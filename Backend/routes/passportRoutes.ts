import { Router } from "express";
import { getPublicPassport } from "../controllers/passportController.js";
import { requestPassportAccess } from "../controllers/passportAccessController.js";
import { protect, providerOnly } from "../middleware/authMiddle.js";
import { verifyPassportAccess } from "../controllers/passportAccessController.js";
import {getPrivatePassportHistory,} from "../controllers/passportAccessController.js";

const router = Router();

router.get("/public/:token", getPublicPassport);
router.post(
  "/request-access/:token",
  protect,
  providerOnly,
  requestPassportAccess,
  verifyPassportAccess,
  getPrivatePassportHistory
);

export default router;
