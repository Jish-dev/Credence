
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import User from "../models/User.js";
import Provider from "../models/Provider.js";

// ========================================
// VALIDATION
// ========================================

const providerRegisterSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(150),
    phone: z.string().trim().min(7).max(20),
    password: z.string().min(6).max(100),

    category: z.string().trim().min(2).max(80),
    title: z.string().trim().max(150).optional().default(""),

    providerType: z.enum(["individual", "business", "company"])
        .optional()
        .default("individual"),

    location: z.string().trim().min(2).max(200),
    city: z.string().trim().max(100).optional().default(""),
    area: z.string().trim().max(100).optional().default(""),
    address: z.string().trim().max(300).optional().default(""),

    experienceYears: z.coerce.number().min(0).max(100)
        .optional()
        .default(0),

    bio: z.string().trim().max(2000).optional().default(""),
    description: z.string().trim().max(2000).optional().default(""),

    startingPrice: z.coerce.number().min(0)
        .optional()
        .default(0),

    profileImage: z.string().trim().optional().default(""),
});

const providerLoginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});

const providerProfileUpdateSchema = z.object({
            name: z.string().trim().min(2).max(100).optional(),
            title: z.string().trim().max(150).optional(),

            category: z.string().trim().min(2).max(80).optional(),
            categories: z.array(z.string()).optional(),

            providerType: z.enum([
                "individual",
                "business",
                "company",
            ]).optional(),

            location: z.string().trim().min(2).max(200).optional(),
            city: z.string().trim().max(100).optional(),
            area: z.string().trim().max(100).optional(),
            address: z.string().trim().max(300).optional(),

            experienceYears: z.coerce.number().min(0).max(100).optional(),

            bio: z.string().trim().max(2000).optional(),
            description: z.string().trim().max(2000).optional(),

            contactPhone: z.string().trim().min(7).max(20).optional(),

            startingPrice: z.coerce.number().min(0).optional(),
            profileImage: z.string().trim().optional(),
        }).refine(
            (data) => Object.keys(data).length > 0,
            { message: "At least one field must be provided" }
        );

// ========================================
// JWT TOKEN
// ========================================

const generateProviderToken = (userId: string) => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is missing in .env");
    }

    return jwt.sign(
        {
            id: userId,
            role: "provider",
        },
        secret,
        {
            expiresIn: "7d",
        }
    );
};

// ========================================
// PROVIDER REGISTER
// POST /api/v1/provider-auth/register
// ========================================


export const providerRegister = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let createdUserId: string | undefined;

    try {
        const parsed = providerRegisterSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider registration details",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const data = parsed.data;
        const normalizedEmail = data.email.toLowerCase();

        // 1. Check existing user account
        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered",
                field: "email",
            });
        }

        // 2. Check existing provider profile
        const existingProvider = await Provider.findOne({
            email: normalizedEmail,
        });

        if (existingProvider) {
            return res.status(409).json({
                success: false,
                message: "A provider profile already exists with this email",
                field: "provider.email",
            });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // 4. Create user account
        const user = await User.create({
            name: data.name,
            email: normalizedEmail,
            phone: data.phone,
            password: hashedPassword,
            role: "provider",
            providerApprovalStatus: "pending",
            isActive: true,
        });

        createdUserId = user._id.toString();

        // 5. Create provider profile
        const provider = await Provider.create({
            user: user._id,

            name: data.name,
            title: data.title,

            category: data.category,
            categories: [data.category],
            providerType: data.providerType,

            location: data.location,
            city: data.city,
            area: data.area,
            address: data.address,

            experienceYears: data.experienceYears,

            bio: data.bio,
            description: data.description,

            contact: data.phone,
            contactPhone: data.phone,
            email: normalizedEmail,

            startingPrice: data.startingPrice,
            profileImage: data.profileImage,

            status: "draft",
            verificationStatus: "pending",

            averageRating: 0,
            reviewCount: 0,
            isAvailable: true,
        });

        return res.status(201).json({
            success: true,
            message: "Provider registration submitted successfully. Please wait for admin approval.",
            approvalStatus: "pending",
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                category: provider.category,
                verificationStatus: provider.verificationStatus,
            },
        });

    } catch (error: unknown) {

        // 6. Rollback user if provider profile creation fails
        if (createdUserId) {
            try {
                await User.findByIdAndDelete(createdUserId);
            } catch (rollbackError) {
                console.error("Provider rollback failed:", rollbackError);
            }
        }

        // 7. Identify MongoDB duplicate key errors
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === 11000
        ) {
            const mongoError = error as {
                keyPattern?: Record<string, number>;
                keyValue?: Record<string, unknown>;
            };

            console.error("Provider duplicate key error:", {
                keyPattern: mongoError.keyPattern,
                keyValue: mongoError.keyValue,
            });

            const duplicateField = Object.keys(
                mongoError.keyPattern || {}
            )[0] || "unknown";

            return res.status(409).json({
                success: false,
                message: `Duplicate value detected for ${duplicateField}`,
                field: duplicateField,
            });
        }

        console.error("Provider registration error:", error);
        next(error);
    }
};


