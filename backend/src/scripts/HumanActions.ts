// backend\scripts\HumanActions.ts
import { ElementHandle, Page } from 'puppeteer';
import Logger from '../services/logger';
import { socialMediaConfigs } from '../config/SocialMedia'; // Import the social media config
import { dynamicWait, generateRandomID } from '../utils';
import { SocialMediaConfig } from '../types';
import { botConfig } from '../config/BotConfig';

const companyPosts: string | number | undefined = process.env.NO_OF_COMPANY_POSTS;
const noOfCompanyPostsToReact: number = companyPosts ? parseInt(companyPosts) : 3;

// Mutable variable for platformConfig
let platformConfig: SocialMediaConfig;

// Helper function to update platformConfig based on the current botConfig
function updatePlatformConfig() {
    const platform = botConfig.selectedPlatform || 'linkedin';
    platformConfig = socialMediaConfigs[platform];
    console.log(`Updated platformConfig: ${JSON.stringify(platformConfig)}`);
}

// Utility function to wait for an element to appear with retries
async function waitForElement(page: Page, selector: string, maxRetries: number = 5, delay: number = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        const element = await page.$(selector);
        if (element) {
            return element;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error(`Element not found: ${selector} after ${maxRetries} retries`);
}

export async function performHumanActions(page: Page, logger: Logger) {
    updatePlatformConfig();
    logger.log(`Starting fun:: performHumanActions on SocialPlatform:: ${platformConfig.name}`);

    // Scroll behavior - scroll down, then scroll back up, and then skip some content
    const scrollRandomly = async () => {
        const scrollTimes = Math.floor(Math.random() * 3) + 2; // Scroll 2-3 times

        for (let i = 0; i < scrollTimes; i++) {
            // Scroll down by random amounts between 300 to 800 pixels
            await page.evaluate(() => {
                window.scrollBy(0, 300 + Math.random() * 500);
            });

            // Simulate reading by waiting a bit after scrolling
            await dynamicWait(50, 150);
        }

        // Occasionally scroll back up
        if (Math.random() < 0.5) {
            await page.evaluate(() => {
                window.scrollBy(0, -(200 + Math.random() * 300)); // Scroll back up a bit
            });
            await dynamicWait(30, 80);
        }

        // Scroll down again after "rechecking"
        await page.evaluate(() => {
            window.scrollBy(0, 400 + Math.random() * 600); // Scroll down by random amounts
        });

        // Simulate reading again
        await dynamicWait(600, 1500);
    };

    // Text selection behavior
    const selectRandomText = async () => {
        await page.evaluate(() => {
            // Only select text from non-clickable elements (excluding buttons, links, etc.)
            const elements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span'))
                .filter(el => !el.closest('button, a, [role="button"], [role="link"]'));

            if (elements.length > 0) {
                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                const text = randomElement.textContent || '';

                if (text.length > 0) {
                    const start = Math.floor(Math.random() * text.length);
                    const end = Math.min(start + Math.floor(Math.random() * 15) + 1, text.length);

                    const range = document.createRange();
                    const textNodes = Array.from(randomElement.childNodes)
                        .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent!.trim().length > 0);

                    if (textNodes.length > 0) {
                        const randomTextNode = textNodes[Math.floor(Math.random() * textNodes.length)];
                        const nodeText = randomTextNode.textContent!;
                        const nodeStart = Math.min(start, nodeText.length - 1);
                        const nodeEnd = Math.min(end, nodeText.length);

                        range.setStart(randomTextNode, nodeStart);
                        range.setEnd(randomTextNode, nodeEnd);

                        const selection = window.getSelection();
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                    }
                }
            }
        });
    };

    // Simulate spending more time on the page
    for (let i = 0; i < Math.floor(Math.random() * 4) + 3; i++) { // Scroll and interact 3-6 times
        const randomValue = Math.random() * 100; // Get a random value between 0 and 100

        // Scroll randomly with 80-99% chance
        if (randomValue >= 1 && randomValue <= 99) {
            logger.log("performHumanActions::> random scrolling");
            if (platformConfig.name === 'Instagram') {
                await scrollInstagramWithKeyboard(page, logger);
            } else {
                await scrollRandomly();  // Scroll down, possibly scroll back up
            }
        }

        // Select random text with 30-80% chance
        if (randomValue >= 30 && randomValue <= 80 && platformConfig.name !== 'Instagram') {
            await selectRandomText(); // Select random text
        }

        if (platformConfig.name === 'Facebook') {
            if (platformConfig.postReactionDiv) {
                await likeRandomPostsWithReactions(page, 5, logger);
            } else {
                await likeRandomPosts(page, 5, logger);
            }
        }

        if (platformConfig.name === 'LinkedIn') {

            // Perform LinkedIn follow action with 5-10% chance
            if (randomValue >= 5 && randomValue <= 10) {
                await performLinkedInFollowActions(page, logger); // Click follow button
            }

            // Perform LinkedIn connect, subscribe, join and accept action with 1-5% chance
            if (randomValue >= 1 && randomValue <= 8) {
                await performLinkedInNetworkActions(page, logger); // Click follow button
                page.goBack();
            }

        }

        await dynamicWait(200, 500);
    }

    logger.log('Finished fun:: performHumanActions');
}

