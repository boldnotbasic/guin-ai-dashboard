// Yahoo Finance Analyst Data - Uses /api/yahoo-analyst route
// Works both locally (via setupProxy) and on Vercel (serverless function)

import axios from 'axios';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const cache = new Map();

export const fetchYahooAnalystBatch = async (tickers) => {
  if (!tickers || tickers.length === 0) return {};
  
  console.log('🔍 Fetching Yahoo analyst data for:', tickers);
  
  // Check cache first
  const uncached = [];
  const results = {};
  
  tickers.forEach(ticker => {
    const cached = cache.get(ticker);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      results[ticker] = cached.data;
    } else {
      uncached.push(ticker);
    }
  });
  
  if (uncached.length === 0) {
    console.log(`✅ All ${tickers.length} from cache`);
    return results;
  }
  
  try {
    const response = await axios.get('/api/yahoo-analyst', {
      params: { tickers: uncached.join(',') },
      timeout: 15000
    });
    
    if (response.data?.results) {
      Object.entries(response.data.results).forEach(([ticker, data]) => {
        results[ticker] = data;
        cache.set(ticker, { data, timestamp: Date.now() });
      });
    }
    
    console.log(`📊 Got Yahoo analyst data for ${Object.keys(results).length}/${tickers.length} tickers`);
  } catch (error) {
    console.error('❌ Yahoo analyst API error:', error.message);
    // If API route fails, return whatever we have from cache
  }
  
  return results;
};
