import fs from "fs";
import path from "path";
import { CONFIG } from "../config/constants";
import { getTimestamp } from "../utils";

const botLogsDir = CONFIG.DATA_PATHS.LOGS_DIR;

/* ---------------------------------------------------------------------------------------------- */
/*                                    Initiate The Logger Class                                   */
/* ---------------------------------------------------------------------------------------------- */

class Logger {
  private botName: string;
  private logDir: string = botLogsDir;
  private logFile: string;

  constructor(botUsername: string) {
    this.botName = botUsername;
    this.logFile = path.join(this.logDir, `${botUsername}.log`);

    // Create the botLogs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(message: string): void {
    const logEntry = `[${getTimestamp()}] ${message}\n`;
    fs.appendFileSync(this.logFile, logEntry);
    console.log(this.botName, " :: ", logEntry.trim()); // Also log to console
  }

  error(message: string): void {
    const errorEntry = `[${getTimestamp()}] ERROR: ${message}\n`;
    fs.appendFileSync(this.logFile, errorEntry);
    console.error(this.botName, " :: ", errorEntry.trim()); // Also log to console
  }
}

export default Logger;
