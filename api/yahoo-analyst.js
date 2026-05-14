// Yahoo Finance Analyst Data API
// Uses yahoo-finance2 package for reliable data fetching
// FREE alternative to FMP for analyst data

const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
const cache = new Map();

const fetchYahooAnalystData = async (ticker) => {
  const symbol = ticker.toUpperCase();
  
  try {
    // yahoo-finance2 v3 requires constructor
    const YF = require('yahoo-finance2').default;
    const yf = new YF({ suppressNotices: ['yahooSurvey'] });
    
    const result = await yf.quoteSummary(symbol, {
      modules: ['recommendationTrend', 'financialData']
    });
    
    if (!result) {
      console.log(`❌ No result for ${symbol}`);
      return null;
    }
    
    const trend = result.recommendationTrend?.trend?.[0];
    const financialData = result.financialData;
    
    if (!trend) {
      console.log(`❌ No recommendation trend for ${symbol}`);
      return null;
    }
    
    // Calculate total analysts
    const total = (trend.strongBuy || 0) + (trend.buy || 0) + (trend.hold || 0) + (trend.sell || 0) + (trend.strongSell || 0);
    
    if (total === 0) {
      console.log(`❌ No analysts for ${symbol}`);
      return null;
    }
    
    // Calculate weighted mean (1=Strong Buy ... 5=Strong Sell)
    const weightedSum = 
      ((trend.strongBuy || 0) * 1) +
      ((trend.buy || 0) * 2) +
      ((trend.hold || 0) * 3) +
      ((trend.sell || 0) * 4) +
      ((trend.strongSell || 0) * 5);
    
    const mean = weightedSum / total;
    
    const targetPrice = financialData?.targetMeanPrice || null;
    const currentPrice = financialData?.currentPrice || null;
    
    console.log(`✅ Yahoo analyst data for ${symbol}: mean=${mean.toFixed(2)}, analysts=${total}, target=${targetPrice}`);
    
    return {
      ticker: symbol,
      mean: parseFloat(mean.toFixed(2)),
      analysts: total,
      breakdown: {
        strongBuy: trend.strongBuy || 0,
        buy: trend.buy || 0,
        hold: trend.hold || 0,
        sell: trend.sell || 0,
        strongSell: trend.strongSell || 0
      },
      targetPrice: targetPrice,
      currentPrice: currentPrice,
      source: 'Yahoo Finance',
      date: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Yahoo analyst error for ${symbol}:`, error.message);
    return null;
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
    const { tickers } = req.query;

    if (!tickers) {
      return res.status(400).json({ error: 'Missing tickers parameter' });
    }

    const tickerList = tickers.split(',').map(t => t.trim()).filter(Boolean);
    
    if (tickerList.length === 0) {
      return res.status(400).json({ error: 'No valid tickers provided' });
    }

    console.log(`🔍 Fetching Yahoo analyst data for: ${tickerList.join(', ')}`);

    // Check cache first
    const results = {};
    const tickersToFetch = [];

    for (const ticker of tickerList) {
      const cached = cache.get(ticker);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`✅ Cache hit for ${ticker}`);
        results[ticker] = cached.data;
      } else {
        tickersToFetch.push(ticker);
      }
    }

    // Fetch uncached tickers
    if (tickersToFetch.length > 0) {
      const promises = tickersToFetch.map(ticker => fetchYahooAnalystData(ticker));
      const fetchedData = await Promise.all(promises);

      fetchedData.forEach((data, index) => {
        const ticker = tickersToFetch[index];
        if (data) {
          results[ticker] = data;
          // Cache the result
          cache.set(ticker, {
            data,
            timestamp: Date.now()
          });
        }
      });
    }

    // Clean old cache entries (keep max 100 items)
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    const successCount = Object.keys(results).length;
    console.log(`📊 Yahoo analyst results: ${successCount}/${tickerList.length} tickers`);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.json({
      results,
      count: successCount,
      total: tickerList.length,
      source: 'Yahoo Finance'
    });

  } catch (error) {
    console.error('❌ Yahoo analyst API error:', error);
    return res.status(500).json({ 
      error: error.message,
      results: {}
    });
  }
};
