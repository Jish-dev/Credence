
import { Router } from "express";

import {
  getProviders,
  getProviderById,
  getAdminProviders,
  createProvider,
  updateProvider,
  updateProviderStatus,
  updateVerification,
  deleteProvider,
} from "../controllers/providerControl.js"

import {
  protect,
  adminOnly,
  providerOnly,
} from "../middleware/authMiddle.js";

import { getProviderDashboard } from "../controllers/providerDashboardController.js";

const router = Router();

// ========================================
// PUBLIC ROUTES
// ========================================

// PUBLIC ROUTES
router.get("/", getProviders);

// PROVIDER ROUTES
router.get(
  "/dashboard",
  protect,
  providerOnly,
  getProviderDashboard
);

// Public provider details — keep this after /dashboard
router.get("/:id", getProviderById);

// ========================================
// ADMIN ROUTES
// ========================================

// Protect all routes below this line
router.use(protect, adminOnly);

// Get all providers, including drafts
router.get("/admin/all", getAdminProviders);

// Create provider
router.post("/", createProvider);

// Update provider
router.put("/:id", updateProvider);

// Publish or save as draft
router.patch("/:id/status", updateProviderStatus);

// Update verification
router.patch("/:id/verification", updateVerification);

// Delete provider
router.delete("/:id", deleteProvider);

export default router;
