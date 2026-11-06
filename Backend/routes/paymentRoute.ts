
import { Router } from "express";

import { createPaymentOrder, verifyPayment } from "../controllers/paymentControl.js";

import {
  protect,
  customerOnly,
} from "../middleware/authMiddle.js";

const router = Router();

router.use(protect, customerOnly);

router.post("/create-order", createPaymentOrder);
router.post("/verify-payment", verifyPayment);

export default router;