export async function typeWithHumanLikeSpeed(page: Page, selector: string, text: string, logger: Logger): Promise<void> {
    updatePlatformConfig();
    logger.log(`Starting fun:: typeWithHumanLikeSpeed on SocialPlatform:: ${platformConfig.name}`);
    return new Promise(async (resolve) => {
        await page.focus(selector);

        let mistypedText = "";

        for (const char of text) {
            // Randomly determine the typo probability between 10% and 30%
            const typoProbability = 0.1 + Math.random() * 0.2; // This generates a value between 0.1 and 0.3

            if (Math.random() < typoProbability) {
                // Introduce a typo by typing a random incorrect character
                const typoChar = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // Random letter a-z
                mistypedText += typoChar;

                await page.type(selector, typoChar, { delay: 50 + Math.random() * 100 });

                // Pause to simulate realizing the mistake
                await new Promise(res => setTimeout(res, 500 + Math.random() * 1000));

                // Simulate backspace to correct the mistake
                await page.keyboard.press('Backspace');
            }

            // Type the correct character
            mistypedText += char;
            await page.type(selector, char, { delay: 50 + Math.random() * 100 });
            await new Promise(res => setTimeout(res, Math.random() * 50)); // Random delay between keystrokes
        }

        resolve();
    });

    logger.log('Finished fun:: typeWithHumanLikeSpeed');
}

export async function likeRandomPosts(page: Page, count: number, logger: Logger): Promise<void> {
    logger.log(`Starting fun:: likeRandomPosts on SocialPlatform:: ${platformConfig.name}`);
    updatePlatformConfig();

    let likeButtons: any[] = [];
    let previousHeight = 0;

    // Step 1: Continuously scroll, simulate reading, and gather "Like" buttons
    while (likeButtons.length < count) {
        // Collect unliked "Like" buttons
        const newButtons = await page.$$(
            platformConfig.postLikeBtn
        );
        likeButtons = likeButtons.concat(newButtons);

        const availableCount = likeButtons.length;
        if (availableCount >= count) {
            logger.log(`likeRandomPosts::> Found enough unliked posts (${availableCount} available).`);
            break;
        }

        // Step 2: Scroll down to load more posts and simulate reading
        previousHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await dynamicWait(4000, 7000);

        // Step 3: Check if the page has more content to load
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        if (newHeight === previousHeight) {
            logger.log("likeRandomPosts::> Reached the bottom of the page, no more posts to load.");
            break;
        }
    }

    // Step 4: Shuffle the buttons to randomize selection
    const shuffled = likeButtons.sort(() => 0.5 - Math.random());

    // Step 5: Select up to 'count' buttons
    const selected = shuffled.slice(0, Math.min(count, likeButtons.length));

    // Step 6: Scroll to each post, simulate reading, and click "Like"
    for (const button of selected) {
        // Scroll the button into view and simulate reading
        await button.evaluate((b: { scrollIntoView: (arg0: { behavior: string; block: string; }) => any; }) =>
            b.scrollIntoView({ behavior: 'smooth', block: 'center' })
        );

        await dynamicWait(5000, 12000);

        // Click the "Like" button
        await button.click();

        // Introduce a random delay after clicking "Like"
        await dynamicWait(300, 800);
    }
    logger.log('Finished fun:: likeRandomPosts');
}

