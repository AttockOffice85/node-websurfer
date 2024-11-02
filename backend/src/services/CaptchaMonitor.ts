import { Browser, Page } from 'puppeteer';

export class CaptchaMonitor {
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private urlPatterns: string[];
    private page: Page;
    private browser: Browser;
    private navigationListener: ((event: any) => void) | null = null;

    constructor(page: Page, browser: Browser, urlPatterns: string[]) {
        this.page = page;
        this.browser = browser;
        this.urlPatterns = urlPatterns;
    }

    private async checkCurrentUrl(): Promise<boolean> {
        const currentUrl = await this.page.evaluate(() => window.location.href);
        const matchedPattern = this.urlPatterns.find(pattern =>
            currentUrl.includes(pattern)
        );

        if (matchedPattern) {
            console.log(`URL match found: ${matchedPattern}`);
            return true;
        }
        return false;
    }

    async startMonitoring(): Promise<void> {
        this.isRunning = true;

        this.navigationListener = async (event: any) => {
            if (this.isRunning) {
                const matched = await this.checkCurrentUrl();
                if (matched) {
                    await this.stopAllOperations();
                }
            }
        };

        this.page.on('load', this.navigationListener);
        this.page.on('hashchange', this.navigationListener);

        // Monitor URL changes via History API with proper typing
        await this.page.evaluate(() => {
            const originalPushState = window.history.pushState;
            const originalReplaceState = window.history.replaceState;

            window.history.pushState = function (
                data: any,
                unused: string,
                url?: string | URL | null
            ) {
                originalPushState.call(this, data, unused, url);
                window.dispatchEvent(new Event('locationchange'));
            };

            window.history.replaceState = function (
                data: any,
                unused: string,
                url?: string | URL | null
            ) {
                originalReplaceState.call(this, data, unused, url);
                window.dispatchEvent(new Event('locationchange'));
            };

            window.addEventListener('popstate', () => {
                window.dispatchEvent(new Event('locationchange'));
            });
        });

        await this.page.evaluate(() => {
            window.addEventListener('locationchange', () => {
                window.dispatchEvent(new Event('urlChanged'));
            });
        });

        await this.page.exposeFunction('notifyUrlChange', async () => {
            if (this.isRunning) {
                const matched = await this.checkCurrentUrl();
                if (matched) {
                    await this.stopAllOperations();
                }
            }
        });

        await this.page.evaluate(() => {
            window.addEventListener('urlChanged', () => {
                (window as any).notifyUrlChange();
            });
        });

        this.intervalId = setInterval(async () => {
            try {
                if (this.isRunning) {
                    const matched = await this.checkCurrentUrl();
                    if (matched) {
                        await this.stopAllOperations();
                    }
                }
            } catch (error) {
                console.error('Error during URL monitoring:', error);
                await this.stopAllOperations();
            }
        }, 2000);
    }

    async stopAllOperations(): Promise<void> {
        try {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }

            this.isRunning = false;

            if (this.navigationListener) {
                this.page.off('load', this.navigationListener);
                this.page.off('hashchange', this.navigationListener);
            }

            try {
                await this.page.evaluate(() => window.stop());
            } catch (error) {
                console.error('Error stopping page navigation:', error);
            }

            await this.browser.close();
            console.log('All operations stopped successfully');
        } catch (error) {
            console.error('Error stopping operations:', error);
            try {
                await this.browser.close();
            } catch (e) {
                console.error('Error force closing browser:', e);
            }
        }
    }

    isMonitoring(): boolean {
        return this.isRunning;
    }

    updatePatterns(newPatterns: string[]): void {
        this.urlPatterns = newPatterns;
    }
}