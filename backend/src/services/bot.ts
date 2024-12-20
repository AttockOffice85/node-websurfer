// backend/bot.ts
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { performHumanActions, typeWithHumanLikeSpeed, performProfileSearchAndLike, likeRandomPosts, sendRandomFriendRequests } from "../scripts/HumanActions";
import Logger from "../services/logger";
import { BrowserProfile, Company } from "../types";
import { botConfig } from "../config/BotConfig";
import { socialMediaConfigs } from "../config/SocialMedia";
import { confirmIPConfiguration, dynamicWait } from "../utils/index";
import { CaptchaMonitor } from "../services/CaptchaMonitor";
import { getCompaniesData, getUsersData, stopBot } from "../controllers/BotController";

puppeteer.use(StealthPlugin());

const headlessBrowser: string | undefined = process.env.HEADLESS_BROWSER;
const randomPosts: string | number | undefined = process.env.NO_OF_RANDOM_POSTS;
const noOfRandomPostsToReact: number = randomPosts ? parseInt(randomPosts) : 3;

/* ---------------------------------------------------------------------------------------------- */
/*                                      Initiate The Browser                                      */
/* ---------------------------------------------------------------------------------------------- */

class BrowserProfileManager {
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

/* ---------------------------------------------------------------------------------------------- */
/*                                   Bot's Whole Working Process                                  */
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

  const browserProfilePath = profileManager.createProfile(userProfile);

