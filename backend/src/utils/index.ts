import { ChildProcess } from "child_process";
import { Page } from "puppeteer";
import Logger from "../services/logger";

// Shared instance to store bot processes
export const botProcesses: { [key: string]: ChildProcess } = {};

/* ---------------------------------------------------------------------------------------------- */
/*                                 Helper To Generate A Random ID                                 */
/* ---------------------------------------------------------------------------------------------- */

export function generateRandomID() {
  return Math.random().toString(36).substr(2, 9);
}

/* ---------------------------------------------------------------------------------------------- */
/*                                  IP Configuration Confirmation                                 */
/* ---------------------------------------------------------------------------------------------- */

export async function confirmIPConfiguration(page: Page, ip_address: string, logger: Logger) {
  let ipConfigured = false;
  let retryCount = 0;
  const maxIPConfigRetries = 3;

  do {
    try {
      await page.goto("https://httpbin.org/ip", { waitUntil: "networkidle2" });
      const body = await page.evaluate(() => document.body.innerText);
      const ipInfo = JSON.parse(body);

      if (ipInfo.origin && ipInfo.origin.includes(ip_address)) {
        console.log("IP configuration successful.");
        logger.log("IP configuration successful.");
        ipConfigured = true; // IP is correctly configured
      } else {
        logger.log(`IP configuration failed. Retrying (${retryCount + 1}/${maxIPConfigRetries})...`);
      }
    } catch (error) {
      console.error("Error during IP configuration check:", error);
      logger.error("Error during IP configuration check");
    }

    if (!ipConfigured) {
      retryCount++;
      if (retryCount < maxIPConfigRetries) {
        // Wait for 3 seconds before the next retry
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  } while (!ipConfigured && retryCount < maxIPConfigRetries);

  if (!ipConfigured) {
    logger.log("Max retries reached. Please check the proxy configuration manually.");
  }

  return ipConfigured;
}

/* ---------------------------------------------------------------------------------------------- */
/*                                       Dynamic Wait Logic                                       */
/* ---------------------------------------------------------------------------------------------- */

export async function dynamicWait(min: number, max: number) {
  const time = min + Math.random() * (max - min);
  await new Promise((resolve) => setTimeout(resolve, time * 1000));
}

/* ---------------------------------------------------------------------------------------------- */
/*                                          Formate Date                                          */
/* ---------------------------------------------------------------------------------------------- */

export function formatDate(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  const dayOfWeek = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, "0");

  return `${dayOfWeek}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
}

/* ---------------------------------------------------------------------------------------------- */
/*                                     Get Current Time Stamp                                     */
/* ---------------------------------------------------------------------------------------------- */

export function getTimestamp(): string {
  const now = new Date();

  // Format date as DD-MMM-YYYY
  const day = String(now.getDate()).padStart(2, "0");
  const month = now.toLocaleString("en-US", { month: "short" });
  const year = now.getFullYear();

  // Format time as HH:MM:SS AM/PM
  const hours = now.getHours() % 12 || 12; // 12-hour format
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";

  return `${day}-${month}-${year}:${hours}:${minutes}:${seconds}:${ampm}`;
}
