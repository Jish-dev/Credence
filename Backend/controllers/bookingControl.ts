
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import Home from "../models/Home.js";
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

    // Optional: connect this booking to a customer's home
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
    "completed",
  ]),
  providerNote: z.string().trim().max(1000).optional(),
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

    // ====================================
    // VALIDATE SELECTED HOME
    // ====================================

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

    // ====================================
    // VALIDATE PRE-BOOKING DATE AND TIME
    // ====================================

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

    // ====================================
    // FIND AVAILABLE PROVIDER
    // ====================================

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

    const serviceName =
      provider.title || provider.category || provider.name;

    // ====================================
    // CREATE BOOKING
    // ====================================

    const booking = await Booking.create({
      customer: customer._id,
      provider: provider._id,

      // Link booking to the selected home.
      // Null for bookings created without a selected home.
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

      amount: provider.startingPrice,

      status: "pending",
      paymentStatus: "pending",
    });

    // ====================================
    // NOTIFY CUSTOMER
    // ====================================

    await createBookingNotification(
      customer._id,
      "Booking Request Submitted",
      `Your booking request for ${serviceName} has been submitted successfully.`,
      booking._id,
      booking.status
    );

    // ====================================
    // NOTIFY PROVIDER
    // ====================================

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
    await booking.save();

    await createBookingNotification(
      booking.customer,
      "Booking Cancelled",
      "Your booking has been cancelled successfully.",
      booking._id,
      booking.status
    );

    // Notify provider
    const provider = await Provider.findById(booking.provider).select("user");

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

    // Provider can only access their own bookings
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

    // Ownership check
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
      "in-progress": ["completed"],
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

    booking.status = newStatus;

    if (parsed.data.providerNote !== undefined) {
      booking.providerNote = parsed.data.providerNote;
    }

    if (newStatus === "completed") {
      booking.providerCompletedAt = new Date();
    }

    await booking.save();

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
        body: "Unfortunately, the provider cannot accept your booking request.",
      },
      "in-progress": {
        title: "Service Started",
        body: "Your provider has started working on your service.",
      },
      completed: {
        title: "Service Completed",
        body: "Your provider has marked your service as completed. You can now proceed with payment.",
      },
    };

    const notificationMessage = notificationMessages[newStatus];

    if (notificationMessage) {
      await createBookingNotification(
        booking.customer,
        notificationMessage.title,
        notificationMessage.body,
        booking._id,
        booking.status
      );
    }

    return res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      booking,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: LEGACY COMPLETION ENDPOINT
// PATCH /api/v1/bookings/my/:id/confirm-completion
//
// Provider now marks the service as completed.
// This handler is retained to avoid breaking existing
// route imports, but it no longer changes booking status.
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
        "Customers cannot confirm service completion. The provider marks the service as completed.",
    });
  } catch (error) {
    next(error);
  }
};
