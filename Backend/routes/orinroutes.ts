
import { Router } from "express";
import { chatWithOrin } from "../controllers/orincontroller.js";

const router = Router();

router.post("/chat", chatWithOrin);

export default router;
