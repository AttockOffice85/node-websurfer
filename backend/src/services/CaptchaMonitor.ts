import { Browser, Page } from 'puppeteer';
import { EventEmitter } from 'events';
import Logger from './logger';

export class CaptchaMonitor extends EventEmitter {
    private browser: Browser;
    private page: Page;
    private platformCaptchaUrls: string[];
    private logger: Logger;
    private isMonitoring: boolean = false;
    private monitorInterval: NodeJS.Timeout | null = null;
    constructor(page: Page, browser: Browser, platformCaptchaUrls: string[], logger: Logger) {
        super();
        this.page = page;
        this.browser = browser;
        this.platformCaptchaUrls = platformCaptchaUrls;
        this.logger = logger;
    }
    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.monitorInterval = setInterval(async () => {
            try {
                const currentUrl = this.page.url();
                if (this.platformCaptchaUrls && this.platformCaptchaUrls.some((captchaString: string) => currentUrl.includes(captchaString))) {
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
                        if (!this.platformCaptchaUrls.some((captchaString: string) => currentUrl.includes(captchaString))) {
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