// Stock Price API Route - Yahoo Finance with Server-side Caching
// No CORS issues, API keys hidden, 10-second cache for performance

const CACHE = new Map();
const CACHE_TTL = 10 * 1000; // 10 seconds cache

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

// Fetch from Yahoo Finance
const fetchYahooData = async (ticker, range = '1d', interval = '5m') => {
  const yahooTicker = tradingViewToYahoo(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=${interval}&range=${range}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Yahoo Finance error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.chart?.result?.[0]) {
    throw new Error('No data available');
  }
  
  return data.chart.result[0];
};

// Calculate technical indicators
const calculateRSI = (prices, period = 14) => {
  if (prices.length < period + 1) return 50;
  
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateSMA = (prices, period) => {
  if (prices.length < period) return prices[prices.length - 1];
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
};

// Main handler
module.exports = async function handler(req, res) {
  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { ticker, range = '1d', interval = '5m' } = req.query;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required' });
  }
  
  // Check cache
  const cacheKey = `${ticker}_${range}_${interval}`;
  const cached = CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({
      ...cached.data,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString()
    });
  }
  
  try {
    const result = await fetchYahooData(ticker, range, interval);
    
    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quote = result.indicators.quote[0];
    const closes = quote.close.filter(p => p !== null);
    const volumes = quote.volume?.filter(v => v !== null) || [];
    
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    // Calculate growth metrics
    const growth1mo = closes.length >= 22 
      ? ((currentPrice - closes[closes.length - 22]) / closes[closes.length - 22]) * 100 
      : 0;
    const growth6mo = closes.length >= 126 
      ? ((currentPrice - closes[closes.length - 126]) / closes[closes.length - 126]) * 100 
      : 0;
    const growth1yr = closes.length >= 252 
      ? ((currentPrice - closes[closes.length - 252]) / closes[closes.length - 252]) * 100 
      : 0;
    
    // Calculate technical indicators
    const rsi = calculateRSI(closes, 14);
    const sma50 = closes.length >= 50 ? calculateSMA(closes, 50) : null;
    const sma200 = closes.length >= 200 ? calculateSMA(closes, 200) : null;
    
    // Calculate max drawdown (30 day)
    const prices30d = closes.slice(-30);
    let maxDrawdown = 0;
    let peak = prices30d[0];
    for (const price of prices30d) {
      if (price > peak) peak = price;
      const drawdown = (peak - price) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    // Average volume
    const avgVolume = volumes.length > 0 
      ? volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(volumes.length, 20)
      : 0;
    const currentVolume = volumes[volumes.length - 1] || 0;
    
    const responseData = {
      ticker: ticker,
      yahooTicker: tradingViewToYahoo(ticker),
      current: currentPrice,
      previousClose: previousClose,
      change: change,
      changePercent: changePercent,
      currency: meta.currency || 'USD',
      marketState: meta.marketState || 'CLOSED',
      timestamp: new Date().toISOString(),
      sparklineData: closes.slice(-30),
      sparklineTimestamps: timestamps.slice(-30),
      growthData: {
        dailyChange: changePercent,
        growth1mo: growth1mo,
        growth6mo: growth6mo,
        growth1yr: growth1yr
      },
      technicals: {
        rsi: rsi,
        sma50: sma50,
        sma200: sma200,
        aboveSMA50: sma50 ? currentPrice > sma50 : null,
        aboveSMA200: sma200 ? currentPrice > sma200 : null
      },
      riskMetrics: {
        maxDrawdown30d: maxDrawdown * 100,
        volatility30d: Math.sqrt(prices30d.map((p, i) => 
          i > 0 ? Math.pow((p - prices30d[i-1]) / prices30d[i-1], 2) : 0
        ).slice(1).reduce((a, b) => a + b, 0) / 29) * 100
      },
      volume: {
        current: currentVolume,
        average20d: avgVolume,
        ratio: avgVolume > 0 ? currentVolume / avgVolume : 1
      }
    };
    
    // Store in cache
    CACHE.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });
    
    // Clean old cache entries (keep only last 100)
    if (CACHE.size > 100) {
      const oldestKey = CACHE.keys().next().value;
      CACHE.delete(oldestKey);
    }
    
    res.json(responseData);
    
  } catch (error) {
    console.error('Stock price fetch error:', error.message);
    
    // Return cached data even if expired (stale-while-revalidate pattern)
    const staleCached = CACHE.get(cacheKey);
    if (staleCached) {
      return res.json({
        ...staleCached.data,
        cached: true,
        stale: true,
        error: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch stock price',
      message: error.message,
      ticker: ticker
    });
  }
}
