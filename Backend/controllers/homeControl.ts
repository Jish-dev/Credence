
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Home from "../models/Home.js";

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

        return res.status(200).json({
            success: true,
            message: "Home passport deactivated successfully",
        });
    } catch (error) {
        next(error);
    }
};
