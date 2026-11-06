
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Provider from "../models/Provider.js";
import User from "../models/User.js";

// ========================================
// VALIDATION
// ========================================

const providerValidation = z.object({
  name: z.string().trim().min(2).max(100),
  title: z.string().trim().max(150).optional().default(""),
  category: z.string().trim().min(1).max(80),
  categories: z.array(z.string().trim()).optional().default([]),

  providerType: z
    .enum(["individual", "company"])
    .optional()
    .default("individual"),

  location: z.string().trim().min(1).max(150),
  city: z.string().trim().optional().default(""),
  area: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),

  experienceYears: z.coerce.number().min(0).max(100).default(0),

  bio: z.string().trim().max(2000).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),

  contact: z.string().trim().max(25).optional(),
  contactPhone: z.string().trim().max(25).optional(),

  email: z
    .union([z.string().trim().email(), z.literal("")])
    .optional()
    .default(""),

  startingPrice: z.coerce.number().min(0).default(0),
  profileImage: z.string().trim().optional().default(""),

  status: z.enum(["draft", "published"]).default("draft"),

  verificationStatus: z
    .enum(["pending", "verified", "rejected"])
    .default("pending"),

  isAvailable: z.boolean().optional().default(true),
});


const updateProviderValidation = providerValidation.partial();

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
// PUBLIC: GET ALL PUBLISHED PROVIDERS
// GET /api/v1/providers
// ========================================

export const getProviders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      status: "published",
    };

    if (req.query.category) {
      filter.$or = [
        {
          category: {
            $regex: String(req.query.category),
            $options: "i",
          },
        },
        {
          categories: {
            $regex: String(req.query.category),
            $options: "i",
          },
        },
      ];
    }

    if (req.query.location) {
      filter.location = {
        $regex: String(req.query.location),
        $options: "i",
      };
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();

      filter.$and = [
        ...(filter.$or ? [{ $or: filter.$or }] : []),
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { title: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
          ],
        },
      ];

      delete filter.$or;
    }

    const [providers, total] = await Promise.all([
      Provider.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Provider.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      providers,
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
// PUBLIC: GET PROVIDER DETAILS
// GET /api/v1/providers/:id
// ========================================

export const getProviderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }
  

    const provider = await Provider.findOne({
      _id: id,
      status: "published",
    }).lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
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
// ADMIN: GET ALL PROVIDERS
// GET /api/v1/providers/admin/all
// ========================================

export const getAdminProviders = async (
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

    if (req.query.verificationStatus) {
      filter.verificationStatus = String(req.query.verificationStatus);
    }

    if (req.query.category) {
      filter.category = {
        $regex: String(req.query.category),
        $options: "i",
      };
    }

    if (req.query.search) {
      const search = String(req.query.search).trim();

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    const [providers, total] = await Promise.all([
      Provider.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Provider.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      providers,
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
// ADMIN: CREATE PROVIDER
// POST /api/v1/providers
// ========================================

export const createProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = providerValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Provider validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    const contact = (
      data.contact || data.contactPhone || ""
    ).trim();

    if (!contact) {
      return res.status(400).json({
        success: false,
        message: "Provider contact number is required",
        errors: {
          contact: ["Please enter a contact number"],
        },
      });
    }

    const provider = await Provider.create({
      ...data,
      contact,
      contactPhone: contact,
    });

    return res.status(201).json({
      success: true,
      message: "Provider created successfully",
      provider,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// ADMIN: UPDATE PROVIDER
// PUT /api/v1/providers/:id
// ========================================

export const updateProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const parsed = updateProviderValidation.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider data",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = { ...parsed.data };

    // Keep contact and contactPhone synchronized
    if (
      data.contact !== undefined ||
      data.contactPhone !== undefined
    ) {
      const contact = (
        data.contact || data.contactPhone || ""
      ).trim();

      if (!contact) {
        return res.status(400).json({
          success: false,
          message: "Contact number cannot be empty",
        });
      }

      data.contact = contact;
      data.contactPhone = contact;
    }

    const provider = await Provider.findByIdAndUpdate(
      id,
      { $set: data },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Provider updated successfully",
      provider,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// ADMIN: UPDATE PUBLISH STATUS
// PATCH /api/v1/providers/:id/status
// ========================================

export const updateProviderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const parsed = z
      .object({
        status: z.enum(["draft", "published"]),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Status must be draft or published",
      });
    }

    const provider = await Provider.findByIdAndUpdate(
      id,
      { $set: { status: parsed.data.status } },
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Provider status updated",
      provider,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// ADMIN: UPDATE VERIFICATION
// PATCH /api/v1/providers/:id/verification
// ========================================


export const updateVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const parsed = z
      .object({
        verificationStatus: z.enum([
          "pending",
          "verified",
          "rejected",
        ]),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification status",
      });
    }

    const { verificationStatus } = parsed.data;

    // Find provider
    const provider = await Provider.findById(id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    // Update linked user account, if one exists
    if (provider.user) {
      const approvalStatus =
        verificationStatus === "verified"
          ? "approved"
          : verificationStatus === "rejected"
            ? "rejected"
            : "pending";

      const user = await User.findByIdAndUpdate(
        provider.user,
        {
          $set: {
            providerApprovalStatus: approvalStatus,
          },
        },
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Linked provider user account not found",
        });
      }
    }

    // Update provider verification
    provider.verificationStatus = verificationStatus;
    await provider.save();

    return res.status(200).json({
      success: true,
      message: "Provider verification updated successfully",
      provider,
      approvalStatus: provider.user
        ? verificationStatus === "verified"
          ? "approved"
          : verificationStatus === "rejected"
            ? "rejected"
            : "pending"
        : null,
    });

  } catch (error) {
    next(error);
  }
};


// ========================================
// ADMIN: DELETE PROVIDER
// DELETE /api/v1/providers/:id
// ========================================

export const deleteProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = getRouteParam(req.params.id);

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const provider = await Provider.findByIdAndDelete(id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Provider deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
