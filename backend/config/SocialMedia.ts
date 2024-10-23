// config/SocialMedia.ts
import { SocialMediaConfig } from "../scripts/types";

export const socialMediaConfigs: Record<string, SocialMediaConfig> = {
    linkedin: {
        name: 'LinkedIn',
        loginUrl: 'https://www.linkedin.com/login',
        usernameSelector: '#username',
        passwordSelector: '#password',
        signinButtonSelector: '.login__form_action_container button',
        homeUrl: 'https://www.linkedin.com/feed/',
        captcha: 'checkpoint/challenge/',
        postLikeBtn: '.feed-shared-social-action-bar--full-width .react-button__trigger[aria-label="React Like"]',
        postReactionDiv: '.reactions-menu--active',
        headerSearchInput: '[data-view-name="search-global-typeahead-input"]',
        headerBtnFilters: 'div#search-reusables__filters-bar button'
    },
    facebook: {
        name: 'Facebook',
        loginUrl: 'https://www.facebook.com/login',
        usernameSelector: '#email',
        passwordSelector: '#pass',
        signinButtonSelector: '#loginbutton',
        homeUrl: 'https://www.facebook.com/',
        postLikeBtn: 'div[aria-label="Like"]',
        postReactionDiv: 'div[aria-label="Reactions"]',
        headerSearchInput: 'input[aria-label="Search Facebook"]',
        headerBtnFilters: 'div[aria-label="Result filters"] div[role="list"] div[role="listitem"]'
    },
    // Add more social media platforms here
};