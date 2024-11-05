import dotenv from "dotenv";
import { getUsersData, runBot } from "./src/controllers/BotController";

dotenv.config();

const noOfBots: number = parseInt(process.env.NO_OF_BOTS || "1");

/* ---------------------------------------------------------------------------------------------- */
/*                            Used When Starting The Bots From Terminal                           */
/* ---------------------------------------------------------------------------------------------- */

function StartTheBotProcesses() {
  const users = getUsersData();
  const botsToRun = Math.min(noOfBots, users.length);
  users.slice(0, botsToRun).forEach(runBot);
}

/* ---------------------------------------------------------------------------------------------- */
/*                                          Let's Rock It                                         */
/* ---------------------------------------------------------------------------------------------- */

StartTheBotProcesses();
