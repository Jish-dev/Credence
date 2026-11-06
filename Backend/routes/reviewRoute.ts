
import { Router } from "express";

import {
  createReview,
  getMyReviews,
  updateReview,
  deleteReview,
  getProviderReviews,
  getAllReviews,
  moderateReview,
} from "../controllers/reviewControl.js";

import {
  protect,
  customerOnly,
  adminOnly,
} from "../middleware/authMiddle.js";

const router = Router();

// PUBLIC
router.get("/provider/:providerId", getProviderReviews);

// All routes below require authentication
router.use(protect);

// CUSTOMER
router.post("/", customerOnly, createReview);
router.get("/my", customerOnly, getMyReviews);
router.put("/:id", customerOnly, updateReview);
router.delete("/:id", customerOnly, deleteReview);

// ADMIN
router.get("/admin/all", adminOnly, getAllReviews);
router.patch("/admin/:id/status", adminOnly, moderateReview);

export default router;
