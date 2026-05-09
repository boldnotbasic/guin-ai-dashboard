// News API - Yahoo Finance news search
// No CORS issues, returns market news

const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache

const fetchNewsForQuery = async (query) => {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=10&quotesCount=0`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.news || [];
    
  } catch (error) {
    console.error(`News error for ${query}:`, error.message);
    return [];
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const { tickers, queries } = req.query;
  
  // Build search queries
  let searchQueries = [];
  if (tickers) {
    searchQueries = tickers.split(',').map(t => t.trim()).filter(t => t);
  } else if (queries) {
    searchQueries = queries.split('|').map(q => q.trim()).filter(q => q);
  } else {
    // Default market queries
    searchQueries = ['stock market', 'S&P 500', 'tech stocks', 'NVIDIA', 'AI stocks'];
  }
  
  // Check cache
  const cacheKey = searchQueries.join(',');
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }
  
  try {
    // Fetch news in parallel
    const allNewsResults = await Promise.all(
      searchQueries.slice(0, 5).map(q => fetchNewsForQuery(q))
    );
    
    // Flatten and deduplicate
    const allNews = [];
    const seenLinks = new Set();
    
    allNewsResults.forEach((newsArr, queryIdx) => {
      newsArr.forEach(article => {
        const link = article.link || article.url;
        if (link && !seenLinks.has(link)) {
          seenLinks.add(link);
          allNews.push({
            title: article.title,
            link: link,
            publisher: article.publisher || 'Unknown',
            publishedAt: article.providerPublishTime ? article.providerPublishTime * 1000 : Date.now(),
            ticker: article.relatedTickers?.[0] || null,
            relatedTickers: article.relatedTickers || [],
            thumbnail: article.thumbnail?.resolutions?.[0]?.url || null,
            query: searchQueries[queryIdx]
          });
        }
      });
    });
    
    // Sort by publishedAt (newest first) and limit
    allNews.sort((a, b) => b.publishedAt - a.publishedAt);
    const topNews = allNews.slice(0, 20);
    
    const responseData = {
      news: topNews,
      count: topNews.length,
      queries: searchQueries,
      timestamp: new Date().toISOString()
    };
    
    CACHE.set(cacheKey, { data: responseData, timestamp: Date.now() });
    
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.json(responseData);
    
  } catch (error) {
    console.error('News error:', error.message);
    return res.status(500).json({ error: error.message, news: [] });
  }
};