export async function performProfileSearchAndLike(page: Page, searchQuery: string, logger: Logger, companyURL: string) {
    updatePlatformConfig();
    logger.log(`Starting fun:: performProfileSearchAndLike on SocialPlatform:: ${platformConfig.name}`);

    // Check if search input is available
    const searchInput = await page.$(platformConfig.headerSearchInput);
    if (!searchInput && platformConfig.headerSearchBtn) {
        const searchButton = await waitForElement(page, platformConfig.headerSearchBtn);
        if (searchButton) {
            await searchButton.click();
            await waitForElement(page, platformConfig.headerSearchInput, 5, 1000);
        } else {
            logger.error("performProfileSearchAndLike::> Couldn't find search input or button");
            return;
        }
    }

    // Focus and clear the search input
    await page.focus(platformConfig.headerSearchInput);
    await page.$eval(platformConfig.headerSearchInput, (input) => {
        (input as HTMLInputElement).value = '';
    });

    // Wait before typing the search query
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Type search query with human-like speed
    await typeWithHumanLikeSpeed(page, platformConfig.headerSearchInput, searchQuery, logger);

    // Press Enter and wait for navigation
    await page.keyboard.press('Enter');
    // await page.waitForNavigation();

    if (platformConfig.headerBtnFilters) {
        logger.log(`performProfileSearchAndLike::> on line 264`);
        await page.waitForSelector(platformConfig.headerBtnFilters);
    }

    await dynamicWait(300, 500);

    if (platformConfig.name === 'LinkedIn' && platformConfig.headerBtnFilters) {
        // Get all buttons inside the filters bar
        const filtersBarButtons = await page.$$(platformConfig.headerBtnFilters);
        if (filtersBarButtons.length > 0) {
            logger.log(`line 274::::on ${filtersBarButtons}`);
            for (const button of filtersBarButtons) {
                // Get the button's text content
                const buttonText = await page.evaluate(element => element.textContent, button);

                // Introduce a delay for a human-like interaction
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 5000));

                // Check if the button contains "Companies"
                if (buttonText && buttonText.includes("Companies")) {
                    // Click the button and wait for navigation
                    await button.click();
                    await page.waitForNavigation();
                    await dynamicWait(3000, 5000);
                    await linkedinCompanyProfileAct(page, companyURL, logger);
                    break;  // Exit the loop after clicking the desired button
                }
            }
        }
    } else if (platformConfig.name === 'Facebook' && platformConfig.headerBtnFilters) {
        // Hover and click on the "My Network" link
        logger.log(`performProfileSearchAndLike::> on line 292`);
        // Select the <a> tag that contains '/search/pages' in the href
        const pageBtn: any = await page.$(`${platformConfig.headerBtnFilters} a[href*="/search/pages"]`);

        if (pageBtn) {
            logger.log(`${pageBtn}`);
            // Apply a red border to the element, if it exists
            await page.evaluate((btn) => {
                if (btn) btn.style.border = '10px solid red';
            }, pageBtn);

            await dynamicWait(300, 500);
            await pageBtn.hover();
            await dynamicWait(20, 60);
            await pageBtn.click();

        } else {
            logger.log('page selector not found 304')
        }
        await dynamicWait(300, 500);
        await facebookCompanyProfileAct(page, companyURL, logger);
    } else if (platformConfig.name === 'Instagram') {
        logger.log(`line 348:: ${platformConfig.name}`)
        // Wait for the specific link inside the div to appear
        await page.waitForSelector('div[style="transform: translateX(0%);"] a[role="link"][href="/theredstoneai/"]', { timeout: 10000 });

        // Select the company profile link
        let companyProfiles = await page.$('div[style="transform: translateX(0%);"] a[role="link"][href="/theredstoneai/"]');

        logger.log(`line 355:: ${companyProfiles}`);

        await dynamicWait(3000, 5000);

        if (companyProfiles) {
            // Highlight the profile link with a red border
            await page.evaluate((btn) => {
                btn.style.border = '10px solid red';
            }, companyProfiles);

            await companyProfiles.click();
            await dynamicWait(3000, 5000);

            await instagramCompanyProfileAct(page, companyURL, logger);

        } else {
            logger.log(`Company profile link not found.`);
        }

        await dynamicWait(3000, 5000);
    }
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 5000));

    logger.log('Finished fun:: performProfileSearchAndLike');
}

