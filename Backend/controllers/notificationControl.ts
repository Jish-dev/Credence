
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Notification from "../models/Notification.js";
import User from "../models/User.js";

// ========================================
// VALIDATION
// ========================================

const announcementValidation = z
  .object({
    title: z.string().trim().min(3).max(100),
    body: z.string().trim().min(1).max(1000),
    customerId: z.string().optional(),
    sendToAll: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.sendToAll) return !data.customerId;
      return Boolean(
        data.customerId &&
        mongoose.Types.ObjectId.isValid(data.customerId)
      );
    },
    {
      message: "Select one customer or choose sendToAll",
    }
  );

const getRouteParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

// ========================================
// CUSTOMER: GET NOTIFICATIONS
// GET /api/v1/notifications
// ========================================

export const getMyNotifications = async (
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

    const filter = { user: req.user.id };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Notification.countDocuments(filter),

      Notification.countDocuments({
        ...filter,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      notifications,
      unreadCount,
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
// CUSTOMER: GET UNREAD COUNT
// GET /api/v1/notifications/unread-count
// ========================================

export const getUnreadCount = async (
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

    const count = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: MARK ONE AS READ
// PATCH /api/v1/notifications/:id/read
// ========================================

export const markNotificationAsRead = async (
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        user: req.user.id,
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: MARK ALL AS READ
// PATCH /api/v1/notifications/read-all
// ========================================

export const markAllNotificationsAsRead = async (
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

    const result = await Notification.updateMany(
      {
        user: req.user.id,
        isRead: false,
      },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER: DELETE NOTIFICATION
// DELETE /api/v1/notifications/:id
// ========================================

export const deleteNotification = async (
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// ADMIN: SEND ANNOUNCEMENT
// POST /api/v1/notifications/admin/announcements
// ========================================

export const sendAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = announcementValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement details",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { title, body, customerId, sendToAll } = parsed.data;

    if (sendToAll) {
      const customers = await User.find({
        role: "customer",
        isActive: true,
      }).select("_id");

      if (customers.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No active customers found",
        });
      }

      await Notification.insertMany(
        customers.map((customer) => ({
          user: customer._id,
          title,
          body,
          type: "announcement",
          data: {},
          isRead: false,
        }))
      );

      return res.status(201).json({
        success: true,
        message: "Announcement sent to all active customers",
        recipientCount: customers.length,
      });
    }

    const customer = await User.findOne({
      _id: customerId,
      role: "customer",
      isActive: true,
    }).select("_id");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Active customer not found",
      });
    }

    const notification = await Notification.create({
      user: customer._id,
      title,
      body,
      type: "announcement",
      data: {},
      isRead: false,
    });

    return res.status(201).json({
      success: true,
      message: "Announcement sent successfully",
      notification,
    });
  } catch (error) {
    next(error);
  }
};
