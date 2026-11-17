
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { getIO } from "../config/socket.js";

import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import Home from "../models/Home.js";
import Payment, { type IPayment } from "../models/Payment.js";
import Notification from "../models/Notification.js";

// ========================================
// VALIDATION
// ========================================

const createBookingValidation = z
  .object({
    providerId: z.string().refine(
      (id) => mongoose.Types.ObjectId.isValid(id),
      "Invalid provider ID"
    ),

    homeId: z
      .string()
      .refine(
        (id) => mongoose.Types.ObjectId.isValid(id),
        "Invalid home ID"
      )
      .optional(),

    bookingType: z
      .enum(["on_demand", "pre_booking"])
      .optional()
      .default("pre_booking"),

    description: z.string().trim().max(1000).optional().default(""),

    bookingDate: z.coerce.date().nullable().optional(),

    bookingTime: z.string().trim().max(50).optional().default(""),

    location: z.string().trim().min(3).max(250),

    contactPhone: z.string().trim().min(5).max(25),
  })
  .superRefine((data, ctx) => {
    if (data.bookingType === "pre_booking") {
      if (!data.bookingDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bookingDate"],
          message: "Booking date is required for pre-booking",
        });
      }

      if (!data.bookingTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bookingTime"],
          message: "Booking time is required for pre-booking",
        });
      }
    }
  });

const providerStatusValidation = z.object({
  status: z.enum([
    "confirmed",
    "rejected",
    "in-progress",
  ]),
  providerNote: z.string().trim().max(1000).optional(),
});

const providerLocationValidation = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const finalBillValidation = z.object({
  laborCharge: z.coerce.number().min(0).max(10000000),

  materialCharge: z.coerce.number().min(0).max(10000000),

  otherCharges: z.coerce
    .number()
    .min(0)
    .max(10000000)
    .optional()
    .default(0),

  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .default(""),
});

// ========================================
// HELPERS
// ========================================

const getRouteParam = (
  value: string | string[] | undefined
): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const isValidId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

// ========================================
// NOTIFICATION HELPER
// ========================================

const createBookingNotification = async (
  userId: mongoose.Types.ObjectId,
  title: string,
  body: string,
  bookingId: mongoose.Types.ObjectId,
  bookingStatus: string
) => {
  try {
    await Notification.create({
      user: userId,
      title,
      body,
      type: "booking",
      data: {
        bookingId,
        bookingStatus,
      },
      isRead: false,
    });
  } catch (error) {
    console.error("Booking notification creation failed:", error);
  }
};

// ========================================
// SOCKET: SEND TRACKING STATUS
// ========================================

const emitTrackingUpdate = (
  customerId: mongoose.Types.ObjectId,
  bookingId: mongoose.Types.ObjectId,
  travelStatus: string,
  location: unknown = null
) => {
  getIO()
    .to(`user:${customerId.toString()}`)
    .emit("provider:tracking:update", {
      bookingId: bookingId.toString(),
      travelStatus,
      location,
    });
};

// ========================================
// PROVIDER AUTHENTICATION HELPER
// ========================================

const getAuthenticatedProvider = async (userId: string) => {
  const user = await User.findOne({
    _id: userId,
    role: "provider",
    isActive: true,
    providerApprovalStatus: "approved",
  });

  if (!user) {
    return null;
  }

  const provider = await Provider.findOne({
    user: user._id,
  });

  return provider;
};

// ========================================
// VERIFIED ADVANCE PAYMENT HELPER
// ========================================

const findVerifiedAdvancePayment = async (
  booking: {
    _id: mongoose.Types.ObjectId;
    customer: mongoose.Types.ObjectId;
  }
) => {
  return Payment.findOne({
    booking: booking._id,
    customer: booking.customer,
    status: "paid",
    signatureVerified: true,
    currency: "INR",
    $or: [
      { purpose: "advance" },
      { purpose: { $exists: false } },
      { purpose: null },
    ],
  }).sort({ createdAt: -1 });
};
// Enforce a positive, verified, amount-matched advance payment.
const getValidAdvancePayment = async (booking: {
  _id: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  amount: number;
}) => {
  const expectedPaise = Math.round(Number(booking.amount) * 100);
  if (!Number.isSafeInteger(expectedPaise) || expectedPaise <= 0) return null;
  const payment = await findVerifiedAdvancePayment(booking);
  return payment?.amount === expectedPaise ? payment : null;
};

