// /api/market-data.js
// Fetches all data needed by MarketMetersWidget server-side (no browser CORS issues)
// Returns: VIX, oil price, major indices, and topic-specific Google News per meter

const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Yahoo Finance quotes (server-side, no CORS) ───────────────────────────────
const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
};

// ── Oilprice.com scraper (best-effort, HTML parse) ────────────────────────────
const fetchOilpricePrice = async (benchmark = 'WTI') => {
  const urls = [
    'https://oilprice.com/nl/olieprijs-grafieken',
    'https://oilprice.com/oil-price-charts',
  ];
  const labels = benchmark.toUpperCase() === 'BRENT'
    ? ['Brent Olie', 'Brent Oil', 'Brent Crude', 'Brent']
    : ['WTI Olie', 'WTI Oil', 'WTI Crude', 'WTI'];
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'nl,en;q=0.8' } });
      if (!r.ok) continue;
      const html = await r.text();
      // Find the closest block that mentions our label
      let idx = -1;
      for (const l of labels) {
        idx = html.toLowerCase().indexOf(l.toLowerCase());
        if (idx !== -1) break;
      }
      if (idx === -1) continue;
      const chunk = html.slice(Math.max(0, idx - 800), Math.min(html.length, idx + 1200));
      // Change percentage, if present (use this to anchor the nearby price)
      const pctRe = /([+\-]?\d{1,3}(?:\.\d{1,2})?)%/;
      const changeMatch = pctRe.exec(chunk);
      let change = null;
      let price = null;
      if (changeMatch) {
        change = parseFloat(changeMatch[1]);
        const pos = changeMatch.index || chunk.indexOf(changeMatch[0]);
        const left = chunk.slice(Math.max(0, pos - 120), pos); // search 120 chars to the left of %
        const numRe = /([0-9]{2,3}(?:\.[0-9]{2}))/g;
        const all = [...left.matchAll(numRe)];
        if (all.length > 0) {
          price = parseFloat(all[all.length - 1][1]);
        }
      }
      // Fallback: generic price search in chunk (in case % not found near price)
      if (price == null) {
        const pm = chunk.match(/\$?\s*([0-9]{2,3}(?:\.[0-9]{2}))/);
        if (!pm) continue;
        price = parseFloat(pm[1]);
      }
      return { price, change, name: benchmark.toUpperCase() === 'BRENT' ? 'Brent Crude' : 'WTI Crude', source: 'oilprice.com' };
    } catch (e) {
      console.error('fetchOilpricePrice error:', e.message);
    }
  }
  return null;
};

const fetchQuotes = async (symbols) => {
  const sym = symbols.map(encodeURIComponent).join('%2C');
  // Try v7 first, then v8 as fallback
  const endpoints = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${sym}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${sym}`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbols[0]}?symbols=${sym}`,
  ];
  for (const url of endpoints.slice(0, 2)) {
    try {
      const r = await fetch(url, { headers: YF_HEADERS });
      if (!r.ok) continue;
      const j = await r.json();
      const results = j.quoteResponse?.result || [];
      if (results.length > 0) return results;
    } catch (e) {
      console.error('fetchQuotes attempt failed:', e.message);
    }
  }
  return [];
};

// ── Stooq simple CSV quote for Brent/WTI fallback ─────────────────────────────
const fetchStooqQuote = async (symbol) => {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return null;
    const text = await r.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const headers = lines[0].split(',').map(s => s.trim().toLowerCase());
    const values = lines[1].split(',').map(s => s.trim());
    const obj = Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
    const price = parseFloat(obj.close);
    if (!isFinite(price)) return null;
    return { price };
  } catch (e) {
    console.error('fetchStooqQuote error:', e.message);
    return null;
  }
};

