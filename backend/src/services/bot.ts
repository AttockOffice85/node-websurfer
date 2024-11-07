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

  constructor(baseDir: string = './browsers') {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  generateRandomProfile(name: string): BrowserProfile {
    const themes: ('dark' | 'light')[] = ['dark', 'light'];
    const languages = ['en-US', 'en-AU', 'en-GB'];

    return {
      name: name,
      color: -Math.floor(Math.random() * 1767215),
      theme: themes[Math.floor(Math.random() * themes.length)],
      zoomLevel: Math.random() * (1.2 - 0.8) + 0.8,
      language: languages[Math.floor(Math.random() * languages.length)],
      fontSize: Math.floor(Math.random() * (20 - 12) + 12)
    };
  }

  async createProfile(profile: BrowserProfile): Promise<string> {
    const profilePath = path.join(this.baseDir, profile.name);

    try {
      // Check if profile directory already exists
      fs.mkdirSync(profilePath, { recursive: true });

      const defaultDir = path.join(profilePath, 'Default');
      fs.mkdirSync(defaultDir, { recursive: true });

      // Create Local State file
      const localState = {
        profile: {
          info_cache: {
            Default: {
              name: profile.name,
              is_using_default_name: false
            }
          },
          last_used: 'Default'
        }
      };
      fs.writeFileSync(path.join(profilePath, 'Local State'), JSON.stringify(localState, null, 2));

      // Create Preferences file
      await this.setProfilePreferences(profilePath, profile);
    } catch (error) {
      console.error(`Error creating profile for ${profile.name}:`, error);
    }

    return profilePath;
  }

  private async setProfilePreferences(profilePath: string, profile: BrowserProfile) {
    const preferencesPath = path.join(profilePath, 'Default', 'Preferences');

    const preferences = {
      profile: {
        name: profile.name,
        avatar_index: Math.floor(Math.random() * 10),
        content_settings: {
          exceptions: {
            cookies: { '*': { setting: 1 } }
          }
        },
        exit_type: "Normal",
        name_dictionary: {
          [profile.name]: {
            "name": profile.name,
            "using_default_name": false
          }
        }
      },
      browser: {
        has_seen_welcome_page: false,
        theme: {
          color_variant: 1,
          user_color: profile.color,
        },
        window_placement: {
          bottom: 810,
          left: 0,
          maximized: false,
          right: 1055,
          top: 0,
          work_area_bottom: 1030,
          work_area_left: 0,
          work_area_right: 1920,
          work_area_top: 0
        }
      },
      bookmark_bar: {
        show_on_all_tabs: false
      },
      intl: {
        accept_languages: profile.language,
        selected_languages: profile.language
      },
      webkit: {
        webprefs: {
          default_fixed_font_size: profile.fontSize,
          default_font_size: profile.fontSize,
          text_size_multiplier: profile.zoomLevel
        }
      },
      extensions: {
        theme: {
          use_system: false,
          custom_theme: profile.theme === 'dark'
        }
      },
      session: {
        restore_on_startup: 4
      }
    };

    await fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2));
  }

  async launchBrowser(profile: BrowserProfile, options: any = {}): Promise<Browser | null> {
    const profilePath = await this.createProfile(profile);

    const defaultOptions = {
      headless: false,
      userDataDir: profilePath,
      args: [
        // `--user-data-dir=${profilePath}`,
        `--profile-directory=${profile.name}`,
        `--window-name=${profile.name}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--profile-directory=Default`,
        '--disable-extensions-except=""',
        '--disable-default-apps',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-sync',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    };

    const mergedOptions = { ...defaultOptions, ...options };

    if (options.args) {
      mergedOptions.args = [...defaultOptions.args, ...options.args];
    }

    try {
      return await puppeteer.launch(mergedOptions);
    } catch (error) {
      console.error(`Failed to launch browser for profile ${profile.name}:`, error);
      return null;
    }
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

  /* -------------------------------------------------------------------------- */
  /*                    Generates random profile settings                       */
  /* -------------------------------------------------------------------------- */

  const profileManager = new BrowserProfileManager();
  const userProfile = profileManager.generateRandomProfile(botUserName);

  try {
    while (true) {
      browser = await profileManager.launchBrowser(userProfile);
      if (!browser) {
        return;
      }

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
          await page.waitForNavigation({ waitUntil: "domcontentloaded" });
          await dynamicWait(15, 26);
          logger.log("Login successful. Proceeding to home page.");
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
        await dynamicWait(botConfig.tabSwitchDelay * 10 * 0.8, botConfig.tabSwitchDelay * 20 * 1.2);
      }
      if (browser) {
        await browser.close();
      }
      logger.log(`All platforms are visited once. Entered hibernation for almost ${botConfig.hibernationTime} minutes`);
      await dynamicWait(botConfig.hibernationTime * 30 * 0.8, botConfig.hibernationTime * 40 * 1.2);
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