// ========================================
// BOOKING DATE/TIME VALIDATION
// INDIA STANDARD TIME (UTC+05:30)
// ========================================

const getBookingDateTime = (
  bookingDate: Date,
  bookingTime: string
): Date | null => {
  const timeMatch = bookingTime.match(
    /^([01]\d|2[0-3]):([0-5]\d)$/
  );

  if (!timeMatch) {
    return null;
  }

  const dateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(bookingDate);

  const dateTime = new Date(
    `${dateString}T${bookingTime}:00+05:30`
  );

  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }

  return dateTime;
};

const validateAdvanceBookingTime = (
  bookingDate: Date,
  bookingTime: string
): { valid: boolean; message?: string } => {
  const selectedDateTime = getBookingDateTime(
    bookingDate,
    bookingTime
  );

  if (!selectedDateTime) {
    return {
      valid: false,
      message:
        "Invalid booking date or time. Please select a valid time.",
    };
  }

  const minimumBookingTime = Date.now() + 30 * 60 * 1000;

  if (selectedDateTime.getTime() < minimumBookingTime) {
    return {
      valid: false,
      message:
        "Bookings must be scheduled at least 30 minutes in advance. Please choose a later date or time.",
    };
  }

  return { valid: true };
};

// ========================================
// CUSTOMER: CREATE BOOKING
// POST /api/v1/bookings
// ========================================

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const parsed = createBookingValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking details",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    const customer = await User.findOne({
      _id: req.user.id,
      role: "customer",
      isActive: true,
    });

    if (!customer) {
      return res.status(403).json({
        success: false,
        message: "Active customer account not found",
      });
    }

    const selectedHome = data.homeId
      ? await Home.findOne({
          _id: data.homeId,
          owner: customer._id,
          isActive: true,
        })
      : null;

    if (data.homeId && !selectedHome) {
      return res.status(404).json({
        success: false,
        message: "Selected home not found or passport is inactive",
      });
    }

    if (data.bookingType === "pre_booking") {
      const bookingTimeValidation = validateAdvanceBookingTime(
        data.bookingDate!,
        data.bookingTime
      );

      if (!bookingTimeValidation.valid) {
        return res.status(400).json({
          success: false,
          message: bookingTimeValidation.message,
        });
      }
    }

    const provider = await Provider.findOne({
      _id: data.providerId,
      status: "published",
      isAvailable: true,
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found or currently unavailable",
      });
    }

    // Mandatory advance: no free/zero-amount booking can enter this flow.
    // Ensure startingPrice represents the agreed advance for this provider.
    const advanceAmount = Number(provider.startingPrice);
    if (!Number.isFinite(advanceAmount) || advanceAmount <= 0 ||
        !Number.isSafeInteger(Math.round(advanceAmount * 100))) {
      return res.status(400).json({
        success: false,
        message: "Provider must have a valid positive advance amount before booking",
      });
    }

    const serviceName =
      provider.title || provider.category || provider.name;

    const booking = await Booking.create({
      customer: customer._id,
      provider: provider._id,
      home: selectedHome?._id ?? null,

      serviceName,

      bookingType: data.bookingType,
      description: data.description,

      bookingDate:
        data.bookingType === "pre_booking"
          ? data.bookingDate ?? null
          : null,

      bookingTime:
        data.bookingType === "pre_booking"
          ? data.bookingTime
          : "",

      location: data.location,
      contactPhone: data.contactPhone,

      // Snapshot provider pricing at booking creation.
      amount: advanceAmount,
      pricingType: provider.pricingType ?? "starting_price",

      status: "pending",

      paymentStatus: "pending",
      upfrontPaymentStatus: "pending",
      balancePaymentStatus: "pending",
    });

    await createBookingNotification(
      customer._id,
      "Booking Request Submitted",
      `Your booking request for ${serviceName} has been submitted successfully.`,
      booking._id,
      booking.status
    );

    if (provider.user) {
      await createBookingNotification(
        provider.user,
        "New Booking Request",
        `You have received a new booking request for ${serviceName}.`,
        booking._id,
        booking.status
      );
    }

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: GET MY BOOKINGS
// GET /api/v1/bookings/my
// ========================================

