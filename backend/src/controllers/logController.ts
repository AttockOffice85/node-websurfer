import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { CONFIG } from "../config/constants";

export class LogController {
  /* ------------------------------------------------------------------------------------------ */
  /*                                        Get Bot Logs                                        */
  /* ------------------------------------------------------------------------------------------ */

  static async getLogs(req: Request, res: Response) {
    const username = req.params.username;
    const logPath = path.join(CONFIG.DATA_PATHS.LOGS_DIR, `${username}.log`);

    try {
      const data = await fs.promises.readFile(logPath, "utf8");
      res.setHeader("Content-Type", "text/plain");
      res.send(data);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return res.status(404).send("Log file not found");
      }
      console.error(err);
      return res.status(500).send("Error reading log file");
    }
  }
}
