import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Browser, Page } from 'puppeteer';

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
    const profileManager = new BrowserProfileManager();
    const userProfile: BrowserProfile = {
        name: 'linkedin_automation',
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

    // Login
    await page.goto(loginUrl);
    await page.type('#username', 'your_username');
    await page.type('#password', 'your_password');
    await page.click('.login__form_action_container button');
    await page.waitForNavigation();

    // Go to home page and like posts
    await page.goto(homePageUrl);
    await likeRandomPosts(page, 5);

    // Visit custom URL and like posts
    await page.goto(customUrl);
    await likeRandomPosts(page, 5);

    await browser.close();
}

async function likeRandomPosts(page: Page, count: number) {
    const likeButtons = await page.$$('.react-button__trigger');
    const shuffled = likeButtons.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    for (const button of selected) {
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
}

main().catch(console.error);