export const getMyBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      customer: req.user.id,
    };

    if (req.query.status) {
      filter.status = String(req.query.status);
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate(
          "provider",
          "name title category location profileImage contact"
        )
        .populate("home", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Your bookings fetched successfully",
      bookings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: GET BOOKING DETAILS
// GET /api/v1/bookings/my/:id
// ========================================

export const getMyBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      customer: req.user.id,
    })
      .populate(
        "provider",
        "name title category location profileImage contact"
      )
      .populate("home", "name")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: CANCEL BOOKING
// PATCH /api/v1/bookings/my/:id/cancel
// ========================================

export const cancelMyBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      customer: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled when its status is ${booking.status}`,
      });
    }

    booking.status = "cancelled";
    booking.providerTravelStatus = "stopped";
    booking.providerLocation = null;
    booking.trackingEndedAt = new Date();

    await booking.save();

    emitTrackingUpdate(
      booking.customer,
      booking._id,
      "stopped"
    );

    await createBookingNotification(
      booking.customer,
      "Booking Cancelled",
      "Your booking has been cancelled successfully.",
      booking._id,
      booking.status
    );

    const provider = await Provider.findById(
      booking.provider
    ).select("user");

    if (provider?.user) {
      await createBookingNotification(
        provider.user,
        "Booking Cancelled",
        "A customer has cancelled their booking.",
        booking._id,
        booking.status
      );
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PROVIDER: GET MY BOOKINGS
// GET /api/v1/bookings/provider/my
// ========================================

export const getProviderBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const provider = await getAuthenticatedProvider(req.user.id);

    if (!provider) {
      return res.status(403).json({
        success: false,
        message: "Approved provider account not found",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      provider: provider._id,
    };

    if (req.query.status) {
      filter.status = String(req.query.status);
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("customer", "name email phone profileImage")
        .populate("home", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Provider bookings fetched successfully",
      bookings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: GET PROVIDER LIVE TRACKING
// GET /api/v1/bookings/my/:id/tracking
// ========================================

export const getMyBookingTracking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    // Only the booking owner can access tracking information.
    const booking = await Booking.findOne({
      _id: id,
      customer: req.user.id,
    })
      .select(
        "status provider providerTravelStatus providerLocation trackingStartedAt trackingEndedAt"
      )
      .populate("provider", "name title category profileImage")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const trackingActive = [
      "on-the-way",
      "arrived",
    ].includes(booking.providerTravelStatus);

    return res.status(200).json({
      success: true,
      message: "Booking tracking details fetched successfully",
      tracking: {
        bookingStatus: booking.status,
        travelStatus: booking.providerTravelStatus,
        trackingActive,
        provider: booking.provider,
        providerLocation: trackingActive
          ? booking.providerLocation
          : null,
        trackingStartedAt: booking.trackingStartedAt,
        trackingEndedAt: booking.trackingEndedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PROVIDER: GET BOOKING DETAILS
// GET /api/v1/bookings/provider/:id
// ========================================

export const getProviderBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const provider = await getAuthenticatedProvider(req.user.id);

    if (!provider) {
      return res.status(403).json({
        success: false,
        message: "Approved provider account not found",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      provider: provider._id,
    })
      .populate("customer", "name email phone profileImage")
      .populate("home", "name")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PROVIDER: UPDATE BOOKING STATUS
// PATCH /api/v1/bookings/provider/:id/status
// ========================================

export const updateProviderBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const parsed = providerStatusValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const provider = await getAuthenticatedProvider(req.user.id);

    if (!provider) {
      return res.status(403).json({
        success: false,
        message: "Approved provider account not found",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      provider: provider._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ["confirmed", "rejected"],
      confirmed: ["in-progress"],
      "in-progress": [],
      completed: [],
      cancelled: [],
      rejected: [],
    };

    const newStatus = parsed.data.status;

    if (!allowedTransitions[booking.status]?.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change booking status from ${booking.status} to ${newStatus}`,
      });
    }

    // Providers cannot accept or start an unpaid booking.
    // Checking the payment record prevents trusting a stale booking status alone.
    let verifiedAdvanceId: mongoose.Types.ObjectId | null = null;
    if (newStatus === "confirmed" || newStatus === "in-progress") {
      const advance = await getValidAdvancePayment(booking);
      if (!advance) {
        return res.status(402).json({
          success: false,
          message: "Customer must complete verified Razorpay advance payment before this booking can proceed.",
        });
      }
      verifiedAdvanceId = advance._id;
    }

    // Atomic status transition prevents stale GPS requests
    // or concurrent actions from restoring location sharing.
    const now = new Date();

    const updates: Record<string, unknown> = {
      status: newStatus,
    };

    if (parsed.data.providerNote !== undefined) {
      updates.providerNote = parsed.data.providerNote;
    }

    if (newStatus === "in-progress" || newStatus === "rejected") {
      updates.providerTravelStatus = "stopped";
      updates.providerLocation = null;
      updates.trackingEndedAt = now;
    }

    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: id,
        provider: provider._id,
        status: booking.status,
        ...(verifiedAdvanceId ? {
          upfrontPaymentStatus: "paid",
          upfrontPaymentId: verifiedAdvanceId,
        } : {}),
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedBooking) {
      return res.status(409).json({
        success: false,
        message:
          "Booking changed while processing. Please refresh and try again.",
      });
    }

    if (["in-progress", "rejected"].includes(newStatus)) {
      emitTrackingUpdate(
        updatedBooking.customer,
        updatedBooking._id,
        "stopped"
      );
    }

    const notificationMessages: Record<
      string,
      { title: string; body: string }
    > = {
      confirmed: {
        title: "Booking Confirmed",
        body: "Your booking has been accepted by the provider.",
      },

      rejected: {
        title: "Booking Rejected",
        body:
          "Unfortunately, the provider cannot accept your booking request.",
      },

      "in-progress": {
        title: "Service Started",
        body: "Your provider has started working on your service.",
      },
    };

    const notificationMessage = notificationMessages[newStatus];

    if (notificationMessage) {
      await createBookingNotification(
        updatedBooking.customer,
        notificationMessage.title,
        notificationMessage.body,
        updatedBooking._id,
        updatedBooking.status
      );
    }

    return res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PROVIDER: SUBMIT FINAL BILL
