// backend\scripts\types.ts
export interface Company {
  name: string;
  city?: string;
  link?: string;
  fbLink?: string;
  instaLink?: string;
}

export interface BrowserProfile {
  name: string;
  theme: 'dark' | 'light';
  zoomLevel: number;
  language: string;
  fontSize: number;
}

export interface SocialMediaConfig {
  name: string;
  loginUrl: string;
  usernameSelector: string;
  passwordSelector: string;
  signinButtonSelector: string;
  homeUrl: string;
  captcha: string[];
  postLikeBtn: string;
  postReactionDiv?: string;
  headerSearchBtn?: string;
  headerSearchInput: string;
  headerBtnFilters?: string;
}

export interface BotConfig {
  hibernationTime: number;
  platforms: string[];
  tabSwitchDelay: number;
  minActionDelay: number;
  maxActionDelay: number;
  retryAttempts: number;
  actionsPerPlatform: number;
  selectedPlatform: string;
}