// Define and export the PlatformConfig interface
export interface PlatformConfig {
  name: string;
  loginUrl: string;
  homeUrl: string;
  usernameSelector: string;
  passwordSelector: string;
  signinButtonSelector: string;
  captcha: string;
  feedSelector: string;
}

// Define and export the socialMediaConfigs object
export const socialMediaConfigs: Record<string, PlatformConfig> = {
  linkedin: {
    name: "LinkedIn",
    loginUrl: "https://www.linkedin.com/login",
    homeUrl: "https://www.linkedin.com/feed/",
    usernameSelector: "#username",
    passwordSelector: "#password",
    signinButtonSelector: "button[type='submit']",
    captcha: "checkpoint/challenge",
    feedSelector: ".feed-shared-update-v2",
  },
  instagram: {
    name: "Instagram",
    loginUrl: "https://www.instagram.com/accounts/login/",
    homeUrl: "https://www.instagram.com",
    usernameSelector: "input[name='username']",
    passwordSelector: "input[name='password']",
    signinButtonSelector: "button[type='submit']",
    captcha: "challenge",
    feedSelector: "article[role='presentation']",
  },
};
