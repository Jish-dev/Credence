
import type { Request, Response, NextFunction } from "express";

import Home from "../models/Home.js";
import Booking from "../models/Booking.js";

// ========================================
// PUBLIC: GET HOME SERVICE PASSPORT
// GET /api/v1/passport/public/:token
// ========================================

export const getPublicPassport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.params.token;

    if (typeof token !== "string" || token.length !== 64) {
      return res.status(404).json({
        success: false,
        message: "Service passport not found",
      });
    }

    const home = await Home.findOne({
      passportToken: token,
      isActive: true,
    }).select("_id name createdAt");

    if (!home) {
      return res.status(404).json({
        success: false,
        message: "Service passport not found or inactive",
      });
    }

    const bookings = await Booking.find({
      home: home._id,
      status: "completed",
    })
      .select(
        "serviceName description provider providerCompletedAt createdAt"
      )
      .populate({
        path: "provider",
        select: "name title category",
      })
      .sort({ providerCompletedAt: -1, createdAt: -1 })
      .lean();

    const services = bookings.map((booking) => {
      const provider = booking.provider as
        | {
            name?: string;
            title?: string;
            category?: string;
          }
        | null;

      return {
        serviceName: booking.serviceName,
        category: provider?.category ?? null,
        serviceDate:
          booking.providerCompletedAt ?? booking.createdAt ?? null,
        provider: provider
          ? {
              name: provider.name ?? null,
              businessName: provider.title ?? null,
            }
          : null,
        publicSummary: booking.description || "Service completed",
      };
    });

    return res.status(200).json({
      success: true,
      passport: {
        name: home.name,
        createdAt: home.createdAt,
        totalCompletedServices: services.length,
        services,
      },
    });
  } catch (error) {
    next(error);
  }
};
