import winston from "winston";
import path from "path";
import { CONFIG } from "../config/constants";

export default class Logger {
  private logger: winston.Logger;

  constructor(botUsername: string) {
    const logFile = path.join(CONFIG.LOG_DIR, `${botUsername}.log`);

    this.logger = winston.createLogger({
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [new winston.transports.File({ filename: logFile }), new winston.transports.Console()],
    });
  }

  log(message: string) {
    this.logger.info(message);
  }

  error(message: string) {
    this.logger.error(message);
  }
}
