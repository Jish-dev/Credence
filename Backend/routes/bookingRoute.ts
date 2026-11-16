
import { Router } from "express";

import {
  createBooking,
  getMyBookings,
  getMyBookingById,
  cancelMyBooking,
  confirmServiceCompletion,
  getProviderBookings,
  getProviderBookingById,
  updateProviderBookingStatus,
  startProviderTracking,
  updateProviderLocation,
  markProviderArrived,
  stopProviderTracking,
  getMyBookingTracking,
} from "../controllers/bookingControl.js";

import {
  protect,
  customerOnly,
  providerOnly,
} from "../middleware/authMiddle.js";

const router = Router();

// ========================================
// AUTHENTICATION
// ========================================

// All booking routes require authentication
router.use(protect);

// ========================================
// CUSTOMER BOOKING ROUTES
// ========================================

// Create booking
router.post(
  "/",
  customerOnly,
  createBooking
);

// Get customer bookings
router.get(
  "/my",
  customerOnly,
  getMyBookings
);

// Get customer booking details
router.get(
  "/my/:id",
  customerOnly,
  getMyBookingById
);

// Cancel booking
router.patch(
  "/my/:id/cancel",
  customerOnly,
  cancelMyBooking
);

// Legacy customer completion endpoint
router.patch(
  "/my/:id/confirm-completion",
  customerOnly,
  confirmServiceCompletion
);

// ========================================
// CUSTOMER LIVE TRACKING
// ========================================

// Get provider's live tracking information
router.get(
  "/my/:id/tracking",
  customerOnly,
  getMyBookingTracking
);

// ========================================
// PROVIDER BOOKING ROUTES
// ========================================

// Get all provider bookings
router.get(
  "/provider/my",
  providerOnly,
  getProviderBookings
);

// Get provider booking details
router.get(
  "/provider/my/:id",
  providerOnly,
  getProviderBookingById
);

// Update booking status
// pending -> confirmed / rejected
// confirmed -> in-progress
// in-progress -> completed
router.patch(
  "/provider/:id/status",
  providerOnly,
  updateProviderBookingStatus
);

// ========================================
// PROVIDER LIVE GPS TRACKING
// ========================================

// Start tracking after booking acceptance
router.patch(
  "/provider/:id/tracking/start",
  providerOnly,
  startProviderTracking
);

// Update provider's GPS coordinates
router.patch(
  "/provider/:id/tracking/location",
  providerOnly,
  updateProviderLocation
);

// Existing arrival endpoint (retained for compatibility)
router.patch(
  "/provider/:id/tracking/arrived",
  providerOnly,
  markProviderArrived
);

// Stop live GPS tracking
router.patch(
  "/provider/:id/tracking/stop",
  providerOnly,
  stopProviderTracking
);

export default router;