  try {
    while (true) {
      browser = await puppeteer.launch({
        headless: headlessBrowser === "true" ? true : false,
        userDataDir: browserProfilePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox", ...(ip_address && ip_port ? [`--proxy-server=http://${ip_address}:${ip_port}`, "--disable-web-security", "--ignore-certificate-errors", "--enable-logging", "--v=1"] : [])],
      });

      /* --------------------------------------- Some Wait -------------------------------------- */

      await dynamicWait(1, 2);

      if (ip_address && ip_port && ip_username && ip_password) {
        logger.log(`Proxy Check::${ip_address} && ${ip_port} && ${ip_username} && ${ip_password}`);
        const page = await browser.newPage();
        await page.authenticate({ username: ip_username, password: ip_password });
        await dynamicWait(1, 2);
        const isIPConfigured = await confirmIPConfiguration(page, ip_address, logger);

        if (!isIPConfigured) {
          logger.error("IP configuration failed, after 3 attempts. Stopping bot from further process.");
          stopBot(username);
        }
        await page.close();
      } else {
        logger.log("Continue Without Proxy!");
      }

      /* ---------------------------------- Get All Users Data ---------------------------------- */

      const users = getUsersData();

      const user = users.find((u: { username: string }) => u.username === username);
      const userPlatforms = user.platforms;
      let botConfigPlatforms = botConfig.platforms;
      botConfigPlatforms = botConfigPlatforms.sort(() => Math.random() - 0.5);

      // Initialize platforms up to maxTabs
      for (let i = 0; i < botConfigPlatforms.length; i++) {
        const platform = botConfigPlatforms[i];
        if (userPlatforms.includes(platform)) {
          logger.log(`${platform} :: <selc : usr> :: ${JSON.stringify(userPlatforms)}`);
          const page = await browser.newPage();
          await page.setViewport({ width: 1920, height: 1080 });
          pages.set(platform, page);

          await page.goto(socialMediaConfigs[platform].loginUrl);
          logger.log(`Initialized ${platform} tab`);
          await dynamicWait(3, 5);
        }
      }

      let allPages = await browser.pages();
      let page1st = allPages[0];
      await page1st.close();

      /* ------------------------------------ Some More Wait ------------------------------------ */

      await dynamicWait(3, 5);

      /* ---------------------------------- And Some More Wait ---------------------------------- */

      await dynamicWait(10, 30);

      for (const [platform, page] of pages) {
        let platformConfig = socialMediaConfigs[platform];
        botConfig.selectedPlatform = platform;

        /* ----------------------------------- Active The Tab ----------------------------------- */

        await page.bringToFront();

        const captchaMonitor = new CaptchaMonitor(page, browser, platformConfig.captcha, logger);

        /* ---------- Create A Promise That Can Be Used To Pause/resume Bot Operations ---------- */

        let pausePromise: Promise<void> | null = null;
        let pauseResolve: (() => void) | null = null;
        captchaMonitor.on("captchaDetected", () => {
          logger.log("Bot operations paused due to captcha");
          pausePromise = new Promise((resolve) => {
            pauseResolve = resolve;
          });
        });

        captchaMonitor.on("captchaResolved", () => {
          logger.log("Resuming bot operations after captcha");
          if (pauseResolve) {
            pauseResolve();
            pausePromise = null;
            pauseResolve = null;
          }
          captchaMonitor.stopMonitoring();
        });

        /* ---------------------------------- Start Monitoring ---------------------------------- */

        captchaMonitor.startMonitoring();

        /* -------------------------------------- Some Wait ------------------------------------- */

        await dynamicWait(7, 9);

        /* -------------------- Check If Operations Are Paused Due To Captcha ------------------- */

        if (pausePromise) {
          pausePromise;
        }

        /* ------------------------ Use The Configuration For Navigation ------------------------ */

        await page.goto(platformConfig.loginUrl);

        /* -------------------------------------- Some Wait ------------------------------------- */

        await dynamicWait(1, 2);

        const isLoginPage = await page.$(platformConfig.usernameSelector);

        if (isLoginPage) {
          console.log("User is not logged in. Proceeding with login...");

          await typeWithHumanLikeSpeed(page, platformConfig.usernameSelector, username, logger);
          await dynamicWait(2, 4);
          await typeWithHumanLikeSpeed(page, platformConfig.passwordSelector, password, logger);
          await dynamicWait(3, 5);
          await page.click(platformConfig.signinButtonSelector);
          await dynamicWait(5, 6);

          console.log("Login successful. Proceeding to home page.");
        } else if (page.url() === platformConfig.homeUrl) {
          logger.log("On the homepage...");
        } else {
          logger.log("Unknown Error In Login Process...");
        }

        /* -------------------------------------- Some Wait ------------------------------------- */

        await dynamicWait(1, 2);

        try {
          if (platformConfig.name === "Instagram") {
            await page.goto(platformConfig.homeUrl);
          }

          if (platformConfig.name === "Facebook") {
            await sendRandomFriendRequests(page, 5, 1, logger);
          }

          /* --------------------- Perform Human Actions With Captcha Check --------------------- */

          await performHumanActions(page, logger);

          /* ----------------------- Like Random Posts With Captcha Check ----------------------- */

          await likeRandomPosts(page, noOfRandomPostsToReact, logger);

          const companies: Company[] = getCompaniesData();
          companies.sort(() => Math.random() - 0.5);

          for (const company of companies) {
            let companyURL = null;
            if (company.instaLink && platformConfig.name === "Instagram") {
              companyURL = company.instaLink;
            } else if (company.link && platformConfig.name === "LinkedIn") {
              companyURL = company.link;
            } else if (company.fbLink && platformConfig.name === "Facebook") {
              companyURL = company.fbLink;
            }

            if (company && companyURL) {
              await performProfileSearchAndLike(page, company.name, logger, companyURL);
            }

            /* ----------------------- Add Random Delay Between Companies ----------------------- */

            await dynamicWait(Math.random() * 5, Math.random() * 8);

            await page.goto(platformConfig.homeUrl);

            await performHumanActions(page, logger);
          }
        } catch (error) {
          logger.error(`Error in main loop: ${error}`);
          // Add delay before retrying the main loop
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }

        logger.log(`Operations completed on ${platform}. Switching tab for next platform in a few minutes.`);
        await dynamicWait(botConfig.tabSwitchDelay * 10 * 0.8, botConfig.tabSwitchDelay * 10 * 1.2);
      }
      if (browser) {
        await browser.close();
      }
      logger.log(`All platforms are visited once. Entered hibernation for almost ${botConfig.hibernationTime} minutes`);
      await dynamicWait(botConfig.hibernationTime * 30 * 0.8, botConfig.hibernationTime * 30 * 1.2);
    }
  } catch (error) {
    logger.error(`Bot operation error: ${error}`);
  } finally {
    if (browser) await browser.close();
  }
}

/* ---------------------------------------------------------------------------------------------- */
/*                                           Run The Bot                                          */
/* ---------------------------------------------------------------------------------------------- */

runBot().catch(console.error);
