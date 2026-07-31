// Earnings API - Uses Alpha Vantage (server-side, no CORS issues)
// Returns next earnings date and history per ticker

const CACHE = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours cache (extended to work around rate limits)

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'UGNO5IK8X988V0LK';
const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

// Mock data for common tickers when APIs are rate-limited (fallback)
const MOCK_EARNINGS = {
  'NVDA': {
    nextEarningsDate: new Date('2026-05-20').getTime(),
    estimatedEPS: 4.56,
    history: [
      { date: '2025-11-14', reportedDate: '2025-11-14', epsActual: 0.81, epsEstimate: 0.75, surprisePercent: 8.0 },
      { date: '2025-08-28', reportedDate: '2025-08-28', epsActual: 0.67, epsEstimate: 0.64, surprisePercent: 4.7 },
      { date: '2025-05-28', reportedDate: '2025-05-28', epsActual: 0.88, epsEstimate: 0.81, surprisePercent: 8.6 },
    ]
  },
  'AAPL': {
    nextEarningsDate: new Date('2026-01-27').getTime(),
    estimatedEPS: 1.39,
    history: [
      { date: '2025-10-31', reportedDate: '2025-10-31', epsActual: 1.64, epsEstimate: 1.60, surprisePercent: 2.5 },
      { date: '2025-07-30', reportedDate: '2025-07-30', epsActual: 1.40, epsEstimate: 1.35, surprisePercent: 3.7 },
      { date: '2025-04-28', reportedDate: '2025-04-28', epsActual: 1.27, epsEstimate: 1.20, surprisePercent: 5.8 },
    ]
  },
  'MSFT': {
    nextEarningsDate: new Date('2026-01-21').getTime(),
    estimatedEPS: 2.82,
    history: [
      { date: '2025-10-23', reportedDate: '2025-10-23', epsActual: 3.30, epsEstimate: 3.10, surprisePercent: 6.5 },
      { date: '2025-07-24', reportedDate: '2025-07-24', epsActual: 2.95, epsEstimate: 2.80, surprisePercent: 5.4 },
      { date: '2025-04-24', reportedDate: '2025-04-24', epsActual: 2.66, epsEstimate: 2.55, surprisePercent: 4.3 },
    ]
  },
  'GOOGL': {
    nextEarningsDate: new Date('2026-02-03').getTime(),
    estimatedEPS: 1.85,
    history: [
      { date: '2025-10-28', reportedDate: '2025-10-28', epsActual: 2.12, epsEstimate: 2.00, surprisePercent: 6.0 },
      { date: '2025-07-23', reportedDate: '2025-07-23', epsActual: 1.89, epsEstimate: 1.80, surprisePercent: 5.0 },
      { date: '2025-04-24', reportedDate: '2025-04-24', epsActual: 1.57, epsEstimate: 1.50, surprisePercent: 4.7 },
    ]
  },
  'TSLA': {
    nextEarningsDate: new Date('2026-01-22').getTime(),
    estimatedEPS: 0.72,
    history: [
      { date: '2025-10-23', reportedDate: '2025-10-23', epsActual: 0.73, epsEstimate: 0.75, surprisePercent: -2.7 },
      { date: '2025-07-23', reportedDate: '2025-07-23', epsActual: 0.52, epsEstimate: 0.60, surprisePercent: -13.3 },
      { date: '2025-04-23', reportedDate: '2025-04-23', epsActual: 0.45, epsEstimate: 0.50, surprisePercent: -10.0 },
    ]
  }
};

// Convert TradingView ticker to clean symbol
const cleanTicker = (ticker) => {
  if (!ticker) return ticker;
  let t = ticker.trim().toUpperCase();
  // Remove exchange prefixes like XNAS:NVDA or NVDA:XNAS
  if (t.includes(':')) {
    const [a, b] = t.split(':');
    // Heuristic: prefer the token that looks like a symbol (letters+digits, <= 6-7 chars)
    const pickA = /^[A-Z0-9.-]{1,7}$/.test(a);
    const pickB = /^[A-Z0-9.-]{1,7}$/.test(b);
    t = pickA && !pickB ? a : (!pickA && pickB ? b : (a.length <= b.length ? a : b));
  }
  // Strip common Yahoo-style suffixes (keep base symbol for Alpha Vantage)
  t = t.replace(/\.(DE|F|AS|L|PA|MI|SW|BR|LS|ST|CO|HE|OL|MC|HK|T|AX|TO|SS|SZ)$/i, '');
  return t;
};

