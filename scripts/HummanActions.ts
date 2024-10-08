import { Page } from 'puppeteer';
import { sendContentToGPT } from './BusinessLogics';
const companyPosts: string | number | undefined = process.env.NO_OF_COMPANY_POSTS;
const noOfCompanyPostsToReact: number = companyPosts ? parseInt(companyPosts) : 3;

export async function performHumanActions(page: Page) {
    // Wait on the page for a random time between 2 to 5 seconds
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // Scroll the page
    await page.evaluate(() => {
        window.scrollBy(0, Math.random() * 500);
    });

    // Wait again
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Select some text randomly
    await page.evaluate(() => {
        const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        if (elements.length > 0) {
            const randomElement = elements[Math.floor(Math.random() * elements.length)];
            const text = randomElement.textContent || '';
            if (text.length > 0) {
                const start = Math.floor(Math.random() * text.length);
                const end = Math.min(start + Math.floor(Math.random() * 10) + 1, text.length);

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

    // Wait after selection
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
}

export async function typeWithHumanLikeSpeed(page: Page, selector: string, text: string): Promise<void> {
    return new Promise(async (resolve) => {
        await page.focus(selector);

        for (const char of text) {
            await page.type(selector, char, { delay: 50 + Math.random() * 100 }); // 22-40 WPM
            await new Promise(res => setTimeout(res, Math.random() * 50)); // Additional random delay between keystrokes
        }

        resolve();
    });
}

export async function likeRandomPosts(page: Page, count: number): Promise<void> {
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
            console.log(`Found enough unliked posts (${availableCount} available).`);
            break;
        }

        console.log(`Found ${availableCount} unliked posts so far. Scrolling down to load more posts...`);

        // Step 2: Scroll to the bottom of the page to load more posts
        previousHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds to load more posts

        // Step 3: Check if we have reached the end of the page
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        if (newHeight === previousHeight) {
            console.log("Reached the bottom of the page, no more posts to load.");
            break;
        }
    }

    // Step 4: Shuffle the buttons to randomize the selection
    const shuffled = likeButtons.sort(() => 0.5 - Math.random());

    // Step 5: Select up to 'count' number of buttons, or fewer if there aren't enough
    const selected = shuffled.slice(0, Math.min(count, likeButtons.length));

    // Step 6: Iterate over the selected buttons and click them
    for (const button of selected) {
        // Scroll the button into view
        await button.evaluate((b: { scrollIntoView: (arg0: { behavior: string; block: string; }) => any; }) => b.scrollIntoView({ behavior: 'smooth', block: 'center' }));

        // Click the button
        await button.click();

        // Introduce a random delay (between 1 and 5 seconds) after each click
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 4000));
    }

    console.log(`Successfully liked ${selected.length} posts.`);
}

export async function performLinkedInSearchAndLike(page: Page, searchQuery: string) {
    // Check if the search input is directly available
    const searchInput = await page.$('[data-view-name="search-global-typeahead-input"]');

    if (!searchInput) {
        // If not, look for the search button and click it
        const searchButton = await page.$('#global-nav-search');
        if (searchButton) {
            await searchButton.click();
            await page.waitForSelector('[data-view-name="search-global-typeahead-input"]', { visible: true });
        } else {
            console.log("Couldn't find search input or button");
            return;
        }
    }

    // Focus on the search input
    await page.focus('[data-view-name="search-global-typeahead-input"]');

    // Clear the search input field
    await page.$eval('[data-view-name="search-global-typeahead-input"]', (input) => {
        (input as HTMLInputElement).value = ''; // Clear the input field
    });

    // Wait for a random delay to simulate human behavior
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Type search query with human-like speed
    await typeWithHumanLikeSpeed(page, '[data-view-name="search-global-typeahead-input"]', searchQuery);

    // Press Enter to search
    await page.keyboard.press('Enter');
    await page.waitForNavigation();
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Check if results are relevant; if not, click "Companies"
    const companiesButton = await page.$('div#search-reusables__filters-bar a'); // Select all anchor tags
    if (companiesButton) {
        const buttonText = await page.evaluate(element => element.textContent, companiesButton);
        if (buttonText && buttonText.includes("Companies")) {
            await companiesButton.click();
            await page.waitForNavigation();
        }
    }

    // Now check if the relevant results are displayed
    const companyLink = await page.$('div[data-view-name="search-entity-result-universal-template"] a.app-aware-link');

    if (companyLink) {
        await companyLink.click();
        await page.waitForNavigation();

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 600));
        // After navigating to the company page, go to the "Posts" tab and like posts
        await goToAndLikeCompanyPosts(page);  // Call the new function to go to "Posts" and like
    } else {
        console.log("No company links found.");
    }

}

// Function to like posts on the company's "Posts" page
async function goToAndLikeCompanyPosts(page: Page) {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    // Find the "Posts" section in the navigation bar
    const postsTab = await page.$('ul.org-page-navigation__items a[href*="/posts/"]');

    await performHumanActions(page);

    // Scroll to top
    await page.evaluate(() => {
        window.scrollBy(0, 0);
    });

    if (postsTab) {
        // Click the "Posts" tab
        await postsTab.click();
        await page.waitForNavigation();

        // Optionally, wait a bit for the posts to load
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

        console.log("noOfCompanyPostsToReact:: ", noOfCompanyPostsToReact);
        // Like posts after navigating to the "Posts" section
        await likeRandomPostsWithReactions(page, noOfCompanyPostsToReact);
    } else {
        console.log('Posts tab not found on company page');
    }
}

