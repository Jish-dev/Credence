
import type { Request, Response, NextFunction } from "express";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";

// ========================================
// GET PROVIDER DASHBOARD
// GET /api/v1/provider/dashboard
// ========================================

export const getProviderDashboard = async (
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

    // Find logged-in provider profile
    const provider = await Provider.findOne({
      user: req.user.id,
    }).select("_id name category profileImage verificationStatus status");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });
    }

    const providerId = provider._id;

    // Dashboard statistics
    const [
      totalBookings,
      pendingJobs,
      activeJobs,
      completedJobs,
      cancelledJobs,
      rejectedJobs,
      earningsResult,
      recentBookings,
    ] = await Promise.all([
      Booking.countDocuments({ provider: providerId }),

      Booking.countDocuments({
        provider: providerId,
        status: "pending",
      }),

      Booking.countDocuments({
        provider: providerId,
        status: {
          $in: ["confirmed", "in-progress"],
        },
      }),

      Booking.countDocuments({
        provider: providerId,
        status: "completed",
      }),

      Booking.countDocuments({
        provider: providerId,
        status: "cancelled",
      }),

      Booking.countDocuments({
        provider: providerId,
        status: "rejected",
      }),

      Booking.aggregate([
        {
          $match: {
            provider: providerId,
            status: "completed",
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      Booking.find({
        provider: providerId,
      })
        .populate("customer", "name email phone profileImage")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const totalEarnings = earningsResult[0]?.total || 0;

    return res.status(200).json({
      success: true,
      dashboard: {
        provider: {
          id: provider._id,
          name: provider.name,
          category: provider.category,
          profileImage: provider.profileImage,
          verificationStatus: provider.verificationStatus,
          status: provider.status,
        },

        statistics: {
          totalBookings,
          pendingJobs,
          activeJobs,
          completedJobs,
          cancelledJobs,
          rejectedJobs,
          totalEarnings,
        },

        recentBookings,
      },
    });
  } catch (error) {
    next(error);
  }
};
