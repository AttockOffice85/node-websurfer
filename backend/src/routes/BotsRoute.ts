// backend/src/routes/BotsRoute.ts
import express from 'express';
import { addBot, getAllBots, getBotLogs, getBotStatus, startExistingBot, stopExistingBot, streamBotLogs } from '../controllers/BotController';

const router = express.Router();

// GET routes
router.get('/all-bots', getAllBots);
router.get('/logs/:username', getBotLogs);
router.get('/bot-status/:username', getBotStatus);
router.get('/stream-logs/:username', streamBotLogs);

// POST routes
router.post('/add-bot', addBot);
router.post('/start-bot', startExistingBot);
router.post('/stop-bot', stopExistingBot);

export default router;