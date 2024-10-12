import { Page } from 'puppeteer';
import Logger from './logger';

const companyPosts: string | number | undefined = process.env.NO_OF_COMPANY_POSTS;
const noOfCompanyPostsToReact: number = companyPosts ? parseInt(companyPosts) : 3;

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
    logger.log('Starting fun:: performHumanActions');
    // Function to wait for a random time
    const wait = async (min: number, max: number) => {
        const time = min + Math.random() * (max - min);
        await new Promise(resolve => setTimeout(resolve, time));
    };

    // Scroll behavior - scroll down, then scroll back up, and then skip some content
    const scrollRandomly = async () => {
        const scrollTimes = Math.floor(Math.random() * 3) + 1; // Scroll 1-3 times

        for (let i = 0; i < scrollTimes; i++) {
            // Scroll down by random amounts between 300 to 800 pixels
            await page.evaluate(() => {
                window.scrollBy(0, 300 + Math.random() * 500);
            });

            // Simulate reading by waiting a bit after scrolling
            await wait(5000, 15000); // 5-15 seconds delay (simulate reading)
        }

        // Occasionally scroll back up
        if (Math.random() < 0.5) {
            await page.evaluate(() => {
                window.scrollBy(0, -(200 + Math.random() * 300)); // Scroll back up a bit
            });
            await wait(3000, 8000); // 3-8 seconds delay (simulating thinking or checking back)
        }

        // Scroll down again after "rechecking"
        await page.evaluate(() => {
            window.scrollBy(0, 400 + Math.random() * 600); // Scroll down by random amounts
        });

        // Simulate reading again
        await wait(6000, 15000); // 6-15 seconds delay
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
        await scrollRandomly();  // Scroll down, possibly scroll back up
        await selectRandomText(); // Select random text
        await wait(2000, 5000);   // Wait between 2-5 seconds after selecting text
    }

    logger.log('Finished fun:: performHumanActions');
}