// Fetch earnings from Alpha Vantage EARNINGS endpoint
const fetchAlphaVantageEarnings = async (symbol) => {
  try {
    const url = `${ALPHA_VANTAGE_BASE}?function=EARNINGS&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.Note || data.Information) {
      console.log(`Alpha Vantage rate limit for ${symbol}:`, data.Note || data.Information);
      return { rateLimited: true }; // Signal that we hit rate limit
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

// Fetch quick earnings info from Yahoo Finance v7 quote endpoint (server-side)
const fetchYahooQuick = async (symbol) => {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const text = await response.text();
    if (text.includes('Too Many Requests') || text.includes('Edge:')) {
      console.log(`Yahoo Finance rate limit for ${symbol}`);
      return { rateLimited: true };
    }
    const data = JSON.parse(text);
    const quote = data?.quoteResponse?.result?.[0];
    if (!quote) return null;
    const ts = quote.earningsTimestamp || quote.earningsTimestampStart || null;
    return {
      symbol,
      nextEarningsDate: ts ? ts * 1000 : null,
      estimatedEPS: quote.epsForward ?? null,
      currency: quote.currency || 'USD',
      currentPrice: quote.regularMarketPrice ?? null,
    };
  } catch (e) {
    return null;
  }
};

// Fetch detailed earnings info from Yahoo Finance v10 quoteSummary (server-side)
const fetchYahooDetailed = async (symbol) => {
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents,earnings,price`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;
    const dates = result.calendarEvents?.earnings?.earningsDate || [];
    let ts = null;
    if (dates[0]) ts = (typeof dates[0] === 'object' ? dates[0].raw : dates[0]);
    const price = result.price || {};
    const eps = result.calendarEvents?.earnings?.epsEstimate?.raw ?? null;
    const history = (result.earnings?.financialsChart?.quarterly || []).slice(0, 8).map(q => ({
      date: q.date || null,
      reportedDate: null,
      epsActual: q.actual?.raw ?? null,
      epsEstimate: q.estimate?.raw ?? null,
      surprisePercent: null,
    }));
    return {
      symbol,
      nextEarningsDate: ts ? ts * 1000 : null,
      estimatedEPS: eps,
      currency: price.currency || 'USD',
      history,
      currentPrice: price.regularMarketPrice?.raw ?? null,
    };
  } catch (e) {
    return null;
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const { tickers, force } = req.query;
  
  if (!tickers) {
    return res.status(400).json({ error: 'Missing tickers parameter' });
  }
  
  const tickerList = tickers.split(',').map(t => t.trim()).filter(t => t);
  
  if (tickerList.length === 0) {
    return res.status(400).json({ error: 'No valid tickers' });
  }
  
  // Check cache (unless force refresh is requested)
  const cacheKey = tickers;
  const cached = !force ? CACHE.get(cacheKey) : null;
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }

  // Even with force=1, return cached data if available when APIs are rate-limited
  const forceCached = CACHE.get(cacheKey);
  const isCacheValid = forceCached && Date.now() - forceCached.timestamp < CACHE_TTL;

  try {
    const results = {};
    let apiRateLimited = false;

    // Process serially to respect Alpha Vantage rate limit (5 calls/min on free tier)
    // Limit to 25 tickers per request; client chunks if more
    const limited = tickerList.slice(0, 25);

    for (const originalTicker of limited) {
      const symbol = cleanTicker(originalTicker);
      console.log(`[${originalTicker}] Cleaned to: ${symbol}`);
      const alpha = await fetchAlphaVantageEarnings(symbol);
      console.log(`[${originalTicker}] Alpha result:`, alpha ? `nextEarningsDate=${alpha.nextEarningsDate}` : 'null');

      let merged = alpha ? { ...alpha } : null;

      // Check if Alpha Vantage is rate-limited
      if (alpha?.rateLimited) {
        apiRateLimited = true;
        console.log(`[${originalTicker}] Alpha Vantage rate-limited, trying Yahoo...`);
      }

      // Yahoo fallback if Alpha Vantage missing or has no upcoming date
      if (!merged || !merged.nextEarningsDate) {
        console.log(`[${originalTicker}] Trying Yahoo quick...`);
        const quick = await fetchYahooQuick(symbol);
        console.log(`[${originalTicker}] Yahoo quick result:`, quick ? `nextEarningsDate=${quick.nextEarningsDate}` : 'null');

        // Check if Yahoo is rate-limited
        if (quick?.rateLimited) {
          apiRateLimited = true;
          console.log(`[${originalTicker}] Yahoo Finance rate-limited`);
        } else if (quick) {
          merged = {
            symbol,
            nextEarningsDate: quick.nextEarningsDate,
            estimatedEPS: quick.estimatedEPS ?? merged?.estimatedEPS ?? null,
            history: merged?.history || [],
            currency: quick.currency || merged?.currency || 'USD',
            currentPrice: quick.currentPrice ?? null,
          };
        }
      }

      if (!merged || !merged.nextEarningsDate) {
        console.log(`[${originalTicker}] Trying Yahoo detailed...`);
        const detailed = await fetchYahooDetailed(symbol);
        console.log(`[${originalTicker}] Yahoo detailed result:`, detailed ? `nextEarningsDate=${detailed.nextEarningsDate}` : 'null');
        if (detailed) {
          merged = {
            symbol,
            nextEarningsDate: detailed.nextEarningsDate,
            estimatedEPS: detailed.estimatedEPS ?? merged?.estimatedEPS ?? null,
            history: merged?.history?.length ? merged.history : (detailed.history || []),
            currency: detailed.currency || merged?.currency || 'USD',
            currentPrice: detailed.currentPrice ?? merged?.currentPrice ?? null,
          };
        }
      }

      if (merged && !merged.rateLimited) {
        console.log(`[${originalTicker}] ✓ Final merged nextEarningsDate:`, merged.nextEarningsDate);
        results[originalTicker] = {
          ...merged,
          ticker: originalTicker,
          name: originalTicker,
        };
      } else {
        console.log(`[${originalTicker}] ✗ No earnings data found`);
      }

      // 200ms delay between calls
      await new Promise(r => setTimeout(r, 200));
    }

    // If APIs are rate-limited and we have cached data, return it with a warning
    if (apiRateLimited && isCacheValid) {
      console.log('APIs rate-limited, returning cached data');
      return res.json({ ...forceCached.data, cached: true, rateLimited: true, message: 'API rate limit reached, showing cached data' });
    }

    // If APIs are rate-limited and no cached data, use mock data for common tickers
    if (apiRateLimited && Object.keys(results).length === 0) {
      console.log('APIs rate-limited and no cache, using mock data fallback');
      for (const ticker of limited) {
        const symbol = cleanTicker(ticker);
        if (MOCK_EARNINGS[symbol]) {
          console.log(`[${ticker}] Using mock data`);
          results[ticker] = {
            ...MOCK_EARNINGS[symbol],
            ticker,
            name: ticker,
            symbol,
            currency: 'USD',
            mock: true
          };
        }
      }
    }

    const responseData = {
      results,
      count: Object.keys(results).length,
      withUpcomingEarnings: Object.values(results).filter(r => r.nextEarningsDate).length,
      timestamp: new Date().toISOString(),
      rateLimited: apiRateLimited
    };

    CACHE.set(cacheKey, { data: responseData, timestamp: Date.now() });

    if (force) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');
    }
    return res.json(responseData);

  } catch (error) {
    console.error('Earnings error:', error.message);
    // If error occurs and we have cached data, return it
    if (isCacheValid) {
      console.log('Error fetching, returning cached data');
      return res.json({ ...forceCached.data, cached: true, error: error.message, message: 'Error fetching data, showing cached data' });
    }
    return res.status(500).json({ error: error.message, results: {} });
  }
};
