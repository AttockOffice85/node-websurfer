import { Request, Response } from "express";
import fs from "fs";
import * as promiseFs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { botProcesses, dynamicWait, formatDate, confirmIPConfiguration } from "../utils";
import { CONFIG } from "../config/Constants";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";
import { performHumanActions, typeWithHumanLikeSpeed, performProfileSearchAndLike, likeRandomPosts, sendRandomFriendRequests } from "../scripts/HumanActions";
import Logger from "../services/logger";
import { BrowserProfile, Company } from "../types";
import { botConfig } from "../config/BotConfig";
import { socialMediaConfigs } from "../config/SocialMedia";
import { BrowserProfileManager, CaptchaMonitor } from "../services/captchaResolver";
import dotenv from "dotenv";

/* ---------------------------------------------------------------------------------------------- */
/*                                 Store The Last Known File Sizes                                */
/* ---------------------------------------------------------------------------------------------- */
const lastFileSizes: { [key: string]: number } = {};
const botInactiveSince: { [logFilePath: string]: string | undefined } = {};
/* ---------------------------------------------------------------------------------------------- */
/*                                   Path To The Data JSON Files                                  */
/* ---------------------------------------------------------------------------------------------- */
const usersDataPath = CONFIG.DATA_PATHS.USERS;
const botLogsDir = CONFIG.DATA_PATHS.LOGS_DIR;
const headlessBrowser: string | undefined = process.env.HEADLESS_BROWSER;
const randomPosts: string | number | undefined = process.env.NO_OF_RANDOM_POSTS;
const noOfRandomPostsToReact: number = randomPosts ? parseInt(randomPosts) : 3;
const noOfBots: number = parseInt(process.env.NO_OF_BOTS || "1");
const botStatus: { [key: string]: boolean } = {};
puppeteer.use(StealthPlugin());
dotenv.config();
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
/*                                        Get All Bot Logs                                        */
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
/*                                     Get Bot Current Status                                     */
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
/*                                             Add Bot                                            */
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
/*                                            Start Bot                                           */
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
/*                                            Stop Bot                                            */
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
/*                                           Delete Bot                                           */
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
/*                                Update Bot Inactive Since Status                                */
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
/*                                       Get Companies Data                                       */
/* ---------------------------------------------------------------------------------------------- */
export function getCompaniesData() {
  const companiesData = JSON.parse(fs.readFileSync(CONFIG.DATA_PATHS.COMPANIES, "utf-8"));
  return companiesData.companies;
}

/* ---------------------------------------------------------------------------------------------- */
/*                                         Get Users Data                                         */
/* ---------------------------------------------------------------------------------------------- */
export function getUsersData() {
  const usersData = JSON.parse(fs.readFileSync(CONFIG.DATA_PATHS.USERS, "utf-8"));
  return usersData.users;
}

/* ---------------------------------------------------------------------------------------------- */
/*                                          Start The Bot                                         */
/* ---------------------------------------------------------------------------------------------- */

