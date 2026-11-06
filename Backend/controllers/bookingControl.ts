
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// ========================================
// VALIDATION
// ========================================

const createBookingValidation = z.object({
  providerId: z.string().refine(
    (id) => mongoose.Types.ObjectId.isValid(id),
    "Invalid provider ID"
  ),
  description: z.string().trim().max(1000).optional().default(""),
  bookingDate: z.coerce.date(),
  bookingTime: z.string().trim().min(1).max(50),
  location: z.string().trim().min(3).max(250),
  contactPhone: z.string().trim().min(5).max(25),
});

const updateStatusValidation = z.object({
  status: z.enum([
    "confirmed",
    "in-progress",
    "completed",
    "cancelled",
    "rejected",
  ]),
  adminNote: z.string().trim().max(1000).optional(),
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
// BOOKING DATE/TIME VALIDATION
// INDIA STANDARD TIME (UTC+05:30)
// ========================================

const getBookingDateTime = (
  bookingDate: Date,
  bookingTime: string
): Date | null => {
  // Accept 24-hour HH:mm format
  const timeMatch = bookingTime.match(
    /^([01]\d|2[0-3]):([0-5]\d)$/
  );

  if (!timeMatch) {
    return null;
  }

  // Get the calendar date in India timezone
  const dateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(bookingDate);

  // Combine date and time using IST offset
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
      message: "Invalid booking date or time. Please select a valid time.",
    };
  }

  // Minimum 30 minutes advance booking
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

    // Check customer account
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

    // Allow today and future dates.
    // Reject past dates and times less than 30 minutes ahead.
    const bookingTimeValidation = validateAdvanceBookingTime(
      data.bookingDate,
      data.bookingTime
    );

    if (!bookingTimeValidation.valid) {
      return res.status(400).json({
        success: false,
        message: bookingTimeValidation.message,
      });
    }

    // Only published and available providers can be booked
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

    // Create booking
    const booking = await Booking.create({
      customer: customer._id,
      provider: provider._id,
      serviceName: provider.title || provider.category || provider.name,
      description: data.description,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      location: data.location,
      contactPhone: data.contactPhone,
      amount: provider.startingPrice,
      status: "pending",
    });

    // Create customer notification
    try {
      await Notification.create({
        user: customer._id,
        title: "Booking Request Submitted",
        body: `Your booking request for ${provider.title || provider.category || provider.name
          } has been submitted successfully. We will notify you when its status changes.`,
        type: "booking",
        data: {
          bookingId: booking._id,
          bookingStatus: booking.status,
        },
        isRead: false,
      });
    } catch (notificationError) {
      console.error(
        "Booking notification creation failed:",
        notificationError
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

    const filter: Record<string, any> = {
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

    // Notify customer about cancellation
    try {
      await Notification.create({
        user: booking.customer,
        title: "Booking Cancelled",
        body: "Your booking has been cancelled successfully.",
        type: "booking",
        data: {
          bookingId: booking._id,
          bookingStatus: "cancelled",
        },
        isRead: false,
      });
    } catch (notificationError) {
      console.error(
        "Booking cancellation notification failed:",
        notificationError
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
// ADMIN: GET ALL BOOKINGS
// GET /api/v1/bookings/admin/all
// ========================================

export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (req.query.status) {
      filter.status = String(req.query.status);
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();

      // Escape regex special characters
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const matchingCustomers = await User.find({
        role: "customer",
        $or: [
          { name: { $regex: safeSearch, $options: "i" } },
          { email: { $regex: safeSearch, $options: "i" } },
          { phone: { $regex: safeSearch, $options: "i" } },
        ],
      }).select("_id");

      const matchingProviders = await Provider.find({
        $or: [
          { name: { $regex: safeSearch, $options: "i" } },
          { category: { $regex: safeSearch, $options: "i" } },
        ],
      }).select("_id");

      filter.$or = [
        {
          customer: {
            $in: matchingCustomers.map((item) => item._id),
          },
        },
        {
          provider: {
            $in: matchingProviders.map((item) => item._id),
          },
        },
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("customer", "name email phone")
        .populate("provider", "name title category location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "All bookings fetched successfully",
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
// ADMIN: GET BOOKING DETAILS
// GET /api/v1/bookings/admin/:id
// ========================================

export const getAdminBookingById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findById(id)
      .populate("customer", "name email phone")
      .populate("provider", "name title category location contact")
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
// ADMIN: UPDATE BOOKING STATUS
// PATCH /api/v1/bookings/admin/:id/status
// ========================================

export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const parsed = updateStatusValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ["confirmed", "rejected", "cancelled"],
      confirmed: ["in-progress", "cancelled"],
      "in-progress": ["completed"],
      completed: [],
      cancelled: [],
      rejected: [],
    };

    if (!allowedTransitions[booking.status]?.includes(parsed.data.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change booking status from ${booking.status} to ${parsed.data.status}`,
      });
    }

    booking.status = parsed.data.status;

    if (parsed.data.adminNote !== undefined) {
      booking.adminNote = parsed.data.adminNote;
    }

    await booking.save();

    // Create notification for customer
    try {
      const notificationMessages: Record<
        string,
        { title: string; body: string }
      > = {
        confirmed: {
          title: "Booking Confirmed",
          body: "Good news! Your booking has been confirmed.",
        },
        rejected: {
          title: "Booking Rejected",
          body: "Unfortunately, your booking request has been rejected.",
        },
        "in-progress": {
          title: "Service In Progress",
          body: "Your service is now in progress.",
        },
        completed: {
          title: "Service Completed",
          body: "Your service has been completed. Thank you for choosing CREDENCE!",
        },
        cancelled: {
          title: "Booking Cancelled",
          body: "Your booking has been cancelled.",
        },
      };

      const notificationMessage = notificationMessages[booking.status];

      if (notificationMessage) {
        await Notification.create({
          user: booking.customer,
          title: notificationMessage.title,
          body: notificationMessage.body,
          type: "booking",
          data: {
            bookingId: booking._id,
            bookingStatus: booking.status,
          },
          isRead: false,
        });
      }
    } catch (notificationError) {
      console.error(
        "Booking status notification failed:",
        notificationError
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
        message: "Authentication required",
      });
    }

    const provider = await Provider.findOne({
      user: req.user.id,
    }).select("_id");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      provider: provider._id,
    };

    if (req.query.status) {
      filter.status = String(req.query.status);
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("customer", "name email phone profileImage")
        .sort({ bookingDate: 1, createdAt: -1 })
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
// GET /api/v1/bookings/provider/my/:id
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
        message: "Authentication required",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const provider = await Provider.findOne({
      user: req.user.id,
    }).select("_id");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });
    }

    const booking = await Booking.findOne({
      _id: id,
      provider: provider._id,
    })
      .populate("customer", "name email phone profileImage")
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
        message: "Authentication required",
      });
    }

    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const parsed = z.object({
      status: z.enum([
        "confirmed",
        "rejected",
        "in-progress",
        "completed",
      ]),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const provider = await Provider.findOne({
      user: req.user.id,
    }).select("_id");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });
    }

    // Only bookings assigned to this provider can be updated.
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
    await booking.save();

    // Notify the customer
    const notificationMessages: Record<
      string,
      { title: string; body: string }
    > = {
      confirmed: {
        title: "Booking Accepted",
        body: "Your booking request has been accepted by the provider.",
      },
      rejected: {
        title: "Booking Rejected",
        body: "Unfortunately, the provider cannot accept your booking.",
      },
      "in-progress": {
        title: "Service Started",
        body: "Your provider has started working on your service.",
      },
      completed: {
        title: "Service Completed",
        body: "Your provider has marked the service as completed.",
      },
    };

    const notification = notificationMessages[newStatus];

    if (notification) {
      try {
        await Notification.create({
          user: booking.customer,
          title: notification.title,
          body: notification.body,
          type: "booking",
          data: {
            bookingId: booking._id,
            bookingStatus: newStatus,
          },
          isRead: false,
        });
      } catch (notificationError) {
        console.error(
          "Provider booking notification failed:",
          notificationError
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: `Booking ${newStatus} successfully`,
      booking,
    });
  } catch (error) {
    next(error);
  }
};
