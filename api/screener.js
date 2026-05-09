// Screener API Route - Enhanced Hidden Gems with Volume Filters & Risk Metrics
// Server-side calculation with caching, no CORS issues

const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for screener data

// Note: Tickers are now sent from the frontend
// This keeps the category logic in one place (BeleggenPage.js)

// Removed SCREENER_CATEGORIES - no longer needed
// Old code kept below for reference if needed:
/*
const SCREENER_CATEGORIES_OLD = {
  tech_growth: {
    label: 'Tech Groei',
    description: 'Technologie aandelen met sterke groei',
    tickers: [
      { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology' },
      { ticker: 'AMD', name: 'AMD', sector: 'Technology' },
      { ticker: 'PLTR', name: 'Palantir', sector: 'Technology' },
      { ticker: 'CRWD', name: 'CrowdStrike', sector: 'Technology' },
      { ticker: 'SNOW', name: 'Snowflake', sector: 'Technology' },
      { ticker: 'DDOG', name: 'Datadog', sector: 'Technology' },
      { ticker: 'NET', name: 'Cloudflare', sector: 'Technology' },
      { ticker: 'MDB', name: 'MongoDB', sector: 'Technology' },
      { ticker: 'CFLT', name: 'Confluent', sector: 'Technology' },
      { ticker: 'OKTA', name: 'Okta', sector: 'Technology' },
    ]
  },
  crypto: {
    label: 'Crypto & Mining',
    description: 'Cryptocurrency gerelateerde aandelen',
    tickers: [
      { ticker: 'COIN', name: 'Coinbase', sector: 'Financial' },
      { ticker: 'MSTR', name: 'MicroStrategy', sector: 'Technology' },
      { ticker: 'IREN', name: 'Iris Energy', sector: 'Technology' },
      { ticker: 'RIOT', name: 'Riot Platforms', sector: 'Technology' },
      { ticker: 'CLSK', name: 'CleanSpark', sector: 'Technology' },
      { ticker: 'MARA', name: 'Marathon Digital', sector: 'Technology' },
      { ticker: 'CORZ', name: 'CoreWeave', sector: 'Technology' },
      { ticker: 'WULF', name: 'Terawulf', sector: 'Technology' },
      { ticker: 'BTBT', name: 'Bitfarms', sector: 'Technology' },
      { ticker: 'HUT', name: 'Hut 8', sector: 'Technology' },
    ]
  },
  healthcare: {
    label: 'Healthcare',
    description: 'Biotech en gezondheidszorg',
    tickers: [
      { ticker: 'VKTX', name: 'Viking Therapeutics', sector: 'Healthcare' },
      { ticker: 'CRSP', name: 'CRISPR Therapeutics', sector: 'Healthcare' },
      { ticker: 'NTLA', name: 'Intellia Therapeutics', sector: 'Healthcare' },
      { ticker: 'BEAM', name: 'Beam Therapeutics', sector: 'Healthcare' },
      { ticker: 'EDIT', name: 'Editas Medicine', sector: 'Healthcare' },
      { ticker: 'MRNA', name: 'Moderna', sector: 'Healthcare' },
      { ticker: 'GILD', name: 'Gilead Sciences', sector: 'Healthcare' },
      { ticker: 'REGN', name: 'Regeneron', sector: 'Healthcare' },
      { ticker: 'VRTX', name: 'Vertex Pharmaceuticals', sector: 'Healthcare' },
      { ticker: 'BIIB', name: 'Biogen', sector: 'Healthcare' },
    ]
  },
  ai: {
    label: 'Artificial Intelligence',
    description: 'AI en machine learning bedrijven',
    tickers: [
      { ticker: 'AI', name: 'C3.ai', sector: 'Technology' },
      { ticker: 'SOUN', name: 'SoundHound AI', sector: 'Technology' },
      { ticker: 'BBAI', name: 'BigBear.ai', sector: 'Technology' },
      { ticker: 'AMST', name: 'Amesite', sector: 'Technology' },
      { ticker: 'INOD', name: 'Innodata', sector: 'Technology' },
      { ticker: 'AIEV', name: 'AI Evolution', sector: 'Technology' },
    ]
  },
  quantum: {
    label: 'Quantum Computing',
    description: 'Quantum computing en gerelateerde tech',
    tickers: [
      { ticker: 'QBTS', name: 'D-Wave Quantum', sector: 'Technology' },
      { ticker: 'IONQ', name: 'IonQ', sector: 'Technology' },
      { ticker: 'RGTI', name: 'Rigetti Computing', sector: 'Technology' },
      { ticker: 'QUBT', name: 'Quantum Computing Inc', sector: 'Technology' },
      { ticker: 'ARQQ', name: 'Arqit Quantum', sector: 'Technology' },
    ]
  },
  space: {
    label: 'Space Tech',
    description: 'Ruimtevaart en satelliet technologie',
    tickers: [
      { ticker: 'ASTS', name: 'AST SpaceMobile', sector: 'Technology' },
      { ticker: 'SPCE', name: 'Virgin Galactic', sector: 'Industrials' },
      { ticker: 'RKLB', name: 'Rocket Lab', sector: 'Industrials' },
      { ticker: 'LUNR', name: 'Intuitive Machines', sector: 'Industrials' },
      { ticker: 'PL', name: 'Planet Labs', sector: 'Technology' },
    ]
  },
  fintech: {
    label: 'Fintech',
    description: 'Financiële technologie',
    tickers: [
      { ticker: 'SOFI', name: 'SoFi Technologies', sector: 'Financial' },
      { ticker: 'AFRM', name: 'Affirm', sector: 'Financial' },
      { ticker: 'HOOD', name: 'Robinhood', sector: 'Financial' },
      { ticker: 'NU', name: 'Nubank', sector: 'Financial' },
      { ticker: 'TOST', name: 'Toast', sector: 'Technology' },
      { ticker: 'SQ', name: 'Block', sector: 'Financial' },
      { ticker: 'PAYO', name: 'Payoneer', sector: 'Financial' },
      { ticker: 'LMND', name: 'Lemonade', sector: 'Financial' },
    ]
  },
  gaming: {
    label: 'Gaming & Entertainment',
    description: 'Games, streaming en media',
    tickers: [
      { ticker: 'TTWO', name: 'Take-Two Interactive', sector: 'Communication' },
      { ticker: 'RBLX', name: 'Roblox', sector: 'Communication' },
      { ticker: 'U', name: 'Unity Software', sector: 'Technology' },
      { ticker: 'EA', name: 'Electronic Arts', sector: 'Communication' },
      { ticker: 'NFLX', name: 'Netflix', sector: 'Communication' },
      { ticker: 'SPOT', name: 'Spotify', sector: 'Communication' },
      { ticker: 'WBD', name: 'Warner Bros Discovery', sector: 'Communication' },
      { ticker: 'DKNG', name: 'DraftKings', sector: 'Consumer Cyclical' },
    ]
  },
  green_energy: {
    label: 'Green Energy',
    description: 'Duurzame energie en milieu',
    tickers: [
      { ticker: 'ENPH', name: 'Enphase Energy', sector: 'Technology' },
      { ticker: 'SEDG', name: 'SolarEdge', sector: 'Technology' },
      { ticker: 'FSLR', name: 'First Solar', sector: 'Technology' },
      { ticker: 'SPWR', name: 'SunPower', sector: 'Technology' },
      { ticker: 'RUN', name: 'Sunrun', sector: 'Technology' },
      { ticker: 'NOVA', name: 'Sunnova', sector: 'Technology' },
      { ticker: 'PLUG', name: 'Plug Power', sector: 'Industrials' },
      { ticker: 'BE', name: 'Bloom Energy', sector: 'Industrials' },
    ]
  },
  emerging: {
    label: 'Emerging Markets',
    description: 'Internationale groeibedrijven',
    tickers: [
      { ticker: 'PDD', name: 'PDD Holdings', sector: 'Consumer Cyclical' },
      { ticker: 'BABA', name: 'Alibaba', sector: 'Consumer Cyclical' },
      { ticker: 'JD', name: 'JD.com', sector: 'Consumer Cyclical' },
      { ticker: 'SE', name: 'Sea Limited', sector: 'Technology' },
      { ticker: 'MELI', name: 'MercadoLibre', sector: 'Consumer Cyclical' },
      { ticker: 'STNE', name: 'StoneCo', sector: 'Technology' },
    ]
  },
  etf: {
    label: 'ETFs',
    description: 'Gepubliceerde indexfondsen voor spreiding',
    tickers: [
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'Materials' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust', sector: 'Technology' },
      { ticker: 'VGT', name: 'Vanguard Information Tech', sector: 'Technology' },
      { ticker: 'ARKK', name: 'ARK Innovation ETF', sector: 'Technology' },
      { ticker: 'SMH', name: 'Semiconductor ETF', sector: 'Technology' },
      { ticker: 'XLE', name: 'Energy Select Sector SPDR', sector: 'Energy' },
      { ticker: 'XLV', name: 'Health Care Select Sector', sector: 'Healthcare' },
      { ticker: 'XLF', name: 'Financial Select Sector', sector: 'Financial' },
      { ticker: 'IJH', name: 'iShares Core S&P Mid-Cap', sector: 'Materials' },
      { ticker: 'IWM', name: 'iShares Russell 2000', sector: 'Materials' },
    ]
  }
};
*/