export async function likeRandomPostsWithReactions(page: Page, count: number): Promise<void> {
    let posts: any[] = [];
    let previousHeight = 0;

    // Step 1: Continuously scroll and gather posts until enough are found or no more content is loaded
    while (posts.length < count) {
        const newPosts = await page.$$('.feed-container-theme > .scaffold-finite-scroll > .scaffold-finite-scroll__content > div');
        console.log("Total Posts Found: ", newPosts.length);

        for (const post of newPosts) {
            const postId = await post.evaluate(el => el.id);
            if (!posts.some(p => p.evaluate((el: { id: any; }) => el.id) === postId)) {
                const shouldProcess = await shouldProcessPost(post);
                if (shouldProcess) {
                    posts.push(post);
                } else {
                    await post.evaluate(el => {
                        el.style.border = '1px solid red';
                        setTimeout(() => {
                            el.remove()
                        }, 1800)
                    });
                }
            }
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 12000));

        }

        if (posts.length >= count) {
            console.log(`Found enough posts to process (${posts.length} available).`);
            break;
        }

        // console.log(`Found ${posts.length} posts to process so far. Scrolling down to load more posts...`);

        previousHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        if (newHeight === previousHeight) {
            console.log('Reached the bottom of the page, no more posts to load.');
            break;
        }
    }

    // const selected = posts.sort(() => 0.5 - Math.random()).slice(0, count);
    console.log(`Found ${posts.length} posts to process...`);

    for (const post of posts) {
        await interactWithPost(page, post);
        // Remove the processed post
        await post.evaluate((el: { remove: () => any; }) => el.remove());
    }

    console.log(`Successfully interacted with ${posts.length} posts.`);
    // await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 120000));
}

async function shouldProcessPost(post: any): Promise<boolean> { // this function will check if the post is already reacted by the user or not.
    const isNotLiked = await post.$('.feed-shared-social-action-bar--full-width .react-button__trigger[aria-label*="React"]');
    // const hasComments = await post.$('.feed-shared-social-action-bar__action-button[aria-label="Comment"]');

    return isNotLiked; // if it is not liked, it means return true
}

async function interactWithPost(page: Page, post: any): Promise<void> {
    await post.evaluate((el: { scrollIntoView: (arg0: { behavior: string; block: string; }) => any; }) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Handle "see more" button
    try {
        const seeMoreButton = await post.$('.feed-shared-inline-show-more-text__see-more-less-toggle');
        if (seeMoreButton) {
            await seeMoreButton.click();
            console.log('Clicked "see more" to reveal full post content.');
        }
    } catch (error) {
        console.error('Error clicking "see more" button:', error);
    }

    // Extract post content
    const postHTML = await post.evaluate(() => {
        const descriptionWrapper = document.querySelector('.feed-shared-update-v2__description-wrapper');
        return descriptionWrapper ? descriptionWrapper.textContent?.trim() : '';
    });
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const commentButton = await post.$('button[aria-label="Comment"]');
    if (commentButton) {
        await commentButton.click();
    }

    // Random delay between actions
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 4000));

    // Extract comments
    const comments = await extractComments(page);

    if (postHTML) {
        // Generate comment and reaction using GPT
        const { comment, reaction } = await sendContentToGPT(postHTML, comments);
        console.log('Generated Comment:', comment);
        console.log('Suggested Reaction:', reaction);

        // Apply reaction
        await applyReaction(page, post, reaction);

        // Add comment
        await addComment(page, comment);
    }
}

async function extractComments(page: Page): Promise<string[]> {
    return await page.evaluate(() => {
        const commentElements = document.querySelectorAll('.feed-shared-inline-show-more-text.comments-comment-item__inline-show-more-text span[dir="ltr"]');
        const extractedComments: string[] = [];
        commentElements.forEach(commentElement => {
            if (commentElement.textContent) {
                extractedComments.push(commentElement.textContent.trim());
            }
        });
        return extractedComments.slice(0, 5);
    });
}

async function applyReaction(page: Page, post: any, reaction: string): Promise<void> {
    const likeButton = await post.$('.feed-shared-social-action-bar--full-width .react-button__trigger[aria-label="React Like"]');
    if (!likeButton) {
        console.log('Like button not found.');
        return;
    }

    await likeButton.hover();
    await page.waitForSelector('.reactions-menu--active', { visible: true });

    const reactionMapping: { [key: string]: string } = {
        like: 'React Like',
        love: 'React Love',
        support: 'React Support',
        insightful: 'React Insightful',
        funny: 'React Funny'
    };

    const reactionLabel = reactionMapping[reaction.toLowerCase()];

    if (reactionLabel) {
        const reactionButton = await page.$(`.reactions-menu--active button[aria-label="${reactionLabel}"]`);
        if (reactionButton) {
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 800));
            await reactionButton.click();
            console.log(`Applied reaction: ${reaction}`);
        } else {
            console.log(`Failed to find the button for the reaction: ${reactionLabel}`);
        }
    } else {
        console.log('Invalid reaction from GPT-4.');
    }
}

async function addComment(page: Page, comment: string): Promise<void> {
    const commentBoxSelector = '.comments-comment-box--cr .editor-content.ql-container';
    const commentBox = await page.$(commentBoxSelector);

    if (commentBox) {
        await commentBox.click();

        await typeWithHumanLikeSpeed(page, commentBoxSelector, comment);

        console.log(`Inserted comment: ${comment}`);

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 400));

        const submitButton = await page.$('.comments-comment-box__submit-button--cr');
        if (submitButton) {
            await submitButton.click();
            console.log('Submitted the comment.');
        } else {
            console.log('Submit button not found.');
        }
    } else {
        console.log('Comment box not found.');
    }
}