// ========================================
// PROVIDER LOGIN
// POST /api/v1/provider-auth/login
// ========================================

export const providerLogin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const parsed = providerLoginSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email and password",
            });
        }


        const { email, password } = parsed.data;

        const user = await User.findOne({
            email: email.toLowerCase(),
            role: "provider",
        }).select("+password");

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (user.providerApprovalStatus === "pending") {
            return res.status(403).json({
                success: false,
                message: "Your provider account is awaiting admin approval",
                approvalStatus: "pending",
            });
        }

        if (user.providerApprovalStatus === "rejected") {
            return res.status(403).json({
                success: false,
                message: "Your provider registration has been rejected",
                approvalStatus: "rejected",
            });
        }

        if (user.providerApprovalStatus !== "approved") {
            return res.status(403).json({
                success: false,
                message: "Provider account is not approved",
            });
        }

        const token = generateProviderToken(user._id.toString());

        return res.status(200).json({
            success: true,
            message: "Provider login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                approvalStatus: user.providerApprovalStatus,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ========================================
// GET PROVIDER PROFILE
// GET /api/v1/provider-auth/profile
// ========================================

export const getProviderProfile = async (
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
        }).lean();

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider profile not found",
            });
        }

        return res.status(200).json({
            success: true,
            provider,
        });
    } catch (error) {
        next(error);
    }

    
};

// ========================================
// UPDATE PROVIDER PROFILE
// PUT /api/v1/provider-auth/profile
// ========================================

export const updateProviderProfile = async (
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

    const parsed = providerProfileUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile information",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    const provider = await Provider.findOne({
      user: req.user.id,
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });
    }

    // Update provider fields
    if (data.name !== undefined) provider.name = data.name;
    if (data.title !== undefined) provider.title = data.title;

    if (data.category !== undefined) {
      provider.category = data.category;
    }

    if (data.categories !== undefined) {
      provider.categories = data.categories;
    }

    if (data.providerType !== undefined) {
      provider.providerType = data.providerType;
    }

    if (data.location !== undefined) provider.location = data.location;
    if (data.city !== undefined) provider.city = data.city;
    if (data.area !== undefined) provider.area = data.area;
    if (data.address !== undefined) provider.address = data.address;

    if (data.experienceYears !== undefined) {
      provider.experienceYears = data.experienceYears;
    }

    if (data.bio !== undefined) provider.bio = data.bio;
    if (data.description !== undefined) {
      provider.description = data.description;
    }

    if (data.contactPhone !== undefined) {
      provider.contactPhone = data.contactPhone;
      provider.contact = data.contactPhone;
    }

    if (data.startingPrice !== undefined) {
      provider.startingPrice = data.startingPrice;
    }

    if (data.profileImage !== undefined) {
      provider.profileImage = data.profileImage;
    }

    await provider.save();

    // Synchronize linked User account
    const userUpdates: {
      name?: string;
      phone?: string;
      profileImage?: string;
    } = {};

    if (data.name !== undefined) {
      userUpdates.name = data.name;
    }

    if (data.contactPhone !== undefined) {
      userUpdates.phone = data.contactPhone;
    }

    if (data.profileImage !== undefined) {
      userUpdates.profileImage = data.profileImage;
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(
        req.user.id,
        { $set: userUpdates },
        { runValidators: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Provider profile updated successfully",
      provider,
    });

  } catch (error) {
    next(error);
  }
};
