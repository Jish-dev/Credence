
import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import User from "../models/User.js";

type UserRole = "customer" | "provider" | "admin";

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
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Please login to continue",
      });
      return;
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication token missing",
      });
      return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      next(new Error("JWT_SECRET is missing"));
      return;
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.id !== "string" ||
      !["customer", "provider", "admin"].includes(
        String(decoded.role)
      )
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
      return;
    }

    req.user = {
      id: decoded.id,
      role: decoded.role as UserRole,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
      return;
    }

    next(error);
  }
};

// ========================================
// CUSTOMER ONLY
// ========================================

export const customerOnly = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Please login first",
    });
    return;
  }

  if (req.user.role !== "customer") {
    res.status(403).json({
      success: false,
      message: "Customer access only",
    });
    return;
  }

  next();
};

// ========================================
// ADMIN ONLY
// ========================================

export const adminOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (req.user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return;
    }

    const admin = await User.findOne({
      _id: req.user.id,
      role: "admin",
      isActive: true,
    });

    if (!admin) {
      res.status(403).json({
        success: false,
        message: "Admin account is inactive or unavailable",
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ========================================
// APPROVED PROVIDER ONLY
// ========================================

export const providerOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Please login first",
      });
      return;
    }

    if (req.user.role !== "provider") {
      res.status(403).json({
        success: false,
        message: "Provider access only",
      });
      return;
    }

    const user = await User.findOne({
      _id: req.user.id,
      role: "provider",
      isActive: true,
      providerApprovalStatus: "approved",
    });

    if (!user) {
      res.status(403).json({
        success: false,
        message:
          "Your provider account is unavailable or awaiting approval",
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ========================================
// CUSTOMER OR APPROVED PROVIDER
// ========================================

export const customerOrApprovedProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Please login first",
      });
      return;
    }

    if (req.user.role === "customer") {
      customerOnly(req, res, next);
      return;
    }

    if (req.user.role === "provider") {
      await providerOnly(req, res, next);
      return;
    }

    res.status(403).json({
      success: false,
      message: "Access denied",
    });
  } catch (error) {
    next(error);
  }
};

export {};
