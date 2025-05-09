# 🗺️ Google Review Scraper

This is a Node.js-based web scraper that uses Puppeteer to extract user reviews from Google Maps for any specified place or business. It automates browser interaction to collect review details like name, rating, date, and comment.

## ✨ Features

- Scrape up to 10 reviews per location.
- Handles Google Maps UI interactions with Puppeteer.
- Displays loading spinner while fetching reviews.
- Error handling and user-friendly alerts.

## 🛠️ Technologies

- Node.js
- Express.js
- Puppeteer
- Bootstrap (Frontend)
- EJS Templating Engine

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/google-review-scraper.git
cd google-review-scraper

npm install
npm run dev
Then open your browser and visit: http://localhost:3000

🧪 Usage
Enter a Google Maps URL or business name (e.g., Statue of Liberty or Starbucks).

Click Scrape Reviews.

Reviews will be displayed in a clean interface.

.
├── scraper/
│   └── scrapeReviews.js  # Puppeteer logic
├── views/
│   └── dashboard.ejs     # Frontend UI
├── public/
│   └── styles.css        # Custom styling
├── index.js              # Express server

