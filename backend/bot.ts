// backend/bot.ts
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { performHumanActions, typeWithHumanLikeSpeed, performProfileSearchAndLike, likeRandomPosts } from './src/scripts/HumanActions';
import Logger from './src/services/logger';
import { BrowserProfile, Company, SocialMediaConfig } from './src/types';
import { stopBot } from './index';
import { botConfig } from './src/config/BotConfig';
import { socialMediaConfigs } from './src/config/SocialMedia';
import { confirmIPConfiguration, dynamicWait } from './src/utils';
import { CONFIG } from './src/config/constants';

puppeteer.use(StealthPlugin());

function getCompaniesData() {
    const companiesData = JSON.parse(fs.readFileSync(CONFIG.DATA_PATHS.COMPANIES, 'utf-8'));
    return companiesData.companies;
}

function getUsersData() {
    const usersData = JSON.parse(fs.readFileSync(CONFIG.DATA_PATHS.USERS, 'utf-8'));
    return usersData.users;
}

const headlessBrowser: string | undefined = process.env.HEADLESS_BROWSER;
const randomPosts: string | number | undefined = process.env.NO_OF_RANDOM_POSTS;
const noOfRandomPostsToReact: number = randomPosts ? parseInt(randomPosts) : 3;

export class CaptchaMonitor extends EventEmitter {
    private page: Page;
    private platformConfig: SocialMediaConfig;
    private logger: Logger;
    private isMonitoring: boolean = false;
    private monitorInterval: NodeJS.Timeout | null = null;

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
                const currentUrl = this.page.url();
                if (this.platformConfig.captcha && this.platformConfig.captcha.some((captchaString: string) => currentUrl.includes(captchaString))) {
                    this.logger.log('Captcha detected during operation');
                    this.emit('captchaDetected');

                    // Wait for captcha resolution
                    await this.waitForCaptchaResolution();
                    this.emit('captchaResolved');
                }
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

    private async waitForCaptchaResolution(): Promise<void> {
        try {
            await Promise.race([
                new Promise<void>((resolve) => {
                    const checkInterval = setInterval(async () => {
                        const currentUrl = await this.page.url();
                        if (currentUrl === this.platformConfig.homeUrl) {
                            clearInterval(checkInterval);
                            this.logger.log('Captcha resolved successfully');
                            resolve();
                        }
                    }, 3000);
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Captcha timeout')), 300000)
                )
            ]);
        } catch (error) {
            this.logger.error(`Captcha resolution timeout: ${error}`);
            throw error;
        }
    }
}

class BrowserProfileManager {
    private baseDir: string;

    constructor(baseDir: string = './browsers') {
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
        fs.writeFileSync(path.join(profilePath, 'preferences.json'), JSON.stringify(profile, null, 2));

        return profilePath;
    }

    getProfilePath(profileName: string): string {
        return path.join(this.baseDir, profileName);
    }
}

async function runBot() {
    const username = process.env.BOT_USERNAME;
    const password = process.env.BOT_PASSWORD;
    const ip_address = process.env.IP_ADDRESS;
    const ip_port = process.env.IP_PORT;
    const ip_username = process.env.IP_USERNAME;
    const ip_password = process.env.IP_PASSWORD;

    if (!username || !password) {
        console.error('Bot credentials not provided');
        process.exit(1);
    }

    let botUserName = username.split('@')[0];
    const logger = new Logger(botUserName);
    logger.log(`Starting bot: ${botUserName}`);

    let browser: Browser | null = null;
    let pages: Map<string, Page> = new Map();

    const profileManager = new BrowserProfileManager();
    const userProfile: BrowserProfile = {
        name: botUserName,
        theme: 'dark'
    };

    const browserProfilePath = profileManager.createProfile(userProfile);

    try {

        while (true) {
            browser = await puppeteer.launch({
                headless: headlessBrowser === 'true' ? true : false,
                userDataDir: browserProfilePath,
                args: ['--no-sandbox', '--disable-setuid-sandbox',
                    ...(ip_address && ip_port ? [
                        `--proxy-server=http://${ip_address}:${ip_port}`,
                        '--disable-web-security',
                        '--ignore-certificate-errors',
                        '--enable-logging',
                        '--v=1'
                    ] : [])
                ]
            });

            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

            const users = getUsersData();
            const user = users.find((u: { username: string; }) => u.username === username);
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
                    await dynamicWait(30, 50);
                }
            }

            {   // this code block is only used to close the first empty tab.
                let allPages = await browser.pages();
                let page1st = allPages[0];
                await page1st.close();
                await dynamicWait(30, 50);
            }

            let [, page] = Array.from(pages)[0];
            if (ip_address && ip_port && ip_username && ip_password) {
                await page.authenticate({ username: ip_username, password: ip_password });
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 20000));
                const isIPConfigured = await confirmIPConfiguration(page, ip_address, logger);

