export interface Bot {
  name: string;
  status: string;
  platform?: string;
  postCount: number;
  inactiveSince?: string;
  isRunning: boolean;
  ip_address?: string;
  ip_port?: string;
}

export interface PopupState {
  isOpen: boolean;
  openPopup: () => void;
  closePopup: () => void;
}

export interface responseMessage {
  type: boolean; // if true Success, else Error
  status?: string;
  descrip?: string;
}

export const botStatusExplanations = [
  {
    status: "! log file",
    desc: "No logs found for the bot. Start the bot!",
  },
  {
    status: "Active",
    desc: "Bot is live and working.",
  },
  {
    status: "Processing...",
    desc: "Bot is live and working.",
  },
  {
    status: "Paused",
    desc: "Bot is paused. Resolve issue manually.",
  },
  {
    status: "Captcha/Code | IP Config",
    desc: "Manual verification/attention required.",
  },
  {
    status: "Error",
    desc: "A general error occurred during bot operation.",
  },
  {
    status: "ERROR",
    desc: "A critical error occurred, requiring immediate attention.",
  },
  {
    status: "Manually stopped",
    desc: "The bot was intentionally stopped by administrator.",
  },
  {
    status: "crashed after",
    desc: "The bot unexpectedly stopped working after a certain point.",
  },
  {
    status: "Breaking forever",
    desc: "The bot encountered a critical issue and has stopped permanently.",
  },
  {
    status: "Session ended",
    desc: "The bot's session has ended, possibly due to logout or session expiration.",
  },
  {
    status: "timeout of",
    desc: "The bot operation timed out, possibly due to slow network or unresponsive pages.",
  },
  {
    status: "Stopped",
    desc: "The bot has been stopped, either automatically or manually. And most probably will auto restart in 30-40 seconds.",
  },
  {
    status: "Active | Processing + Start Btn",
    desc: "The bot is in trouble, need immediate attention.",
  },
  {
    status: "Entered hibernation",
    desc: "All platforms are visited once. Bot will automatically start almost after 60 minutes.",
  },
];

export const logDescriptions = [
  { title: "Starting bot", description: "The bot is initializing for the specified task." },
  { title: "Bot operation error", description: "There’s an issue in the bot's code. For instance, 'Cannot read properties of undefined' means the bot couldn't find a necessary data point. The 'ERR_INVALID_AUTH_CREDENTIALS' error suggests a login issue, possibly due to incorrect credentials." },
  { title: "Stopped the bot", description: "The bot has stopped, either automatically after encountering an error or manually by the user." },
  { title: "Manually stopped. Not restarting", description: "The bot was manually stopped and won’t automatically restart." },
  { title: "Selecting platforms", description: "The bot is identifying which social platforms to work on (e.g., LinkedIn, Instagram, Facebook)." },
  { title: "Initialized tab", description: "The bot successfully opened the specified platform's tab and is ready to interact with it." },
  { title: "Continue Without Proxy", description: "The bot attempted to use a proxy but is now proceeding without one." },
  { title: "typeWithHumanLikeSpeed", description: "The bot is simulating human typing speed on a platform (e.g., LinkedIn) to appear more natural." },
  { title: "Operations completed on [platform]", description: "The bot finished its tasks on one platform and will soon switch to the next platform." },
];