// Stock Search API - Yahoo Finance search proxy
// No CORS issues, fast results

const CACHE = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache for search results

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const { q, count = 8 } = req.query;
  
  if (!q || q.length < 1) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }
  
  // Check cache
  const cacheKey = `${q}_${count}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }
  
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${count}&newsCount=0`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo returned ${response.status}`);
    }
    
    const data = await response.json();
    
    const results = (data.quotes || [])
      .filter(q => q.symbol && (q.shortname || q.longname))
      .map(q => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        sector: q.typeDisp || q.quoteType || '',
        exchange: q.exchDisp || q.exchange || '',
      }));
    
    const responseData = {
      query: q,
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    };
    
    CACHE.set(cacheKey, { data: responseData, timestamp: Date.now() });
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.json(responseData);
    
  } catch (error) {
    console.error('Search error:', error.message);
    return res.status(500).json({ 
      error: 'Search failed', 
      message: error.message,
      results: []
    });
  }
};
