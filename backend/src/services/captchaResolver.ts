import { Page } from "puppeteer";
import { EventEmitter } from "events";
import Logger from "./logger";
import fs from "fs";
import { BrowserProfile, SocialMediaConfig } from "../types";
import path from "path";

export class CaptchaMonitor extends EventEmitter {
  private page: Page;
  private platformConfig: SocialMediaConfig;
  private logger: Logger;
  private isMonitoring: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private currentPausePromise: Promise<void> | null = null;
  private currentPauseResolve: (() => void) | null = null;

  constructor(page: Page, platformConfig: SocialMediaConfig, logger: Logger) {
    super();
    this.page = page;
    this.platformConfig = platformConfig;
    this.logger = logger;
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitorInterval = setInterval(async () => {
      try {
        await this.checkForCaptcha();
      } catch (error) {
        this.logger.error(`Error in captcha monitoring: ${error}`);
      }
    }, 2000); // Check every 2 seconds
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
  }

  async getCurrentPausePromise(): Promise<void> {
    if (this.currentPausePromise) {
      await this.currentPausePromise;
    }
  }

  private async checkForCaptcha(): Promise<void> {
    const currentUrl = await this.page.url();
    const isCaptchaUrl = this.platformConfig.captcha?.some((captchaString: string) => currentUrl.includes(captchaString));

    if (isCaptchaUrl && !this.currentPausePromise) {
      // Create new pause promise when captcha is detected
      this.currentPausePromise = new Promise((resolve) => {
        this.currentPauseResolve = resolve;
      });
      this.logger.log("Captcha detected - pausing operations");
      this.emit("captchaDetected");

      // Wait for resolution
      try {
        await this.waitForCaptchaResolution();
        this.logger.log("Captcha resolved - resuming operations");
        this.emit("captchaResolved");

        // Clear the pause promise
        if (this.currentPauseResolve) {
          this.currentPauseResolve();
          this.currentPausePromise = null;
          this.currentPauseResolve = null;
        }
      } catch (error) {
        this.logger.error(`Captcha resolution error: ${error}`);
        throw error;
      }
    }
  }

  private async waitForCaptchaResolution(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const currentUrl = await this.page.url();
          if (currentUrl === this.platformConfig.homeUrl) {
            clearInterval(checkInterval);
            resolve();
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 2000);

      // Set timeout for captcha resolution
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Captcha resolution timeout after 5 minutes"));
      }, 300000); // 5 minutes timeout
    });
  }
}

export class BrowserProfileManager {
  private baseDir: string;

  constructor(baseDir: string = "./browsers") {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  createProfile(profile: BrowserProfile): string {
    const profilePath = path.join(this.baseDir, profile.name);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }

    // Save profile preferences
    fs.writeFileSync(path.join(profilePath, "preferences.json"), JSON.stringify(profile, null, 2));

    return profilePath;
  }

  getProfilePath(profileName: string): string {
    return path.join(this.baseDir, profileName);
  }
}
