// /api/market-scanner.js
// 24/7 market scanner: volume anomalies, RSI extremes, breakouts, momentum
// Uses Yahoo Finance for real-time data, returns ranked opportunities

const CACHE = new Map();
const CACHE_TTL = 8 * 60 * 1000; // 8 min

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
};

// Fetch quote from Yahoo Finance
const fetchQuote = async (ticker) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`;
    const r = await fetch(url, { headers: YF_HEADERS });
    if (!r.ok) return null;
    const j = await r.json();
    const meta = j.chart?.result?.[0]?.meta;
    const indicators = j.chart?.result?.[0]?.indicators?.quote?.[0];
    const timestamps = j.chart?.result?.[0]?.timestamp || [];
    if (!meta || !indicators) return null;

    const closes = (indicators.close || []).filter(Boolean);
    const volumes = (indicators.volume || []).filter(Boolean);
    if (closes.length < 5) return null;

    const currentPrice = meta.regularMarketPrice || closes[closes.length - 1];
    const prevClose = meta.chartPreviousClose || closes[closes.length - 2];
    const changePercent = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
    const currentVolume = meta.regularMarketVolume || volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length);
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;

    // RSI calculation (14-period)
    const rsi = calculateRSI(closes);

    // Simple momentum: 5-day vs 20-day
    const ma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
    const momentum = ma5 > ma20 ? 'bullish' : 'bearish';

    // 52-week range
    const high52 = meta.fiftyTwoWeekHigh || Math.max(...closes);
    const low52 = meta.fiftyTwoWeekLow || Math.min(...closes);
    const rangePercent = high52 > low52 ? ((currentPrice - low52) / (high52 - low52)) * 100 : 50;

    return {
      ticker,
      name: meta.shortName || meta.longName || ticker,
      currentPrice,
      changePercent,
      currentVolume,
      avgVolume,
      volumeRatio,
      rsi,
      momentum,
      ma5,
      ma20,
      high52,
      low52,
      rangePercent,
      currency: meta.currency || 'USD',
    };
  } catch {
    return null;
  }
};

const calculateRSI = (closes, period = 14) => {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - (100 / (1 + rs)));
};

// Score a signal for ranking
const scoreSignal = (q) => {
  let score = 0;
  const signals = [];

  // Volume anomaly
  if (q.volumeRatio >= 3) { score += 30; signals.push({ type: 'volume', label: `${q.volumeRatio.toFixed(1)}x volume`, strength: 'high' }); }
  else if (q.volumeRatio >= 2) { score += 20; signals.push({ type: 'volume', label: `${q.volumeRatio.toFixed(1)}x volume`, strength: 'medium' }); }
  else if (q.volumeRatio >= 1.5) { score += 10; signals.push({ type: 'volume', label: `${q.volumeRatio.toFixed(1)}x volume`, strength: 'low' }); }

  // RSI oversold/overbought
  if (q.rsi <= 25) { score += 25; signals.push({ type: 'rsi', label: `RSI oververkocht (${q.rsi})`, strength: 'high' }); }
  else if (q.rsi <= 35) { score += 15; signals.push({ type: 'rsi', label: `RSI laag (${q.rsi})`, strength: 'medium' }); }
  else if (q.rsi >= 75) { score += 20; signals.push({ type: 'rsi_ob', label: `RSI overkocht (${q.rsi})`, strength: 'high' }); }

  // Price momentum (MA crossover)
  if (q.momentum === 'bullish' && q.changePercent > 2) { score += 20; signals.push({ type: 'momentum', label: 'MA5 > MA20 + stijging', strength: 'high' }); }
  else if (q.momentum === 'bearish' && q.changePercent < -2) { score += 15; signals.push({ type: 'momentum_bear', label: 'MA5 < MA20 + daling', strength: 'medium' }); }

  // Near 52-week high (breakout zone)
  if (q.rangePercent >= 90) { score += 20; signals.push({ type: 'breakout', label: '52-wk high zone', strength: 'high' }); }
  else if (q.rangePercent <= 10) { score += 15; signals.push({ type: 'low52', label: '52-wk low zone', strength: 'medium' }); }

  // Strong daily move
  if (Math.abs(q.changePercent) >= 5) { score += 15; signals.push({ type: 'move', label: `${q.changePercent > 0 ? '+' : ''}${q.changePercent.toFixed(1)}% vandaag`, strength: 'high' }); }
  else if (Math.abs(q.changePercent) >= 2.5) { score += 8; signals.push({ type: 'move', label: `${q.changePercent > 0 ? '+' : ''}${q.changePercent.toFixed(1)}% vandaag`, strength: 'medium' }); }

  return { score, signals };
};

// Default watchlist to scan when none provided
const DEFAULT_SCAN_TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'ASML.AS',
  'AMD', 'AVGO', 'ORCL', 'CRM', 'NFLX', 'UBER', 'SHOP', 'ABNB', 'PLTR',
  'SPY', 'QQQ', 'VWCE.DE', 'IWDA.AS', 'SOXX', 'XLK', 'XLF',
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const tickers = (req.query.tickers || '')
    .split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  const scanList = tickers.length > 0 ? tickers : DEFAULT_SCAN_TICKERS;
  const limit = Math.min(parseInt(req.query.limit || '25', 10), 50);

  const cacheKey = scanList.slice(0, 30).sort().join(',');
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }

  // Fetch all quotes in parallel (batched to avoid rate limits)
  const BATCH = 8;
  const allQuotes = [];
  for (let i = 0; i < scanList.length; i += BATCH) {
    const batch = scanList.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(fetchQuote));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) allQuotes.push(r.value);
    }
    if (i + BATCH < scanList.length) await new Promise(r => setTimeout(r, 200));
  }

  // Score and rank
  const scored = allQuotes.map(q => {
    const { score, signals } = scoreSignal(q);
    return { ...q, score, signals };
  }).filter(q => q.signals.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Categorize
  const volumeAlerts = scored.filter(q => q.signals.some(s => s.type === 'volume' && s.strength === 'high'));
  const breakouts = scored.filter(q => q.signals.some(s => s.type === 'breakout'));
  const oversold = scored.filter(q => q.signals.some(s => s.type === 'rsi' && q.rsi <= 35));
  const topMomentum = scored.filter(q => q.signals.some(s => s.type === 'momentum'));

  const payload = {
    scanned: allQuotes.length,
    signals: scored,
    categories: { volumeAlerts, breakouts, oversold, topMomentum },
    updatedAt: new Date().toISOString(),
  };

  CACHE.set(cacheKey, { data: payload, ts: Date.now() });
  res.json(payload);
}
