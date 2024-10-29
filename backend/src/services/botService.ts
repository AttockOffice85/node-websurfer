import * as fs from "fs/promises";
import path from "path";
import { CONFIG } from "../config/constants";
import { startBot, stopBot } from "../index";
import { botProcesses } from "../utils";
import { User, Bot } from "../types";

export class BotService {
  /* ------------------------------------------------------------------------------------------ */
  /*                                      Handle Bot Start                                      */
  /* ------------------------------------------------------------------------------------------ */

  static async handleBotStart(email: string, password?: string, ip_address?: string, ip_port?: string, ip_username?: string, ip_password?: string, isNewUser?: boolean): Promise<{ status: string; error?: string }> {
    const username = email.includes("@") ? email.split("@")[0] : email;

    if (botProcesses[username]) {
      return { status: "Bot is already running" };
    }

    try {
      if (isNewUser) {
        const usersData = JSON.parse(await fs.readFile(CONFIG.DATA_PATHS.USERS, "utf8"));
        const existingUser = usersData.users.find((user: User) => user.username === email);

        if (existingUser) {
          startBot(username);
          return { status: `User: ${username} already exists. Bot started.` };
        }

        const newUser: User = {
          username: email,
          password: password || "defaultPassword",
          ip_address: ip_address || "",
          ip_port: ip_port || "",
          ip_username: ip_username || "",
          ip_password: ip_password || "",
        };

        usersData.users.push(newUser);
        await fs.writeFile(CONFIG.DATA_PATHS.USERS, JSON.stringify(usersData, null, 2));

        const updatedUsersData = JSON.parse(await fs.readFile(CONFIG.DATA_PATHS.USERS, "utf8"));
        const confirmedUser = updatedUsersData.users.find((user: User) => user.username === email);

        if (confirmedUser) {
          console.log("User added successfully:", confirmedUser);
          startBot(username);
        } else {
          throw new Error("User not found after write operation");
        }
      } else {
        startBot(username);
      }

      return { status: `Bot ${isNewUser ? "added and" : ""} started successfully` };
    } catch (error) {
      console.error(`Failed to start bot for ${username}:`, error);
      return { status: `Failed to ${isNewUser ? "add and" : ""} start bot`, error: String(error) };
    }
  }
}
