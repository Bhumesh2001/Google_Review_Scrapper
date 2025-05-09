const puppeteer = require('puppeteer');

async function scrapeReviews(placeName) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true, // Set true for production
            defaultViewport: null,
            args: ['--start-maximized'],
        });

        const page = await browser.newPage();
        await page.goto('https://www.google.co.in/maps', { waitUntil: 'networkidle2' });

        // Search for the place
        await page.waitForSelector('input#searchboxinput', { visible: true });
        await page.type('input#searchboxinput', placeName, { delay: 50 });
        await page.click('button#searchbox-searchbutton');

        // Wait for the reviews button to appear
        await page.waitForSelector(`button[aria-label^="Reviews for ${placeName}"]`, { visible: true, timeout: 10000 });
        await page.click(`button[aria-label^="Reviews for ${placeName}"]`);

        // Wait for reviews to load
        await page.waitForSelector('.jftiEf', { visible: true });

        // Scroll reviews container multiple times
        const scrollContainerSelector = '.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd';
        const scrollTimes = 8;

        for (let i = 0; i < scrollTimes; i++) {
            await page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (el) el.scrollBy(0, 500);
            }, scrollContainerSelector);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Click "See more" buttons to expand comments
        await page.evaluate(() => {
            document.querySelectorAll('button[aria-label^="See more"]').forEach(btn => btn.click());
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Extract reviews
        const reviews = await page.evaluate(() => {
            const reviewEls = document.querySelectorAll('.jftiEf');
            return Array.from(reviewEls).slice(0, 10).map(el => ({
                name: el.querySelector('.d4r55')?.textContent?.trim() || 'N/A',
                rating:
                    parseFloat(
                        el.querySelector('.kvMYJc')?.getAttribute('aria-label')?.replace(/[^\d.]/g, '')
                    ) || 'N/A',
                date: el.querySelector('.rsqaWe')?.textContent?.trim() || 'N/A',
                comment: el.querySelector('.wiI7pd')?.textContent?.trim().replace(/\n/g, ' ') || 'N/A',
            }));
        });

        // console.log(reviews);
        return reviews;

    } catch (error) {
        console.error('Scraping failed:', error.message);
        throw new Error('Could not scrape reviews.');
    } finally {
        if (browser) await browser.close();
    }
};

// scrapeReviews('Statue of Liberty');
module.exports = scrapeReviews;
