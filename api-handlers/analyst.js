// Analyst Recommendations API - Yahoo Finance
// Returns real analyst ratings: Strong Buy, Buy, Hold, Underperform, Sell

const CACHE = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache (analyst data doesn't change often)

// Convert TradingView ticker to Yahoo Finance format
const tradingViewToYahoo = (tvTicker) => {
  if (!tvTicker || !tvTicker.includes(':')) return tvTicker;
  
  const parts = tvTicker.split(':');
  let exchange, symbol;
  
  if (parts[0].length <= 6 && parts[0] === parts[0].toUpperCase() && /^[A-Z]+$/.test(parts[0])) {
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

// Fetch analyst data from Yahoo Finance
const fetchAnalystData = async (ticker) => {
  const yahooTicker = tradingViewToYahoo(ticker);
  
  // Try multiple Yahoo Finance endpoints for analyst data
  const endpoints = [
    // quoteSummary with recommendationTrend module
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooTicker}?modules=recommendationTrend,financialData,price`,
    // v7 quote endpoint (has averageAnalystRating)
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooTicker}`,
  ];
  
  let analystData = null;
  
  // Try quoteSummary first (most detailed)
  try {
    const response = await fetch(endpoints[0], {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const result = data.quoteSummary?.result?.[0];
      
      if (result) {
        const trend = result.recommendationTrend?.trend?.[0]; // Current month
        const financial = result.financialData;
        const price = result.price;
        
        if (trend) {
          const total = (trend.strongBuy || 0) + (trend.buy || 0) + (trend.hold || 0) + 
                       (trend.sell || 0) + (trend.strongSell || 0);
          
          // Calculate weighted mean (1=Strong Buy, 5=Strong Sell)
          let weightedSum = 0;
          weightedSum += (trend.strongBuy || 0) * 1;
          weightedSum += (trend.buy || 0) * 2;
          weightedSum += (trend.hold || 0) * 3;
          weightedSum += (trend.sell || 0) * 4;
          weightedSum += (trend.strongSell || 0) * 5;
          
          const mean = total > 0 ? weightedSum / total : null;
          
          analystData = {
            ticker: ticker,
            yahooTicker: yahooTicker,
            mean: mean,
            analysts: total,
            breakdown: {
              strongBuy: trend.strongBuy || 0,
              buy: trend.buy || 0,
              hold: trend.hold || 0,
              sell: trend.sell || 0,
              strongSell: trend.strongSell || 0,
            },
            targetPrice: financial?.targetMeanPrice?.raw || null,
            targetHigh: financial?.targetHighPrice?.raw || null,
            targetLow: financial?.targetLowPrice?.raw || null,
            currentPrice: price?.regularMarketPrice?.raw || null,
            recommendation: financial?.recommendationKey || null,
            numberOfAnalystOpinions: financial?.numberOfAnalystOpinions?.raw || total,
          };
        }
      }
    }
  } catch (e) {
    console.log(`quoteSummary failed for ${yahooTicker}:`, e.message);
  }
  
  // Fallback to v7 quote if quoteSummary failed
  if (!analystData) {
    try {
      const response = await fetch(endpoints[1], {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const quote = data.quoteResponse?.result?.[0];
        
        if (quote && quote.averageAnalystRating) {
          // Parse rating like "1.8 - Buy" or "2.5 - Hold"
          const ratingStr = quote.averageAnalystRating;
          const match = ratingStr.match(/^([\d.]+)\s*-\s*(.+)$/);
          
          analystData = {
            ticker: ticker,
            yahooTicker: yahooTicker,
            mean: match ? parseFloat(match[1]) : null,
            analysts: null, // v7 doesn't provide count
            breakdown: null,
            targetPrice: quote.targetPriceMean || null,
            targetHigh: quote.targetPriceHigh || null,
            targetLow: quote.targetPriceLow || null,
            currentPrice: quote.regularMarketPrice || null,
            recommendation: match ? match[2].toLowerCase() : null,
            ratingString: ratingStr,
          };
        }
      }
    } catch (e) {
      console.log(`v7 quote failed for ${yahooTicker}:`, e.message);
    }
  }
  
  return analystData;
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
  const cacheKey = tickerList.sort().join(',');
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }
  
  try {
    const results = {};
    
    // Fetch analyst data for each ticker (limit to 20 to avoid rate limits)
    const limited = tickerList.slice(0, 20);
    
    await Promise.all(limited.map(async (ticker) => {
      const data = await fetchAnalystData(ticker);
      if (data) {
        results[ticker] = data;
      }
    }));
    
    // Calculate summary stats
    const withData = Object.values(results).filter(r => r.mean !== null);
    const avgMean = withData.length > 0 
      ? withData.reduce((sum, r) => sum + r.mean, 0) / withData.length 
      : null;
    
    const responseData = {
      results,
      count: Object.keys(results).length,
      withAnalystData: withData.length,
      averageMean: avgMean,
      timestamp: new Date().toISOString()
    };
    
    CACHE.set(cacheKey, { data: responseData, timestamp: Date.now() });
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.json(responseData);
    
  } catch (error) {
    console.error('Analyst API error:', error.message);
    return res.status(500).json({ error: error.message, results: {} });
  }
};
