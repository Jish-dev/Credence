import { Router } from "express"
import upload from "../middleware/upload.js"
import { uploadImage } from "../controllers/uploadController.js"
import { protect, adminOnly, providerOnly } from "../middleware/authMiddle.js"


const router=Router()

router.post(
    "/",
    protect,
    adminOnly,
    providerOnly,
    upload.single("image"),
    uploadImage
)

export default router