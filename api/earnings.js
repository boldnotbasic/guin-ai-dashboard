// Earnings API - Uses Alpha Vantage (server-side, no CORS issues)
// Returns next earnings date and history per ticker

const CACHE = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours cache

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'UGNO5IK8X988V0LK';
const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

// Convert TradingView ticker to clean symbol
const cleanTicker = (ticker) => {
  if (!ticker) return ticker;
  // Remove exchange prefixes/suffixes
  if (ticker.includes(':')) {
    const parts = ticker.split(':');
    // First part is symbol if longer, second if shorter
    return parts[0].length <= 6 && /^[A-Z]+$/.test(parts[0]) ? parts[1] : parts[0];
  }
  // Remove suffixes like .DE, .AS
  return ticker.replace(/\.(DE|F|AS|L|PA|MI|SW|BR|LS|ST|CO|HE|OL|MC|HK|T|AX|TO|SS|SZ)$/i, '');
};

// Fetch earnings from Alpha Vantage EARNINGS endpoint
const fetchAlphaVantageEarnings = async (symbol) => {
  try {
    const url = `${ALPHA_VANTAGE_BASE}?function=EARNINGS&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.Note || data.Information) {
      console.log(`Alpha Vantage rate limit/info for ${symbol}:`, data.Note || data.Information);
      return null;
    }
    
    const annualEarnings = data.annualEarnings || [];
    const quarterlyEarnings = data.quarterlyEarnings || [];
    
    if (quarterlyEarnings.length === 0 && annualEarnings.length === 0) {
      return null;
    }
    
    // Get earnings history (last 8 quarters)
    const history = quarterlyEarnings.slice(0, 8).map(q => ({
      date: q.fiscalDateEnding,
      reportedDate: q.reportedDate,
      epsActual: parseFloat(q.reportedEPS) || null,
      epsEstimate: parseFloat(q.estimatedEPS) || null,
      surprisePercent: parseFloat(q.surprisePercentage) || null,
    }));
    
    // Find next earnings date - try EARNINGS_CALENDAR endpoint
    let nextEarningsDate = null;
    let estimatedEPS = null;
    
    try {
      const calUrl = `${ALPHA_VANTAGE_BASE}?function=EARNINGS_CALENDAR&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
      const calResponse = await fetch(calUrl);
      const csvText = await calResponse.text();
      
      if (csvText && csvText.includes('symbol')) {
        const lines = csvText.trim().split('\n');
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim());
          const symbolIdx = headers.indexOf('symbol');
          const reportDateIdx = headers.indexOf('reportDate');
          const estimateIdx = headers.indexOf('estimate');
          
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim());
            if (cols[symbolIdx] === symbol && cols[reportDateIdx]) {
              const date = new Date(cols[reportDateIdx]);
              if (date >= new Date()) {
                nextEarningsDate = date.getTime();
                estimatedEPS = parseFloat(cols[estimateIdx]) || null;
                break;
              }
            }
          }
        }
      }
    } catch (e) {
      // Calendar fetch failed, continue without next date
    }
    
    return {
      symbol,
      nextEarningsDate,
      estimatedEPS,
      history,
      currency: 'USD',
    };
    
  } catch (error) {
    console.error(`Alpha Vantage error for ${symbol}:`, error.message);
    return null;
  }
};

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
  
  const tickerList = tickers.split(',').map(t => t.trim()).filter(t => t);
  
  if (tickerList.length === 0) {
    return res.status(400).json({ error: 'No valid tickers' });
  }
  
  // Check cache
  const cacheKey = tickers;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }
  
  try {
    const results = {};
    
    // Process serially to respect Alpha Vantage rate limit (5 calls/min on free tier)
    // Limit to 10 tickers to stay within rate limits
    const limited = tickerList.slice(0, 10);
    
    for (const originalTicker of limited) {
      const symbol = cleanTicker(originalTicker);
      const data = await fetchAlphaVantageEarnings(symbol);
      
      if (data) {
        results[originalTicker] = {
          ...data,
          ticker: originalTicker,
          name: originalTicker,
        };
      }
      
      // 200ms delay between calls
      await new Promise(r => setTimeout(r, 200));
    }
    
    const responseData = {
      results,
      count: Object.keys(results).length,
      withUpcomingEarnings: Object.values(results).filter(r => r.nextEarningsDate).length,
      timestamp: new Date().toISOString()
    };
    
    CACHE.set(cacheKey, { data: responseData, timestamp: Date.now() });
    
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');
    return res.json(responseData);
    
  } catch (error) {
    console.error('Earnings error:', error.message);
    return res.status(500).json({ error: error.message, results: {} });
  }
};
