import { Bot } from "../scripts/types";

const apiUrl: string | undefined = process.env.REACT_APP_API_URL;

if (!apiUrl) {
  throw new Error("API URL is not defined");
}

interface AddBotFormData {
  email: string;
  password: string;
  ip_address?: string;
  ip_port?: string;
  ip_username?: string;
  ip_password?: string;
  platforms: { linkedin: boolean; instagram: boolean; facebook: boolean };
}

interface BotResponse {
  bots: Bot[];
  inactiveBots: number;
  activeBots: number;
  attentionRequired: number;
}

export const BotsClient = {
  /* -------------------------------------------------------------------------------------------- */
  /*                                          Fetch Bots                                          */
  /* -------------------------------------------------------------------------------------------- */

  fetchBots: async (): Promise<BotResponse> => {
    const response = await fetch(`${apiUrl}/bot/all-bots`);
    if (!response.ok) {
      throw new Error("Failed to fetch bots");
    }
    const data: Bot[] = await response.json();

    const botsInActiveArr = data.filter((bot) => ["Error", "timeout of", "ERROR", "crashed after", "Session ended", "Breaking forever", "Stopped", "Manually stopped", "! log file"].includes(bot.status));

    const botsAttentionReqArr = data.filter((bot) => ["Captcha/Code", "IP Config", "paused"].includes(bot.status));

    const inactiveBots = botsInActiveArr.length;
    const activeBots = Math.max(0, data.length - inactiveBots);

    return {
      bots: data,
      inactiveBots,
      activeBots,
      attentionRequired: botsAttentionReqArr.length,
    };
  },

  /* ------------------------------------------------------------------------------------------ */
  /*                                         Add New Bot                                        */
  /* ------------------------------------------------------------------------------------------ */

  addNewBot: async (formData: AddBotFormData) => {
    try {
      const response = await fetch(`${apiUrl}/bot/add-bot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add bot");
      }

      return await response.json();
    } catch (error) {
      console.error("Error adding bot:", error);
      throw error;
    }
  },

  /* -------------------------------------------------------------------------------------------- */
  /*                                           Start Bot                                          */
  /* -------------------------------------------------------------------------------------------- */

  startBot: async (botName: string): Promise<Bot[]> => {
    const response = await fetch(`${apiUrl}/bot/start-bot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: botName }),
    });

    if (!response.ok) {
      throw new Error("Failed to start bot");
    }

    return await fetch(`${apiUrl}/bot/all-bots`).then((res) => res.json());
  },

  /* -------------------------------------------------------------------------------------------- */
  /*                                           Stop Bot                                           */
  /* -------------------------------------------------------------------------------------------- */

  stopBot: async (botName: string): Promise<Bot[]> => {
    const response = await fetch(`${apiUrl}/bot/stop-bot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: botName }),
    });

    if (!response.ok) {
      throw new Error("Failed to stop bot");
    }

    return await fetch(`${apiUrl}/bot/all-bots`).then((res) => res.json());
  },

  /* -------------------------------------------------------------------------------------------- */
  /*                                           Delete Bot                                           */
  /* -------------------------------------------------------------------------------------------- */

  deleteBot: async (botName: string): Promise<Bot[]> => {
    const response = await fetch(`${apiUrl}/bot/delete-bot`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: botName }),
    });

    if (!response.ok) {
      throw new Error("Failed to stop bot");
    }

    return await fetch(`${apiUrl}/bot/all-bots`).then((res) => res.json());
  },
};
