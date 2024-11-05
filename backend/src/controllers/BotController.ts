import { Request, Response } from "express";
import fs from "fs";
import * as promiseFs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { botProcesses, dynamicWait, formatDate } from "../utils/index";
import { CONFIG } from "../config/constants";
import Logger from "../services/logger";

// Store the last known file sizes
const lastFileSizes: { [key: string]: number } = {};
const botInactiveSince: { [logFilePath: string]: string | undefined } = {};
// Path to the data JSON files
const usersDataPath = CONFIG.DATA_PATHS.USERS;
const botLogsDir = CONFIG.DATA_PATHS.LOGS_DIR;
const botStatus: { [key: string]: boolean } = {};
let retryNewUser = 0;

/* ---------------------------------------------------------------------------------------------- */
/*                                          Get All Bots                                          */
/* ---------------------------------------------------------------------------------------------- */

export const getAllBots = (req: Request, res: Response) => {
  fs.readFile(usersDataPath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error reading users data file");
    }

    try {
      const users = JSON.parse(data).users;
      const botsStatus = users.map((user: { username: string; ip_address: string; ip_port: string }) => {
        const email = user.username;
        const botName = email.split("@")[0];
        const logFilePath = path.join(botLogsDir, `${botName}.log`);
        const ip_address = user.ip_address;
        const ip_port = user.ip_port;

        let status: string = "! log file";
        let postCount: any = 0;
        let platform: string | undefined = "";
        let inactiveSince: string | undefined = "";

        if (fs.existsSync(logFilePath)) {
          ({ status, postCount, inactiveSince, platform } = getLatestStatus(logFilePath));
        } else {
          console.warn(`Log file not found for bot: ${botName}`);
        }

        return {
          name: botName,
          ip_address,
          ip_port,
          status,
          postCount,
          inactiveSince,
          platform,
          isRunning: !!botProcesses[botName],
        };
      });

      res.json(botsStatus);
    } catch (parseError) {
      console.error(parseError);
      res.status(500).send("Error parsing users data file");
    }
  });
};

/* ---------------------------------------------------------------------------------------------- */
/*                                          Get Bot Logs                                          */
/* ---------------------------------------------------------------------------------------------- */

export const getBotLogs = (req: Request, res: Response) => {
  const username = req.params.username;
  const logPath = path.join(botLogsDir, `${username}.log`);

  fs.readFile(logPath, "utf8", (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.status(404).send("Log file not found");
      } else {
        console.error(err);
        res.status(500).send("Error reading log file");
      }
      return;
    }
    res.setHeader("Content-Type", "text/plain");
    res.send(data);
  });
};

/* ---------------------------------------------------------------------------------------------- */
/*                                     Get Current Bot Status                                     */
/* ---------------------------------------------------------------------------------------------- */

export const getBotStatus = (req: Request, res: Response) => {
  const { username } = req.params;
  const logPath = path.join(botLogsDir, `${username}.log`);
  const { status, postCount, inactiveSince, platform } = getLatestStatus(logPath);

  res.json({
    name: username,
    status,
    postCount,
    inactiveSince,
    platform,
    isRunning: !!botProcesses[username],
  });
};

/* ---------------------------------------------------------------------------------------------- */
/*                                         Stream Bot Logs                                        */
/* ---------------------------------------------------------------------------------------------- */

export const streamBotLogs = (req: Request, res: Response) => {
  const { username } = req.params;
  const logPath = path.join(botLogsDir, `${username}.log`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendEvent = (data: string) => {
    res.write(`data: ${data}\n\n`);
  };

  const tailProcess = spawn("tail", ["-f", logPath]);

  tailProcess.stdout.on("data", (data) => {
    sendEvent(data.toString());
  });

  req.on("close", () => {
    tailProcess.kill();
  });
};

/* ---------------------------------------------------------------------------------------------- */
/*                                           Add New Bot                                          */
/* ---------------------------------------------------------------------------------------------- */

export const addBot = async (req: any, res: any) => {
  const { email, password, ip_address, ip_port, ip_username, ip_password, platforms } = req.body;

  if (!platforms || !platforms["linkedin"]) {
    return res.status(400).send({ error: "LinkedIn platform is required." });
  }

  const platformsArray = Object.keys(platforms).filter((platform) => platforms[platform] === true);

  try {
    const result = await handleBotStart(email, password, ip_address, ip_port, ip_username, ip_password, platformsArray, true);

    if (result.error) {
      return res.status(500).send({ error: result.error });
    }
    return res.send({ status: result.status });
  } catch (error) {
    console.error("Error starting bot:", error);
    return res.status(500).send({ error: "Failed to add bot" });
  }
};

/* ---------------------------------------------------------------------------------------------- */
/*                                         Start The  Bot                                         */
/* ---------------------------------------------------------------------------------------------- */

export const startExistingBot = async (req: any, res: any) => {
  const { username } = req.body;
  const result = await handleBotStart(username, undefined, undefined, undefined, undefined, undefined, undefined, false);
  if (result.error) {
    return res.status(500).send({ error: result.error });
  }
  res.send({ status: result.status });
};

/* ---------------------------------------------------------------------------------------------- */
/*                                          Stop The Bot                                          */
/* ---------------------------------------------------------------------------------------------- */

export const stopExistingBot = (req: any, res: any) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).send({ error: "Username is required" });
  }

  try {
    stopBot(username);
    res.send({ status: `Bot ${username} stopped` });
  } catch (error) {
    console.error(`Failed to stop bot for ${username}:`, error);
    res.status(500).send({ error: "Failed to stop bot" });
  }
};

