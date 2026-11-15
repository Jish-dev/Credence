import { Router } from "express";
import { getPublicPassport } from "../controllers/passportController.js";

const router = Router();

router.get("/public/:token", getPublicPassport);

export default router;
