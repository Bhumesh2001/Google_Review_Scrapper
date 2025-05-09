const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const scrapeReviews = require('./scraper/scrapeReviews');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('dashboard');
});

app.post('/scrape-reviews', async (req, res) => {
    const { input } = req.body;
    if (!input) {
        return res.status(400).json({ success: false, message: 'Input is required' });
    }

    try {
        const reviews = await scrapeReviews(input);
        res.status(200).json({ success: true, reviews });
    } catch (err) {
        console.error('Error scraping reviews:', err.message);
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to fetch reviews. Please try again later.'
        });
    }
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
