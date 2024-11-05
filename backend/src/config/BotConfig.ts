import { BotConfig } from "../types";

export const botConfig: BotConfig = {
  hibernationTime: 60, // 60 minutes
  platforms: ["linkedin", "instagram", "facebook"],
  tabSwitchDelay: 5, // 5 minutes minimum between tab switches
  minActionDelay: 3, // 3 seconds minimum between actions
  maxActionDelay: 10, // 10 seconds maximum between actions
  retryAttempts: 3,
  actionsPerPlatform: 5, // number of actions to perform before switching
  selectedPlatform: "", // defined platform
};
