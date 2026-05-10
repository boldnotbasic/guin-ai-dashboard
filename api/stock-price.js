// Stock Price API Route - Yahoo Finance with Server-side Caching
// No CORS issues, API keys hidden, 10-second cache for performance

const CACHE = new Map();
const CACHE_TTL = 10 * 1000; // 10 seconds cache

// Convert TradingView ticker to Yahoo Finance format
const tradingViewToYahoo = (tvTicker) => {
  if (!tvTicker || !tvTicker.includes(':')) return tvTicker;
  
  const parts = tvTicker.split(':');
  let exchange, symbol;
  
  if (parts[0].length <= 8 && parts[0] === parts[0].toUpperCase() && /^[A-Z]+$/.test(parts[0])) {
    exchange = parts[0];
    symbol = parts[1];
  } else {
    symbol = parts[0];
    exchange = parts[1];
  }
  
  // INDICES: TradingView uses SP:SPX, NASDAQ:NDX, etc. Yahoo uses ^GSPC, ^NDX, etc.
  const indexMap = {
    'SP:SPX': '^GSPC',
    'SPX': '^GSPC',
    'NASDAQ:NDX': '^NDX',
    'NDX': '^NDX',
    'NASDAQ:IXIC': '^IXIC',
    'IXIC': '^IXIC',
    'DJ:DJI': '^DJI',
    'DJI': '^DJI',
    'TVC:DXY': 'DX-Y.NYB',
    'DXY': 'DX-Y.NYB',
    'TVC:VIX': '^VIX',
    'VIX': '^VIX',
    'EURONEXT:AEX': '^AEX',
    'AEX': '^AEX',
    'XETR:DAX': '^GDAXI',
    'DAX': '^GDAXI',
    'TVC:UKX': '^FTSE',
    'UKX': '^FTSE',
  };
  
  // Check full ticker against index map first
  if (indexMap[tvTicker]) return indexMap[tvTicker];
  if (indexMap[symbol]) return indexMap[symbol];
  
  // CRYPTO: TradingView uses BINANCE:BTCUSDT, COINBASE:BTCUSD, etc. Yahoo uses BTC-USD
  if (['BINANCE', 'COINBASE', 'BITFINEX', 'KRAKEN', 'BITSTAMP'].includes(exchange)) {
    // Strip USDT/USD suffix and reformat
    const cryptoMatch = symbol.match(/^([A-Z]+?)(USDT?|EUR|GBP|BUSD)$/);
    if (cryptoMatch) {
      const base = cryptoMatch[1];
      const quote = cryptoMatch[2].startsWith('USD') ? 'USD' : cryptoMatch[2];
      return `${base}-${quote}`;
    }
    return symbol;
  }
  
  const exchangeMap = {
    'XETR': '.DE', 'XFRA': '.F', 'XAMS': '.AS', 'XBRU': '.BR',
    'XPAR': '.PA', 'XLON': '.L', 'XSWX': '.SW', 'XMIL': '.MI',
    'XLIS': '.LS', 'XSTO': '.ST', 'XCSE': '.CO', 'XHEL': '.HE',
    'XOSL': '.OL', 'XMAD': '.MC', 'XHKG': '.HK', 'XTKS': '.T',
    'XASX': '.AX', 'XTSE': '.TO', 'XSHG': '.SS', 'XSHE': '.SZ',
    'NASDAQ': '', 'NYSE': '', 'XNAS': '', 'XNYS': '', 'AMEX': '',
    'EURONEXT': '.PA', 'LSE': '.L', 'TSX': '.TO',
  };
  
  const suffix = exchangeMap[exchange];
  if (suffix === undefined) return symbol;
  return symbol + suffix;
};

// Generate ticker variants to try in order
const getTickerVariants = (ticker) => {
  const variants = [];
  const primary = tradingViewToYahoo(ticker);
  variants.push(primary);
  
  // If ticker contains colon (TradingView format), also try just the symbol part
  if (ticker.includes(':')) {
    const parts = ticker.split(':');
    const symbol = parts[0].length <= 8 && /^[A-Z]+$/.test(parts[0]) ? parts[1] : parts[0];
    if (!variants.includes(symbol)) variants.push(symbol);
    
    // Index fallback - try with ^ prefix
    if (!variants.some(v => v.startsWith('^'))) {
      variants.push(`^${symbol}`);
    }
    
    // Crypto fallback - try -USD format
    if (symbol.endsWith('USDT') || symbol.endsWith('USD')) {
      const base = symbol.replace(/USDT?$/, '');
      variants.push(`${base}-USD`);
    }
  }
  
  // Try common European exchange suffixes if no exchange specified
  if (!ticker.includes(':') && !ticker.includes('.')) {
    variants.push(`${ticker}.AS`, `${ticker}.DE`, `${ticker}.PA`, `${ticker}.L`, `${ticker}.MI`);
  }
  
  return [...new Set(variants)]; // dedupe
};