async function runBot() {
  const username = process.env.BOT_USERNAME;
  const password = process.env.BOT_PASSWORD;
  const ip_address = process.env.IP_ADDRESS;
  const ip_port = process.env.IP_PORT;
  const ip_username = process.env.IP_USERNAME;
  const ip_password = process.env.IP_PASSWORD;

  if (!username || !password) {
    console.error("Bot credentials not provided");
    process.exit(1);
  }

  let botUserName = username.split("@")[0];
  const logger = new Logger(botUserName);
  logger.log(`Starting bot: ${botUserName}`);

  let browser: Browser | null = null;
  let pages: Map<string, Page> = new Map();

  const profileManager = new BrowserProfileManager();
  const userProfile: BrowserProfile = {
    name: botUserName,
    theme: "dark",
  };

  /* -------------------------------------- Create Browser -------------------------------------- */

  const browserProfilePath = profileManager.createProfile(userProfile);

  try {
    while (true) {
      browser = await puppeteer.launch({
        headless: headlessBrowser === "true" ? true : false,
        userDataDir: browserProfilePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox", ...(ip_address && ip_port ? [`--proxy-server=http://${ip_address}:${ip_port}`, "--disable-web-security", "--ignore-certificate-errors", "--enable-logging", "--v=1"] : [])],
      });

      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

      /* -------------------------------- Run Bot For Each Users -------------------------------- */

      const users = getUsersData();
      const user = users.find((u: { username: string }) => u.username === username);
      const userPlatforms = user.platforms;

      /* -------------------------- Initialize Platforms Up To MaxTabs -------------------------- */

      for (let i = 0; i < botConfig.platforms.length; i++) {
        const platform = botConfig.platforms[i];
        if (userPlatforms.includes(platform)) {
          logger.log(`${platform} :: <selected : user> :: ${JSON.stringify(userPlatforms)}`);
          const page = await browser.newPage();
          await page.setViewport({ width: 1920, height: 1080 });
          pages.set(platform, page);

          await page.goto(socialMediaConfigs[platform].loginUrl);
          logger.log(`Initialized ${platform} tab`);
          await dynamicWait(30, 50);
        }
      }

      /* ------------- This Code Block Is Only Used To Close The First Empty Tab. ------------- */

      const allPages = await browser.pages();
      const page1st = allPages[0];
      await page1st.close();
      await dynamicWait(30, 50);

      let [, page] = Array.from(pages)[0];
      if (ip_address && ip_port && ip_username && ip_password) {
        await page.authenticate({ username: ip_username, password: ip_password });
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 20000));
        const isIPConfigured = await confirmIPConfiguration(page, ip_address, logger);

        if (!isIPConfigured) {
          logger.error("IP configuration failed, after 3 attempts. Stopping bot from further process.");
          stopBot(username);
        }
      } else {
        logger.log("Continue Without Proxy!");
      }

      /* -------------------------------------- Wait A Bit -------------------------------------- */

      await dynamicWait(10, 30);

      /* ------------------------------------------- X ------------------------------------------ */

      for (const [platform, page] of pages) {
        let platformConfig = socialMediaConfigs[platform];
        botConfig.selectedPlatform = platform;
        await page.bringToFront();

        await dynamicWait(300, 500);

        /* -------------------------------------------------------------------------------------- */
        /*                              Ye Usko Captcha Ki Nai Jagah                              */
        /* -------------------------------------------------------------------------------------- */
        const captchaMonitor = new CaptchaMonitor(page, platformConfig, logger);

        /* ---------------------------------- Start Monitoring ---------------------------------- */

        captchaMonitor.startMonitoring();

        /* -------------------------------------------------------------------------------------- */
        /*                                            X                                           */
        /* -------------------------------------------------------------------------------------- */

        /* ------------------------ Use The Configuration For Navigation ------------------------ */

        await page.goto(platformConfig.loginUrl);

        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

        const isLoginPage = await page.$(platformConfig.usernameSelector);

        /* --------------------------- Check If Page Url Is Login Page -------------------------- */

        if (isLoginPage) {
          console.log("User is not logged in. Proceeding with login...");

          await typeWithHumanLikeSpeed(page, platformConfig.usernameSelector, username, logger);
          await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 100));
          await typeWithHumanLikeSpeed(page, platformConfig.passwordSelector, password, logger);
          await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 200));
          await page.click(platformConfig.signinButtonSelector);
          console.log("Login successful. Proceeding to home page.");
        }

        /* ------------------- Check If There's An Active Pause Due To Captcha ------------------ */

        await captchaMonitor.getCurrentPausePromise();

        /* ------------------------------------- Wait A Bit ------------------------------------- */

        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 200));

        /* -------------------------------------------------------------------------------------- */
        /*                               Ye Captcha Wala Code Yahan Tha                           */
        /* -------------------------------------------------------------------------------------- */

        if (page.url() === platformConfig.homeUrl) {
          logger.log("On the homepage...");

          try {
            if (platformConfig.name === "Instagram") {
              await page.goto(platformConfig.homeUrl);
            }

            /* -------------------- Perform Human Actions With Captcha Check -------------------- */

            // await performHumanActions(page, logger);

            if (platformConfig.name === "Facebook") {
              await sendRandomFriendRequests(page, CONFIG.NO_OF_FRIEND_REQUESTS, 20, logger);
            }

            /* ---------------------- Like Random Posts With Captcha Check ---------------------- */

            //   await likeRandomPosts(page, noOfRandomPostsToReact, logger);

            //   const companies: Company[] = getCompaniesData();
            //   companies.sort(() => Math.random() - 0.5);

            //   for (const company of companies) {
            //     let companyURL = null;
            //     if (company.instaLink && platformConfig.name === "Instagram") {
            //       companyURL = company.instaLink;
            //     } else if (company.link && platformConfig.name === "LinkedIn") {
            //       companyURL = company.link;
            //     } else if (company.fbLink && platformConfig.name === "Facebook") {
            //       companyURL = company.fbLink;
            //     }

            //     if (company && companyURL) {
            //       await performProfileSearchAndLike(page, company.name, logger, companyURL);
            //     }

            //     // Add random delay between companies
            //     await dynamicWait(Math.random() * 5000, 5000);
            //     await page.goto(platformConfig.homeUrl);

            //     await performHumanActions(page, logger);
            //   }
          } catch (error) {
            logger.error(`Error in main loop: ${error}`);

            /* --------------------- Add Delay Before Retrying The Main Loop -------------------- */

            await new Promise((resolve) => setTimeout(resolve, 10000));
          }

          logger.log(`Operations completed on ${platform}. Switching tab for next platform in a few minutes.`);

          await dynamicWait(botConfig.tabSwitchDelay * 1000 * 0.8, botConfig.tabSwitchDelay * 1000 * 1.2);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 200));

        /* ------------------------- Non Of The Login Or Home Page Found ------------------------ */

        logger.log("Unknown Error In Login Process...");

        // You can still use event listeners if needed
        captchaMonitor.on("captchaDetected", () => {
          logger.log("Bot operations paused due to captcha");
        });

        captchaMonitor.on("captchaResolved", () => {
          logger.log("Resuming bot operations after captcha");
        });

        logger.log("I think Captcha agaya hay, kandly check the bot logs please.");
      }

      if (browser) {
        await browser.close();
      }

      logger.log(`All platforms are visited once. Entered hibernation for almost ${botConfig.hibernationTime} minutes`);

      await dynamicWait(botConfig.hibernationTime * 60 * 0.8, botConfig.hibernationTime * 60 * 1.2);
    }
  } catch (error) {
    logger.error(`Bot operation error: ${error}`);
  } finally {
    logger.log("");
    if (browser) await browser.close();
  }
}