// Technical indicator calculations
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
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
};

const calculateMACD = (prices) => {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  if (!ema12 || !ema26) return { macd: 0, signal: 0, histogram: 0 };
  
  const macd = ema12 - ema26;
  const signal = calculateEMA([...prices.slice(0, -26), ema26], 9) || ema26;
  
  return {
    macd: macd,
    signal: signal,
    histogram: macd - signal
  };
};

const calculateEMA = (prices, period) => {
  if (prices.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
};

// Calculate max drawdown
const calculateMaxDrawdown = (prices) => {
  let maxDrawdown = 0;
  let peak = prices[0];
  
  for (const price of prices) {
    if (price > peak) peak = price;
    const drawdown = (peak - price) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  return maxDrawdown;
};

// Calculate volatility
const calculateVolatility = (prices) => {
  if (prices.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * 100; // As percentage
};

// Get technical signal
const getSignal = (rsi, macd, currentPrice, sma50, sma200) => {
  let score = 0;
  let reasons = [];
  
  // RSI signals
  if (rsi < 30) {
    score += 3;
    reasons.push('RSI oversold');
  } else if (rsi < 40) {
    score += 2;
    reasons.push('RSI approaching oversold');
  } else if (rsi > 70) {
    score -= 3;
    reasons.push('RSI overbought');
  } else if (rsi > 60) {
    score -= 1;
    reasons.push('RSI elevated');
  } else {
    score += 1;
    reasons.push('RSI neutral');
  }
  
  // MACD signals
  if (macd.histogram > 0) {
    score += 2;
    reasons.push('MACD bullish');
  } else if (macd.histogram < 0) {
    score -= 2;
    reasons.push('MACD bearish');
  }
  
  // Moving average signals
  if (sma50 && currentPrice > sma50) {
    score += 2;
    reasons.push('Above 50-day MA');
  } else if (sma50) {
    score -= 2;
    reasons.push('Below 50-day MA');
  }
  
  if (sma200 && currentPrice > sma200) {
    score += 3;
    reasons.push('Above 200-day MA (bull trend)');
  } else if (sma200) {
    score -= 3;
    reasons.push('Below 200-day MA (bear trend)');
  }
  
  // Golden cross / Death cross
  if (sma50 && sma200) {
    if (sma50 > sma200) {
      score += 2;
      reasons.push('Golden cross pattern');
    } else {
      score -= 2;
      reasons.push('Death cross pattern');
    }
  }
  
  // Map score to signal
  let signal;
  if (score >= 8) signal = 'STRONG BUY';
  else if (score >= 4) signal = 'BUY';
  else if (score >= 1) signal = 'WEAK BUY';
  else if (score === 0) signal = 'HOLD';
  else if (score >= -3) signal = 'WEAK SELL';
  else if (score >= -7) signal = 'SELL';
  else signal = 'STRONG SELL';
  
  return { signal, score, reasons };
};

// Enhanced quality score calculation
const calculateQualityScore = (data) => {
  let score = 0;
  const factors = [];
  
  const { 
    currentPrice, 
    previousClose, 
    growth1mo, 
    growth6mo, 
    growth1yr,
    rsi,
    sma50,
    sma200,
    maxDrawdown30d,
    volatility30d,
    avgVolume20d,
    currentVolume,
    signal
  } = data;
  
  const changePercent = ((currentPrice - previousClose) / previousClose) * 100;
  
  // === MINIMUM REQUIREMENTS (Filters) ===
  // Skip if volume too low (illiquid)
  if (avgVolume20d < 100000) {
    return { score: 0, opportunityType: 'LOW_VOLUME', factors: ['Insufficient liquidity'] };
  }
  
  // Skip if price too low (penny stock risk)
  if (currentPrice < 5) {
    return { score: 0, opportunityType: 'PENNY_STOCK', factors: ['Price below $5'] };
  }
  
  // Skip if excessive drawdown (major event/crash)
  if (maxDrawdown30d > 40) {
    return { score: 0, opportunityType: 'HIGH_DRAWDOWN', factors: ['Excessive drawdown >40%'] };
  }
  
  // === GROWTH SCORING (max 40 points) ===
  // 1-year performance (proven track record)
  if (growth1yr > 100) { score += 20; factors.push('Exceptional 1Y growth (>100%)'); }
  else if (growth1yr > 50) { score += 18; factors.push('Strong 1Y growth (>50%)'); }
  else if (growth1yr > 25) { score += 15; factors.push('Good 1Y growth (>25%)'); }
  else if (growth1yr > 10) { score += 10; factors.push('Moderate 1Y growth (>10%)'); }
  else if (growth1yr > 0) { score += 5; factors.push('Positive 1Y growth'); }
  else if (growth1yr < -30) { score -= 10; factors.push('Poor 1Y performance (<-30%)'); }
  
  // 6-month momentum
  if (growth6mo > 50) { score += 12; factors.push('Strong 6M momentum (>50%)'); }
  else if (growth6mo > 25) { score += 10; factors.push('Good 6M momentum (>25%)'); }
  else if (growth6mo > 10) { score += 6; factors.push('Moderate 6M momentum (>10%)'); }
  else if (growth6mo > 0) { score += 3; factors.push('Positive 6M momentum'); }
  else if (growth6mo < -20) { score -= 5; factors.push('Negative 6M momentum'); }
  
  // 1-month recency (most weighted for "right now" opportunity)
  if (growth1mo > 30) { score += 8; factors.push('Strong recent surge (>30%)'); }
  else if (growth1mo > 15) { score += 6; factors.push('Good recent momentum (>15%)'); }
  else if (growth1mo > 5) { score += 4; factors.push('Positive recent momentum (>5%)'); }
  else if (growth1mo > 0) { score += 2; factors.push('Slight positive momentum'); }
  else if (growth1mo < -15) { score -= 5; factors.push('Recent decline (<-15%)'); }
  
  // Daily change bonus/penalty
  if (changePercent > 10) { score += 5; factors.push('Strong daily gain (>10%)'); }
  else if (changePercent < -10) { score -= 3; factors.push('Sharp daily decline (<-10%)'); }
  
  // === TECHNICAL SIGNALS (max 30 points) ===
  if (signal?.signal === 'STRONG BUY') { score += 30; factors.push('Strong technical buy'); }
  else if (signal?.signal === 'BUY') { score += 22; factors.push('Technical buy'); }
  else if (signal?.signal === 'WEAK BUY') { score += 12; factors.push('Weak technical buy'); }
  else if (signal?.signal === 'HOLD') { score += 5; factors.push('Neutral technicals'); }
  else if (signal?.signal === 'WEAK SELL') { score -= 5; factors.push('Weak technical sell'); }
  else if (signal?.signal === 'SELL') { score -= 15; factors.push('Technical sell'); }
  else if (signal?.signal === 'STRONG SELL') { score -= 25; factors.push('Strong technical sell'); }
  
  // === RISK METRICS (max 15 points) ===
  // Low volatility bonus (quality sign)
  if (volatility30d < 20) { score += 10; factors.push('Low volatility (<20%)'); }
  else if (volatility30d < 35) { score += 5; factors.push('Moderate volatility'); }
  else if (volatility30d > 60) { score -= 5; factors.push('High volatility (>60%)'); }
  
  // Manageable drawdown
  if (maxDrawdown30d < 10) { score += 5; factors.push('Low drawdown (<10%)'); }
  else if (maxDrawdown30d > 25) { score -= 5; factors.push('High drawdown (>25%)'); }
  
  // === VOLUME CONFIRMATION (max 10 points) ===
  const volumeRatio = currentVolume / avgVolume20d;
  if (volumeRatio > 3) { score += 10; factors.push('Exceptional volume (>3x avg)'); }
  else if (volumeRatio > 2) { score += 7; factors.push('High volume (>2x avg)'); }
  else if (volumeRatio > 1.5) { score += 5; factors.push('Above average volume'); }
  else if (volumeRatio > 1.2) { score += 2; factors.push('Slightly above avg volume'); }
  else if (volumeRatio < 0.5) { score -= 3; factors.push('Low volume (<50% avg)'); }
  
  // === RSI ADJUSTMENT ===
  if (rsi < 20) { score += 5; factors.push('Extremely oversold (RSI<20)'); }
  else if (rsi < 30) { score += 3; factors.push('Oversold (RSI<30)'); }
  else if (rsi > 80) { score -= 5; factors.push('Extremely overbought (RSI>80)'); }
  else if (rsi > 70) { score -= 3; factors.push('Overbought (RSI>70)'); }
  
  // === OPPORTUNITY TYPE CLASSIFICATION ===
  let opportunityType = '';
  
  if (score >= 70) {
    opportunityType = 'HIDDEN_GEM';
  } else if (score >= 50) {
    opportunityType = 'STRONG_OPPORTUNITY';
  } else if (score >= 30) {
    opportunityType = 'MODERATE_OPPORTUNITY';
  } else if (score >= 10) {
    opportunityType = 'WEAK_OPPORTUNITY';
  } else if (score >= -10) {
    opportunityType = 'NEUTRAL';
  } else if (score >= -30) {
    opportunityType = 'AVOID';
  } else {
    opportunityType = 'STRONG_AVOID';
  }
  
  return {
    score: Math.max(0, Math.round(score)),
    opportunityType,
    factors: factors.slice(0, 8) // Limit to top 8 factors
  };
};

// Fetch stock data for a ticker
const fetchStockData = async (ticker) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.chart?.result?.[0]) return null;
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const closes = result.indicators.quote[0].close.filter(p => p !== null);
    const volumes = result.indicators.quote[0].volume?.filter(v => v !== null) || [];
    
    if (closes.length < 30) return null;
    
    const currentPrice = meta.regularMarketPrice;
    const previousClose = closes[closes.length - 2] || meta.previousClose;
    
    // Calculate metrics
    const growth1yr = closes.length >= 252 
      ? ((currentPrice - closes[closes.length - 252]) / closes[closes.length - 252]) * 100 
      : ((currentPrice - closes[0]) / closes[0]) * 100;
    
    const growth6mo = closes.length >= 126 
      ? ((currentPrice - closes[closes.length - 126]) / closes[closes.length - 126]) * 100 
      : ((currentPrice - closes[Math.floor(closes.length / 2)]) / closes[Math.floor(closes.length / 2)]) * 100;
    
    const growth1mo = closes.length >= 22 
      ? ((currentPrice - closes[closes.length - 22]) / closes[closes.length - 22]) * 100 
      : 0;
    
    const prices30d = closes.slice(-30);
    const rsi = calculateRSI(closes, 14);
    const sma50 = closes.length >= 50 ? calculateSMA(closes, 50) : null;
    const sma200 = closes.length >= 200 ? calculateSMA(closes, 200) : null;
    const macd = calculateMACD(closes);
    const maxDrawdown30d = calculateMaxDrawdown(prices30d) * 100;
    const volatility30d = calculateVolatility(prices30d);
    const avgVolume20d = volumes.length >= 20 
      ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 
      : (volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0);
    const currentVolume = volumes[volumes.length - 1] || 0;
    
    const signal = getSignal(rsi, macd, currentPrice, sma50, sma200);
    
    const qualityData = {
      currentPrice,
      previousClose,
      growth1mo,
      growth6mo,
      growth1yr,
      rsi,
      sma50,
      sma200,
      maxDrawdown30d,
      volatility30d,
      avgVolume20d,
      currentVolume,
      signal
    };
    
    const quality = calculateQualityScore(qualityData);
    
    return {
      ticker,
      name: meta.shortName || meta.longName || ticker,
      currency: meta.currency || 'USD',
      currentPrice,
      previousClose,
      dailyChange: ((currentPrice - previousClose) / previousClose) * 100,
      growth1mo,
      growth6mo,
      growth1yr,
      sparkline: closes.slice(-30),
      rsi: Math.round(rsi * 10) / 10,
      sma50,
      sma200,
      signal: signal.signal,
      signalScore: signal.score,
      signalReasons: signal.reasons,
      maxDrawdown30d: Math.round(maxDrawdown30d * 10) / 10,
      volatility30d: Math.round(volatility30d * 10) / 10,
      avgVolume20d: Math.round(avgVolume20d),
      currentVolume: Math.round(currentVolume),
      volumeRatio: Math.round((currentVolume / avgVolume20d) * 100) / 100,
      qualityScore: quality.score,
      opportunityType: quality.opportunityType,
      qualityFactors: quality.factors,
      marketCap: meta.marketCap,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error.message);
    return null;
  }
};

