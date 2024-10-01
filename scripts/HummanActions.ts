import { Page } from 'puppeteer';

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
    // clear the search bar first
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

    // Now focus on the search input
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

    // Like posts on the search results page
    await likeRandomPosts(page, 10);

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Check for "See all post results" button
    const seeAllPostsButton = await page.$('div.search-results__cluster-bottom-banner a[href*="/search/results/content/"]');
    if (seeAllPostsButton) {

        await seeAllPostsButton.click();
        await page.waitForNavigation();

        console.log("search result page");

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        // Like all posts on the results page
        await likeRandomPosts(page, 10);
    }
}