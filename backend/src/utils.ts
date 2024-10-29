import { ChildProcess } from 'child_process';
import { Page } from 'puppeteer';
import Logger from '../scripts/logger';

// Helper to generate a random ID
export function generateRandomID() {
    return Math.random().toString(36).substr(2, 9);
}

// Shared instance to store bot processes
export const botProcesses: { [key: string]: ChildProcess } = {};

// IP Configuration confirmation
export async function confirmIPConfiguration(page: Page, ip_address: string, logger: Logger) {
    let ipConfigured = false;
    let retryCount = 0;
    const maxIPConfigRetries = 3;

    do {
        try {
            await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle2' });
            const body = await page.evaluate(() => document.body.innerText);
            const ipInfo = JSON.parse(body);

            if (ipInfo.origin && ipInfo.origin.includes(ip_address)) {
                console.log('IP configuration successful.');
                logger.log('IP configuration successful.');
                ipConfigured = true; // IP is correctly configured
            } else {
                logger.log(`IP configuration failed. Retrying (${retryCount + 1}/${maxIPConfigRetries})...`);
            }
        } catch (error) {
            console.error('Error during IP configuration check:', error);
            logger.error('Error during IP configuration check');
        }

        if (!ipConfigured) {
            retryCount++;
            if (retryCount < maxIPConfigRetries) {
                // Wait for 3 seconds before the next retry
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    } while (!ipConfigured && retryCount < maxIPConfigRetries);

    if (!ipConfigured) {
        logger.log('Max retries reached. Please check the proxy configuration manually.');
    }

    return ipConfigured;
}

// dynamic wait logic
export async function dynamicWait(min: number, max: number) {
    const time = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, time));
};
