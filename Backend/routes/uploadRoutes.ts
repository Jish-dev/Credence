import { Router } from "express";
import upload from "../middleware/upload.js";
import { uploadImage } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddle.js";

const router = Router();

router.post(
  "/",
  protect,
  upload.single("image"),
  uploadImage
);

export default router;