                if (!isIPConfigured) {
                    logger.error('IP configuration failed, after 3 attempts. Stopping bot from further process.');
                    stopBot(username);
                }
            } else {
                logger.log("Continue Without Proxy!");
            }

            await dynamicWait(10, 30);
            for (const [platform, page] of pages) {

                let platformConfig = socialMediaConfigs[platform];
                botConfig.selectedPlatform = platform;
                await page.bringToFront();

                await dynamicWait(300, 500);

                // Use the configuration for navigation
                await page.goto(platformConfig.loginUrl);
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

                const isLoginPage = await page.$(platformConfig.usernameSelector);

                if (isLoginPage) {
                    console.log("User is not logged in. Proceeding with login...");

                    await typeWithHumanLikeSpeed(page, platformConfig.usernameSelector, username, logger);
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 100));
                    await typeWithHumanLikeSpeed(page, platformConfig.passwordSelector, password, logger);
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));
                    await page.click(platformConfig.signinButtonSelector);
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

                    console.log("Login successful. Proceeding to home page.");
                } else if (page.url() === platformConfig.homeUrl) {
                    logger.log('On the homepage...');
                } else {
                    logger.log('Unknown Error In Login Process...');
                }
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

                const captchaMonitor = new CaptchaMonitor(page, platformConfig, logger);

                // Create a promise that can be used to pause/resume bot operations
                let pausePromise: Promise<void> | null = null;
                let pauseResolve: (() => void) | null = null;

                captchaMonitor.on('captchaDetected', () => {
                    logger.log('Bot operations paused due to captcha');
                    pausePromise = new Promise(resolve => {
                        pauseResolve = resolve;
                    });
                });

                captchaMonitor.on('captchaResolved', () => {
                    logger.log('Resuming bot operations after captcha');
                    if (pauseResolve) {
                        pauseResolve();
                        pausePromise = null;
                        pauseResolve = null;
                    }
                });

                // Start monitoring
                captchaMonitor.startMonitoring();

                try {
                    // Check if operations are paused due to captcha
                    if (pausePromise) {
                        pausePromise;
                    }

                    if (platformConfig.name === 'Instagram') {
                        await page.goto(platformConfig.homeUrl);
                    }

                    // Perform human actions with captcha check
                    await performHumanActions(page, logger);

                    // Like random posts with captcha check
                    await likeRandomPosts(page, noOfRandomPostsToReact, logger);

                    const companies: Company[] = getCompaniesData();
                    companies.sort(() => Math.random() - 0.5);

                    for (const company of companies) {
                        let companyURL = null;
                        if (company.instaLink && platformConfig.name === 'Instagram') {
                            companyURL = company.instaLink;
                        } else if (company.link && platformConfig.name === 'LinkedIn') {
                            companyURL = company.link;
                        } else if (company.fbLink && platformConfig.name === 'Facebook') {
                            companyURL = company.fbLink;
                        }

                        if (company && companyURL) {
                            await performProfileSearchAndLike(page, company.name, logger, companyURL);
                        }

                        // Add random delay between companies
                        await dynamicWait((Math.random() * 5000), 5000);
                        await page.goto(platformConfig.homeUrl);

                        await performHumanActions(page, logger);
                    }
                } catch (error) {
                    logger.error(`Error in main loop: ${error}`);
                    // Add delay before retrying the main loop
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }

                logger.log(`Operations completed on ${platform}. Switching tab for next platform in a few minutes.`);
                await dynamicWait(botConfig.tabSwitchDelay * 1000 * 0.8, botConfig.tabSwitchDelay * 1000 * 1.2);
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
        if (browser) await browser.close();
    }
}

runBot().catch(console.error);