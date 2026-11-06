
import { Router } from "express";

import {
  getDashboardStats,
  getBookingStats,
  getMonthlyTrends,
  getRecentBookings,
  getRecentCustomers,
  getAllCustomers,
} from "../controllers/dashboardControl.js";

import { protect, adminOnly } from "../middleware/authMiddle.js";

const router = Router();

// Admin-only access
router.use(protect, adminOnly);

// Dashboard APIs
router.get("/stats", getDashboardStats);
router.get("/booking-stats", getBookingStats);
router.get("/monthly-trends", getMonthlyTrends);
router.get("/recent-bookings", getRecentBookings);
router.get("/recent-customers", getRecentCustomers);
router.get("/customers", getAllCustomers);
export default router;
