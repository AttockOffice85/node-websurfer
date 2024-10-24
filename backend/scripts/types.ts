// scripts/types.ts
export interface Company {
    name: string;
    city?: string;
    link?: string;
    fbLink?: string;
    instaLink?: string;
}

export interface BrowserProfile {
    name: string;
    theme: string;
    // Add other profile preferences as needed
}

export interface SocialMediaConfig {
    name: string;
    loginUrl: string;
    usernameSelector: string;
    passwordSelector: string;
    signinButtonSelector: string;
    homeUrl: string;
    captcha?: string;
    postLikeBtn: string;
    postReactionDiv?: string;
    headerSearchBtn?: string;
    headerSearchInput: string;
    headerBtnFilters?: string;
}