/* ---------------------------------------------------------------------------------------------- */
/*                                         Delete The Bot                                         */
/* ---------------------------------------------------------------------------------------------- */

export const deleteExistingBot = async (req: any, res: any) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).send({ error: "Username is required" });
  }

  try {
    // Read the current data from the JSON file
    const usersData = JSON.parse(await promiseFs.readFile(usersDataPath, "utf8"));

    // Filter out the user to delete
    const updatedUsers = usersData.users.filter((user: any) => user.username.split("@")[0] !== username);

    // Check if any user was actually deleted
    if (updatedUsers.length === usersData.users.length) {
      return res.status(404).send({ error: "User not found" });
    }
    // Update the users array in the JSON structure
    usersData.users = updatedUsers;

    const logFilePath = path.join(botLogsDir, `${username}.log`);

    if (fs.existsSync(logFilePath)) {
      try {
        fs.unlinkSync(logFilePath); // Synchronously delete the log file
        console.log(`Deleted log file for user: ${username}`);
      } catch (error) {
        console.error(`Error deleting log file for user ${username}:`, error);
      }
    }

    // Write the updated data back to the JSON file
    await promiseFs.writeFile(usersDataPath, JSON.stringify(usersData, null, 2));

    // Send a success response
    res.status(200).send({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ error: "An error occurred while deleting the user" });
  }
};

/* ---------------------------------------------------------------------------------------------- */
/*                                        Handle Bot Start                                        */
/* ---------------------------------------------------------------------------------------------- */

const handleBotStart = async (email: string, password?: string, ip_address?: string, ip_port?: string, ip_username?: string, ip_password?: string, platforms: string[] = [], isNewUser = false): Promise<{ status: string; error?: string }> => {
  let username: string = email.includes("@") ? email.split("@")[0] : email;

  if (botProcesses[username]) {
    return { status: "Bot is already running" };
  }

  try {
    if (isNewUser) {
      const usersData = JSON.parse(await promiseFs.readFile(usersDataPath, "utf8"));

      const existingUser = usersData.users.find((user: any) => user.username === email);
      if (existingUser) {
        startBot(username);
        return { status: `User: ${username} already exists. Bot started.` };
      }

      const newUser = {
        username: email,
        password: password || "defaultPassword",
        platforms,
        ip_address: ip_address || "",
        ip_port: ip_port || "",
        ip_username: ip_username || "",
        ip_password: ip_password || "",
      };

      usersData.users.push(newUser);
      await promiseFs.writeFile(usersDataPath, JSON.stringify(usersData, null, 2));

      const confirmedUser = usersData.users.find((user: any) => user.username === email);
      if (confirmedUser) {
        console.log("User added successfully:", confirmedUser);
        startBot(username);
      } else {
        console.error("User not found after write operation.");
      }
    } else {
      startBot(username);
    }
    return { status: `Bot ${isNewUser ? "added and" : ""} started successfully` };
  } catch (error) {
    console.error(`Failed to start bot for ${username}:`, error);
    return { status: `Failed to ${isNewUser ? "add and" : ""} start bot`, error: String(error) };
  }
};

/* ---------------------------------------------------------------------------------------------- */
/*                                      Get Bot Error Status                                      */
/* ---------------------------------------------------------------------------------------------- */

function getErrorStatus(line: string): string | null {
  const errors = CONFIG.BOT_LOG_ERRORS;
  const matchedError = errors.find((error: string) => line.includes(error));
  return matchedError || null;
}

/* ---------------------------------------------------------------------------------------------- */
/*                                       Update Inactive Bot                                      */
/* ---------------------------------------------------------------------------------------------- */

function updateInactiveSince(logFilePath: string): string {
  const now = formatDate(new Date());
  botInactiveSince[logFilePath] = now;
  return now;
}

/* ---------------------------------------------------------------------------------------------- */
/*                                      Get Latest Bot Status                                     */
/* ---------------------------------------------------------------------------------------------- */