export async function typeWithHumanLikeSpeed(page: Page, selector: string, text: string, logger: Logger): Promise<void> {
    logger.log('Starting fun:: typeWithHumanLikeSpeed');
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
    logger.log('Starting fun:: likeRandomPosts');
    let likeButtons: any[] = [];
    let previousHeight = 0;

    const wait = async (min: number, max: number) => {
        const time = min + Math.random() * (max - min);
        await new Promise(resolve => setTimeout(resolve, time));
    };

    // Step 1: Continuously scroll, simulate reading, and gather "Like" buttons
    while (likeButtons.length < count) {
        // Collect unliked "Like" buttons
        const newButtons = await page.$$(
            '.feed-shared-social-action-bar--full-width .react-button__trigger[aria-label="React Like"]'
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
        await wait(4000, 7000); // Simulate reading by waiting 4-7 seconds after scrolling

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

        await wait(5000, 12000); // Simulate reading for 5-12 seconds

        // Click the "Like" button
        await button.click();

        // Introduce a random delay after clicking "Like"
        await wait(3000, 8000); // Wait 3-8 seconds before moving to the next post
    }
    logger.log('Finished fun:: likeRandomPosts');
}

export async function performLinkedInSearchAndLike(page: Page, searchQuery: string, logger: Logger, companyURL: string) {
    logger.log('Starting fun:: performLinkedInSearchAndLike');
    // Wait for search input to be available
    await waitForElement(page, '[data-view-name="search-global-typeahead-input"]');

    // Check if search input is available
    const searchInput = await page.$('[data-view-name="search-global-typeahead-input"]');
    if (!searchInput) {
        const searchButton = await waitForElement(page, '#global-nav-search');
        if (searchButton) {
            await searchButton.click();
            await waitForElement(page, '[data-view-name="search-global-typeahead-input"]', 5, 1000);
        } else {
            logger.error("performLinkedInSearchAndLike::> Couldn't find search input or button");
            return;
        }
    }

    // Focus and clear the search input
    await page.focus('[data-view-name="search-global-typeahead-input"]');
    await page.$eval('[data-view-name="search-global-typeahead-input"]', (input) => {
        (input as HTMLInputElement).value = '';
    });

    // Wait before typing the search query
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Type search query with human-like speed
    await typeWithHumanLikeSpeed(page, '[data-view-name="search-global-typeahead-input"]', searchQuery, logger);

    // Press Enter and wait for navigation
    await page.keyboard.press('Enter');
    await page.waitForNavigation();
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    // Check for the Companies filter and click it if available
    const companiesButton = await page.$('div#search-reusables__filters-bar a');
    if (companiesButton) {
        const buttonText = await page.evaluate(element => element.textContent, companiesButton);
        if (buttonText && buttonText.includes("Companies")) {
            await companiesButton.click();
            await page.waitForNavigation();
        }
    }

    // Check for relevant company results and retry if necessary
    let companyLink = null;
    let retryAttempts = 0;
    const maxRetries = 3; // Set a limit for retries

    while (!companyLink && retryAttempts < maxRetries) {
        companyLink = await waitForElement(page, 'div[data-view-name="search-entity-result-universal-template"] a.app-aware-link', 5, 1000);

        if (companyLink) {
            // Check if "no results" message is displayed and retry with another link
            const shouldRetry = await checkCompanyPageResultsAndRetry(page, logger, companyURL);
            if (shouldRetry) {
                companyLink = null; // Reset the company link and try again
                retryAttempts++;
                logger.log(`Retrying... Attempt ${retryAttempts}/${maxRetries}`);
            }
        }
    }

    if (companyLink) {
        // Simulate reading the results before clicking
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
        await companyLink.click();
        await page.waitForNavigation();

        // Navigate to the company's "Posts" tab and like posts
        await goToAndLikeCompanyPosts(page, logger);
    } else {
        logger.error("performLinkedInSearchAndLike::> No company links found after retries.");
    }
    logger.log('Finished fun:: performLinkedInSearchAndLike');
}

export async function likeRandomPostsWithReactions(page: Page, count: number, logger: Logger): Promise<void> {
    logger.log('Starting fun:: likeRandomPostsWithReactions');
    try {
        let likeButtons: any[] = [];
        let previousHeight = 0;

        // Step 1: Continuously scroll and gather "like" buttons until enough are found or no more content is loaded
        while (likeButtons.length < count) {
            // Select all unliked "like" buttons from the feed-shared-social-action-bar elements
            likeButtons = await page.$$(
                '.feed-shared-social-action-bar--full-width .react-button__trigger[aria-label="React Like"]'
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
            await page.waitForSelector('.reactions-menu--active', { visible: true });

            // Step 8: Select a reaction to click
            const reactions = await page.$$('.reactions-menu--active button');

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
    logger.log('Finished fun:: likeRandomPostsWithReactions');
}

// Function to like posts on the company's "Posts" page
async function goToAndLikeCompanyPosts(page: Page, logger: Logger) {
    logger.log('Starting fun:: goToAndLikeCompanyPosts');
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
        await likeRandomPostsWithReactions(page, noOfCompanyPostsToReact, logger);
    } else {
        logger.error("goToAndLikeCompanyPosts::> Couldn't find the 'Posts' tab.");
    }
    logger.log('Finished fun:: goToAndLikeCompanyPosts');
}

// Function to check if "no results" element is present and retry with another link
async function checkCompanyPageResultsAndRetry(page: Page, logger: Logger, companyURL: string) {
    const noResultsElement = await page.$('.search-reusable-search-no-results.artdeco-card.mb2');
    if (page.url() !== companyURL) {
        return true; // company link is not matched, should retry
    } else if (noResultsElement) {
        logger.log("checkCompanyPageResultsAndRetry::> No results found, trying another link.");
        return true; // Indicates that the function found "no results" and should retry
    }
    return false; // No "no results" element found, so proceed with the current link
}