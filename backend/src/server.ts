import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { BotController } from "./controllers/botController";
import { LogController } from "./controllers/logController";
import { CompanyController } from "./controllers/companyController";
import { CONFIG } from "./config/constants";

dotenv.config();

const app = express();
const port = CONFIG.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Bot Management Routes
app.get("/all-bots", BotController.getAllBots);
app.get("/bot-status/:username", BotController.getBotStatus);
app.post("/add-bot", BotController.addBot);
app.post("/start-bot", BotController.startBot);
app.post("/stop-bot", BotController.stopBot);
app.get("/stream-logs/:username", BotController.streamLogs);

// Log Routes
app.get("/logs/:username", LogController.getLogs);

// Company Routes
app.post("/add-company", CompanyController.addCompany);

// Start server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

export default app;