function getLatestStatus(logFilePath: string): { status: string; postCount: number; inactiveSince?: string; platform?: string } {
  try {
    const stats = fs.statSync(logFilePath);
    const currentSize = stats.size;
    const lastSize = lastFileSizes[logFilePath] || 0;
    const data = fs.readFileSync(logFilePath, "utf8");
    const lines = data.split("\n").filter(Boolean);
    const lastLine = [...lines].reverse().find((line) => /^\[\d{2}-[A-Za-z]{3}-\d{4}:\d{1,2}:\d{2}:\d{2}:(AM|PM)\]/.test(line));

    // Extracting the platform from the last line
    const lastPlatformLine = [...lines].reverse().find((line) => /SocialPlatform::\s*(\w+)/.test(line));
    const lastPlatform = lastPlatformLine ? lastPlatformLine.match(/SocialPlatform::\s*(\w+)/)?.[1] : undefined;

    let status: string;
    let inactiveSince: string | undefined = botInactiveSince[logFilePath];

    if (!lastLine) {
      return { status: "failed", postCount: lines.length, platform: lastPlatform };
    }

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

    return { status, postCount: lines.length, inactiveSince, platform: lastPlatform };
  } catch (error) {
    console.error(`Error reading log file: ${logFilePath}`, error);
    return { status: "Processing...", postCount: 0 };
  }
}

/* ---------------------------------------------------------------------------------------------- */
/*                                          Get All Users                                         */
/* ---------------------------------------------------------------------------------------------- */

export function getUsersData() {
  const usersData = JSON.parse(fs.readFileSync(CONFIG.DATA_PATHS.USERS, "utf-8"));
  return usersData.users;
}

/* ---------------------------------------------------------------------------------------------- */
/*                                       Get Companies Data                                       */
/* ---------------------------------------------------------------------------------------------- */

export function getCompaniesData() {
  const companiesData = JSON.parse(fs.readFileSync(CONFIG.DATA_PATHS.COMPANIES, "utf-8"));
  return companiesData.companies;
}

/* ---------------------------------------------------------------------------------------------- */
/*                                           Run The Bot                                          */
/* ---------------------------------------------------------------------------------------------- */

export function runBot(user: any) {
  const botProcess = spawn("node", ["-r", "ts-node/register", path.join(__dirname, "../services/bot")], {
    env: {
      ...process.env,
      BOT_USERNAME: user.username,
      BOT_PASSWORD: user.password,
      IP_ADDRESS: user.ip_address,
      IP_PORT: user.ip_port,
      IP_USERNAME: user.ip_username,
      IP_PASSWORD: user.ip_password,
    },
  });

  let botUserName = user.username.split("@")[0];

  botProcess.stdout.on("data", (data) => {
    console.log(`stdout.on: Bot ${botUserName}: ${data}`);
  });

  botProcess.stderr.on("data", (data) => {
    console.error(`stderr.on: Bot ${botUserName} error: ${data}`);
  });

  botProcess.on("close", (code) => {
    console.log(`on('close: Bot ${botUserName} exited with code ${code}`);
    delete botProcesses[botUserName]; // Remove from botProcesses on exit
    const logger = new Logger(botUserName);
    logger.log(`Stopped the bot: ${botUserName}`);

    // Check if the bot was not manually stopped before restarting
    if (botStatus[botUserName] !== false) {
      setTimeout(() => runBot(user), 30000);
    } else {
      logger.log(`Manually stopped. Not restarting.`);
      // Reset the status for future use
      delete botStatus[botUserName];
    }
  });

  botProcesses[botUserName] = botProcess; // Store the bot process
  botStatus[botUserName] = true; // Set the bot status to running
}

/* ---------------------------------------------------------------------------------------------- */
/*                                            Start Bot                                           */
/* ---------------------------------------------------------------------------------------------- */

export async function startBot(username: string) {
  const users = getUsersData();
  console.log(users, "USERNAME: ", username);
  const user = users.find((u: { username: string }) => u.username.split("@")[0] === username);
  if (user) {
    console.log(username, " :USERNAME: ", botProcesses[username]);
    if (!botProcesses[username]) {
      // Check if already running
      runBot(user);
      console.log(`Starting bot for ${username}`);
    } else {
      console.log(`Bot for ${username} is already running.`);
    }
  } else {
    console.log("Retrying: ", retryNewUser, " :User not found in the file: ", username);
    if (retryNewUser < 3) {
      retryNewUser++;
      new Promise((resolve) => setTimeout(resolve, 2000));
      startBot(username);
    }
  }
  retryNewUser = 0;
}

/* --------------------------------------------------------------------------------------------- */
/*                                          Stop The Bot                                         */
/* --------------------------------------------------------------------------------------------- */

export function stopBot(username: string) {
  if (botProcesses[username]) {
    botStatus[username] = false; // Set the bot status to stopped
    botProcesses[username].kill(); // Stop the bot process
    console.log(`Manually stopped the bot for ${username}`);
  } else {
    console.log(`Bot for ${username} is not running.`);
  }
}
