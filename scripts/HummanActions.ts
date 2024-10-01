import { Page } from 'puppeteer';

export async function performHumanLikeActions(page: Page) {
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

export async function likeRandomPosts(page: Page, count: number) {
    // Step 1: Select all unliked "like" buttons from the feed-shared-social-action-bar elements
    const likeButtons = await page.$$(
        '.feed-shared-social-action-bar--full-width .react-button__trigger[aria-label="React Like"]'
    );

    // Step 2: Check if there are enough posts to like
    const availableCount = likeButtons.length;
    if (availableCount === 0) {
        console.log("No unliked posts available.");
        return;
    }

    console.log(`Found ${availableCount} unliked posts.`);

    // Step 3: Shuffle the buttons to randomize the selection
    const shuffled = likeButtons.sort(() => 0.5 - Math.random());

    // Step 4: Select up to 'count' number of buttons, or fewer if there aren't enough
    const selected = shuffled.slice(0, Math.min(count, availableCount));

    // Step 5: Iterate over the selected buttons
    for (const button of selected) {
        // Scroll the button into view
        await button.evaluate(b => b.scrollIntoView({ behavior: 'smooth', block: 'center' }));

        // Step 6: Click the button
        await button.click();

        // Step 7: Introduce a random delay (between 1 and 5 seconds) after each click
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 4000));
    }

    console.log(`Successfully liked ${selected.length} posts.`);
}