// FMP Analyst Recommendations API - Uses NEW /stable/ endpoints
// Returns real analyst ratings: Strong Buy, Buy, Hold, Sell, Strong Sell

const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const FMP_API_KEY = process.env.FMP_API_KEY;

const CACHE = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

// Convert TradingView ticker to plain symbol
const cleanTicker = (ticker) => {
  if (!ticker) return ticker;
  // Remove exchange prefix (NASDAQ:AAPL -> AAPL)
  if (ticker.includes(':')) {
    const parts = ticker.split(':');
    // Take the part that looks like a symbol
    return parts.find(p => /^[A-Z]{1,6}$/.test(p)) || parts[1] || ticker;
  }
  return ticker;
};

// Fetch analyst grades historical (Strong Buy/Buy/Hold/Sell/Strong Sell counts)
const fetchGradesHistorical = async (symbol) => {
  try {
    const url = `${FMP_BASE_URL}/grades-historical?symbol=${symbol}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`FMP grades-historical failed for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    // Get most recent breakdown
    const latest = data[0];
    
    return {
      strongBuy: latest.analystRatingsStrongBuy || 0,
      buy: latest.analystRatingsBuy || 0,
      hold: latest.analystRatingsHold || 0,
      sell: latest.analystRatingsSell || 0,
      strongSell: latest.analystRatingsStrongSell || 0,
      date: latest.date,
    };
  } catch (e) {
    console.log(`FMP grades-historical error for ${symbol}:`, e.message);
    return null;
  }
};

// Fetch price target summary
const fetchPriceTarget = async (symbol) => {
  try {
    const url = `${FMP_BASE_URL}/price-target-summary?symbol=${symbol}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    
    const latest = data[0];
    return {
      targetPrice: latest.lastMonthAvgPriceTarget || latest.lastQuarterAvgPriceTarget || latest.lastYearAvgPriceTarget,
      analystCount: latest.lastMonthCount || latest.lastQuarterCount || latest.lastYearCount || 0,
    };
  } catch (e) {
    return null;
  }
};

// Fetch ratings snapshot (overall score)
const fetchRatingsSnapshot = async (symbol) => {
  try {
    const url = `${FMP_BASE_URL}/ratings-snapshot?symbol=${symbol}&apikey=${FMP_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    
    return {
      rating: data[0].rating,
      overallScore: data[0].overallScore,
    };
  } catch (e) {
    return null;
  }
};

// Get analyst data for a single ticker
const getAnalystData = async (ticker) => {
  const symbol = cleanTicker(ticker);
  
  // Fetch in parallel
  const [grades, priceTarget, ratings] = await Promise.all([
    fetchGradesHistorical(symbol),
    fetchPriceTarget(symbol),
    fetchRatingsSnapshot(symbol),
  ]);
  
  if (!grades) return null;
  
  const total = grades.strongBuy + grades.buy + grades.hold + grades.sell + grades.strongSell;
  
  if (total === 0) return null;
  
  // Calculate weighted mean (1=Strong Buy, 5=Strong Sell)
  const weightedSum = 
    (grades.strongBuy * 1) +
    (grades.buy * 2) +
    (grades.hold * 3) +
    (grades.sell * 4) +
    (grades.strongSell * 5);
  const mean = weightedSum / total;
  
  return {
    ticker: ticker,
    mean: mean,
    analysts: total,
    breakdown: {
      strongBuy: grades.strongBuy,
      buy: grades.buy,
      hold: grades.hold,
      sell: grades.sell,
      strongSell: grades.strongSell,
    },
    targetPrice: priceTarget?.targetPrice || null,
    rating: ratings?.rating || null,
    overallScore: ratings?.overallScore || null,
    date: grades.date,
    source: 'FMP'
  };
};

// Main handler
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const { tickers } = req.query;
  
  if (!tickers) {
    return res.status(400).json({ error: 'Missing tickers parameter' });
  }
  
  if (!FMP_API_KEY) {
    return res.status(500).json({ 
      error: 'FMP_API_KEY not configured in environment variables',
      hint: 'Add FMP_API_KEY to your Vercel environment variables'
    });
  }
  
  const tickerList = tickers.split(',').map(t => t.trim()).filter(t => t);
  
  if (tickerList.length === 0) {
    return res.status(400).json({ error: 'No valid tickers' });
  }
  
  // Check cache
  const cacheKey = tickerList.sort().join(',');
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }
  
  try {
    const results = {};
    
    // Process in batches to respect rate limits (limit to 25 tickers)
    const limited = tickerList.slice(0, 25);
    
    // Fetch all in parallel
    const dataPromises = limited.map(async (ticker) => {
      try {
        const data = await getAnalystData(ticker);
        if (data) {
          results[ticker] = data;
        }
      } catch (error) {
        console.error(`Error fetching ${ticker}:`, error.message);
      }
    });
    
    await Promise.all(dataPromises);
    
    const responseData = {
      results,
      count: Object.keys(results).length,
      total: tickerList.length,
      source: 'Financial Modeling Prep (stable)',
      timestamp: new Date().toISOString()
    };
    
    CACHE.set(cacheKey, { data: responseData, timestamp: Date.now() });
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.json(responseData);
    
  } catch (error) {
    console.error('FMP Analyst API error:', error.message);
    return res.status(500).json({ error: error.message, results: {} });
  }
};
