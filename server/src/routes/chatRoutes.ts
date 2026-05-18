import express from "express";
import { chat } from "../controllers/chatController";

const router = express.Router();

router.post("/", chat);

export default router;
