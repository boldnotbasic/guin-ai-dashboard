// Dutch Financial News API
// Fetches Dutch financial news from Beursduivel.be

const cheerio = require('cheerio');
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache
let cache = null;
let cacheTime = 0;

const fetchDutchNews = async () => {
  // Return cached data if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return cache;
  }

  try {
    const response = await fetch('https://www.beursduivel.be/nieuws/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Beursduivel.be returned ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const articles = [];
    const seen = new Set();

    // Beursduivel.be uses class "timelist__title" for article titles
    $('.timelist__title a').each((i, elem) => {
      if (articles.length >= 10) return false;
      
      const $elem = $(elem);
      const href = $elem.attr('href');
      const title = $elem.text().trim();
      
      if (!href || !title) return;
      
      // Avoid duplicates
      if (seen.has(title)) return;
      seen.add(title);

      articles.push({
        title,
        link: href.startsWith('http') ? href : `https://www.beursduivel.be${href}`,
        publishedAt: new Date(),
        publisher: 'Beursduivel.be',
        source: 'Beursduivel.be'
      });
    });

    cache = articles;
    cacheTime = Date.now();
    
    console.log(`✅ Fetched ${articles.length} articles from Beursduivel.be`);
    return articles;

  } catch (error) {
    console.error('❌ Beursduivel.be news error:', error.message);
    return [];
  }
};

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const articles = await fetchDutchNews();
    
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.json({
      articles,
      count: articles.length,
      source: 'Beursduivel.be'
    });

  } catch (error) {
    console.error('Dutch news API error:', error);
    return res.status(500).json({ 
      error: error.message,
      articles: []
    });
  }
};
