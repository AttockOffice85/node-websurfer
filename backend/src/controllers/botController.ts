import { Request, Response } from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import dotenv from "dotenv";
import { CONFIG } from "../config/constants";
import Logger from "../../scripts/logger";
import { Bot, User, BrowserProfile, Company, BotProcess } from "../types";
import { performHumanActions, typeWithHumanLikeSpeed, performProfileSearchAndLike, likeRandomPosts } from "../../scripts/HumanActions";
import { confirmIPConfiguration } from "../utils";
import { socialMediaConfigs, PlatformConfig } from "../config/SocialMedia";
import { Browser, Page } from "puppeteer";
import { BotService } from "../services/botService";
import { getLatestStatus } from "../utils/logUtils";

dotenv.config();
puppeteer.use(StealthPlugin());

class CaptchaMonitor extends EventEmitter {
  private page: Page;
  private config: PlatformConfig;
  private logger: Logger;
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 2000;
  private static readonly CAPTCHA_TIMEOUT = 300000;

  constructor(page: Page, config: PlatformConfig, logger: Logger) {
    super();
    this.page = page;
    this.config = config;
    this.logger = logger;
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => this.checkForCaptcha(), CaptchaMonitor.CHECK_INTERVAL);
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
  }

  private async checkForCaptcha(): Promise<void> {
    try {
      const currentUrl = await this.page.url();
      if (this.config.captcha && currentUrl.includes(this.config.captcha)) {
        this.logger.log("Captcha detected");
        this.emit("captchaDetected");
        await this.waitForCaptchaResolution();
        this.emit("captchaResolved");
      }
    } catch (error) {
      this.logger.error(`Captcha monitoring error: ${error}`);
    }
  }

  private async waitForCaptchaResolution(): Promise<void> {
    try {
      await Promise.race([this.waitForHomeRedirect(), this.createCaptchaTimeout()]);
    } catch (error) {
      this.logger.error(`Captcha resolution failed: ${error}`);
      throw error;
    }
  }

  private async waitForHomeRedirect(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(async () => {
        const currentUrl = await this.page.url();
        if (currentUrl === this.config.homeUrl) {
          clearInterval(checkInterval);
          this.logger.log("Captcha resolved");
          resolve();
        }
      }, 3000);
    });
  }

  private createCaptchaTimeout(): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error("Captcha timeout")), CaptchaMonitor.CAPTCHA_TIMEOUT));
  }
}

class BrowserProfileManager {
  private readonly baseDir: string;

  constructor(baseDir: string = "./browsers") {
    this.baseDir = baseDir;
    this.ensureBaseDirectoryExists();
  }

  private ensureBaseDirectoryExists(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  createProfile(profile: BrowserProfile): string {
    const profilePath = path.join(this.baseDir, profile.name);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }
    fs.writeFileSync(path.join(profilePath, "preferences.json"), JSON.stringify(profile, null, 2));
    return profilePath;
  }

  getProfilePath(profileName: string): string {
    return path.join(this.baseDir, profileName);
  }
}

export class BotController {
  private static botProcesses: Map<string, BotProcess> = new Map();
  private static readonly MAX_RETRIES = 3;
  private static readonly BOT_COUNT = Number(process.env.NO_OF_BOTS || "1");
  private static readonly HEADLESS = process.env.HEADLESS_BROWSER === "true";
  private static readonly RANDOM_POSTS_COUNT = Number(process.env.NO_OF_RANDOM_POSTS || "3");

  private static async setupBrowserPage(user: User, profileManager: BrowserProfileManager, logger: Logger): Promise<{ browser: Browser; page: Page }> {
    const browserProfilePath = profileManager.createProfile({
      name: user.username.split("@")[0],
      theme: "dark",
    });

    const browser = await puppeteer.launch({
      headless: this.HEADLESS,
      userDataDir: browserProfilePath,
      args: this.getBrowserArgs(user),
    });

    const [page] = await browser.pages();
    await this.configureProxy(page, user, logger);
    await page.setViewport({ width: 1920, height: 1080 });

    return { browser, page };
  }

  private static getBrowserArgs(user: User): string[] {
    const baseArgs = ["--no-sandbox", "--disable-setuid-sandbox"];

    if (user.ip_address && user.ip_port) {
      return [...baseArgs, `--proxy-server=http://${user.ip_address}:${user.ip_port}`];
    }

    return baseArgs;
  }

