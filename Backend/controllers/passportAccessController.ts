
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import mongoose from "mongoose";

import Home from "../models/Home.js";
import User from "../models/User.js";
import Provider from "../models/Provider.js";
import PassportAccessRequest from "../models/PassportAccessRequest.js";
import Booking from "../models/Booking.js";

// ========================================
// CONFIGURATION
// ========================================

const OTP_EXPIRY_MINUTES = 5;

// ========================================
// PROVIDER AUTHENTICATION
// ========================================

const getApprovedProvider = async (userId: string) => {
    const user = await User.findOne({
        _id: userId,
        role: "provider",
        isActive: true,
        providerApprovalStatus: "approved",
    });

    if (!user) return null;

    return Provider.findOne({
        user: user._id,
    });
};

// ========================================
// PROVIDER: REQUEST PASSPORT ACCESS
// POST /api/v1/passport/request-access/:token
// ========================================

export const requestPassportAccess = async (
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

        const token = req.params.token;

        if (typeof token !== "string" || token.length !== 64) {
            return res.status(404).json({
                success: false,
                message: "Service passport not found",
            });
        }

        const provider = await getApprovedProvider(req.user.id);

        if (!provider) {
            return res.status(403).json({
                success: false,
                message: "Approved provider account not found",
            });
        }

        const home = await Home.findOne({
            passportToken: token,
            isActive: true,
        }).populate("owner", "name phone role isActive");

        if (!home) {
            return res.status(404).json({
                success: false,
                message: "Service passport not found or inactive",
            });
        }

        const owner = home.owner as unknown as {
            _id: mongoose.Types.ObjectId;
            name: string;
            phone: string;
            role: string;
            isActive: boolean;
        } | null;

        if (!owner || owner.role !== "customer" || !owner.isActive) {
            return res.status(400).json({
                success: false,
                message: "Home owner account is unavailable",
            });
        }

        if (!owner.phone || !owner.phone.trim()) {
            return res.status(400).json({
                success: false,
                message: "Customer has no registered phone number",
            });
        }

        // Invalidate previous pending requests for this provider and home
        await PassportAccessRequest.updateMany(
            {
                home: home._id,
                provider: provider._id,
                status: "pending",
            },
            {
                $set: { status: "expired" },
            }
        );

        // Generate a cryptographically secure 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();

        const otpHash = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        const expiresAt = new Date(
            Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
        );

        await PassportAccessRequest.create({
            home: home._id,
            provider: provider._id,
            otpHash,
            expiresAt,
            attempts: 0,
            status: "pending",
            approvedAt: null,
            approvedUntil: null,
        });

        // TODO: Send OTP to owner.phone using an SMS provider.
        // Development mode only: show OTP in the server terminal.
        if (process.env.NODE_ENV !== "production") {
            console.log(
                `[CREDENCE PASSPORT DEV OTP] Home: ${home._id}, OTP: ${otp}`
            );
        }

        return res.status(200).json({
            success: true,
            message: "Access request created. OTP has been sent to the home owner.",
            expiresIn: OTP_EXPIRY_MINUTES * 60,
            customerPhone: `******${owner.phone.slice(-4)}`,
            ...(process.env.NODE_ENV !== "production"
                ? { developmentOtp: otp }
                : {}),
        });
    } catch (error) {
        next(error);
    }
};


const MAX_OTP_ATTEMPTS = 5;
const ACCESS_DURATION_MINUTES = 30;

// ========================================
// PROVIDER: VERIFY PASSPORT OTP
// POST /api/v1/passport/verify-access/:requestId
// ========================================

