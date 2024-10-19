// bot.ts
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

puppeteer.use(StealthPlugin());

// Move the file reading logic into a function
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
    const username = process.env.BOT_USERNAME;
    const password = process.env.BOT_PASSWORD;
    const ip_address = process.env.IP_ADDRESS;
    const ip_port = process.env.IP_PORT;
    const ip_username = process.env.IP_USERNAME;
    const ip_password = process.env.IP_PASSWORD;

    if (!username || !password || !ip_address || !ip_port || !ip_username || !ip_password) {
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
                `--proxy-server=http://${ip_address}:${ip_port}`,
                '--disable-web-security', // Temporarily disable web security
                '--ignore-certificate-errors', // Ignore SSL certificate errors
                '--enable-logging', // Enable logging
                '--v=1' // Verbose logging
            ]
        });

        let pages = await browser.pages();
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        page = pages[0];
        await page.authenticate({ username: ip_username, password: ip_password });
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 20000));

        const isIPConfigured = await confirmIPConfiguration(page, ip_address, logger);

        if (!isIPConfigured) {
            logger.error('IP configuration failed, after 3 attempts. Stoping bot from further process.');
            stopBot(username);
        }

        await page.setViewport({ width: 1200, height: 1080 });

        // Login process
        await page.goto('https://www.linkedin.com/login');

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // Check if the login form is present
        const isLoginPage = await page.$('#username');

        if (isLoginPage) {
            console.log("User is not logged in. Proceeding with login...");

            // Type credentials with human-like speed
            await typeWithHumanLikeSpeed(page, '#username', username, logger);
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 100));
            await typeWithHumanLikeSpeed(page, '#password', password, logger);

            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

            await page.click('.login__form_action_container button');
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

            console.log("Login successful. Proceeding to home page.");
        } else if (page.url() === "https://www.linkedin.com/feed/") {
            logger.log('On the homepage...');
        } else {
            logger.log('Unknown Error In Login Process...');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

        if (page.url().includes('checkpoint/challenge/')) {
            logger.log('Captcha/Code Verification required...');

            // Wait for the user to manually resolve the captcha
            await new Promise<void>((resolve) => {
                const checkPage = async () => {
                    const currentUrl = page?.url();
                    if (currentUrl === "https://www.linkedin.com/feed/") {
                        logger.log('Captcha verification successful. Continuing process...');
                        resolve(); // Resolve the promise to continue the process
                    } else {
                        // Check again after a short delay
                        setTimeout(checkPage, 3000); // Check every 3 seconds
                    }
                };
                checkPage();
            });
        }

        while (true) {
            await performHumanActions(page, logger);
            await likeRandomPosts(page, noOfRandomPostsToReact, logger);

            const companies: Company[] = getCompaniesData(); // Dynamically read the companies data
            companies.sort(() => Math.random() - 0.5); // Simple one-liner shuffle

            for (const company of companies) {
                console.log(company, " :: ", companies);
                if (company && company.link) {
                    await performLinkedInSearchAndLike(page, company.name, logger, company.link);
                }
                await page.goto('https://www.linkedin.com/feed/');
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