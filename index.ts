import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { Browser, Page } from 'puppeteer';

import { Company } from './scripts/types';
import { performHumanActions, typeWithHumanLikeSpeed, performLinkedInSearchAndLike, likeRandomPosts } from './scripts/HummanActions';

// Load environment variables from .env file
dotenv.config();

// Load users from users.json
const usersData = JSON.parse(fs.readFileSync('./data/users-data.json', 'utf-8'));
const users = usersData.users;

import companiesData from './data/comapnies-data.json';
const companies: Company[] = companiesData.companies;
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
    const profileManager = new BrowserProfileManager();
    const userProfile: BrowserProfile = {
        name: user.username.split('@')[0],
        theme: 'dark',
        // Add other preferences as needed
    };

    const browserProfilePath = profileManager.createProfile(userProfile);

    const loginUrl = 'https://www.linkedin.com/login';
    const homePageUrl = 'https://www.linkedin.com/feed/';

    const browser: Browser = await puppeteer.launch({
        headless: false,
        userDataDir: browserProfilePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page: Page = await browser.newPage();

    await page.setViewport({
        width: 1200,
        height: 1080,
    });

    // Login
    await page.goto(loginUrl);

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Check if the login form is present
    const isLoginPage = await page.$('#username');

    if (isLoginPage) {
        console.log("User is not logged in. Proceeding with login...");

        // Type credentials with human-like speed
        await typeWithHumanLikeSpeed(page, '#username', user.username);
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));
        await typeWithHumanLikeSpeed(page, '#password', user.password);

        await page.click('.login__form_action_container button');
        await page.waitForNavigation();

        console.log("Login successful. Proceeding to home page.");
    } else {
        console.log("User is already logged in. Skipping login step...");
    }

    while (true) {

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

        await performHumanActions(page);
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

        await likeRandomPosts(page, noOfRandomPostsToReact);

        for (const company of companies) {
            console.log("Company: ", company.name);
            if (company) {
                await performLinkedInSearchAndLike(page, company.name);
            }
            // Wait for a random delay between each iteration to simulate human behavior1
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 100));
            // Go to home page and like posts
            await page.goto(homePageUrl);

            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));
            await performHumanActions(page);
        }

    }

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));
    await browser.close();
}

async function main() {
    // Get the total number of bots to run
    const botsToRun = Math.min(noOfBots, users.length);

    // Run bots concurrently using Promise.all
    const botPromises = users.slice(0, botsToRun).map((user: any) => runBot(user));

    await Promise.all(botPromises);
    console.log(`${botsToRun} bots have finished running.`);
}

main().catch(console.error);