export const verifyPassportAccess = async (
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

        const requestId = req.params.requestId;
        const otp = req.body.otp;

        if (
            typeof requestId !== "string" ||
            !mongoose.Types.ObjectId.isValid(requestId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid access request ID",
            });
        }

        if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid 6-digit OTP",
            });
        }

        const provider = await getApprovedProvider(req.user.id);

        if (!provider) {
            return res.status(403).json({
                success: false,
                message: "Approved provider account not found",
            });
        }

        const accessRequest = await PassportAccessRequest.findOne({
            _id: requestId,
            provider: provider._id,
            status: "pending",
        }).select("+otpHash");

        if (!accessRequest) {
            return res.status(404).json({
                success: false,
                message: "Access request not found or already used",
            });
        }

        // Check OTP expiry
        if (accessRequest.expiresAt.getTime() <= Date.now()) {
            accessRequest.status = "expired";
            await accessRequest.save();

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP.",
            });
        }

        // Check maximum attempts
        if (accessRequest.attempts >= MAX_OTP_ATTEMPTS) {
            accessRequest.status = "expired";
            await accessRequest.save();

            return res.status(429).json({
                success: false,
                message: "Maximum OTP attempts reached. Request a new OTP.",
            });
        }

        const submittedHash = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        const storedHash = Buffer.from(accessRequest.otpHash, "hex");
        const submittedBuffer = Buffer.from(submittedHash, "hex");

        const otpMatches =
            storedHash.length === submittedBuffer.length &&
            crypto.timingSafeEqual(storedHash, submittedBuffer);

        if (!otpMatches) {
            accessRequest.attempts += 1;

            if (accessRequest.attempts >= MAX_OTP_ATTEMPTS) {
                accessRequest.status = "expired";
            }

            await accessRequest.save();

            return res.status(400).json({
                success: false,
                message:
                    accessRequest.status === "expired"
                        ? "Maximum OTP attempts reached. Request a new OTP."
                        : "Incorrect OTP",
                remainingAttempts:
                    MAX_OTP_ATTEMPTS - accessRequest.attempts,
            });
        }

        // Grant temporary access
        const now = new Date();
        const approvedUntil = new Date(
            now.getTime() + ACCESS_DURATION_MINUTES * 60 * 1000
        );

        accessRequest.status = "approved";
        accessRequest.approvedAt = now;
        accessRequest.approvedUntil = approvedUntil;

        // Consume the OTP after successful verification
        accessRequest.otpHash = "";

        await accessRequest.save();

        return res.status(200).json({
            success: true,
            message: "Passport access approved successfully",
            access: {
                requestId: accessRequest._id,
                homeId: accessRequest.home,
                expiresAt: approvedUntil,
                durationMinutes: ACCESS_DURATION_MINUTES,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ========================================
// PROVIDER: GET PRIVATE PASSPORT HISTORY
// GET /api/v1/passport/private-history/:requestId
// ========================================

export const getPrivatePassportHistory = async (
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

        const requestId = req.params.requestId;

        if (
            typeof requestId !== "string" ||
            !mongoose.Types.ObjectId.isValid(requestId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid access request ID",
            });
        }

        const provider = await getApprovedProvider(req.user.id);

        if (!provider) {
            return res.status(403).json({
                success: false,
                message: "Approved provider account not found",
            });
        }

        // Verify temporary access belongs to this provider
        const accessRequest = await PassportAccessRequest.findOne({
            _id: requestId,
            provider: provider._id,
            status: "approved",
            approvedUntil: { $gt: new Date() },
        });

        if (!accessRequest) {
            return res.status(403).json({
                success: false,
                message: "Access denied or your temporary access has expired",
            });
        }

        // Check whether the home passport is still active
        const home = await Home.findOne({
            _id: accessRequest.home,
            isActive: true,
        }).select("_id name");

        if (!home) {
            return res.status(403).json({
                success: false,
                message: "This home passport is inactive",
            });
        }

        // Retrieve completed service records only
        const bookings = await Booking.find({
            home: home._id,
            status: "completed",
        })
            .select(
                "serviceName description bookingType bookingDate bookingTime providerCompletedAt providerNote createdAt provider"
            )
            .populate({
                path: "provider",
                select: "name title category",
            })
            .sort({
                providerCompletedAt: -1,
                createdAt: -1,
            })
            .lean();

        const services = bookings.map((booking) => {
            const serviceProvider = booking.provider as unknown as {
                name?: string;
                title?: string;
                category?: string;
            } | null;

            return {
                serviceName: booking.serviceName,
                description: booking.description,
                bookingType: booking.bookingType,
                bookingDate: booking.bookingDate,
                bookingTime: booking.bookingTime,
                completedAt: booking.providerCompletedAt,
                providerNote: booking.providerNote,
                createdAt: booking.createdAt,
                provider: serviceProvider
                    ? {
                        name: serviceProvider.name ?? null,
                        businessName: serviceProvider.title ?? null,
                        category: serviceProvider.category ?? null,
                    }
                    : null,
            };
        });

        return res.status(200).json({
            success: true,
            message: "Private service history retrieved successfully",
            accessExpiresAt: accessRequest.approvedUntil,
            passport: {
                homeName: home.name,
                totalServices: services.length,
                services,
            },
        });
    } catch (error) {
        next(error);
    }
};