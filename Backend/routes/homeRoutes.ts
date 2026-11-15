
import { Router } from "express";

import {
  createHome,
  getMyHomes,
  getHomePassportQR,
  deactivateHomePassport,
} from "../controllers/homeControl.js";

import {
  protect,
  customerOnly,
} from "../middleware/authMiddle.js";

const router = Router();

// All home passport routes require customer authentication
router.use(protect, customerOnly);

// Create a new home
router.post("/", createHome);

// Get logged-in customer's homes
router.get("/my-homes", getMyHomes);

// Get QR passport URL
router.get("/:homeId/qr", getHomePassportQR);

// Deactivate home passport
router.patch("/:homeId/deactivate", deactivateHomePassport);

export default router;
