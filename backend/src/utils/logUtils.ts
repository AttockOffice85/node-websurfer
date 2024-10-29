import fs from "fs";
import { CONFIG } from "../config/constants";
import { formatDate } from "./dateUtils";

interface LogStatus {
  status: string;
  postCount: number;
  inactiveSince?: string;
}

const lastFileSizes: { [key: string]: number } = {};
const botInactiveSince: { [logFilePath: string]: string | undefined } = {};

export const getErrorStatus = (line: string): string | null => {
  const matchedError = CONFIG.ERROR_INDICATORS.find((error) => line.includes(error));
  return matchedError || null;
};

export const updateInactiveSince = (logFilePath: string): string => {
  const now = formatDate(new Date());
  botInactiveSince[logFilePath] = now;
  return now;
};

export const getLatestStatus = (logFilePath: string): LogStatus => {
  try {
    const stats = fs.statSync(logFilePath);
    const currentSize = stats.size;
    const lastSize = lastFileSizes[logFilePath] || 0;
    const data = fs.readFileSync(logFilePath, "utf8");
    const lines = data.split("\n").filter(Boolean);
    const lastLine = [...lines].reverse().find((line) => /^\[\d{2}-[A-Za-z]{3}-\d{4}:\d{1,2}:\d{2}:\d{2}:(AM|PM)\]/.test(line));

    if (!lastLine) {
      return { status: "failed", postCount: lines.length };
    }

    let status: string;
    let inactiveSince: string | undefined = botInactiveSince[logFilePath];

    if (currentSize === lastSize) {
      const timeSinceLastModification = Date.now() - stats.mtimeMs;
      const errorStatus = getErrorStatus(lastLine);

      if (timeSinceLastModification > 60 * 100 && errorStatus) {
        status = errorStatus;
        if (!inactiveSince) {
          inactiveSince = updateInactiveSince(logFilePath);
        }
      } else {
        status = "Processing...";
      }
    } else if (currentSize > lastSize) {
      const errorStatus = getErrorStatus(lastLine);
      if (errorStatus) {
        status = errorStatus;
        if (!inactiveSince) {
          inactiveSince = updateInactiveSince(logFilePath);
        }
      } else {
        status = "Active";
        botInactiveSince[logFilePath] = undefined;
      }
      lastFileSizes[logFilePath] = currentSize;
    } else if (lastLine.includes("Starting")) {
      status = "Starting";
      botInactiveSince[logFilePath] = undefined;
    } else {
      const errorStatus = getErrorStatus(lastLine);
      status = errorStatus || "Processing...";
      if (!inactiveSince) {
        inactiveSince = updateInactiveSince(logFilePath);
      }
    }

    return { status, postCount: lines.length, inactiveSince };
  } catch (error) {
    console.error(`Error reading log file: ${logFilePath}`, error);
    return { status: "Processing...", postCount: 0 };
  }
};
