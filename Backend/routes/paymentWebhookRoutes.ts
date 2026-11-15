
import { Router } from "express";
import express from "express";

import {
  handleRazorpayWebhook,
} from "../controllers/paymentControl.js";

const router = Router();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook
);

export default router;
