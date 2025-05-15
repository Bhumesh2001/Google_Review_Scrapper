const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer');

async function scrapeReviews(placeName, numReviews = 10, retries = 1) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        let browser;
        try {
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                headless: false,
                timeout: 30000,
            });

            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForSelector('input#searchboxinput', { visible: true, timeout: 5000 });
            await page.type('input#searchboxinput', placeName, { delay: 50 });
            await page.click('button#searchbox-searchbutton');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });

            const isListView = await page.$('.Nv2PK') !== null;
            return isListView ? await scrapeMultiplePlaces(page, numReviews) : await scrapeSinglePlace(page, numReviews);

        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt === retries) throw new Error(`Failed after ${retries} retries: ${error.message}`);
        } finally {
            if (browser) await browser.close().catch(err => console.error('Close error:', err));
        }
    }
};

async function scrapeSinglePlace(page, numReviews) {
    const allReviews = [];

    await page.waitForSelector('button[aria-label*="Reviews"]', { visible: true, timeout: 10000 });
    const reviewsButton = await page.$('button[aria-label*="Reviews"]');
    if (!reviewsButton) {
        console.log('No reviews button found.');
        return allReviews;
    }
    await reviewsButton.click();
    await page.waitForSelector('.jftiEf', { visible: true, timeout: 5000 });

    await scrollReviews(page, numReviews);
    await expandComments(page);

    const reviews = await extractReviews(page, numReviews);
    allReviews.push({ location: 'Place 1', reviews });
    return allReviews;
};

async function scrapeMultiplePlaces(page, numReviews) {
    const allReviews = [];
    let placeHandles = await page.$$('.Nv2PK');

    for (let i = 0; i < placeHandles.length; i++) {
        try {
            await placeHandles[i].hover();
            await placeHandles[i].click();
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });

            await page.waitForSelector('button[aria-label*="Reviews"]', { visible: true, timeout: 10000 });
            const reviewsButton = await page.$('button[aria-label*="Reviews"]');
            if (!reviewsButton) continue;

            await reviewsButton.click();
            await page.waitForSelector('.jftiEf', { visible: true, timeout: 5000 });

            await scrollReviews(page, numReviews);
            await expandComments(page);

            const reviews = await extractReviews(page, numReviews);
            allReviews.push({ location: `Place ${i + 1}`, reviews });

            await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 });
            await page.waitForSelector('.Nv2PK', { visible: true, timeout: 10000 });
            placeHandles = await page.$$('.Nv2PK');

        } catch (err) {
            console.error(`Error on place ${i + 1}:`, err.message);
            continue;
        }
    }
    return allReviews;
};

async function scrollReviews(page, numReviews) {
    const scrollContainerSelector = '.m6QErb.DxyBCb.kA9KIf.dS8AEf';
    let lastCount = 0, stagnant = 0, maxScrolls = 10;

    for (let j = 0; j < maxScrolls; j++) {
        const count = await page.evaluate(() => document.querySelectorAll('.jftiEf').length);
        if (count >= numReviews) break;

        if (count === lastCount) {
            if (++stagnant >= 3) break;
        } else stagnant = 0;

        lastCount = count;
        await page.evaluate(selector => {
            const el = document.querySelector(selector);
            if (el) el.scrollBy(0, 1000);
        }, scrollContainerSelector);

        await new Promise(resolve => setTimeout(resolve, 1500));
    }
};

async function expandComments(page) {
    await page.evaluate(() => {
        document.querySelectorAll('button[aria-label^="See more"]').forEach(btn => btn.click());
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
};

async function extractReviews(page, numReviews) {
    return await page.evaluate(num => {
        const els = document.querySelectorAll('.jftiEf');
        return Array.from(els).slice(0, num).map(el => {
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
};

module.exports = scrapeReviews;