// ── Google News RSS (topic-specific, returns real headlines) ──────────────────
const fetchGoogleNews = async (query, { hl = 'nl', gl = 'NL', limit = 4 } = {}) => {
  try {
    const ceid = `${gl}:${hl}`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${encodeURIComponent(ceid)}&when:7d`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return [];
    const xml = await r.text();
    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null && items.length < limit) {
      const chunk = m[1];
      const title = (chunk.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || chunk.match(/<title>(.*?)<\/title>/) || [])[1] || '';
      const link = (chunk.match(/<link>(.*?)<\/link>/) || [])[1] || '';
      const pub = (chunk.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || '';
      const date = (chunk.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
      if (title && link) items.push({ title: title.trim(), link: link.trim(), publisher: pub, publishedAt: date });
    }
    return items;
  } catch (e) {
    console.error('fetchGoogleNews error:', e.message);
    return [];
  }
};

// ── Trump sentiment: score recent headlines for political/trade risk ───────────
// Positive score = MORE risk (bad news for markets)
const scoreTrumpSentiment = (headlines) => {
  const badKeywords = [
    'tariff', 'tarief', 'sanction', 'sanctie', 'threat', 'dreig', 'trade war', 'handelsoorlog',
    'escalat', 'breakdown', 'misluk', 'fail', 'reject', 'afwijs', 'veto', 'impose', 'opleg',
    'crisis', 'tension', 'spanning', 'collapse', 'inzak', 'ban', 'verbod', 'retaliat',
    'military', 'militair', 'oorlog', 'war', 'attack', 'aanval', 'missile', 'nuclear',
    'shut down', 'default', 'deficit', 'schul', 'conflict', 'confrontat'
  ];
  const goodKeywords = [
    'deal', 'akkoord', 'agreement', 'overeenkomst', 'progress', 'vooruitgang',
    'truce', 'wapenstilstand', 'ceasefire', 'staakt', 'lift', 'ophef', 'resolv', 'oplos',
    'peace', 'vrede', 'positive', 'positief', 'rally', 'boost', 'recover', 'herstel',
    'lower', 'verlag', 'cut', 'vermin', 'cooperat', 'samenwerk', 'talk', 'overleg', 'negotiat'
  ];
  let risk = 0;
  for (const h of headlines) {
    const text = (h.title || '').toLowerCase();
    badKeywords.forEach(kw => { if (text.includes(kw)) risk += 12; });
    goodKeywords.forEach(kw => { if (text.includes(kw)) risk -= 8; });
  }
  return Math.max(-35, Math.min(40, risk));
};

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { bust } = req.query || {};
  const cacheKey = 'market-data-v2';
  const cached = CACHE.get(cacheKey);
  if (!bust && cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }

  try {
    // Fetch all in parallel: quotes + 3 news topics
    const [quotes, trumpNews, oilNews, marketNews] = await Promise.all([
      fetchQuotes(['^VIX', 'BZ=F', 'CL=F', '^GSPC', '^IXIC', '^AEX']),
      // Trump: Dutch + English to maximise relevance
      Promise.all([
        fetchGoogleNews('Trump tarief handelsoorlog akkoord deal', { hl: 'nl', gl: 'NL', limit: 3 }),
        fetchGoogleNews('Trump tariff trade war sanctions deal NATO', { hl: 'en', gl: 'US', limit: 3 }),
      ]).then(([a, b]) => [...a, ...b].slice(0, 5)),
      // Oil: Brent price + OPEC news
      Promise.all([
        fetchGoogleNews('Brent ruwe olie prijs OPEC vandaag', { hl: 'nl', gl: 'NL', limit: 3 }),
        fetchGoogleNews('Brent crude oil price OPEC today', { hl: 'en', gl: 'US', limit: 3 }),
      ]).then(([a, b]) => [...a, ...b].slice(0, 5)),
      // Market barometer: broad market sentiment
      Promise.all([
        fetchGoogleNews('aandelenmarkt beurs stijgt daalt vandaag', { hl: 'nl', gl: 'NL', limit: 3 }),
        fetchGoogleNews('stock market S&P 500 Wall Street today', { hl: 'en', gl: 'US', limit: 3 }),
      ]).then(([a, b]) => [...a, ...b].slice(0, 5)),
    ]);

    const q = (sym) => quotes.find(x => x.symbol === sym);
    const vixQ = q('^VIX');
    const brentQ = q('BZ=F');
    const wtiQ = q('CL=F');
    const spxQ = q('^GSPC');
    const ndxQ = q('^IXIC');
    const aexQ = q('^AEX');

    const trumpSentimentAdj = scoreTrumpSentiment(trumpNews);

    // Try Oilprice.com (preferred), then Brent via Yahoo, then WTI Yahoo, then Stooq, finally cached mock
    let oil = null;
    const preferred = (process.env.OIL_BENCHMARK || 'WTI').toUpperCase();
    const oilprice = await fetchOilpricePrice(preferred);
    if (oilprice?.price != null) {
      oil = {
        price: oilprice.price,
        change: oilprice.change,
        prevClose: null,
        symbol: `OILPRICE:${preferred}`,
        name: oilprice.name,
      };
    } else if (brentQ && brentQ.regularMarketPrice != null) {
      oil = {
        price: brentQ.regularMarketPrice,
        change: brentQ.regularMarketChangePercent,
        prevClose: brentQ.regularMarketPreviousClose,
        symbol: brentQ.symbol,
        name: brentQ.shortName || 'Brent Crude',
      };
    } else if (wtiQ && wtiQ.regularMarketPrice != null) {
      oil = {
        price: wtiQ.regularMarketPrice,
        change: wtiQ.regularMarketChangePercent,
        prevClose: wtiQ.regularMarketPreviousClose,
        symbol: wtiQ.symbol,
        name: wtiQ.shortName || 'WTI Crude',
      };
    } else {
      // Stooq fallback (no %change)
      const stqBrent = await fetchStooqQuote('brn.f');
      if (stqBrent?.price) {
        oil = { price: stqBrent.price, change: null, prevClose: null, symbol: 'STOOQ:BRN.F', name: 'Brent Crude' };
      } else {
        const stqWti = await fetchStooqQuote('cl.f');
        if (stqWti?.price) {
          oil = { price: stqWti.price, change: null, prevClose: null, symbol: 'STOOQ:CL.F', name: 'WTI Crude' };
        } else {
          // Mock fallback so frontend shows something instead of null
          oil = { price: 78.50, change: 0.8, prevClose: 77.70, symbol: 'MOCK', name: 'Crude (cached)' };
        }
      }
    }

    // Small helper: dedupe by title and keep recent first
    const dedupe = (arr) => {
      const seen = new Set();
      const out = [];
      for (const n of arr) {
        const key = (n.title || '').trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(n);
      }
      return out;
    };

    const data = {
      vix: vixQ
        ? { price: vixQ.regularMarketPrice, change: vixQ.regularMarketChangePercent }
        : null,
      oil,
      indices: {
        spx: spxQ ? { price: spxQ.regularMarketPrice, change: spxQ.regularMarketChangePercent } : null,
        ndx: ndxQ ? { price: ndxQ.regularMarketPrice, change: ndxQ.regularMarketChangePercent } : null,
        aex: aexQ ? { price: aexQ.regularMarketPrice, change: aexQ.regularMarketChangePercent } : null,
      },
      news: {
        trump: dedupe(trumpNews),
        oil: dedupe(oilNews),
        market: dedupe(marketNews),
      },
      trumpSentimentAdj,
      fetchedAt: new Date().toISOString(),
    };

    // Store in cache unless explicitly bypassed
    if (!bust) {
      CACHE.set(cacheKey, { data, ts: Date.now() });
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    return res.json({ ...data, bust: Boolean(bust) });
  } catch (err) {
    console.error('market-data error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
