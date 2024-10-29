import { Page } from "puppeteer";
import Logger from "./logger";

export async function typeWithHumanLikeSpeed(page: Page, selector: string, text: string, logger: Logger): Promise<void> {
  try {
    await page.waitForSelector(selector);
    const element = await page.$(selector);
    if (!element) throw new Error(`Element ${selector} not found`);

    for (const char of text) {
      await element.type(char, { delay: 50 + Math.random() * 100 });
    }
  } catch (error) {
    logger.error(`Error typing with human-like speed: ${error}`);
    throw error;
  }
}

export async function performHumanActions(page: Page, logger: Logger): Promise<void> {
  try {
    // Simulate random scrolling
    await page.evaluate(() => {
      const scrollAmount = Math.floor(Math.random() * 500) + 200;
      window.scrollBy(0, scrollAmount);
    });

    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
  } catch (error) {
    logger.error(`Error performing human actions: ${error}`);
  }
}

export async function performProfileSearchAndLike(page: Page, companyName: string, logger: Logger, profileUrl: string): Promise<void> {
  try {
    await page.goto(profileUrl);
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Find and click like buttons
    const likeButtons = await page.$$("button[aria-label*='Like']");
    for (const button of likeButtons.slice(0, 2)) {
      await button.click();
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
  } catch (error) {
    logger.error(`Error performing profile search and like for ${companyName}: ${error}`);
  }
}

export async function likeRandomPosts(page: Page, numberOfPosts: number, logger: Logger): Promise<void> {
  try {
    const posts = await page.$$("article");
    const randomPosts = posts.sort(() => Math.random() - 0.5).slice(0, numberOfPosts);

    for (const post of randomPosts) {
      const likeButton = await post.$("button[aria-label*='Like']");
      if (likeButton) {
        await likeButton.click();
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
      }
    }
  } catch (error) {
    logger.error(`Error liking random posts: ${error}`);
  }
}
