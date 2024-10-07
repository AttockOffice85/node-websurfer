import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Browser, Page } from 'puppeteer';
import dotenv from 'dotenv';

import { Company } from './scripts/types';
import { performHumanActions, typeWithHumanLikeSpeed, performLinkedInSearchAndLike, likeRandomPosts } from './scripts/HummanActions';

// Load user data from the correct file
const sanitizedUsername = process.argv[2]; // Get sanitizedUsername from command line argument
const userDataPath = path.join(__dirname, 'data', `${sanitizedUsername}-data.json`);

// Read the user's data file
if (!fs.existsSync(userDataPath)) {
    throw new Error(`User data file for ${sanitizedUsername} not found.`);
}

const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));

// Extract user-specific data
const companies = userData.companies;
const linkedInUsername = userData.linkedinUsername;
const linkedInPassword = userData.linkedinPassword;
const noOfRandomPostsToReact = userData.noOfRandomPosts ? parseInt(userData.noOfRandomPosts) : 3;
const noOfCompanyPosts = userData.noOfCompanyPosts ? parseInt(userData.noOfCompanyPosts) : 3;

// Load environment variables from .env file
dotenv.config();

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

async function main() {
    if (!linkedInUsername || !linkedInPassword) {
        console.log("LinkedIn credentials are missing");
        return;
    }

    const profileManager = new BrowserProfileManager();
    const userProfile: BrowserProfile = {
        name: linkedInUsername.split('@')[0],
        theme: 'dark',
        // Add other preferences as needed
    };

    const browserProfilePath = profileManager.createProfile(userProfile);

    const loginUrl = 'https://www.linkedin.com/login';
    const homePageUrl = 'https://www.linkedin.com/feed/';
    const customUrl = 'https://www.linkedin.com/custom/page';

    const browser: Browser = await puppeteer.launch({
        headless: false,
        userDataDir: browserProfilePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page: Page = await browser.newPage();

    // await page.setViewport({
    //     width: 1920,
    //     height: 1080,
    // });

    // Login
    await page.goto(loginUrl);

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Check if the login form is present
    const isLoginPage = await page.$('#username');

    if (isLoginPage) {
        console.log("User is not logged in. Proceeding with login...");

        // Type credentials with human-like speed
        await typeWithHumanLikeSpeed(page, '#username', linkedInUsername);
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));
        await typeWithHumanLikeSpeed(page, '#password', linkedInPassword);

        await page.click('.login__form_action_container button');
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log("Login successful. Proceeding to home page.");
    } else {
        console.log("User is already logged in. Skipping login step...");
    }

    // Go to home page and like posts
    // await page.goto(homePageUrl); // no need as the user will be redirected to homepage automatically. 
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

    await performHumanActions(page);
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

    await likeRandomPosts(page, noOfRandomPostsToReact);
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 200));

    for (const company of companies) {
        console.log("Company: ", company);
        if (company) {
            await performLinkedInSearchAndLike(page, company.name, noOfCompanyPosts);
        }
        // Wait for a random delay between each iteration to simulate human behavior
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 100));
        // Go to home page and like posts
        await page.goto(homePageUrl);
    }

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 6000));

    await browser.close();
}

main().catch(console.error);