// News API - FMP ticker-specific news + Yahoo fallback for general queries
// FMP gives REAL ticker news (not random soccer/football news like Yahoo does)

const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache

// Clean ticker to plain symbol (strip exchange prefix/suffix)
const cleanTicker = (ticker) => {
  if (!ticker) return ticker;
  // Strip exchange prefix like NASDAQ:AAPL, XETR:JEDI, etc.
  if (ticker.includes(':')) {
    const parts = ticker.split(':');
    // Find part that looks like a ticker (1-6 uppercase letters)
    const tickerPart = parts.find(p => /^[A-Z]{1,6}$/.test(p));
    if (tickerPart) return tickerPart;
  }
  // Strip exchange suffix like .DE, .L, .PA, .AS
  if (ticker.includes('.')) {
    return ticker.split('.')[0];
  }
  return ticker;
};

// Fetch news from Yahoo Finance for a specific ticker
const fetchYahooNewsForTicker = async (ticker) => {
  const symbol = cleanTicker(ticker);
  
  try {
    // Yahoo Finance news endpoint - more reliable than FMP
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q="${symbol}"&newsCount=10&quotesCount=0`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`Yahoo news failed for ${symbol}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    if (!data.news || !Array.isArray(data.news)) return [];
    
    return data.news.map(article => ({
      title: article.title,
      link: article.link || article.url,
      publisher: article.publisher || 'Unknown',
      publishedAt: article.providerPublishTime ? article.providerPublishTime * 1000 : Date.now(),
      ticker: symbol,
      relatedTickers: article.relatedTickers || [symbol],
      thumbnail: article.thumbnail?.resolutions?.[0]?.url || null,
      query: ticker
    }));
  } catch (error) {
    console.error(`Yahoo news error for ${symbol}:`, error.message);
    return [];
  }
};

// Yahoo search for general market queries (fallback only)
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
    return (data.news || []).map(article => ({
      title: article.title,
      link: article.link || article.url,
      publisher: article.publisher || 'Unknown',
      publishedAt: article.providerPublishTime ? article.providerPublishTime * 1000 : Date.now(),
      ticker: article.relatedTickers?.[0] || null,
      relatedTickers: article.relatedTickers || [],
      thumbnail: article.thumbnail?.resolutions?.[0]?.url || null,
      query
    }));
    
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
  
  // Build search inputs
  const tickerList = tickers ? tickers.split(',').map(t => t.trim()).filter(t => t) : [];
  const queryList = queries ? queries.split('|').map(q => q.trim()).filter(q => q) : [];
  
  // Default to general market queries if nothing specified
  const useDefaultQueries = tickerList.length === 0 && queryList.length === 0;
  const finalQueries = useDefaultQueries 
    ? ['stock market', 'S&P 500', 'tech stocks', 'NVIDIA', 'AI stocks']
    : queryList;
  
  // Check cache
  const cacheKey = `${tickerList.join(',')}|${finalQueries.join(',')}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }
  
  try {
    // Fetch ticker news from Yahoo (ticker-specific news with quotes for exact match)
    // Fetch query news from Yahoo (general market searches)
    const [tickerNewsResults, queryNewsResults] = await Promise.all([
      Promise.all(tickerList.slice(0, 8).map(t => fetchYahooNewsForTicker(t))),
      Promise.all(finalQueries.slice(0, 5).map(q => fetchNewsForQuery(q)))
    ]);
    
    // Flatten and deduplicate
    const allNews = [];
    const seenLinks = new Set();
    
    [...tickerNewsResults, ...queryNewsResults].forEach(newsArr => {
      newsArr.forEach(article => {
        const link = article.link;
        if (link && !seenLinks.has(link)) {
          seenLinks.add(link);
          allNews.push(article);
        }
      });
    });
    
    // Sort by publishedAt (newest first) and limit
    allNews.sort((a, b) => b.publishedAt - a.publishedAt);
    const topNews = allNews.slice(0, 20);
    
    const responseData = {
      news: topNews,
      count: topNews.length,
      queries: [...tickerList, ...finalQueries],
      tickers: tickerList,
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