export async function likeRandomPostsWithReactions(page: Page, count: number, logger: Logger): Promise<void> {
    logger.log(`Starting fun:: likeRandomPostsWithReactions on SocialPlatform:: ${platformConfig.name}`);
    try {
        let likeButtons: any[] = [];
        let previousHeight = 0;

        // Step 1: Continuously scroll and gather "like" buttons until enough are found or no more content is loaded
        while (likeButtons.length < count) {
            // Select all unliked "like" buttons from the feed-shared-social-action-bar elements
            likeButtons = await page.$$(
                platformConfig.postLikeBtn
            );

            const availableCount = likeButtons.length;

            if (availableCount >= count) {
                logger.log(`likeRandomPostsWithReactions::> Found enough unliked posts (${availableCount} available).`);
                break;
            }

            // Step 2: Scroll to the bottom of the page to load more posts
            previousHeight = await page.evaluate(() => document.body.scrollHeight);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000)); // Increased wait for loading posts

            // Step 3: Check if we have reached the end of the page
            const newHeight = await page.evaluate(() => document.body.scrollHeight);
            if (newHeight === previousHeight) {
                logger.log("likeRandomPostsWithReactions::> Reached the bottom of the page, no more posts to load.");
                break;
            }
        }

        // Step 4: Shuffle the buttons to randomize the selection
        const shuffled = likeButtons.sort(() => 0.5 - Math.random());

        // Step 5: Select up to 'count' number of buttons, or fewer if there aren't enough
        const selected = shuffled.slice(0, Math.min(count, likeButtons.length));

        // Step 6: Iterate over the selected buttons and apply reactions
        for (const button of selected) {
            // Scroll the button into view
            await button.evaluate((b: { scrollIntoView: (arg0: { behavior: string; block: string; }) => any; }) => b.scrollIntoView({ behavior: 'smooth', block: 'center' }));

            // Simulate reading time before reacting (2-5 seconds)
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

            // Step 7: Hover over the like button to trigger the reactions menu
            await button.hover();
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

            // Wait for the reactions menu to become visible (adjust selector as necessary)
            if (platformConfig.postReactionDiv) {
                await page.waitForSelector(platformConfig.postReactionDiv, { visible: true });
            }
            // Step 8: Select a reaction to click
            let reactions: any = await page.$$(`${platformConfig.postReactionDiv} button`);

            if (platformConfig.name === 'Facebook') {
                reactions = await page.$$(`${platformConfig.postReactionDiv} div[aria-label]`);
            }

            if (reactions.length > 0) {
                // Choose a random reaction
                const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];

                // Click the reaction
                await randomReaction.click();
            }

            // Step 9: Introduce a longer random delay (between 3 and 6 seconds) after each action to simulate human behavior
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 3000));
        }

        // Total estimated time calculation
        const totalEstimatedTime = selected.length * (3 + Math.random() * 3) + (selected.length * 3);
        logger.log(`likeRandomPostsWithReactions::> Successfully reacted to ${selected.length} posts. Estimated time taken: ${totalEstimatedTime / 60} minutes`);

    } catch (error) {
        logger.error(`likeRandomPostsWithReactions::> Error: ${String(error)}`);
    }
    logger.log(`Finished fun:: likeRandomPostsWithReactions ${platformConfig.postReactionDiv ? '' : ' - ! reactions'}`);
}

