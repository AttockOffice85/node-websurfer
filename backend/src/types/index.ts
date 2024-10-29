import { Browser, Page } from "puppeteer"; // import Browser and Page types from puppeteer

// Bot interface for defining bot-related properties
export interface Bot {
  name: string;
  ip_address: string;
  ip_port: string;
  status: "active" | "inactive"; // restrict status to specific values
  postCount: number;
  inactiveSince?: string; // optional, for tracking inactivity duration
  isRunning: boolean;
}

// User interface for user login and proxy details
export interface User {
  username: string;
  password: string;
  ip_address: string;
  ip_port: string;
  ip_username: string;
  ip_password: string;
}

// BrowserProfile interface for managing browser profile configurations
export interface BrowserProfile {
  name: string;
  theme: "dark" | "light"; // restrict theme to common values
}

// Company interface to define company-specific information
export interface Company {
  name: string;
  link: string; // assumes link is a URL; can be validated if needed
}

// BotProcess interface for managing bot process states and instances
export interface BotProcess {
  status: boolean;
  browser?: Browser; // optional, if browser instance is not yet initialized
  page?: Page; // optional, if page instance is not yet initialized
}
