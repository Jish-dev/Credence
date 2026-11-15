import { Router } from "express";

import {
  register,
  login,
  googleLogin,
  getMe,
  updateProfile,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/authCrontol.js";

import { protect } from "../middleware/authMiddle.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);
router.post("/google", googleLogin);

router.get("/me", protect, getMe);
router.patch("/profile", protect, updateProfile);

export default router;