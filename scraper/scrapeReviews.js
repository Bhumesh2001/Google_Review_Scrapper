const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
// const fs = require('fs');

async function scrapeReviews(placeName, numReviews = 10, retries = 1) {
    let browser;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                headless: true,
                timeout: 30000,
            });

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Navigate to Google Maps
            await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 15000 });

            // Search for the place
            await page.waitForSelector('input#searchboxinput', { visible: true, timeout: 5000 });
            await page.type('input#searchboxinput', placeName, { delay: 50 });
            await page.click('button#searchbox-searchbutton');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });

            // Wait for search results to load
            await page.waitForSelector('.Nv2PK', { visible: true, timeout: 10000 });

            const allReviews = [];

            // Get all place cards
            let placeHandles = await page.$$('.Nv2PK');

            for (let i = 0; i < placeHandles.length; i++) {
                // console.log(`Scraping place ${i + 1} of ${placeHandles.length}`);

                try {
                    // Scroll into view and click the place card
                    await placeHandles[i].hover();
                    await placeHandles[i].click();
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });

                    // Wait for the reviews button
                    await page.waitForSelector('button[aria-label*="Reviews"]', { visible: true, timeout: 10000 });

                    const reviewsButton = await page.$('button[aria-label*="Reviews"]');
                    if (!reviewsButton) {
                        console.log('No reviews button found for this place.');
                        continue;
                    }

                    await reviewsButton.click();
                    await page.waitForSelector('.jftiEf', { visible: true, timeout: 5000 });

                    const scrollContainerSelector = '.m6QErb.DxyBCb.kA9KIf.dS8AEf';
                    let lastReviewCount = 0;
                    let stagnantCount = 0;
                    const maxScrolls = 10;

                    for (let j = 0; j < maxScrolls; j++) {
                        const reviewCount = await page.evaluate(() => document.querySelectorAll('.jftiEf').length);
                        if (reviewCount >= numReviews) break;

                        if (reviewCount === lastReviewCount) {
                            stagnantCount++;
                            if (stagnantCount >= 3) break;
                        } else {
                            stagnantCount = 0;
                        }

                        lastReviewCount = reviewCount;

                        await page.evaluate((selector) => {
                            const el = document.querySelector(selector);
                            if (el) el.scrollBy(0, 1000);
                        }, scrollContainerSelector);
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    };

                    // Click "See more" buttons to expand comments
                    await page.evaluate(() => {
                        document.querySelectorAll('button[aria-label^="See more"]').forEach(btn => btn.click());
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const reviews = await page.evaluate((numReviews) => {
                        const reviewEls = document.querySelectorAll('.jftiEf');
                        return Array.from(reviewEls).slice(0, numReviews).map(el => {
                            const ratingText = el.querySelector('.kvMYJc')?.getAttribute('aria-label') || '';
                            const rating = parseFloat(ratingText.match(/\d+(\.\d+)?/)?.[0]) || 'N/A';
                            return {
                                name: el.querySelector('.d4r55')?.textContent?.trim() || 'Anonymous',
                                rating,
                                date: el.querySelector('.rsqaWe')?.textContent?.trim() || 'N/A',
                                comment: el.querySelector('.wiI7pd')?.textContent?.trim().replace(/\n/g, ' ') || 'No comment',
                            };
                        });
                    }, numReviews);

                    allReviews.push({
                        location: `Place ${i + 1}`,
                        reviews,
                    });

                    // Go back to the search results page
                    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 });
                    await page.waitForSelector('.Nv2PK', { visible: true, timeout: 10000 });
                    placeHandles = await page.$$('.Nv2PK'); // Refresh handles after navigation

                } catch (err) {
                    console.error(`Error scraping place ${i + 1}:`, err.message);
                    continue;
                };
            };

            return allReviews;

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt === retries) {
                throw new Error(`Failed to scrape reviews after ${retries} attempts: ${error.message}`);
            }
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (e) {
                    console.error('Failed to close browser:', e);
                };
            };
        }
    }
};

// scrapeReviews('Taj Mahal')
//     .then(data => {
//         const allReviews = data.flatMap(place => place.reviews);
//         console.log('All Reviews:', allReviews);
//         fs.writeFileSync('reviews.json', JSON.stringify(allReviews, null, 2));
//     })
//     .catch(error => {
//         console.error('Error:', error);
//     });

module.exports = scrapeReviews;