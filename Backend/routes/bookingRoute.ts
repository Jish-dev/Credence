
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
} from "../controllers/bookingControl.js";

import {
  protect,
  customerOnly,
  providerOnly,
} from "../middleware/authMiddle.js";

const router = Router();

// All booking routes require login
router.use(protect);

// ========================================
// CUSTOMER ROUTES
// ========================================

// Create booking
router.post("/", customerOnly, createBooking);

// Get all customer bookings
router.get("/my", customerOnly, getMyBookings);

// Get customer booking details
router.get("/my/:id", customerOnly, getMyBookingById);

// Cancel booking
router.patch("/my/:id/cancel", customerOnly, cancelMyBooking);

// Confirm service completion
router.patch(
  "/my/:id/confirm-completion",
  customerOnly,
  confirmServiceCompletion
);

// ========================================
// PROVIDER ROUTES
// ========================================

// Get provider bookings
router.get("/provider/my", providerOnly, getProviderBookings);

// Get provider booking details
router.get("/provider/my/:id", providerOnly, getProviderBookingById);

// Accept, reject, start or complete service
router.patch(
  "/provider/:id/status",
  providerOnly,
  updateProviderBookingStatus
);

export default router;