// POST /api/v1/bookings/provider/:id/final-bill
// ========================================

export const submitProviderFinalBill = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const parsed = finalBillValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid final bill details",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const provider = await getAuthenticatedProvider(req.user.id);

    if (!provider) {
      return res.status(403).json({
        success: false,
        message: "Approved provider account not found",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      provider: provider._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "in-progress") {
      return res.status(400).json({
        success: false,
        message: "Only in-progress bookings can be completed",
      });
    }

    if (booking.finalBill) {
      return res.status(409).json({
        success: false,
        message: "Final bill has already been submitted",
      });
    }

    // Verify the upfront payment.
    // Legacy records without purpose are treated as advance payments.
    const upfrontPayment = await getValidAdvancePayment({
      _id: booking._id,
      customer: booking.customer,
      amount: booking.amount,
    });

    if (!upfrontPayment) {
      return res.status(400).json({
        success: false,
        message:
          "Verified upfront payment not found. The service cannot be completed yet.",
      });
    }

    // Payment.amount is stored in paise.
    // Booking.amount is stored in rupees.
    const expectedAdvancePaise = Math.round(
      Number(booking.amount) * 100
    );

    if (upfrontPayment.amount !== expectedAdvancePaise) {
      return res.status(400).json({
        success: false,
        message:
          "The verified upfront payment does not match the booking amount.",
      });
    }

    // Use integer paise internally to avoid floating-point calculation errors.
    const laborPaise = Math.round(
      parsed.data.laborCharge * 100
    );

    const materialPaise = Math.round(
      parsed.data.materialCharge * 100
    );

    const otherPaise = Math.round(
      parsed.data.otherCharges * 100
    );

    const totalPaise =
      laborPaise + materialPaise + otherPaise;

    const advancePaise = upfrontPayment.amount;

    if (totalPaise < advancePaise) {
      return res.status(400).json({
        success: false,
        message:
          "Final bill cannot be lower than the upfront amount. Please review the charges.",
      });
    }

    const balancePaise = totalPaise - advancePaise;
    const now = new Date();

    const finalBill = {
      laborCharge: laborPaise / 100,
      materialCharge: materialPaise / 100,
      otherCharges: otherPaise / 100,

      totalAmount: totalPaise / 100,
      advanceDeducted: advancePaise / 100,
      balanceAmount: balancePaise / 100,

      description: parsed.data.description,

      approvalStatus: "pending" as const,

      submittedAt: now,
      approvedAt: null,
    };

    // Atomic update prevents two simultaneous final bill submissions.
    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        provider: provider._id,
        status: "in-progress",
        $or: [
          { finalBill: { $exists: false } },
          { finalBill: null },
        ],
      },
      {
        $set: {
          finalBill,

          status: "completed",
          providerCompletedAt: now,

          providerTravelStatus: "stopped",
          providerLocation: null,
          trackingEndedAt: booking.trackingEndedAt ?? now,

          upfrontPaymentStatus: "paid",
          upfrontPaymentId: upfrontPayment._id,

          // Approval must happen before the booking is fully settled.
          balancePaymentStatus: "pending",
          paymentStatus: "pending",
          paidAt: null,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedBooking) {
      return res.status(409).json({
        success: false,
        message:
          "Booking was updated by another request. Please refresh and check the booking.",
      });
    }

    emitTrackingUpdate(
      updatedBooking.customer,
      updatedBooking._id,
      "stopped"
    );

    await createBookingNotification(
      updatedBooking.customer,
      "Final Bill Received",
      "Your provider has submitted the final bill. Please review and approve it to proceed with the remaining payment.",
      updatedBooking._id,
      updatedBooking.status
    );

    return res.status(200).json({
      success: true,
      message: "Final bill submitted successfully",
      booking: updatedBooking,
      finalBill: updatedBooking.finalBill,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: APPROVE FINAL BILL
// PATCH /api/v1/bookings/my/:id/approve-final-bill
// ========================================

export const approveCustomerFinalBill = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      customer: req.user.id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "completed" || !booking.finalBill) {
      return res.status(400).json({
        success: false,
        message: "Final bill is not available for approval",
      });
    }

    if (booking.finalBill.approvalStatus === "approved") {
      return res.status(409).json({
        success: false,
        message: "Final bill has already been approved",
      });
    }

    // Verify upfront payment before accepting bill approval.
    const upfrontPayment = await getValidAdvancePayment({
      _id: booking._id,
      customer: booking.customer,
      amount: booking.amount,
    });

    if (!upfrontPayment) {
      return res.status(400).json({
        success: false,
        message: "Verified upfront payment not found",
      });
    }

    const expectedAdvancePaise = Math.round(
      Number(booking.amount) * 100
    );

    if (upfrontPayment.amount !== expectedAdvancePaise) {
      return res.status(400).json({
        success: false,
        message: "Upfront payment verification failed",
      });
    }

    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        customer: req.user.id,
        status: "completed",
        "finalBill.approvalStatus": "pending",
        "finalBill.balanceAmount": booking.finalBill.balanceAmount,
      },
      {
        $set: {
          "finalBill.approvalStatus": "approved",
          "finalBill.approvedAt": new Date(),
          ...(booking.finalBill.balanceAmount === 0 ? {
            balancePaymentStatus: "paid",
            paymentStatus: "paid",
            paidAt: new Date(),
          } : {}),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedBooking) {
      return res.status(409).json({
        success: false,
        message:
          "Final bill was already updated. Please refresh and try again.",
      });
    }

    const provider = await Provider.findById(
      updatedBooking.provider
    ).select("user");

    if (provider?.user) {
      await createBookingNotification(
        provider.user,
        "Final Bill Approved",
        "The customer has approved your final bill.",
        updatedBooking._id,
        updatedBooking.status
      );
    }

    return res.status(200).json({
      success: true,
      message: "Final bill approved successfully",
      booking: updatedBooking,
      balanceAmount: updatedBooking.finalBill?.balanceAmount ?? 0,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PROVIDER: START LIVE TRACKING
// PATCH /api/v1/bookings/provider/:id/tracking/start
// ========================================

export const startProviderTracking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const provider = await getAuthenticatedProvider(req.user.id);

    if (!provider) {
      return res.status(403).json({
        success: false,
        message: "Approved provider account not found",
      });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: id,
        provider: provider._id,
        status: "confirmed",
        providerTravelStatus: "idle",
      },
      {
        $set: {
          providerTravelStatus: "on-the-way",
          trackingStartedAt: new Date(),
          trackingEndedAt: null,
          providerLocation: null,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!booking) {
      const existing = await Booking.findOne({
        _id: id,
        provider: provider._id,
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (
        existing.status === "confirmed" &&
        ["on-the-way", "arrived"].includes(
          existing.providerTravelStatus
        )
      ) {
        return res.status(200).json({
          success: true,
          message: "Tracking already active",
          booking: existing,
        });
      }

      return res.status(409).json({
        success: false,
        message: "Tracking cannot start for this booking",
      });
    }

    emitTrackingUpdate(
      booking.customer,
      booking._id,
      "on-the-way"
    );

    await createBookingNotification(
      booking.customer,
      "Provider On The Way",
      "Your service provider has started travelling to your location.",
      booking._id,
      booking.status
    );

    return res.status(200).json({
      success: true,
      message: "Live tracking started",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PROVIDER: UPDATE GPS LOCATION
// PATCH /api/v1/bookings/provider/:id/tracking/location
// ========================================

export const updateProviderLocation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const parsed = providerLocationValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS coordinates",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const provider = await getAuthenticatedProvider(req.user.id);

    if (!provider) {
      return res.status(403).json({
        success: false,
        message: "Approved provider account not found",
      });
    }

    // Conditional atomic update:
    // GPS cannot be written after Start Service.
    const location = {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      updatedAt: new Date(),
    };

    const booking = await Booking.findOneAndUpdate(
      {
        _id: id,
        provider: provider._id,
        status: "confirmed",
        providerTravelStatus: "on-the-way",
      },
      {
        $set: {
          providerLocation: location,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!booking) {
      return res.status(409).json({
        success: false,
        message: "Location updates are not active for this booking",
      });
    }

    emitTrackingUpdate(
      booking.customer,
      booking._id,
      "on-the-way",
      booking.providerLocation
    );

    return res.status(200).json({
      success: true,
      message: "Provider location updated",
      location: booking.providerLocation,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PROVIDER: MARK ARRIVED
// PATCH /api/v1/bookings/provider/:id/tracking/arrived
// ========================================

export const markProviderArrived = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const provider = await getAuthenticatedProvider(req.user.id);

    if (!provider) {
      return res.status(403).json({
        success: false,
        message: "Approved provider account not found",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      provider: provider._id,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (
      booking.status !== "confirmed" ||
      booking.providerTravelStatus !== "on-the-way"
    ) {
      return res.status(400).json({
        success: false,
        message: "Provider cannot mark arrival for this booking",
      });
    }

    booking.providerTravelStatus = "arrived";

    await booking.save();

    emitTrackingUpdate(
      booking.customer,
      booking._id,
      "arrived"
    );

    await createBookingNotification(
      booking.customer,
      "Provider Has Arrived",
      "Your service provider has arrived at your location.",
      booking._id,
      booking.status
    );

    return res.status(200).json({
      success: true,
      message: "Arrival marked successfully",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PROVIDER: STOP LIVE TRACKING
// PATCH /api/v1/bookings/provider/:id/tracking/stop
// ========================================

export const stopProviderTracking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const provider = await getAuthenticatedProvider(req.user.id);

    if (!provider) {
      return res.status(403).json({
        success: false,
        message: "Approved provider account not found",
      });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: id,
        provider: provider._id,
        status: "confirmed",
        providerTravelStatus: {
          $in: ["on-the-way", "arrived"],
        },
      },
      {
        $set: {
          providerTravelStatus: "stopped",
          providerLocation: null,
          trackingEndedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!booking) {
      return res.status(409).json({
        success: false,
        message: "Live tracking is not active",
      });
    }

    emitTrackingUpdate(
      booking.customer,
      booking._id,
      "stopped"
    );

    return res.status(200).json({
      success: true,
      message: "Live tracking stopped",
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: LEGACY COMPLETION ENDPOINT
// PATCH /api/v1/bookings/my/:id/confirm-completion
// ========================================

export const confirmServiceCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    return res.status(403).json({
      success: false,
      message:
        "Customers cannot confirm service completion through this endpoint. The provider submits the final bill, and the customer approves it.",
    });
  } catch (error) {
    next(error);
  }
};
