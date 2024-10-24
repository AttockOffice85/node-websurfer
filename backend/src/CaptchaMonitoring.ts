// backend\src\CaptchaMonitoring.ts
import { Page } from 'puppeteer';
import EventEmitter from 'events';
import Logger from '../scripts/logger';

class BotStateManager extends EventEmitter {
    private isPaused: boolean = false;
    private captchaDetected: boolean = false;

    pause(reason?: string): void {
        this.isPaused = true;
        this.emit('paused', reason);
    }

    resume(): void {
        this.isPaused = false;
        this.captchaDetected = false;
        this.emit('resumed');
    }

    isPausedState(): boolean {
        return this.isPaused;
    }

    setCaptchaDetected(detected: boolean): void {
        this.captchaDetected = detected;
    }

    isCaptchaDetected(): boolean {
        return this.captchaDetected;
    }
}

interface CaptchaMonitorOptions {
    minInterval: number;
    maxInterval: number;
    page: Page;
    logger: Logger;
    platformConfig: {
        captcha: string[];  // Array of captcha URL patterns
        homeUrl: string;
    };
    stateManager: BotStateManager;
}

class CaptchaMonitor {
    private isRunning: boolean = false;
    private intervalId?: NodeJS.Timeout;
    private options: CaptchaMonitorOptions;
    private consecutiveFailures: number = 0;
    private readonly MAX_FAILURES = 3;

    constructor(options: CaptchaMonitorOptions) {
        this.options = options;
        this.setupPageListeners();
    }

    private setupPageListeners(): void {
        const { page, logger } = this.options;

        // Listen for navigation events
        page.on('response', async (response) => {
            try {
                const status = response.status();
                const url = response.url();

                // Check for common captcha triggers
                if (status === 403 || status === 429 ||
                    status === 401 || status === 302) {
                    logger.log(`⚠️ Potential Captcha/Code trigger - Status ${status} detected on ${url}`);
                    await this.checkForCaptcha();
                }
            } catch (error) {
                logger.error(`Error handling response: ${error}`);
            }
        });

        // Add navigation listener
        page.on('framenavigated', async (frame) => {
            if (frame === page.mainFrame()) {
                await this.checkForCaptcha();
            }
        });
    }

    private getRandomInterval(): number {
        return Math.floor(
            Math.random() * (this.options.maxInterval - this.options.minInterval) +
            this.options.minInterval
        );
    }

    private async checkForCaptcha(): Promise<void> {
        const { page, logger, platformConfig, stateManager } = this.options;

        try {
            const currentUrl = page.url();

            // Enhanced captcha detection
            const isCaptchaPage = await this.isCaptchaDetected(currentUrl);

            if (isCaptchaPage && !stateManager.isCaptchaDetected()) {
                logger.log('⚠️ Captcha/Code Verification required...');
                stateManager.setCaptchaDetected(true);
                stateManager.pause('captcha');
                this.consecutiveFailures = 0;

                // Start monitoring for captcha resolution
                await this.waitForCaptchaResolution();
            } else if (!isCaptchaPage && stateManager.isCaptchaDetected()) {
                if (await this.isValidPage(currentUrl)) {
                    logger.log('✅ Captcha verified. Resuming bot operations...');
                    stateManager.resume();
                    this.consecutiveFailures = 0;
                }
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    private async isValidPage(currentUrl: string): Promise<boolean> {
        const { platformConfig, page } = this.options;

        if (currentUrl === platformConfig.homeUrl) return true;

        // Additional checks for valid state
        try {
            const isLoggedIn = await page.evaluate(() => {
                // Add platform-specific checks here
                return !document.documentElement.innerHTML.toLowerCase().includes('sign in');
            });
            return isLoggedIn;
        } catch {
            return false;
        }
    }

    private handleError(error: any): void {
        this.consecutiveFailures++;
        this.options.logger.error(`Error in captcha monitoring: ${error}`);

        if (this.consecutiveFailures >= this.MAX_FAILURES) {
            this.options.logger.error(
                `Exceeded maximum consecutive failures (${this.MAX_FAILURES}). Stopping monitor.`
            );
            this.stop();
            throw new Error('Captcha monitor stopped due to excessive failures');
        }
    }

    private async isCaptchaDetected(currentUrl: string): Promise<boolean> {
        const { page, platformConfig } = this.options;

        // URL pattern check
        const urlMatch = platformConfig.captcha.some(pattern =>
            currentUrl.includes(pattern) ||
            currentUrl.match(new RegExp(pattern, 'i'))
        );

        if (urlMatch) return true;

        // Content check for common captcha elements
        try {
            const captchaIndicators = await page.evaluate(() => {
                const html = document.documentElement.innerHTML.toLowerCase();
                return {
                    hasCaptchaText: html.includes('captcha') || html.includes('verification'),
                    hasRecaptcha: !!document.querySelector('.g-recaptcha'),
                    hasSecurityCheck: html.includes('security check') || html.includes('please verify')
                };
            });

            return Object.values(captchaIndicators).some(value => value === true);
        } catch (error) {
            return false;
        }
    }


    private async waitForCaptchaResolution(): Promise<void> {
        const { page, logger, platformConfig } = this.options;

        return new Promise<void>((resolve) => {
            const checkInterval = setInterval(async () => {
                try {
                    const currentUrl = page.url();
                    const isCaptchaResolved = currentUrl === platformConfig.homeUrl;

                    if (isCaptchaResolved) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                } catch (error) {
                    logger.error(`Error checking captcha resolution: ${error}`);
                }
            }, 3000);
        });
    }

    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.scheduleNextCheck();
        this.options.logger.log('Captcha monitoring started');
    }

    private scheduleNextCheck(): void {
        if (!this.isRunning) return;

        const interval = this.getRandomInterval();
        this.intervalId = setTimeout(async () => {
            await this.checkForCaptcha();
            this.scheduleNextCheck();
        }, interval);
    }

    stop(): void {
        this.isRunning = false;
        if (this.intervalId) {
            clearTimeout(this.intervalId);
        }
        this.options.logger.log('Captcha monitoring stopped');
    }
}

export { CaptchaMonitor, BotStateManager, CaptchaMonitorOptions };