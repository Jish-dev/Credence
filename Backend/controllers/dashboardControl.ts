
import type { Request, Response, NextFunction } from "express";

import User from "../models/User.js";
import Provider from "../models/Provider.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";

// ========================================
// ADMIN DASHBOARD SUMMARY
// ========================================

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      totalCustomers,
      totalProviders,
      publishedProviders,
      totalBookings,
      totalReviews,
      completedBookings,
      pendingBookings,
      revenueResult,
    ] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      Provider.countDocuments(),
      Provider.countDocuments({ status: "published" }),
      Booking.countDocuments(),
      Review.countDocuments(),
      Booking.countDocuments({ status: "completed" }),
      Booking.countDocuments({ status: "pending" }),
      Booking.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    return res.status(200).json({
      success: true,
      message: "Dashboard statistics fetched successfully",
      data: {
        totalCustomers,
        totalProviders,
        publishedProviders,
        totalBookings,
        totalReviews,
        completedBookings,
        pendingBookings,
        totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// BOOKING STATUS STATISTICS
// ========================================

export const getBookingStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = {
      pending: 0,
      confirmed: 0,
      "in-progress": 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
    };

    bookingStats.forEach((item) => {
      if (item._id in statusCounts) {
        statusCounts[item._id as keyof typeof statusCounts] = item.count;
      }
    });

    return res.status(200).json({
      success: true,
      message: "Booking statistics fetched successfully",
      data: statusCounts,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// MONTHLY BOOKING & REVENUE TRENDS
// ========================================

export const getMonthlyTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();

    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1
    );

    const monthlyData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                1,
                0,
              ],
            },
          },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const trends = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const existing = monthlyData.find(
        (item) =>
          item._id.year === year &&
          item._id.month === month
      );

      trends.push({
        year,
        month,
        monthName: date.toLocaleString("en", {
          month: "short",
        }),
        totalBookings: existing?.totalBookings || 0,
        completedBookings: existing?.completedBookings || 0,
        revenue: existing?.revenue || 0,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Monthly trends fetched successfully",
      data: trends,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// RECENT BOOKINGS
// ========================================

export const getRecentBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "name email")
      .populate("provider", "name category")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Recent bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// RECENT CUSTOMERS
// ========================================

export const getRecentCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customers = await User.find({ role: "customer" })
      .select("name email phone profileImage createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Recent customers fetched successfully",
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};


// ========================================
// ALL REGISTERED CUSTOMERS
// ========================================

export const getAllCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const search = String(req.query.search || "").trim();

    const filter: Record<string, unknown> = {
      role: "customer",
    };

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [customers, total] = await Promise.all([
      User.find(filter)
        .select("name email phone profileImage createdAt isActive")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: {
        customers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
