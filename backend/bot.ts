// backend/bot.ts
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { performHumanActions, typeWithHumanLikeSpeed, performLinkedInSearchAndLike, likeRandomPosts } from './scripts/HumanActions';
import Logger from './scripts/logger';
import { BrowserProfile, Company } from './scripts/types';
import { confirmIPConfiguration } from './src/utils';
import { stopBot } from './index';
import { socialMediaConfigs } from './config/SocialMedia'; // Import the social media platformConfig

puppeteer.use(StealthPlugin());

function getCompaniesData() {
    const companiesData = JSON.parse(fs.readFileSync('./data/companies-data.json', 'utf-8'));
    return companiesData.companies;
}

const headlessBrowser: string | undefined = process.env.HEADLESS_BROWSER;
const randomPosts: string | number | undefined = process.env.NO_OF_RANDOM_POSTS;
const noOfRandomPostsToReact: number = randomPosts ? parseInt(randomPosts) : 3;

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
    let platform = process.env.PLATFORM;
    if (!platform) platform = 'linkedin';
    const platformConfig = socialMediaConfigs[platform];

    if (!platformConfig) {
        console.error(`Configuration for ${platform} not found`);
        process.exit(1);
    }

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
    let page: Page | null = null;

    const profileManager = new BrowserProfileManager();
    const userProfile: BrowserProfile = {
        name: botUserName,
        theme: 'dark'
    };

    const browserProfilePath = profileManager.createProfile(userProfile);

    try {
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

        let pages = await browser.pages();
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        page = pages[0];
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

        await page.setViewport({ width: 1920, height: 1080 });

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

        if (platformConfig.captcha && page.url().includes(platformConfig.captcha)) {
            logger.log('Captcha/Code Verification required...');

            await new Promise<void>((resolve) => {
                const checkPage = async () => {
                    const currentUrl = page?.url();
                    if (currentUrl === platformConfig.homeUrl) {
                        logger.log('Captcha verification successful. Continuing process...');
                        resolve(); // Resolve the promise to continue the process
                    } else {
                        setTimeout(checkPage, 3000); // Check every 3 seconds
                    }
                };
                checkPage();
            });
        }

        while (true) {
            await performHumanActions(page, logger);
            await likeRandomPosts(page, noOfRandomPostsToReact, logger);

            const companies: Company[] = getCompaniesData();
            companies.sort(() => Math.random() - 0.5); // Shuffle companies

            for (const company of companies) {
                console.log(company, " :: ", companies);
                let companyURL = platformConfig.name === 'LinkedIn' ? company.link : company.fbLink;
                if (company && companyURL) {
                    await performLinkedInSearchAndLike(page, company.name, logger, companyURL);
                }
                await page.goto(platformConfig.homeUrl); // Use the home URL from platformConfig
                await performHumanActions(page, logger);
            }
        }
    } catch (error) {
        logger.error(`Bot operation error: ${error}`);
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

runBot().catch(console.error);