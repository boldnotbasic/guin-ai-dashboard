// Earnings API - Yahoo Finance earnings data via quoteSummary
// Returns next earnings date and history

const CACHE = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours cache

const convertToYahooTicker = (tvTicker) => {
  if (!tvTicker || !tvTicker.includes(':')) return tvTicker;
  
  const parts = tvTicker.split(':');
  let exchange, symbol;
  
  if (parts[0].length <= 6 && /^[A-Z]+$/.test(parts[0])) {
    exchange = parts[0];
    symbol = parts[1];
  } else {
    symbol = parts[0];
    exchange = parts[1];
  }
  
  const exchangeMap = {
    'XETR': '.DE', 'XFRA': '.F', 'XAMS': '.AS', 'XBRU': '.BR',
    'XPAR': '.PA', 'XLON': '.L', 'XSWX': '.SW', 'XMIL': '.MI',
    'XLIS': '.LS', 'XSTO': '.ST', 'XCSE': '.CO', 'XHEL': '.HE',
    'XOSL': '.OL', 'XMAD': '.MC', 'XHKG': '.HK', 'XTKS': '.T',
    'XASX': '.AX', 'XTSE': '.TO', 'XSHG': '.SS', 'XSHE': '.SZ',
    'NASDAQ': '', 'NYSE': '', 'XNAS': '', 'XNYS': '', 'AMEX': '',
  };
  
  const suffix = exchangeMap[exchange];
  if (suffix === undefined) return symbol;
  return symbol + suffix;
};

const fetchEarnings = async (ticker) => {
  const yahooTicker = convertToYahooTicker(ticker);
  
  try {
    // Use Yahoo Finance quoteSummary for earnings data
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooTicker}?modules=earnings,calendarEvents,earningsHistory,price`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo returned ${response.status}`);
    }
    
    const data = await response.json();
    const result = data?.quoteSummary?.result?.[0];
    
    if (!result) return null;
    
    const calendar = result.calendarEvents?.earnings;
    const history = result.earningsHistory?.history || [];
    const price = result.price;
    
    let nextEarningsDate = null;
    if (calendar?.earningsDate?.[0]?.raw) {
      nextEarningsDate = calendar.earningsDate[0].raw * 1000; // Convert to ms
    }
    
    const earningsHistory = history
      .filter(h => h.epsActual?.raw != null)
      .map(h => ({
        date: h.quarter?.fmt,
        epsActual: h.epsActual?.raw,
        epsEstimate: h.epsEstimate?.raw,
        epsDifference: h.epsDifference?.raw,
        surprisePercent: h.surprisePercent?.raw,
      }))
      .reverse(); // Most recent first
    
    return {
      ticker,
      yahooTicker,
      name: price?.shortName || price?.longName || ticker,
      currency: price?.currency || 'USD',
      nextEarningsDate,
      estimatedEPS: calendar?.earningsAverage?.raw || null,
      estimatedRevenueLow: calendar?.revenueLow?.raw || null,
      estimatedRevenueHigh: calendar?.revenueHigh?.raw || null,
      history: earningsHistory,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`Earnings error for ${ticker}:`, error.message);
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
    
    // Fetch in parallel batches of 5
    const batchSize = 5;
    for (let i = 0; i < tickerList.length; i += batchSize) {
      const batch = tickerList.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(t => fetchEarnings(t)));
      
      batch.forEach((ticker, idx) => {
        if (batchResults[idx]) {
          results[ticker] = batchResults[idx];
        }
      });
      
      // Small delay between batches
      if (i + batchSize < tickerList.length) {
        await new Promise(r => setTimeout(r, 200));
      }
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