  private static async configureProxy(page: Page, user: User, logger: Logger): Promise<void> {
    if (user.ip_address && user.ip_port && user.ip_username && user.ip_password) {
      await page.authenticate({
        username: user.ip_username,
        password: user.ip_password,
      });

      await this.sleep(1000, 2000);

      const isIPConfigured = await confirmIPConfiguration(page, user.ip_address, logger);

      if (!isIPConfigured) {
        throw new Error("IP configuration failed after maximum attempts");
      }
    } else {
      logger.log("Continuing without proxy configuration");
    }
  }

  private static async performLogin(page: Page, user: User, config: PlatformConfig, logger: Logger): Promise<void> {
    await page.goto(config.loginUrl);
    await this.sleep(1000, 2000);

    const isLoginPage = await page.$(config.usernameSelector);
    if (isLoginPage) {
      await typeWithHumanLikeSpeed(page, config.usernameSelector, user.username, logger);
      await this.sleep(1000, 1100);
      await typeWithHumanLikeSpeed(page, config.passwordSelector, user.password, logger);
      await this.sleep(1000, 1200);
      await page.click(config.signinButtonSelector);
      await this.sleep(1000, 1200);
    }
  }

  private static async runBotAutomation(user: User): Promise<void> {
    const platform = process.env.PLATFORM || "linkedin";
    const config = socialMediaConfigs[platform];

    if (!config) {
      throw new Error(`Configuration not found for platform: ${platform}`);
    }

    const botUserName = user.username.split("@")[0];
    const logger = new Logger(botUserName);
    logger.log(`Starting automation for ${botUserName}`);

    const profileManager = new BrowserProfileManager();
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      const setup = await this.setupBrowserPage(user, profileManager, logger);
      browser = setup.browser;
      page = setup.page;

      await this.performLogin(page, user, config, logger);

      const captchaMonitor = new CaptchaMonitor(page, config, logger);
      await this.runMainAutomationLoop(page, captchaMonitor, config, logger);
    } catch (error) {
      logger.error(`Automation error: ${error}`);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  private static async runMainAutomationLoop(page: Page, captchaMonitor: CaptchaMonitor, config: PlatformConfig, logger: Logger): Promise<void> {
    let pausePromise: Promise<void> | null = null;
    let pauseResolve: (() => void) | null = null;

    captchaMonitor.on("captchaDetected", () => {
      logger.log("Operations paused: captcha detected");
      pausePromise = new Promise<void>((resolve) => {
        pauseResolve = resolve;
      });
    });

    captchaMonitor.on("captchaResolved", () => {
      logger.log("Resuming operations after captcha resolved");
      if (pauseResolve) pauseResolve();
      pausePromise = pauseResolve = null;
    });

    await captchaMonitor.startMonitoring();

    await performProfileSearchAndLike(page, config.name, logger, config.homeUrl);

    while (true) {
      try {
        if (pausePromise) await pausePromise;

        await likeRandomPosts(page, this.RANDOM_POSTS_COUNT, logger);
        await this.sleep(1000, 2000);
      } catch (error) {
        logger.error(`Error in main automation loop: ${error}`);
      }
    }
  }

  private static sleep(min: number, max: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
  }

  static async initializeBots() {
    const users = this.getUsersData();
    const botsToRun = Math.min(this.BOT_COUNT, users.length);
    for (const user of users.slice(0, botsToRun)) {
      this.startBot(user);
    }
  }

  private static getUsersData(): User[] {
    const dataPath = path.join(CONFIG.json_data_directory, "users.json");
    const usersData = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(usersData);
  }

  static async startBot(user: User): Promise<void> {
    try {
      const botProcess = new BotProcess(user, this.runBotAutomation);
      this.botProcesses.set(user.username, botProcess);
      botProcess.start();
    } catch (error) {
      console.error(`Failed to start bot for ${user.username}:`, error);
    }
  }

  static async stopBot(req: Request, res: Response) {
    const { username } = req.params;
    const botProcess = this.botProcesses.get(username);

    if (!botProcess) return res.status(404).json({ message: "Bot not found" });

    botProcess.stop();
    this.botProcesses.delete(username);
    return res.status(200).json({ message: "Bot stopped successfully" });
  }

  static async getBotStatus(req: Request, res: Response) {
    const { username } = req.params;
    const botProcess = this.botProcesses.get(username);

    if (!botProcess) return res.status(404).json({ message: "Bot not found" });

    const status = await getLatestStatus(username);
    return res.status(200).json({ message: "Bot status fetched successfully", status });
  }

  static async getAllBots(req: Request, res: Response) {
    const botStatuses = Array.from(this.botProcesses.keys()).map((username) => ({
      username,
      status: this.botProcesses.get(username)?.getStatus(),
    }));
    return res.status(200).json(botStatuses);
  }
}
