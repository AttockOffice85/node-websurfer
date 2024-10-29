import { Page } from "puppeteer";
import Logger from "../../scripts/logger";

export async function confirmIPConfiguration(page: Page, expectedIP: string, logger: Logger, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto("https://api.ipify.org?format=json");
      const ipContent = await page.content();
      const currentIP = JSON.parse(ipContent.match(/{.*}/)?.[0] || "{}").ip;

      if (currentIP === expectedIP) {
        logger.log(`IP configuration confirmed: ${currentIP}`);
        return true;
      }

      logger.error(`IP mismatch. Expected: ${expectedIP}, Got: ${currentIP}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      logger.error(`Error checking IP configuration (attempt ${i + 1}): ${error}`);
    }
  }
  return false;
}
