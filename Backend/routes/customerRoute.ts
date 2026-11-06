
import { Router } from "express";

import {
  getCustomers,
  getCustomerById,
  updateCustomer,
  updateCustomerStatus,
  deleteCustomer,
} from "../controllers/customerControl.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddle.js";

const router = Router();

// All customer management routes require admin authentication
router.use(protect, adminOnly);

router.get("/", getCustomers);

router.get("/:id", getCustomerById);

router.put("/:id", updateCustomer);

router.patch("/:id/status", updateCustomerStatus);

router.delete("/:id", deleteCustomer);

export default router;
