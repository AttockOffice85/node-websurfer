import { Router } from "express";
import { BotController } from "../controllers/botController";

const router = Router();

router.get("/all-bots", BotController.getAllBots);
router.get("/bot-status/:username", BotController.getBotStatus);
router.post("/start-bot", BotController.startBot);
router.post("/stop-bot", BotController.stopBot);
router.get("/stream-logs/:username", BotController.streamLogs);

export default router;
