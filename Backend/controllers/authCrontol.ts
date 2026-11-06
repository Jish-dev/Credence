
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import crypto from "crypto";
import { sendPasswordResetOTP } from "../config/email.js";
import Provider from "../models/Provider.js";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  phone: z.string().trim().max(20).optional().default(""),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(150),
});

const verifyResetOtpSchema = z.object({
  email: z.string().trim().email().max(150),
  otp: z.string().regex(/^\d{6}$/, "OTP must contain 6 digits"),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(32),
  newPassword: z.string().min(6).max(100),
});

const generateToken = (userId: string, role: string) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is missing in .env");
  }

  return jwt.sign(
    {
      id: userId,
      role,
    },
    secret,
    {
      expiresIn: "7d",
    }
  );
};

// ========================================
// CUSTOMER REGISTER
// POST /api/v1/auth/register
// ========================================

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration details",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, email, phone, password } = parsed.data;

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      role: "customer",
    });

    const token = generateToken(
      user._id.toString(),
      user.role
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// LOGIN
// POST /api/v1/auth/login
// ========================================

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email and password",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
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

    // Provider approval check
    if (user.role === "provider") {
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
    }

    const token = generateToken(
      user._id.toString(),
      user.role
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// GET CURRENT USER
// GET /api/v1/auth/me
// ========================================

export const getMe = async (
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

    const user = await User.findById(req.user.id).select(
      "-password"
    );

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};


// ========================================
// FORGOT PASSWORD - SEND OTP
// POST /api/v1/auth/forgot-password
// ========================================

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const email = parsed.data.email.toLowerCase();

    const user = await User.findOne({ email }).select(
      "+resetOtp +resetOtpExpires +resetOtpAttempts +resetOtpVerified +resetOtpLastSentAt"
    );

    const genericMessage =
      "If an account exists with this email, an OTP will be sent.";

    if (!user || !user.isActive || user.role !== "customer") {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    const now = Date.now();

    if (
      user.resetOtpLastSentAt &&
      now - user.resetOtpLastSentAt.getTime() < 60_000
    ) {
      return res.status(429).json({
        success: false,
        message: "Please wait 60 seconds before requesting another OTP.",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    user.resetOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    user.resetOtpExpires = new Date(now + 5 * 60 * 1000);
    user.resetOtpAttempts = 0;
    user.resetOtpVerified = false;
    user.resetOtpLastSentAt = new Date(now);

    await user.save();

    try {
      await sendPasswordResetOTP(user.email, otp);
    } catch (emailError) {
      delete user.resetOtp;
      delete user.resetOtpExpires
      user.resetOtpAttempts = 0;
      user.resetOtpVerified = false;
      delete user.resetOtpLastSentAt;
      await user.save();

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// VERIFY RESET OTP
// POST /api/v1/auth/verify-reset-otp
// ========================================

export const verifyResetOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = verifyResetOtpSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or OTP format",
      });
    }

    const { email, otp } = parsed.data;

    const user = await User.findOne({
      email: email.toLowerCase(),
      role: "customer",
      isActive: true,
    }).select(
      "+resetOtp +resetOtpExpires +resetOtpAttempts +resetOtpVerified"
    );

    if (
      !user ||
      !user.resetOtp ||
      !user.resetOtpExpires ||
      user.resetOtpExpires.getTime() < Date.now() ||
      user.resetOtpVerified
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP is invalid or expired. Request a new OTP.",
      });
    }

    if ((user.resetOtpAttempts ?? 0) >= 5) {
      delete user.resetOtp;
      delete user.resetOtpExpires;
      user.resetOtpAttempts = 0;
      user.resetOtpVerified = false;
      await user.save();

      return res.status(429).json({
        success: false,
        message: "Too many attempts. Please request a new OTP.",
      });
    }

    const submittedHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    if (submittedHash !== user.resetOtp) {
      user.resetOtpAttempts = (user.resetOtpAttempts ?? 0) + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP",
        attemptsRemaining: 5 - user.resetOtpAttempts,
      });
    }

    // Generate a separate one-time reset token.
    // The frontend receives this only after successful OTP verification.
    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetOtp = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOtpVerified = true;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// RESET PASSWORD
// POST /api/v1/auth/reset-password
// ========================================

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid password details",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { resetToken, newPassword } = parsed.data;

    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetOtp: tokenHash,
      resetOtpVerified: true,
      isActive: true,
      role: "customer",
      resetOtpExpires: { $gt: new Date() },
    }).select("+password +resetOtp +resetOtpExpires +resetOtpVerified");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset session is invalid or expired. Start again.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    delete user.resetOtp;
    delete user.resetOtpExpires;
    user.resetOtpAttempts = 0;
    user.resetOtpVerified = false;
    delete user.resetOtpLastSentAt;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login again.",
    });
  } catch (error) {
    next(error);
  }
};