// Function to like posts on the company's "Posts" page
async function goToAndLikeCompanyPosts(page: Page, logger: Logger) {
    logger.log(`Starting fun:: goToAndLikeCompanyPosts on SocialPlatform:: ${platformConfig.name}`);
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    // Find the "Posts" section in the navigation bar
    const postsTab = await waitForElement(page, 'ul.org-page-navigation__items a[href*="/posts/"]', 5, 1000);
    if (postsTab) {
        await postsTab.click();
        await page.waitForNavigation();
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        await performHumanActions(page, logger);
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
        // Like posts
        if (platformConfig.postReactionDiv) {
            await likeRandomPostsWithReactions(page, noOfCompanyPostsToReact, logger);
        } else {
            await likeRandomPosts(page, 5, logger);
        }
    } else {
        logger.error("goToAndLikeCompanyPosts::> Couldn't find the 'Posts' tab.");
    }
    logger.log('Finished fun:: goToAndLikeCompanyPosts');
}

// Function to perform LinkedIn follow actions
export async function performLinkedInFollowActions(page: Page, logger: Logger) {
    logger.log(`Starting fun:: performLinkedInFollowActions on SocialPlatform:: ${platformConfig.name}`);

    const followUsers = async () => {
        const followButtons = await page.$$('button.follow.feed-follows-module-recommendation__follow-btn, button.follow.update-components-actor__follow-button');

        // Randomly follow fewer users (e.g., 1-2)
        for (let i = 0; i < Math.floor(Math.random() * 2) + 1; i++) { // Follow 1-2 users
            if (followButtons.length > 0) {
                const randomButtonIndex = Math.floor(Math.random() * followButtons.length);
                const buttonToClick = followButtons[randomButtonIndex];

                // Scroll the button into view before clicking
                await page.evaluate((btn) => {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, buttonToClick);
                await dynamicWait(100, 300);

                // Click the follow button
                await buttonToClick.click();
                logger.log('Clicked follow button');

                // Change the button's border to red after clicking
                await page.evaluate((btn) => {
                    btn.style.border = '2px solid red';
                }, buttonToClick);

                // Wait after clicking the follow button
                await dynamicWait(3000, 6000);
            }
        }
    };

    // Call followUsers function to execute the following action
    await followUsers();

    logger.log('Finished fun:: performLinkedInFollowActions');
}

// Function to perform LinkedIn Network Actions
export async function performLinkedInNetworkActions(page: Page, logger: Logger) {
    logger.log(`Starting fun:: performLinkedInNetworkActions on SocialPlatform:: ${platformConfig.name}`);

    // Hover and click on the "My Network" link
    await page.hover('a[href*="linkedin.com/mynetwork"]');
    await page.click('a[href*="linkedin.com/mynetwork"]');

    // Wait for the new page to load properly
    await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    logger.log('Navigated to My Network page');

    await waitForElement(page, '.artdeco-card.artdeco-card--with-hover.discover-entity-type-card button.artdeco-button--secondary span.artdeco-button__text');

    const allNetworkButtons = await page.$$('.artdeco-card.artdeco-card--with-hover.discover-entity-type-card button.artdeco-button--secondary span.artdeco-button__text');

    // Hover over invitation buttons, then randomly click Ignore or Accept
    const handleInvitations = async () => {
        const invitationActions = await page.$$('.invitation-card__action-container button');
        const totalInvitations = invitationActions.length;
        const maxInvitationsToProcess = Math.floor(totalInvitations * 0.5); // Process up to 50%

        for (let i = 0; i < maxInvitationsToProcess; i++) {
            const randomIndex = Math.floor(Math.random() * invitationActions.length);
            const ignoreBtn = invitationActions[randomIndex * 2]; // Assuming Ignore and Accept are in pairs
            const acceptBtn = invitationActions[randomIndex * 2 + 1];

            // Hover over both buttons
            await ignoreBtn.hover();
            await acceptBtn.hover();

            // Randomly decide to click Ignore or Accept
            if (Math.random() > 0.5) {
                await acceptBtn.click();
                logger.log('Accepted invitation');
            } else {
                await ignoreBtn.click();
                logger.log('Ignored invitation');
            }

            // Wait before moving to the next invitation
            await dynamicWait(200, 400);
        }
    };

    // Look for 'Connect' buttons and click randomly
    const handleConnectButtons = async () => {
        const connectButtons = (await Promise.all(allNetworkButtons.map(async (button) => {
            const text = await button.evaluate(el => el.innerText);
            logger.log(`in handleConnectButtons ;;;; ${text}`);
            return text.includes('Connect') ? button : null;
        }))).filter((button): button is ElementHandle<HTMLButtonElement> => button !== null); // Type guard

        if (connectButtons.length > 0) {
            const randomIndex = Math.floor(Math.random() * connectButtons.length);
            await connectButtons[randomIndex].hover();
            await connectButtons[randomIndex].click();
            logger.log('Clicked Connect button');
            await dynamicWait(300, 500);
        }
    };

    // Look for 'Subscribe' buttons and click randomly
    const handleSubscribeButtons = async () => {
        const subscribeButtons = (await Promise.all(allNetworkButtons.map(async (button) => {
            const text = await button.evaluate(el => el.innerText);
            return text.includes('Subscribe') ? button : null;
        }))).filter((button): button is ElementHandle<HTMLButtonElement> => button !== null); // Type guard

        if (subscribeButtons.length > 0) {
            const randomIndex = Math.floor(Math.random() * subscribeButtons.length);
            await subscribeButtons[randomIndex].hover();
            await subscribeButtons[randomIndex].click();
            logger.log('Clicked Subscribe button');
            await dynamicWait(300, 500);
        }
    };


    const randomValue = Math.random() * 100; // Get a random value between 0 and 100

    // Execute the various actions
    if (randomValue >= 20 && randomValue <= 70) { // handleConnectButtons on chance 50%
        await handleConnectButtons();
    }
    if (randomValue >= 40 && randomValue <= 60) { // handleInvitations on chance 20%
        await handleInvitations();
    }
    if (randomValue >= 5 && randomValue <= 20) { // handleSubscribeButtons on chance 15%
        await handleSubscribeButtons();
    }

    logger.log('Finished fun:: performLinkedInNetworkActions');
}

async function linkedinCompanyProfileAct(page: Page, companyURL: string, logger: Logger) {

    const noResultsElement = await page.$('.search-reusable-search-no-results.artdeco-card.mb2');
    if (noResultsElement) {
        logger.log("checkCompanyPageResultsAndRetry::> No results found");
        await page.goBack();
    }

    // Loop through search results and assign random IDs
    const companiesLinks = await page.$$('ul.reusable-search__entity-result-list li.reusable-search__result-container');
    if (companiesLinks.length === 0) {
        logger.error('No search results found.');
        return;
    }

    for (let i = 0; i < companiesLinks.length; i++) {
        const result = companiesLinks[i];

        // Assign a random ID to each result container
        const randomID = generateRandomID();
        await page.evaluate((el, id) => el.setAttribute('data-random-id', id), result, randomID);

        // Extract the company link
        const linkElement = await result.$('a.app-aware-link');
        const selectedLink = linkElement ? await page.evaluate(el => el.href, linkElement) : null;

        if (selectedLink === companyURL) {
            logger.log(`link matched: ${selectedLink}`);

            await page.goto(selectedLink);
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

            await goToAndLikeCompanyPosts(page, logger);
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
            break;
        } else {
            await page.evaluate((el) => {
                el.style.border = '1px solid red';
            }, result);
        }
    }

}
async function facebookCompanyProfileAct(page: Page, companyURL: string, logger: Logger) {
    // Step 1: Select all divs within the feed
    let allFbPageFeeds = await page.$$('div[aria-label="Search results"] div[role="feed"] > div');

    // Step 2: Loop through all feed divs
    for (let i = 0; i < 10; i++) {
        let currentDiv = allFbPageFeeds[i];

        // Highlight the current div for debugging
        await page.evaluate((currentDiv) => {
            if (currentDiv) currentDiv.style.border = '10px solid red';
        }, currentDiv);

        // Step 3: Look for the a tag inside div.html-div div[role="article"]
        const anchorTag = await currentDiv.$('div.html-div div[role="article"] a');

        if (anchorTag) {
            // Get the href attribute of the anchor tag
            const anchorHref = await page.evaluate((aTag: any) => aTag.getAttribute('href'), anchorTag);
            logger.log(`line 625 >>>> ${anchorTag} :::: ${anchorHref} :::: ${companyURL}`)
            // Step 4: Check if the href matches the companyURL
            if (anchorHref && (anchorHref.split('?')[0] === companyURL || anchorHref === companyURL)) {
                // If found, click the anchor tag
                await anchorTag.click();
                console.log(`Clicked on the link with href: ${companyURL}`);

                await dynamicWait(10, 40);

                if (platformConfig.postReactionDiv) {
                    await likeRandomPostsWithReactions(page, 5, logger);
                } else {
                    await likeRandomPosts(page, 5, logger);
                }

                await dynamicWait(20, 50);

                break; // Stop the loop once the link is found and clicked
            } else {
                // Otherwise, remove the current div
                await page.evaluate((div) => div.remove(), currentDiv);
                console.log(`Removed a div without the matching href.`);
            }
            await dynamicWait(30, 60);
        } else {
            // Remove the div if no anchor tag is found
            await page.evaluate((div) => div.remove(), currentDiv);
            console.log(`Removed a div without any link.`);
        }

        await dynamicWait(300, 500);

    }
}

async function instagramCompanyProfileAct(page: Page, companyURL: string, logger: Logger) {
    // Counter to limit likes
    let likesCount = 0;
    await dynamicWait(3000, 5000);

    // Wait for the main content area to load
    await page.waitForSelector('main[role="main"] > div > div:nth-child(3)');
    let companyPosts = await page.$$('main[role="main"] > div > div:nth-child(3) a[role="link"][href*="/theredstoneai"]');

    // Randomize the order of company posts
    companyPosts.sort(() => Math.random() - 0.5);

    for (let post of companyPosts) {
        try {
            // Scroll post into view, hover over it, and click to open
            await page.evaluate(element => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), post);
            await post.hover();
            await dynamicWait(1000, 3000);
            await post.click();

            // Wait for the post to load and check if it's already liked
            const isLiked = await page.$('section div[role="button"] svg[aria-label="Unlike"]');
            const likeButtonParent = await page.$('section div[role="button"]:has(svg[aria-label="Like"])');

            if (isLiked) {
                logger.log("Post already liked, skipping.");
            } else if (likeButtonParent && likesCount < noOfCompanyPostsToReact) {
                // Highlight the Like button parent to visually indicate it's being clicked
                await page.evaluate((btn) => {
                    btn.style.border = '10px solid red';
                }, likeButtonParent);

                // Hover over and click the Like button parent
                await dynamicWait(3000, 8000);
                await likeButtonParent.hover();
                await likeButtonParent.click();

                // Wait for the "Unlike" button to confirm the post was liked
                await page.waitForSelector('section div[role="button"] svg[aria-label="Unlike"]', { timeout: 5000 });

                // Change the border color of the Unlike button parent to blue to indicate success
                const unlikeButtonParent = await page.$('section div[role="button"]:has(svg[aria-label="Unlike"])');
                await page.evaluate((btn) => { if (btn) btn.style.border = '8px solid blue'; }, unlikeButtonParent);

                await dynamicWait(5000, 10000);
                logger.log("Post liked.");
                likesCount++;
            } else {
                logger.error("Like button not found, skipping post.");
            }

            await dynamicWait(1000, 2000);
            await scrollInstagramWithKeyboard(page, logger);
        } catch (error) {
            logger.error(`Error interacting with Instagram post: ${error}`);
        } finally {
            // Attempt to close the post in case of error or completion
            try {
                await page.click('svg[aria-label="Close"]');
            } catch (closeError) {
                logger.error(`Close button not available: ${closeError}`);
            }
        }
    }
}

async function scrollInstagramWithKeyboard(page: Page, logger: Logger) {
    const scrollTimes = Math.floor(Math.random() * 3) + 1; // Scroll 1-3 times for shorter duration

    for (let i = 0; i < scrollTimes; i++) {
        // Simulate pressing the "ArrowDown" key for smoother scrolling
        await page.keyboard.press('ArrowDown');
        await dynamicWait(5000, 10000); // 5-10 seconds delay
    }

    // Occasionally simulate pressing the "ArrowUp" key to scroll back up
    if (Math.random() < 0.3) {
        await page.keyboard.press('ArrowUp');
        await dynamicWait(3000, 5000); // 3-5 seconds delay
    }

    // Scroll down again using the "ArrowDown" key
    await page.keyboard.press('ArrowDown');
    await dynamicWait(3000, 7000); // 3-7 seconds delay
};
