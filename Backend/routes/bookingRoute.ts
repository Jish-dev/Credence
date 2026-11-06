
import { Router } from "express";

import {
  createBooking,
  getMyBookings,
  getMyBookingById,
  cancelMyBooking,
  getAllBookings,
  getAdminBookingById,
  updateBookingStatus,
  getProviderBookings,
  getProviderBookingById,
  updateProviderBookingStatus,
} from "../controllers/bookingControl.js";

import {
  protect,
  customerOnly,
  adminOnly,
  providerOnly,
} from "../middleware/authMiddle.js";

const router = Router();

// All booking routes require login
router.use(protect);

// CUSTOMER ROUTES
router.post("/", customerOnly, createBooking);

router.get("/my", customerOnly, getMyBookings);

router.get("/my/:id", customerOnly, getMyBookingById);

router.patch("/my/:id/cancel", customerOnly, cancelMyBooking);

// ADMIN ROUTES
router.get("/admin/all", adminOnly, getAllBookings);

router.get("/admin/:id", adminOnly, getAdminBookingById);

router.patch("/admin/:id/status", adminOnly, updateBookingStatus);

// PROVIDER ROUTES
router.get("/provider/my",providerOnly,getProviderBookings);

router.get("/provider/my/:id",providerOnly,getProviderBookingById);

router.patch("/provider/:id/status",providerOnly,updateProviderBookingStatus);

export default router;
