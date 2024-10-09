import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Browser, Page } from 'puppeteer';

import { Company } from './scripts/types';
import { performHumanActions, typeWithHumanLikeSpeed, performLinkedInSearchAndLike, likeRandomPosts } from './scripts/HumanActions';
import Logger from './scripts/logger';

// Load environment variables from .env file
dotenv.config();

// Load users from users.json
const usersData = JSON.parse(fs.readFileSync('./data/users-data.json', 'utf-8'));
const users = usersData.users;

import companiesData from './data/companies-data.json';
const companies: Company[] = companiesData.companies;
const headlessBrowser: string | undefined = process.env.HEADLESS_BROWSER;
const randomPosts: string | number | undefined = process.env.NO_OF_RANDOM_POSTS;
const noOfRandomPostsToReact: number = randomPosts ? parseInt(randomPosts) : 3;
const noOfBots: number = parseInt(process.env.NO_OF_BOTS || '1');

puppeteer.use(StealthPlugin());

interface BrowserProfile {
    name: string;
    theme: string;
    // Add other profile preferences as needed
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

async function runBot(user: any) {
    const botUserName = user.username.split('@')[0];
    const logger = new Logger(botUserName);
    logger.log(`Starting bot for user: ${botUserName}`);

    const profileManager = new BrowserProfileManager();
    const userProfile: BrowserProfile = {
        name: botUserName,
        theme: 'dark',
        // Add other preferences as needed
    };

    const browserProfilePath = profileManager.createProfile(userProfile);

    const loginUrl = 'https://www.linkedin.com/login';
    const homePageUrl = 'https://www.linkedin.com/feed/';

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        browser = await puppeteer.launch({
            headless: headlessBrowser === 'true' ? true : false,
            userDataDir: browserProfilePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        page = await browser.newPage();

        await page.setViewport({
            width: 1200,
            height: 1080,
        });

        // Login
        logger.log('Navigating to login page');
        await page.goto(loginUrl);

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // Check if the login form is present
        const isLoginPage = await page.$('#username');

        if (isLoginPage) {
            logger.log("User is not logged in. Proceeding with login...");
            await typeWithHumanLikeSpeed(page, '#username', user.username, logger);
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));
            await typeWithHumanLikeSpeed(page, '#password', user.password, logger);

            await page.click('.login__form_action_container button');
            await page.waitForNavigation();

            logger.log('Login successful');
        } else {
            logger.log('User already logged in');
        }

        const startTime = Date.now();

        while (true) {
            try {
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

                await performHumanActions(page, logger);
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

                await likeRandomPosts(page, noOfRandomPostsToReact, logger);

                for (const company of companies) {
                    logger.log(`Searching for company: ${company.name}`);
                    if (company) {
                        await performLinkedInSearchAndLike(page, company.name, logger);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 100));
                    logger.log('Navigating to home page');
                    await page.goto(homePageUrl);

                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));
                    await performHumanActions(page, logger);
                }
            } catch (error) {
                logger.error(`Error during bot operation: ${error}`);
                if (error instanceof Error) {
                    logger.error(`Stack trace: ${error.stack}`);
                }
                // Add a short delay before continuing
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (error) {
        logger.error(`An error occurred in runBot: ${error}`);
        if (error instanceof Error) {
            logger.error(`Stack trace: ${error.stack}`);
        }
    } finally {
        if (page) {
            await page.close();
        }
        if (browser) {
            await browser.close();
        }
        logger.log(`Session ended for ${botUserName} bot.`);
    }
}

async function main() {
    const botsToRun = Math.min(noOfBots, users.length);
    const botPromises = users.slice(0, botsToRun).map((user: any) => runBot(user));

    await Promise.all(botPromises);
    console.log(`${botsToRun} bots have finished running.`);
}

main().catch(console.error);