// Main handler
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { tickers, minScore = 0, maxResults = 50 } = req.query;
  
  // Validate tickers
  if (!tickers) {
    return res.status(400).json({ 
      error: 'Missing tickers parameter. Provide comma-separated ticker symbols.'
    });
  }
  
  const tickerList = tickers.split(',').map(t => t.trim()).filter(t => t);
  
  if (tickerList.length === 0) {
    return res.status(400).json({ error: 'No valid tickers provided' });
  }
  
  // Check cache
  const cacheKey = `${tickers}_${minScore}_${maxResults}`;
  const cached = CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({
      ...cached.data,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString()
    });
  }
  
  try {
    const results = [];
    
    // Fetch data for each ticker (with small delay to avoid rate limiting)
    for (const ticker of tickerList) {
      const data = await fetchStockData(ticker);
      
      if (data && data.qualityScore >= parseInt(minScore)) {
        results.push(data);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Sort by quality score (descending)
    results.sort((a, b) => b.qualityScore - a.qualityScore);
    
    // Take top results
    const topResults = results.slice(0, parseInt(maxResults));
    
    // Calculate statistics
    const stats = {
      totalAnalyzed: tickerList.length,
      passedFilter: results.length,
      hiddenGems: results.filter(r => r.opportunityType === 'HIDDEN_GEM').length,
      strongOpportunities: results.filter(r => r.opportunityType === 'STRONG_OPPORTUNITY').length,
      averageScore: Math.round(results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length) || 0,
      bestPerformer: topResults[0] || null
    };
    
    const responseData = {
      timestamp: new Date().toISOString(),
      stats,
      results: topResults,
      filters: {
        minScore: parseInt(minScore),
        maxResults: parseInt(maxResults),
        minVolume: 100000,
        minPrice: 5,
        maxDrawdown: 40
      }
    };
    
    // Store in cache
    CACHE.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (CACHE.size > 20) {
      const oldestKey = CACHE.keys().next().value;
      CACHE.delete(oldestKey);
    }
    
    res.json(responseData);
    
  } catch (error) {
    console.error('Screener error:', error);
    
    // Return cached data even if expired
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
      error: 'Failed to fetch screener data',
      message: error.message
    });
  }
}
