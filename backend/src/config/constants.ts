import path from "path";

export const CONFIG = {
  PORT: process.env.SERVER_PORT || 8080,
  LOG_DIR: "./logs",
  DATA_DIR: "./data",
  BROWSERS_DIR: "./browsers",
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  DATA_PATHS: {
    USERS: path.join(process.cwd(), "src","data", "users-data.json"),
    COMPANIES: path.join(process.cwd(), "src","data", "companies-data.json"),
    LOGS_DIR: path.join(__dirname, "..", "botLogs"),
  },
  ERROR_INDICATORS: ["Error", "timeout of", "ERROR", "crashed after", "Session ended", "Breaking forever", "Stopped", "Manually stopped", "Captcha/Code", "IP Config", "paused"],
};
