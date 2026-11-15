
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Home from "../models/Home.js";
import PassportAccessRequest from "../models/PassportAccessRequest.js";
import Booking from "../models/Booking.js";

// ========================================
// CREATE HOME
// ========================================

export const createHome = async (
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

        const { name, address } = req.body;

        if (
            typeof name !== "string" ||
            typeof address !== "string" ||
            !name.trim() ||
            !address.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Home name and address are required",
            });
        }

        const home = await Home.create({
            owner: req.user.id,
            name: name.trim(),
            address: address.trim(),
        });

        return res.status(201).json({
            success: true,
            message: "Home created successfully",
            home: {
                id: home._id,
                name: home.name,
                address: home.address,
                passportToken: home.passportToken,
                createdAt: home.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ========================================
// GET MY HOMES
// ========================================

export const getMyHomes = async (
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

        const homes = await Home.find({
            owner: req.user.id,
        })
            .select("-passportToken")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: homes.length,
            homes,
        });
    } catch (error) {
        next(error);
    }
};

// ========================================
// GET HOME QR PASSPORT URL
// ========================================

export const getHomePassportQR = async (
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

        const homeId = req.params.homeId;

        if (
            typeof homeId !== "string" ||
            !mongoose.Types.ObjectId.isValid(homeId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid home ID",
            });
        }

        const home = await Home.findOne({
            _id: homeId,
            owner: req.user.id,
            isActive: true,
        });

        if (!home) {
            return res.status(404).json({
                success: false,
                message: "Home not found or passport is inactive",
            });
        }

        const frontendUrl =
            process.env.FRONTEND_URL || "http://localhost:5173";

        const passportUrl =
            `${frontendUrl.replace(/\/$/, "")}/passport/${home.passportToken}`;

        return res.status(200).json({
            success: true,
            message: "Passport QR URL generated successfully",
            passportUrl,
        });
    } catch (error) {
        next(error);
    }
};

// ========================================
// DEACTIVATE HOME PASSPORT
// ========================================


export const deactivateHomePassport = async (
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

        const homeId = req.params.homeId;

        if (
            typeof homeId !== "string" ||
            !mongoose.Types.ObjectId.isValid(homeId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid home ID",
            });
        }

        const home = await Home.findOneAndUpdate(
            {
                _id: homeId,
                owner: req.user.id,
                isActive: true,
            },
            {
                $set: { isActive: false },
            },
            {
                returnDocument: "after",
            }
        );

        if (!home) {
            return res.status(404).json({
                success: false,
                message: "Home not found or already inactive",
            });
        }

        // Revoke all active provider access requests for this home
        await PassportAccessRequest.updateMany(
            {
                home: home._id,
                status: "approved",
            },
            {
                $set: {
                    status: "revoked",
                },
            }
        );

        // Expire any pending OTP requests
        await PassportAccessRequest.updateMany(
            {
                home: home._id,
                status: "pending",
            },
            {
                $set: {
                    status: "expired",
                },
            }
        );

        return res.status(200).json({
            success: true,
            message: "Home Passport deactivated successfully. All provider access has been revoked.",
        });
    } catch (error) {
        next(error);
    }
};


// ========================================
// DELETE DEACTIVATED HOME
// ========================================

export const deleteHome = async (
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

        const homeId = req.params.homeId;

        if (
            typeof homeId !== "string" ||
            !mongoose.Types.ObjectId.isValid(homeId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid home ID",
            });
        }

        // Find only a deactivated home owned by this customer
        const home = await Home.findOne({
            _id: homeId,
            owner: req.user.id,
            isActive: false,
        });

        if (!home) {
            return res.status(404).json({
                success: false,
                message: "Deactivated home not found",
            });
        }

        // Preserve homes that have associated booking history
        const existingBookings = await Booking.exists({
            home: home._id,
        });

        if (existingBookings) {
            return res.status(409).json({
                success: false,
                message:
                    "This home has service booking history and cannot be permanently deleted. You can keep it deactivated.",
            });
        }

        // Remove associated passport access requests
        await PassportAccessRequest.deleteMany({
            home: home._id,
        });

        // Permanently delete the home
        await Home.deleteOne({
            _id: home._id,
            owner: req.user.id,
            isActive: false,
        });

        return res.status(200).json({
            success: true,
            message: "Home deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};