runBot().catch(console.error);

/* ---------------------------------------------------------------------------------------------- */
/*                                      Start The Bot Process                                     */
/* ---------------------------------------------------------------------------------------------- */
function StartTheBotProcess(user: any) {
  const botProcess = spawn("node", ["-r", "ts-node/register", path.join(__dirname, "bot")], {
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
      setTimeout(() => StartTheBotProcess(user), 30000);
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
      StartTheBotProcess(user);
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

/* ---------------------------------------------------------------------------------------------- */
/*                                             Stopbot                                            */
/* ---------------------------------------------------------------------------------------------- */
export function stopBot(username: string) {
  if (botProcesses[username]) {
    botStatus[username] = false; // Set the bot status to stopped
    botProcesses[username].kill(); // Stop the bot process
    console.log(`Manually stopped the bot for ${username}`);
  } else {
    console.log(`Bot for ${username} is not running.`);
  }
}

/* ---------------------------------------------------------------------------------------------- */
/*                                          Main Function                                         */
/* ---------------------------------------------------------------------------------------------- */
function LetBeginTheNewEra() {
  const users = getUsersData();
  const botsToRun = Math.min(noOfBots, users.length);
  users.slice(0, botsToRun).forEach(StartTheBotProcess);
}

/* ---------------------------------------------------------------------------------------------- */
/*                                            Let Do It                                           */
/* ---------------------------------------------------------------------------------------------- */
LetBeginTheNewEra();