// Fetch from Yahoo Finance with fallback to multiple ticker variants
const fetchYahooData = async (ticker, range = '1d', interval = '5m') => {
  const variants = getTickerVariants(ticker);
  let lastError = null;
  
  for (const yahooTicker of variants) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=${interval}&range=${range}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        lastError = new Error(`Yahoo ${response.status} for ${yahooTicker}`);
        continue;
      }
      
      const data = await response.json();
      
      if (!data.chart?.result?.[0]) {
        lastError = new Error(`No data for ${yahooTicker}`);
        continue;
      }
      
      // Success - attach resolved ticker
      const result = data.chart.result[0];
      result._resolvedTicker = yahooTicker;
      return result;
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  
  throw lastError || new Error('All ticker variants failed');
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

// Fetch analyst recommendations from Yahoo Finance v7 quote endpoint
const fetchAnalystData = async (yahooTicker) => {
  try {
    // Try v7 quote endpoint first (more reliable, less rate limited)
    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooTicker}`;
    const quoteResponse = await fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      const quote = quoteData.quoteResponse?.result?.[0];
      
      if (quote) {
        // Parse averageAnalystRating like "1.8 - Buy" or "2.5 - Hold"
        let mean = null;
        let ratingLabel = null;
        if (quote.averageAnalystRating) {
          const match = quote.averageAnalystRating.match(/^([\d.]+)\s*-\s*(.+)$/);
          if (match) {
            mean = parseFloat(match[1]);
            ratingLabel = match[2];
          }
        }
        
        return {
          mean: mean,
          analysts: quote.numberOfAnalystOpinions || null,
          targetPrice: quote.targetPriceMean || null,
          targetHigh: quote.targetPriceHigh || null,
          targetLow: quote.targetPriceLow || null,
          ratingLabel: ratingLabel,
          // v7 doesn't have breakdown, but we can estimate based on mean
          breakdown: mean ? estimateBreakdown(mean) : null,
        };
      }
    }
  } catch (e) {
    console.log('v7 quote failed, trying quoteSummary:', e.message);
  }
  
  // Fallback to quoteSummary (may be rate limited)
  try {
    const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${yahooTicker}?modules=recommendationTrend,financialData`;
    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });
    
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const result = summaryData.quoteSummary?.result?.[0];
      
      if (result) {
        const trend = result.recommendationTrend?.trend?.[0];
        const financial = result.financialData;
        
        if (trend) {
          const total = (trend.strongBuy || 0) + (trend.buy || 0) + (trend.hold || 0) + 
                       (trend.sell || 0) + (trend.strongSell || 0);
          
          let weightedSum = 0;
          weightedSum += (trend.strongBuy || 0) * 1;
          weightedSum += (trend.buy || 0) * 2;
          weightedSum += (trend.hold || 0) * 3;
          weightedSum += (trend.sell || 0) * 4;
          weightedSum += (trend.strongSell || 0) * 5;
          
          const mean = total > 0 ? weightedSum / total : null;
          
          return {
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
          };
        }
      }
    }
  } catch (e) {
    console.log('quoteSummary also failed:', e.message);
  }
  
  return null;
};

// Estimate breakdown based on mean rating (when v7 doesn't provide it)
const estimateBreakdown = (mean) => {
  // mean 1 = all strong buy, mean 5 = all sell
  // This is a rough estimate for display purposes
  const total = 30; // assume 30 analysts
  if (mean <= 1.5) {
    return { strongBuy: 20, buy: 8, hold: 2, sell: 0, strongSell: 0 };
  } else if (mean <= 2.0) {
    return { strongBuy: 15, buy: 10, hold: 5, sell: 0, strongSell: 0 };
  } else if (mean <= 2.5) {
    return { strongBuy: 8, buy: 12, hold: 8, sell: 2, strongSell: 0 };
  } else if (mean <= 3.0) {
    return { strongBuy: 3, buy: 7, hold: 15, sell: 5, strongSell: 0 };
  } else if (mean <= 3.5) {
    return { strongBuy: 0, buy: 5, hold: 15, sell: 8, strongSell: 2 };
  } else if (mean <= 4.0) {
    return { strongBuy: 0, buy: 2, hold: 8, sell: 12, strongSell: 8 };
  } else {
    return { strongBuy: 0, buy: 0, hold: 5, sell: 10, strongSell: 15 };
  }
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
    
    // Fetch analyst data (don't await - we'll add it if available)
    const resolvedTicker = result._resolvedTicker || tradingViewToYahoo(ticker);
    const analystData = await fetchAnalystData(resolvedTicker);
    
    const responseData = {
      ticker: ticker,
      yahooTicker: result._resolvedTicker || tradingViewToYahoo(ticker),
      current: currentPrice,
      previousClose: previousClose,
      change: change,
      changePercent: changePercent,
      currency: meta.currency || 'USD',
      marketState: meta.marketState || 'CLOSED',
      timestamp: new Date().toISOString(),
      sparklineData: closes.slice(-30),
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
      },
      // Analyst recommendations
      analystData: analystData
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
