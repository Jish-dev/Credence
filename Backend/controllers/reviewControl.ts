
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Review, { type ReviewStatus } from "../models/Review.js";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";

// ========================================
// VALIDATION
// ========================================

const reviewValidation = z.object({
  bookingId: z.string().refine(
    (id) => mongoose.Types.ObjectId.isValid(id),
    "Invalid booking ID"
  ),

  rating: z.coerce.number().int().min(1).max(5),

  comment: z.string().trim().max(1000).optional().default(""),
});

const updateReviewValidation = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),

  comment: z.string().trim().max(1000).optional(),
}).refine(
  (data) => data.rating !== undefined || data.comment !== undefined,
  "Provide a rating or comment to update"
);

const moderationValidation = z.object({
  status: z.enum(["published", "hidden"]),
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
// UPDATE PROVIDER RATING
// ========================================

const updateProviderRating = async (providerId: string) => {
  const result = await Review.aggregate<{
    averageRating: number;
    reviewCount: number;
  }>([
    {
      $match: {
        provider: new mongoose.Types.ObjectId(providerId),
        status: "published",
      },
    },
    {
      $group: {
        _id: "$provider",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const averageRating = result[0]?.averageRating ?? 0;
  const reviewCount = result[0]?.reviewCount ?? 0;

  await Provider.findByIdAndUpdate(providerId, {
    $set: {
      averageRating: Number(averageRating.toFixed(1)),
      reviewCount,
    },
  });
};

// ========================================
// CUSTOMER: CREATE REVIEW
// POST /api/v1/reviews
// ========================================

export const createReview = async (
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

    const parsed = reviewValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid review data",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { bookingId, rating, comment } = parsed.data;

    // Find a completed booking belonging to this customer
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: req.user.id,
      status: "completed",
    });

    if (!booking) {
      return res.status(400).json({
        success: false,
        message: "Only completed bookings can be reviewed",
      });
    }

    // One review per booking
    const existingReview = await Review.findOne({
      booking: booking._id,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this booking",
      });
    }

    const review = await Review.create({
      customer: req.user.id,
      provider: booking.provider,
      booking: booking._id,
      rating,
      comment,
      status: "published",
    });

    await updateProviderRating(String(booking.provider));

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error: unknown) {
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message: "A review already exists for this booking",
      });
    }

    next(error);
  }
};

// ========================================
// CUSTOMER: GET MY REVIEWS
// GET /api/v1/reviews/my
// ========================================

export const getMyReviews = async (
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

    const reviews = await Review.find({
      customer: req.user.id,
    })
      .populate("provider", "name title category profileImage")
      .populate("booking", "serviceName bookingDate status")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: UPDATE MY REVIEW
// PUT /api/v1/reviews/:id
// ========================================

export const updateReview = async (
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
        message: "Invalid review ID",
      });
    }

    const parsed = updateReviewValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid review data",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const review = await Review.findOne({
      _id: id,
      customer: req.user.id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (parsed.data.rating !== undefined) {
      review.rating = parsed.data.rating;
    }

    if (parsed.data.comment !== undefined) {
      review.comment = parsed.data.comment;
    }

    await review.save();

    await updateProviderRating(String(review.provider));

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: DELETE MY REVIEW
// DELETE /api/v1/reviews/:id
// ========================================

export const deleteReview = async (
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
        message: "Invalid review ID",
      });
    }

    const review = await Review.findOne({
      _id: id,
      customer: req.user.id,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const providerId = String(review.provider);

    await Review.deleteOne({
      _id: review._id,
      customer: req.user.id,
    });

    await updateProviderRating(providerId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// PUBLIC: GET PROVIDER REVIEWS
// GET /api/v1/reviews/provider/:providerId
// ========================================

export const getProviderReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const providerId = getRouteParam(req.params.providerId);

    if (!isValidId(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit) || 10)
    );
    const skip = (page - 1) * limit;

    const filter: {
      provider: mongoose.Types.ObjectId;
      status: "published";
    } = {
      provider: new mongoose.Types.ObjectId(providerId),
      status: "published",
    };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("customer", "name profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reviews,
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
// ADMIN: GET ALL REVIEWS
// GET /api/v1/reviews/admin/all
// ========================================

export const getAllReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20)
    );
    const skip = (page - 1) * limit;

    const filter: {
      status?: ReviewStatus;
      provider?: mongoose.Types.ObjectId;
    } = {};

    if (
      req.query.status === "published" ||
      req.query.status === "hidden"
    ) {
      filter.status = req.query.status;
    }

    if (req.query.providerId) {
      const providerId = String(req.query.providerId);

      if (!isValidId(providerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid provider ID",
        });
      }

      filter.provider = new mongoose.Types.ObjectId(providerId);
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("customer", "name email")
        .populate("provider", "name title category")
        .populate("booking", "serviceName bookingDate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reviews,
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
// ADMIN: MODERATE REVIEW
// PATCH /api/v1/reviews/admin/:id/status
// ========================================

export const moderateReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    const parsed = moderationValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Status must be published or hidden",
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.status = parsed.data.status;
    await review.save();

    await updateProviderRating(String(review.provider));

    return res.status(200).json({
      success: true,
      message: `Review ${parsed.data.status} successfully`,
      review,
    });
  } catch (error) {
    next(error);
  }
};
