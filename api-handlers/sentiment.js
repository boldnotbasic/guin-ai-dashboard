// /api/sentiment.js
// Real-time sentiment scoring per ticker using Google News + AI scoring
// Returns bullish/bearish score -100..+100 with headline evidence

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

const fetchGoogleNewsForTicker = async (ticker, companyName) => {
  const queries = [ticker, companyName].filter(Boolean);
  const allItems = [];
  for (const q of queries.slice(0, 1)) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' stock')}&hl=en-US&gl=US&ceid=US:en`;
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) continue;
      const xml = await r.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
      for (const [, block] of items.slice(0, 6)) {
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] || '';
        const link = (block.match(/<link>(.*?)<\/link>/))?.[1] || '';
        const pub = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || '';
        if (title) allItems.push({ title: title.trim(), link: link.trim(), pub });
      }
    } catch {}
  }
  return allItems;
};

// Simple keyword-based sentiment scoring (no API cost)
const scoreSentiment = (headlines) => {
  const positive = ['surges', 'beats', 'record', 'growth', 'upgrade', 'bull', 'gain', 'rally', 'strong', 'profit', 'revenue beat', 'raises guidance', 'outperform', 'buy', 'exceeds', 'breakthrough', 'partnership', 'acquisition', 'dividend', 'buyback', 'AI', 'innovation'];
  const negative = ['falls', 'drops', 'miss', 'loss', 'decline', 'downgrade', 'sell', 'bear', 'recession', 'debt', 'layoffs', 'cuts guidance', 'underperform', 'warning', 'investigation', 'lawsuit', 'default', 'crash', 'disappoints', 'below expectations', 'tariff', 'fine'];

  let totalScore = 0;
  const scored = headlines.map(h => {
    const text = h.title.toLowerCase();
    let score = 0;
    for (const w of positive) if (text.includes(w.toLowerCase())) score += 15;
    for (const w of negative) if (text.includes(w.toLowerCase())) score -= 15;
    score = Math.max(-100, Math.min(100, score));
    return { ...h, score };
  });

  if (scored.length > 0) {
    totalScore = Math.round(scored.reduce((acc, h) => acc + h.score, 0) / scored.length);
  }

  const label = totalScore >= 30 ? 'bullish' : totalScore <= -30 ? 'bearish' : 'neutraal';
  const color = totalScore >= 30 ? 'green' : totalScore <= -30 ? 'red' : 'yellow';

  return { score: totalScore, label, color, headlines: scored.slice(0, 5) };
};

// Anomaly detection: score much more extreme than average = alert
const detectAnomaly = (score, historicalAvg = 0) => {
  const delta = Math.abs(score - historicalAvg);
  if (delta >= 50) return { alert: true, message: `Sterke sentiment-afwijking (${score > 0 ? '+' : ''}${score})` };
  return { alert: false };
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const tickers = (req.query.tickers || '').split(',').map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  const names = (req.query.names || '').split(',').map(n => n.trim()).filter(Boolean);

  if (!tickers.length) return res.status(400).json({ error: 'tickers required' });

  const cacheKey = tickers.sort().join(',');
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }

  const results = {};
  await Promise.allSettled(
    tickers.map(async (ticker, idx) => {
      const companyName = names[idx] || '';
      try {
        const headlines = await fetchGoogleNewsForTicker(ticker, companyName);
        const sentiment = scoreSentiment(headlines);
        const anomaly = detectAnomaly(sentiment.score);
        results[ticker] = {
          ticker,
          name: companyName || ticker,
          ...sentiment,
          anomaly,
          updatedAt: new Date().toISOString(),
        };
      } catch (e) {
        results[ticker] = { ticker, score: 0, label: 'neutraal', color: 'yellow', headlines: [], error: e.message };
      }
    })
  );

  const overall = Object.values(results);
  const avgScore = overall.length > 0
    ? Math.round(overall.reduce((s, r) => s + (r.score || 0), 0) / overall.length)
    : 0;

  const payload = {
    tickers: results,
    overall: {
      avgScore,
      label: avgScore >= 20 ? 'bullish' : avgScore <= -20 ? 'bearish' : 'gemengd',
      alerts: overall.filter(r => r.anomaly?.alert).map(r => ({ ticker: r.ticker, message: r.anomaly.message })),
    },
    updatedAt: new Date().toISOString(),
  };

  CACHE.set(cacheKey, { data: payload, ts: Date.now() });
  res.json(payload);
}
