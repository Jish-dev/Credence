
import { Router } from "express";

import {
  providerRegister,
  providerLogin,
  getProviderProfile,
  updateProviderProfile,
} from "../controllers/providerAuthController.js";

import {
  protect,
  providerOnly,
} from "../middleware/authMiddle.js";

const router = Router();

// Public routes
router.post("/register", providerRegister);
router.post("/login", providerLogin);

// Approved provider routes
router.get("/profile", protect, providerOnly, getProviderProfile);
// Approved provider routes
router.get(
  "/profile",
  protect,
  providerOnly,
  getProviderProfile
);

router.put(
  "/profile",
  protect,
  providerOnly,
  updateProviderProfile
);
export default router;
