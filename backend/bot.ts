// bot.ts
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { performHumanActions, typeWithHumanLikeSpeed, performLinkedInSearchAndLike, likeRandomPosts } from './scripts/HumanActions';
import Logger from './scripts/logger';
import companiesData from './data/companies-data.json';
import { BrowserProfile, Company } from './scripts/types';

puppeteer.use(StealthPlugin());

const companies: Company[] = companiesData.companies;
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
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        let pages = await browser.pages();
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        page = pages[0];
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
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));
            await typeWithHumanLikeSpeed(page, '#password', password, logger);

            await page.click('.login__form_action_container button');
            await page.waitForNavigation();

            console.log("Login successful. Proceeding to home page.");
        } else if (page.url() === "https://www.linkedin.com/feed/") {
            logger.log('Login successful');
        } else {
            logger.log('Unknown Error In Login Process...');
        }

        while (true) {
            await performHumanActions(page, logger);
            await likeRandomPosts(page, noOfRandomPostsToReact, logger);

            for (const company of companies) {
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