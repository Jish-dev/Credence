
import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import User from "../models/User.js";

type UserRole = "customer" | "admin" | "provider";

interface TokenPayload extends JwtPayload {
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

// ========================================
// VERIFY LOGIN TOKEN
// ========================================

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please login to continue",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is missing");
    }

    const decoded = jwt.verify(token, secret) as TokenPayload;

    if (
      typeof decoded.id !== "string" ||
      !["customer", "admin", "provider"].includes(decoded.role)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// ========================================
// CUSTOMER ONLY
// ========================================

export const customerOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  if (req.user.role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "Customer access only",
    });
  }

  next();
};

// ========================================
// ADMIN ONLY
// ========================================

export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};

// ========================================
// APPROVED PROVIDER ONLY
// ========================================

export const providerOnly = async (
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

    if (req.user.role !== "provider") {
      return res.status(403).json({
        success: false,
        message: "Provider access only",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is unavailable",
      });
    }

    if (user.providerApprovalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your provider account is awaiting admin approval",
        approvalStatus: user.providerApprovalStatus,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
