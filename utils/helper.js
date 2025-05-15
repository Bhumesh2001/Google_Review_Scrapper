const axios = require('axios');
const { URL } = require('url');

/**
 * Detects if input is a g.co short URL or a raw place name.
 * If URL, fetches and resolves to the place name from redirect.
 * @param {string} input - Place name or g.co short URL
 * @returns {Promise<string>} - Resolved place name
 */
async function getPlaceName(input) {
    // Simple check for URL
    const isUrl = input.startsWith('http://') || input.startsWith('https://');

    if (!isUrl) {
        // Input is already a place name
        return input.trim();
    }

    try {
        const response = await axios.get(input, {
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400,
        });

        const redirectUrl = response.headers.location;
        const parsedUrl = new URL(redirectUrl);
        const query = parsedUrl.searchParams.get('q');

        if (!query) {
            throw new Error('No place name found in redirect URL');
        }

        return query;
    } catch (error) {
        throw new Error(`Failed to resolve place name from URL: ${error.message}`);
    }
};

module.exports = getPlaceName;