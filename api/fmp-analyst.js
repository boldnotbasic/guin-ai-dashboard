// FMP Analyst Recommendations API
// Uses Financial Modeling Prep for reliable analyst data

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY;

const CACHE = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

// Fetch analyst estimates from FMP
const fetchFMPAnalystData = async (ticker) => {
  if (!FMP_API_KEY) {
    throw new Error('FMP_API_KEY not configured');
  }
  
  try {
    // Analyst estimates endpoint
    const url = `${FMP_BASE_URL}/analyst-estimates/${ticker}?apikey=${FMP_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`FMP analyst data failed for ${ticker}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Get most recent estimate
    const latest = data[0];
    
    // Calculate mean rating from estimates
    // FMP provides: estimatedRevenueLow, estimatedRevenueHigh, estimatedRevenueAvg
    // We need to fetch grade data separately
    
    return {
      ticker: ticker,
      estimatedRevenue: latest.estimatedRevenueAvg,
      estimatedEPS: latest.estimatedEpsAvg,
      numberOfAnalysts: latest.numberAnalystEstimatedRevenue || null,
      date: latest.date
    };
  } catch (error) {
    console.error(`FMP analyst fetch error for ${ticker}:`, error.message);
    return null;
  }
};

// Fetch stock grade (Buy/Hold/Sell) from FMP
const fetchFMPGrade = async (ticker) => {
  if (!FMP_API_KEY) {
    console.error('FMP_API_KEY not configured');
    throw new Error('FMP_API_KEY not configured');
  }
  
  try {
    const url = `${FMP_BASE_URL}/grade/${ticker}?apikey=${FMP_API_KEY}`;
    console.log(`Fetching FMP grade for ${ticker}: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`FMP grade failed for ${ticker}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`FMP grade data for ${ticker}:`, JSON.stringify(data).substring(0, 500));
    
    if (!data || data.length === 0) {
      console.log(`FMP grade returned no data for ${ticker}`);
      return null;
    }
    
    // Aggregate recent grades (last 30 days)
    const recentGrades = data.slice(0, 10); // Last 10 grades
    
    let buyCount = 0;
    let holdCount = 0;
    let sellCount = 0;
    
    recentGrades.forEach(grade => {
      const g = grade.newGrade?.toLowerCase() || '';
      if (g.includes('buy') || g.includes('outperform') || g.includes('overweight')) {
        buyCount++;
      } else if (g.includes('hold') || g.includes('neutral') || g.includes('equal')) {
        holdCount++;
      } else if (g.includes('sell') || g.includes('underperform') || g.includes('underweight')) {
        sellCount++;
      }
    });
    
    const total = buyCount + holdCount + sellCount;
    
    if (total === 0) return null;
    
    // Calculate weighted mean (1=Strong Buy, 5=Strong Sell)
    // Simplified: Buy=1.5, Hold=3, Sell=4.5
    const weightedSum = (buyCount * 1.5) + (holdCount * 3) + (sellCount * 4.5);
    const mean = weightedSum / total;
    
    return {
      mean: mean,
      analysts: total,
      breakdown: {
        strongBuy: Math.floor(buyCount * 0.4),
        buy: Math.ceil(buyCount * 0.6),
        hold: holdCount,
        sell: Math.ceil(sellCount * 0.6),
        strongSell: Math.floor(sellCount * 0.4),
      },
      recentGrades: recentGrades.slice(0, 5).map(g => ({
        firm: g.gradingCompany,
        grade: g.newGrade,
        date: g.date
      }))
    };
  } catch (error) {
    console.error(`FMP grade fetch error for ${ticker}:`, error.message);
    return null;
  }
};

// Fetch price target from FMP
const fetchFMPPriceTarget = async (ticker) => {
  if (!FMP_API_KEY) {
    throw new Error('FMP_API_KEY not configured');
  }
  
  try {
    const url = `${FMP_BASE_URL}/price-target/${ticker}?apikey=${FMP_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Get most recent price target
    const latest = data[0];
    
    return {
      targetPrice: latest.adjPriceTarget,
      targetHigh: latest.priceTargetHigh,
      targetLow: latest.priceTargetLow,
      analysts: latest.numberOfAnalysts || null
    };
  } catch (error) {
    console.error(`FMP price target error for ${ticker}:`, error.message);
    return null;
  }
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
    return res.status(500).json({ error: 'FMP_API_KEY not configured in environment variables' });
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
    
    // Fetch data for each ticker (limit to 20 to stay within rate limits)
    const limited = tickerList.slice(0, 20);
    
    await Promise.all(limited.map(async (ticker) => {
      try {
        // Fetch grade (most important for Buy/Hold/Sell)
        const grade = await fetchFMPGrade(ticker);
        
        // Fetch price target
        const priceTarget = await fetchFMPPriceTarget(ticker);
        
        if (grade || priceTarget) {
          results[ticker] = {
            ticker: ticker,
            mean: grade?.mean || null,
            analysts: grade?.analysts || priceTarget?.analysts || null,
            breakdown: grade?.breakdown || null,
            targetPrice: priceTarget?.targetPrice || null,
            targetHigh: priceTarget?.targetHigh || null,
            targetLow: priceTarget?.targetLow || null,
            recentGrades: grade?.recentGrades || null,
            source: 'FMP'
          };
        }
      } catch (error) {
        console.error(`Error fetching ${ticker}:`, error.message);
      }
    }));
    
    const responseData = {
      results,
      count: Object.keys(results).length,
      source: 'Financial Modeling Prep',
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
