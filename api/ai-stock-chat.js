// AI Stock Chat API
// Handles 4 modes: ticker analysis, screener Q&A, morning brief, portfolio coach

const CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

const callOpenAI = async (messages, apiKey, opts = {}) => {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY niet geconfigureerd');

  const body = {
    model: opts.model || 'gpt-4o-mini',
    messages,
    max_tokens: opts.max_tokens || 1200,
    temperature: opts.temperature ?? 0.65,
  };
  if (opts.json) body.response_format = { type: 'json_object' };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || 'OpenAI fout');
  }
  const data = await resp.json();
  return data.choices[0].message.content;
};

// Robust JSON parsing for LLM outputs
const safeJSONParse = (raw) => {
  try {
    if (!raw) throw new Error('Leeg antwoord van AI');
    if (typeof raw === 'object') return raw;
    let s = String(raw).trim();
    // Strip code fences if present
    if (s.startsWith('```')) {
      s = s.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
    }
    // First attempt
    try { return JSON.parse(s); } catch {}
    // Extract between first '{' and last '}'
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      const inner = s.slice(first, last + 1);
      try { return JSON.parse(inner); } catch {}
    }
    // Remove trailing commas heuristically
    const noTrailingCommas = s.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(noTrailingCommas);
  } catch (e) {
    throw new Error(e.message || 'JSON parse fout');
  }
};

// Fetch fresh stock snapshot from Yahoo
const fetchSnapshot = async (ticker) => {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!r.ok) return null;
    const j = await r.json();
    const q = j.quoteResponse?.result?.[0];
    if (!q) return null;
    return {
      ticker,
      name: q.longName || q.shortName || ticker,
      price: q.regularMarketPrice,
      change: q.regularMarketChangePercent,
      currency: q.currency || 'USD',
      sector: q.sector || '',
      industry: q.industry || '',
      marketCap: q.marketCap,
      pe: q.trailingPE,
      eps: q.epsTrailingTwelveMonths,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      avgVolume: q.averageDailyVolume3Month,
      targetMean: q.targetMeanPrice,
      analystRating: q.averageAnalystRating,
      analystCount: q.numberOfAnalystOpinions,
    };
  } catch { return null; }
};

// Fetch news headlines for a ticker
const fetchNews = async (ticker) => {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&newsCount=5&quotesCount=0`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.news || []).slice(0, 5).map(n => ({ title: n.title, link: n.link }));
  } catch { return []; }
};

// Fetch Google News RSS for a query (no API key required)
const fetchGoogleNews = async (query, { hl = 'nl', gl = 'NL', ceid = 'NL:nl', window = '7d', limit = 8 } = {}) => {
  try {
    const q = `${query} when:${window}`.trim();
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return [];
    const xml = await resp.text();
    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null && items.length < limit) {
      const itemXml = m[1];
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
      const pubMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      const srcMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);
      const title = (titleMatch && (titleMatch[1] || titleMatch[2])) ? (titleMatch[1] || titleMatch[2]) : '';
      const link = linkMatch ? linkMatch[1] : '';
      const publisher = srcMatch ? srcMatch[1] : '';
      const publishedAt = pubMatch ? pubMatch[1] : '';
      if (title && link) items.push({ title, link, publisher, publishedAt });
    }
    return items;
  } catch {
    return [];
  }
};

const buildMarketContext = async ({ message, rawTickers, snapshotData }) => {
  const detectedTickers = rawTickers?.length ? rawTickers : extractTickers(message);
  const contextTickers = [...new Set([...detectedTickers, ...detectMarketContext(message)])].slice(0, 5);

  const snapshots = await Promise.all(contextTickers.map(async (t) => {
    if (snapshotData?.[t]) {
      const d = snapshotData[t];
      return {
        ticker: t, name: d.name || t, price: d.current, change: d.changePercent,
        currency: d.currency || 'USD', sector: d.sector || '', industry: d.description || '',
        marketCap: null, pe: null, eps: null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null,
        targetMean: d.analystData?.targetPrice || null, analystRating: d.analystData?.mean || null,
        analystCount: d.analystData?.analysts || null, technicals: d.technicals || {}, growthData: d.growthData || {},
      };
    }
    return fetchSnapshot(t);
  }));

  const newsAll = await Promise.all(contextTickers.map(fetchNews));

  // ── Build search queries ──────────────────────────────────────────────────
  const queries = new Set();

  // Always include broad market queries so we always find something
  queries.add('aandelenmarkt nieuws vandaag');
  queries.add('beurs nieuws vandaag');
  queries.add('stock market news today');

  // The message itself as a query
  if (message && message.length > 0) queries.add(message);

  // ETF / investment advice questions → search for top ETF recommendations
  if (/(etf|index fund|tracker|vwce|iwda|msci|s&p|nasdaq)/i.test(message)) {
    queries.add('beste ETF beleggen 2025');
    queries.add('top ETF aanbevelingen');
    queries.add('best ETF to buy 2025');
  }

  // Stock recommendations without screener
  if (/(beste aandelen|goede aandelen|koop aandelen|dividend aandelen|groei aandelen)/i.test(message)) {
    queries.add('beste aandelen kopen 2025');
    queries.add('top aandelen aanbevelingen');
    queries.add('best stocks to buy 2025');
  }

  // Ticker-specific queries
  detectedTickers.forEach(t => {
    queries.add(t + ' nieuws');
    queries.add(t + ' stock news');
    if (/earnings|cijfers|kwartaalcijfers|resultaten/i.test(message)) queries.add(t + ' earnings');
  });

  // Domain-specific queries
  if (/\b(olie|oil|brent|wti|crude)\b/i.test(message)) {
    queries.add('Brent olie prijs vandaag'); queries.add('WTI crude oil price'); queries.add('OPEC nieuws');
  }
  if (/\b(rente|inflatie|fed|powell|ecb)\b/i.test(message)) {
    queries.add('rente besluit fed nieuws'); queries.add('inflatie VS Europa'); queries.add('ECB rente besluit');
  }
  if (/\b(tech|technologie|ai|artificial intelligence)\b/i.test(message)) {
    queries.add('tech aandelen nieuws'); queries.add('AI stocks news 2025'); queries.add('technologie sector beurs');
  }
  if (/(waarom|negatief|daalt|crash|dip|rood)/i.test(message)) {
    queries.add('aandelenmarkt daling reden'); queries.add('beurs daalt waarom'); queries.add('stock market drop reason today');
  }
  if (/(stijgt|positief|groen|rally|herstel)/i.test(message)) {
    queries.add('aandelenmarkt stijging reden'); queries.add('beurs stijgt waarom'); queries.add('stock market rally reason');
  }
  if (/(oorlog|geopolitiek|conflict|iran|israel|oekraïne|rusland)/i.test(message)) {
    queries.add('geopolitiek impact beurs'); queries.add('geopolitical risk markets'); queries.add('oorlog impact aandelen');
  }

  // ── Round 1: Dutch news ───────────────────────────────────────────────────
  const queryList = Array.from(queries).slice(0, 6);
  const googleNewsLists = await Promise.all(queryList.map(q => fetchGoogleNews(q, { hl: 'nl', gl: 'NL', ceid: 'NL:nl', window: '7d', limit: 8 })));
  let googleNews = googleNewsLists.flat();

  const mergedNews = [];
  const seen = new Set();
  [...newsAll.flat(), ...googleNews].forEach(n => {
    const key = (n.link || '') + '|' + (n.title || '');
    if (!seen.has(key)) { seen.add(key); mergedNews.push(n); }
  });

  // ── Round 2: English fallback if < 4 headlines ───────────────────────────
  if (mergedNews.length < 4) {
    const enQueries = Array.from(queries).slice(0, 6);
    const enLists = await Promise.all(enQueries.map(q => fetchGoogleNews(q, { hl: 'en', gl: 'US', ceid: 'US:en', window: '7d', limit: 8 })));
    enLists.flat().forEach(n => {
      const key = (n.link || '') + '|' + (n.title || '');
      if (!seen.has(key)) { seen.add(key); mergedNews.push(n); }
    });
  }

  // ── Round 3: Broader English search if still < 4 headlines ───────────────
  if (mergedNews.length < 4) {
    const broadQueries = ['stock market news', 'financial markets today', 'investing news', 'market outlook'];
    const broadLists = await Promise.all(broadQueries.map(q => fetchGoogleNews(q, { hl: 'en', gl: 'US', ceid: 'US:en', window: '3d', limit: 6 })));
    broadLists.flat().forEach(n => {
      const key = (n.link || '') + '|' + (n.title || '');
      if (!seen.has(key)) { seen.add(key); mergedNews.push(n); }
    });
  }

  const dataBlocks = contextTickers.map((t, i) => {
    const s = snapshots[i];
    const n = newsAll[i];
    const tech = s?.technicals || {};
    const growth = s?.growthData || {};
    const analystTarget = s?.targetMean || s?.analystData?.targetPrice;
    const analystRating = s?.analystRating || s?.analystData?.mean;
    const upside = analystTarget && s?.price ? (((analystTarget - s.price) / s.price) * 100).toFixed(1) : null;

    if (!s) return `${t}: geen data gevonden.`;

    return `
TICKER: ${t} (${s.name})
Sector: ${s.sector || 'onbekend'} | Omschrijving: ${s.industry || 'onbekend'}
Koers: ${s.currency} ${s.price?.toFixed(2) ?? 'N/A'} (${s.change >= 0 ? '+' : ''}${s.change?.toFixed(2) ?? 'N/A'}% vandaag)
Groei: 1m ${growth.growth1mo != null ? `${growth.growth1mo >= 0 ? '+' : ''}${growth.growth1mo?.toFixed(1)}%` : 'N/A'} | 6m ${growth.growth6mo != null ? `${growth.growth6mo >= 0 ? '+' : ''}${growth.growth6mo?.toFixed(1)}%` : 'N/A'} | 1j ${growth.growth1yr != null ? `${growth.growth1yr >= 0 ? '+' : ''}${growth.growth1yr?.toFixed(1)}%` : 'N/A'}
Technisch: RSI ${tech.rsi?.toFixed(0) ?? 'N/A'} | SMA50 ${tech.sma50 ? (s.price > tech.sma50 ? 'boven' : 'onder') : 'N/A'} | SMA200 ${tech.sma200 ? (s.price > tech.sma200 ? 'boven' : 'onder') : 'N/A'}
Analisten: doel ${analystTarget ?? 'N/A'}${upside != null ? ` (${upside >= 0 ? '+' : ''}${upside}% upside)` : ''} | rating ${analystRating ?? 'N/A'}
Nieuws: ${n.map(x => `• ${x.title}`).join('\n') || 'geen recente nieuwsitems'}`.trim();
  }).join('\n\n---\n\n');

  return { contextTickers, dataBlocks, newsAll, mergedNews };
};

// Extract ticker symbols from a free-text message
const extractTickers = (message) => {
  // Matches uppercase sequences of 1-5 letters, optionally with . suffix (European tickers)
  const matches = message.match(/\b([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\b/g) || [];
  // Filter out common non-ticker words
  const stopwords = new Set(['AI', 'ETF', 'RSI', 'SMA', 'EMA', 'AND', 'OR', 'NOT', 'THE', 'FOR', 'IS', 'VS', 'IN', 'OF', 'TO', 'A', 'AN', 'UCITS']);
  return [...new Set(matches.filter(m => !stopwords.has(m)))];
};

// Detect if ticker is an ETF based on name or ticker pattern
const isETF = (ticker, name = '') => {
  const lowerName = name.toLowerCase();
  const lowerTicker = ticker.toLowerCase();
  
  // Common ETF patterns
  if (/\b(etf|ucits|index fund|tracker)\b/i.test(lowerName)) return true;
  if (/^(SPY|QQQ|VOO|VTI|IVV|VWO|EEM|GLD|SLV|TLT|AGG|BND|VEA|IEFA|VXUS|SCHD|VYM|VIG|VWCE|IWDA|EMIM)$/i.test(ticker)) return true;
  
  return false;
};

// Enrich ETF data with attributes
const enrichETF = (ticker, name = '') => {
  const lowerName = name.toLowerCase();
  const lowerTicker = ticker.toLowerCase();
  
  const attributes = {
    isETF: isETF(ticker, name),
    category: 'Unknown',
    geography: 'Unknown',
    assetClass: 'Equity',
  };
  
  // Asset class
  if (/\b(bond|obligatie|fixed income)\b/i.test(lowerName)) attributes.assetClass = 'Fixed Income';
  if (/\b(commodity|grondstof|goud|zilver|olie)\b/i.test(lowerName)) attributes.assetClass = 'Commodity';
  if (/\b(reit|vastgoed|real estate)\b/i.test(lowerName)) attributes.assetClass = 'Real Estate';
  
  // Geography
  if (/\b(world|wereld|global|all country|acwi)\b/i.test(lowerName)) attributes.geography = 'Global';
  if (/\b(us|usa|america|s&p|nasdaq)\b/i.test(lowerName)) attributes.geography = 'US';
  if (/\b(europe|europa|stoxx)\b/i.test(lowerName)) attributes.geography = 'Europe';
  if (/\b(emerging|opkomend|em)\b/i.test(lowerName)) attributes.geography = 'Emerging Markets';
  if (/\b(asia|pacific|japan|china)\b/i.test(lowerName)) attributes.geography = 'Asia-Pacific';
  
  // Category
  if (/\b(dividend|income|yield)\b/i.test(lowerName)) attributes.category = 'Dividend';
  if (/\b(growth|groei)\b/i.test(lowerName)) attributes.category = 'Growth';
  if (/\b(value|waarde)\b/i.test(lowerName)) attributes.category = 'Value';
  if (/\b(small cap|small-cap)\b/i.test(lowerName)) attributes.category = 'Small Cap';
  if (/\b(tech|technology|technologie)\b/i.test(lowerName)) attributes.category = 'Technology';
  if (/\b(esg|sustainable|duurzaam)\b/i.test(lowerName)) attributes.category = 'ESG/Sustainable';
  
  // Specific tickers
  if (/^(VWCE|VWRL)$/i.test(ticker)) {
    attributes.category = 'All-World';
    attributes.geography = 'Global';
  }
  if (/^(IWDA|SWDA)$/i.test(ticker)) {
    attributes.category = 'Developed Markets';
    attributes.geography = 'Global';
  }
  if (/^(EMIM|IEMM)$/i.test(ticker)) {
    attributes.category = 'Emerging Markets';
    attributes.geography = 'Emerging Markets';
  }
  
  return attributes;
};

const detectMarketContext = (message = '') => {
  const lower = message.toLowerCase();
  const symbols = [];

  const add = (symbol) => {
    if (!symbols.includes(symbol)) symbols.push(symbol);
  };

  if (/\b(olie|oil|brent|wti|crude)\b/i.test(lower)) {
    add('CL=F');
    add('BZ=F');
  }

  if (/\b(earnings|cijfers|kwartaalcijfers|resultaten|voor earnings|vlak voor earnings)\b/i.test(lower)) {
    add('^GSPC');
    add('^IXIC');
  }

  if (/\b(vix|volatiliteit|volatility)\b/i.test(lower)) {
    add('^VIX');
  }

  if (/\b(markt|marktbreed|macro|rente|inflatie|fed|powell|economie)\b/i.test(lower)) {
    add('^GSPC');
    add('^IXIC');
    add('^TNX');
  }

  return symbols;
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-openai-key, X-OpenAI-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', c => { data += c; });
      req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
      req.on('error', () => resolve({}));
    });
  }

  const { type, message, tickers: rawTickers, snapshotData, portfolio, watchlist, screenerData, apiKey, constraints } = body || {};
  const userApiKey = apiKey || req.headers['x-openai-key'] || req.headers['X-OpenAI-Key'];

  if (!type || !message) return res.status(400).json({ error: 'Verplichte velden: type, message' });

  const cacheKey = `${type}-${JSON.stringify({ message, rawTickers }).substring(0, 120)}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }

  try {
    // ─── MODE: TICKER ANALYSIS ───────────────────────────────────────────────
    if (type === 'ticker') {
      const tickers = rawTickers?.length ? rawTickers : extractTickers(message);
      if (!tickers.length) return res.status(400).json({ error: 'Geen geldige ticker(s) gevonden in het bericht.' });

      // Use pre-fetched snapshotData from frontend if available, else fetch from Yahoo
      const snapshots = await Promise.all(tickers.map(async (t) => {
        if (snapshotData?.[t]) {
          const d = snapshotData[t];
          // Normalize frontend stockPrices shape to our snapshot shape
          return {
            ticker: t,
            name: d.name || t,
            price: d.current,
            change: d.changePercent,
            currency: d.currency || 'USD',
            sector: d.sector || '',
            industry: d.description || '',
            marketCap: null,
            pe: null,
            eps: null,
            fiftyTwoWeekHigh: null,
            fiftyTwoWeekLow: null,
            targetMean: d.analystData?.targetPrice || null,
            analystRating: d.analystData?.mean || null,
            analystCount: d.analystData?.analysts || null,
            technicals: d.technicals || {},
            growthData: d.growthData || {},
          };
        }
        return fetchSnapshot(t);
      }));
      const newsAll = await Promise.all(tickers.map(fetchNews));

      const dataBlocks = tickers.map((t, i) => {
        const s = snapshots[i];
        const n = newsAll[i];
        const preSnap = snapshotData?.[t];
        if (!s && !preSnap) return t + ': geen data gevonden.';
        const tech = s.technicals || {};
        const growth = s.growthData || {};
        const analystTarget = s.targetMean || s.analystData?.targetPrice;
        const analystRating = s.analystRating || s.analystData?.mean;
        const upside = analystTarget && s.price ? (((analystTarget - s.price) / s.price) * 100).toFixed(1) : null;
        const newsStr = (n || []).slice(0, 4).map(x => '• ' + x.title).join('\n') || 'geen nieuws';
        return 'TICKER: ' + t + ' (' + s.name + ')\n' +
          'Sector: ' + (s.sector || 'onbekend') + ' | ' + (s.industry || s.description || 'onbekend') + '\n' +
          'Koers: ' + (s.currency || '') + ' ' + (s.price != null ? s.price.toFixed(2) : 'N/A') + ' (' + (s.change >= 0 ? '+' : '') + (s.change != null ? s.change.toFixed(2) : 'N/A') + '% vandaag)\n' +
          'Groei: 1m ' + (growth.growth1mo != null ? (growth.growth1mo >= 0 ? '+' : '') + growth.growth1mo.toFixed(1) + '%' : 'N/A') + ' | 6m ' + (growth.growth6mo != null ? (growth.growth6mo >= 0 ? '+' : '') + growth.growth6mo.toFixed(1) + '%' : 'N/A') + ' | 1j ' + (growth.growth1yr != null ? (growth.growth1yr >= 0 ? '+' : '') + growth.growth1yr.toFixed(1) + '%' : 'N/A') + '\n' +
          'Technisch: RSI ' + (tech.rsi != null ? tech.rsi.toFixed(0) : 'N/A') + ' | SMA50 ' + (tech.sma50 ? (s.price > tech.sma50 ? 'boven' : 'onder') : 'N/A') + ' | SMA200 ' + (tech.sma200 ? (s.price > tech.sma200 ? 'boven' : 'onder') : 'N/A') + '\n' +
          'Analisten: doel ' + (analystTarget != null ? analystTarget : 'N/A') + (upside != null ? ' (' + (upside >= 0 ? '+' : '') + upside + '% upside)' : '') + ' | rating ' + (analystRating != null ? analystRating : 'N/A') + '\n' +
          'Nieuws:\n' + newsStr;
      }).join('\n\n---\n\n');

      const userQuestion = message.replace(/\b[A-Z]{1,5}(?:\.[A-Z]{1,2})?\b/g, '').trim() || 'Geef een volledige analyse.';

      const prompt = 'Je bent een senior financieel analist. De gebruiker vraagt om een analyse van ' + tickers.join(', ') + '. Gebruik onderstaande data.\\n\\nMARKTDATA:\\n' + dataBlocks + '\\n\\nVRAAG VAN GEBRUIKER: "' + userQuestion + '"\\n\\nGeef exact dit JSON-formaat:\\n{\\n  "tickers": ["' + tickers.join('","') + '"],\\n  "sections": [\\n    { "title": "📌 Wat doet ' + (tickers.length === 1 ? tickers[0] : 'het bedrijf') + '?", "content": "Max 2 zinnen: wat doet het bedrijf, wat is de core activiteit." },\\n    { "title": "📊 Markt snapshot", "content": "Koers, dagmutatie, 52w range, marktwaarde, P/E in plain text." },\\n    { "title": "👨‍💼 Analisten", "content": "Rating, doelkoers, opwaarts/neerwaarts potentieel." },\\n    { "title": "📰 Nieuws & sentiment", "content": "Samenvatting van de laatste nieuwsitems en hun impact." },\\n    { "title": "⚡ Kansen & risico\'s", "content": "2-3 kansen en 2-3 risico\'s." },\\n    { "title": "🎯 Conclusie", "content": "Duidelijk oordeel: kopen / houden / verkopen, met tijdshorizon." }\\n  ],\\n  "verdict": "kopen|houden|verkopen",\\n  "confidence": <0-100>,\\n  "oneliner": "<Max 15 woorden: kern van de conclusie>"\\n}';

      let raw = await callOpenAI([
        { role: 'system', content: 'Je bent een senior financieel analist. Antwoord altijd in geldig JSON.' },
        { role: 'user', content: prompt }
      ], userApiKey, { json: true, max_tokens: 1400 });

      let result;
      try { result = safeJSONParse(raw); }
      catch (e) {
        const response = { type: 'text', content: String(raw || e.message || 'AI parse fout'), fetchedAt: new Date().toISOString(), fallback: 'llm_parse_failed' };
        CACHE.set(cacheKey, { data: response, ts: Date.now() });
        return res.json(response);
      }
      const newsLinks = newsAll.flat().slice(0, 6);
      const response = { type: 'ticker', result, newsLinks, fetchedAt: new Date().toISOString() };
      CACHE.set(cacheKey, { data: response, ts: Date.now() });
      return res.json(response);
    }

    // ─── MODE: MARKET Q&A ────────────────────────────────────────────────────
    if (type === 'market') {
      const { contextTickers, dataBlocks, newsAll, mergedNews } = await buildMarketContext({ message, rawTickers, snapshotData });
      const headlinesText = (mergedNews || []).slice(0, 15).map((n, idx) => (idx + 1) + '. ' + n.title + (n.publisher ? ' — ' + n.publisher : '') + (n.publishedAt ? ' (' + n.publishedAt + ')' : '')).join('\n');

      // Detect requested count — only 1-2 digit numbers (avoid matching years like 2025)
      const countMatch = message.match(/\b([1-9][0-9]?)\b(?!\d)/);
      const rawCount = countMatch ? parseInt(countMatch[1]) : 5;
      const requestedCount = Math.min(rawCount > 0 ? rawCount : 5, 20);

      // Detect question type for layout hint
      const isListQuestion = /(geef|top|beste|lijst|noem|welke|kloppers|aanbeveling|goede|sterke|dividend|groei|kopen)/i.test(message);
      const isMarketQuestion = /(waarom|hoe komt|reden|negatief|positief|stijgt|daalt|beurs|markt|vandaag|macro|rente|fed|inflatie)/i.test(message);
      const isCompareQuestion = /(versus|vs|vergelijk|verschil|beter|slechter)/i.test(message);
      const isETFQuestion = /(etf|index|tracker|fonds|vwce|iwda|msci)/i.test(message);

      let layoutHint = '';
      if (isListQuestion) layoutHint = 'LIST';
      else if (isCompareQuestion) layoutHint = 'COMPARE';
      else if (isMarketQuestion) layoutHint = 'MARKET_ANALYSIS';
      else layoutHint = 'GENERAL';

      const systemPrompt = 'Je bent een senior financieel analist en beleggingsadviseur. Regels:\n'
        + '1. Beantwoord ALTIJD met concrete, specifieke antwoorden. NOOIT vaag.\n'
        + '2. Als de gebruiker om X aandelen/ETFs vraagt, geef je er PRECIES X. Altijd.\n'
        + '3. Gebruik je eigen uitgebreide financiele kennis + de aangeleverde headlines.\n'
        + '4. Geef altijd echte tickers in het juiste formaat (bijv. AAPL, VWCE.DE, ASML.AS).\n'
        + '5. Antwoord in het Nederlands. Retourneer geldig JSON.';

      const userPrompt = 'VRAAG: "' + message + '"\n'
        + 'GEVRAAGD AANTAL: ' + requestedCount + '\n'
        + 'VRAAG TYPE: ' + layoutHint + '\n\n'
        + 'RECENTE HEADLINES:\n' + (headlinesText || 'Geen headlines beschikbaar') + '\n\n'
        + (dataBlocks ? 'LIVE MARKTDATA:\n' + dataBlocks + '\n\n' : '')
        + 'INSTRUCTIES VOOR DIT ANTWOORD:\n'
        + (isListQuestion
          ? '- Geef een LIJST van PRECIES ' + requestedCount + ' aandelen/ETFs met voor elk: ticker, volledige naam, sector, korte reden (2 zinnen), en huidige sentimentscore.\n'
          + '- Varieer over sectoren tenzij specifiek gevraagd.\n'
          + (isETFQuestion ? '- Focus op bekende ETFs: VWCE.DE, IWDA.AS, EMIM.AS, QQQ, SPY, VUSA.AS, CSPX.AS, EQQQ.AS, SWRD.AS, VHYL.AS etc.\n' : '- Gebruik bekende tickers: AAPL, MSFT, NVDA, ASML.AS, AMZN, GOOGL, META, TSLA, JPM, etc.\n')
          : isMarketQuestion
          ? '- Geef een concrete analyse: welke factoren (macro, rente, geopolitiek, earnings, sentiment) drijven de beweging.\n'
          + '- Baseer je op de headlines + je kennis. Noem specifieke gebeurtenissen of data.\n'
          + '- BELANGRIJK: de gebruiker vraagt om ANALYSE, NIET om aanbevelingen. Zet topPicks op een LEGE array [].\n'
          + '- Vul drivers (min. 3) en risks (min. 2) zo specifiek mogelijk in met echte factoren.\n'
          : isCompareQuestion
          ? '- Vergelijk beide opties op: rendement, risico, kosten, geschiktheid.\n'
          + '- Geef een duidelijke winnaar met onderbouwing.\n'
          + '- BELANGRIJK: dit is een vergelijking. Zet topPicks op een LEGE array [].\n'
          : '- Beantwoord de vraag zo specifiek en nuttig mogelijk.\n'
          + '- Als de vraag niet expliciet om een aandelenlijst vraagt, zet topPicks op een LEGE array [].\n')
        + '- Gebruik de headlines als bewijs waar relevant.\n'
        + '- Geef NOOIT "het is moeilijk te zeggen" of vergelijkbare vage zinnen.\n\n'
        + 'Retourneer EXACT dit JSON (topPicks array moet PRECIES ' + requestedCount + ' items bevatten als het een lijstvraag is):\n'
        + '{"answer":"<directe samenvatting in 2-3 zinnen>","topPicks":[{"ticker":"<TICKER>","name":"<Volledige naam>","sector":"<sector>","reason":"<2 zinnen onderbouwing>","sentiment":"bullish|neutraal|bearish"}],"sections":[{"title":"<sectie titel>","content":"<inhoud>"}],"drivers":["<factor 1>","<factor 2>","<factor 3>"],"risks":["<risico 1>","<risico 2>"],"followUpQuestions":["<vraag 1>","<vraag 2>"],"evidence":[{"title":"<headline>","link":"<url>"}],"verdict":"kopen|houden|verkopen|neutraal","confidence":<0-100>,"responseType":"' + layoutHint + '"}';

      let raw = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], userApiKey, { json: true, max_tokens: 2500 });

      let result;
      try { result = safeJSONParse(raw); }
      catch (e) {
        const response = { type: 'text', content: String(raw || e.message || 'AI parse fout'), fetchedAt: new Date().toISOString(), fallback: 'llm_parse_failed' };
        CACHE.set(cacheKey, { data: response, ts: Date.now() });
        return res.json(response);
      }
      const newsLinks = (mergedNews && mergedNews.length > 0 ? mergedNews : newsAll.flat()).slice(0, 8);
      const response = { type: 'market', result, newsLinks, fetchedAt: new Date().toISOString(), tickers: contextTickers };
      CACHE.set(cacheKey, { data: response, ts: Date.now() });
      return res.json(response);
    }

    // ─── MODE: SCREENER Q&A ──────────────────────────────────────────────────
    if (type === 'screener') {
      // Apply constraints if provided
      let filteredData = screenerData || [];
      
      if (constraints) {
        if (constraints.maxPrice) {
          filteredData = filteredData.filter(s => s.currentPrice <= constraints.maxPrice);
        }
        if (constraints.minPrice) {
          filteredData = filteredData.filter(s => s.currentPrice >= constraints.minPrice);
        }
        if (constraints.sector) {
          filteredData = filteredData.filter(s => s.sector === constraints.sector);
        }
        if (constraints.dividend) {
          filteredData = filteredData.filter(s => s.qualityScore >= 60);
        }
        if (constraints.lowRisk) {
          filteredData = filteredData.filter(s => s.rsi >= 30 && s.rsi <= 70);
        }
        if (constraints.growth) {
          filteredData = filteredData.filter(s => s.growth6mo > 10);
        }
      }
      
      // ETF detection and enrichment
      const enrichedData = filteredData.map(s => {
        const etfAttrs = enrichETF(s.ticker, s.name);
        return { ...s, ...etfAttrs };
      });
      
      // Filter ETFs if requested
      let finalData = enrichedData;
      if (constraints?.etf) {
        finalData = enrichedData.filter(s => s.isETF);
      }
      
      if (!finalData || finalData.length === 0) {
        return res.status(400).json({ error: 'Geen resultaten gevonden in de screener.' });
      }
      
      const dataStr = finalData.slice(0, 50).map(s => {
        const etfLabel = s.isETF ? '[ETF: ' + s.category + ', ' + s.geography + ']' : '';
        return s.ticker + ' (' + s.name + ') ' + etfLabel + ' - €' + s.currentPrice + ' | RSI ' + s.rsi + ' | 1M ' + (s.growth1mo >= 0 ? '+' : '') + s.growth1mo + '% | 6M ' + (s.growth6mo >= 0 ? '+' : '') + s.growth6mo + '% | Q ' + s.qualityScore + ' | ' + (s.sector || 'N/A');
      }).join('\n');

      const prompt = 'Je bent een beleggingsassistent. Beantwoord de gebruikersvraag op basis van onderstaande screener-data. Gebruik altijd concrete tickers als bewijs.\\n\\nSCREENER DATA:\\n' + dataStr + '\\n\\nVRAAG: "' + message + '"\\n\\nRetourneer EXACT dit JSON-formaat:\\n{\\n  "answer": "<Nederlandstalige uitleg in 3-5 zinnen>",\\n  "topPicks": [\\n    { "ticker": "<ticker>", "reason": "<Max 10 woorden waarom>" }\\n  ],\\n  "filters": "<beschrijving van de filters die je hebt toegepast>"\\n}';

      let raw = await callOpenAI([
        { role: 'system', content: 'Financieel assistent. Geef altijd geldig JSON.' },
        { role: 'user', content: prompt }
      ], userApiKey, { json: true, max_tokens: 900 });

      let result;
      try { result = safeJSONParse(raw); }
      catch (e) {
        const response = { type: 'text', content: String(raw || e.message || 'AI parse fout'), fetchedAt: new Date().toISOString(), fallback: 'llm_parse_failed' };
        CACHE.set(cacheKey, { data: response, ts: Date.now() });
        return res.json(response);
      }
      const response = { type: 'screener', result, fetchedAt: new Date().toISOString() };
      CACHE.set(cacheKey, { data: response, ts: Date.now() });
      return res.json(response);
    }

    // ─── MODE: MORNING BRIEF ─────────────────────────────────────────────────
    if (type === 'brief') {
      const portfolioItems = Array.isArray(portfolio) ? portfolio : [];
      const watchlistItems = Array.isArray(watchlist) ? watchlist : [];

      // Fetch live market headlines for richer brief context
      const briefNewsLists = await Promise.all([
        fetchGoogleNews('aandelenmarkt beurs nieuws vandaag', { hl: 'nl', gl: 'NL', window: '1d', limit: 5 }),
        fetchGoogleNews('stock market news today', { hl: 'en', gl: 'US', ceid: 'US:en', window: '1d', limit: 5 }),
      ]);
      const briefHeadlines = [...briefNewsLists[0], ...briefNewsLists[1]].slice(0, 8);
      const briefHeadlinesText = briefHeadlines.length
        ? briefHeadlines.map((n, i) => (i + 1) + '. ' + n.title + (n.publisher ? ' — ' + n.publisher : '')).join('\n')
        : 'Geen recente nieuwskoppen beschikbaar.';

      const portfolioSummary = portfolioItems.map(p => {
        const sp = p.stockPrice || {};
        const pnl = sp.changePercent ?? 0;
        return (p.ticker_symbol || p.name) + ': ' + (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '% vandaag';
      }).join('\n') || 'Geen portfolio data.';

      const watchlistSummary = watchlistItems.map(w => {
        const sp = w.stockPrice || {};
        return w.ticker + ': ' + (sp.changePercent !== undefined ? (sp.changePercent >= 0 ? '+' : '') + sp.changePercent.toFixed(2) + '%' : 'geen data');
      }).join('\n') || 'Geen watchlist data.';

      const prompt = 'Je bent een persoonlijk beleggingscoach. Schrijf een beknopte dagelijkse brief in het Nederlands op basis van de portfolio- en watchlist-bewegingen EN de actuele marktkoppen.\n\nACTUELE MARKTKOPPEN VANDAAG:\n' + briefHeadlinesText + '\n\nPORTFOLIO BEWEGINGEN VANDAAG:\n' + portfolioSummary + '\n\nWATCHLIST BEWEGINGEN VANDAAG:\n' + watchlistSummary + '\n\nRetourneer EXACT dit JSON:\n{\n  "greeting": "<Persoonlijke begroeting met datum en korte marktsamenvatting, max 2 zinnen>",\n  "highlights": [\n    { "type": "winner|loser|alert", "ticker": "<ticker>", "message": "<max 12 woorden>" }\n  ],\n  "focus": "<1-2 tickers om vandaag extra op te letten, met reden>",\n  "tip": "<Beleggingstip van de dag, max 2 zinnen>",\n  "mood": "bullish|neutraal|voorzichtig"\n}';

      let raw = await callOpenAI([
        { role: 'system', content: 'Persoonlijk beleggingscoach. Geef altijd geldig JSON.' },
        { role: 'user', content: prompt }
      ], userApiKey, { json: true, max_tokens: 800 });

      let result;
      try { result = safeJSONParse(raw); }
      catch (e) {
        const response = { type: 'text', content: String(raw || e.message || 'AI parse fout'), fetchedAt: new Date().toISOString(), fallback: 'llm_parse_failed' };
        CACHE.set(cacheKey, { data: response, ts: Date.now() });
        return res.json(response);
      }
      const response = { type: 'brief', result, fetchedAt: new Date().toISOString() };
      CACHE.set(cacheKey, { data: response, ts: Date.now() });
      return res.json(response);
    }

    // ─── MODE: PORTFOLIO COACH ───────────────────────────────────────────────
    if (type === 'coach') {
      const portfolioItems = Array.isArray(portfolio) ? portfolio : [];

      // Compute allocation by sector
      const totalValue = portfolioItems.reduce((sum, p) => sum + (p.currentValue || p.amount || 0), 0);
      const sectorMap = {};
      portfolioItems.forEach(p => {
        const sec = p.sector || 'Overig';
        sectorMap[sec] = (sectorMap[sec] || 0) + (p.currentValue || p.amount || 0);
      });
      const sectorBreakdown = Object.entries(sectorMap)
        .sort((a, b) => b[1] - a[1])
        .map(([sec, val]) => sec + ': ' + (totalValue > 0 ? ((val / totalValue) * 100).toFixed(1) : 0) + '%')
        .join(', ');
      const portfolioSummary = portfolioItems.map(p => {
        const sp = p.stockPrice || {};
        const currentValue = sp.current ? sp.current * (Number(p.shares) || 0) : p.currentValue || 0;
        const invested = Number(p.amount) || 0;
        const pnl = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
        return (p.ticker_symbol || p.name) + ': €' + currentValue.toFixed(0) + ' (' + (pnl >= 0 ? '+' : '') + pnl.toFixed(1) + '%)';
      }).join('\n') || 'Geen portfolio data.';

      const totalInvested = portfolioItems.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalCurrent = portfolioItems.reduce((sum, p) => {
        const sp = p.stockPrice || {};
        const val = sp.current ? sp.current * (Number(p.shares) || 0) : p.currentValue || 0;
        return sum + val;
      }, 0);
      const totalPnL = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

      const prompt = 'Je bent een persoonlijk portfolio coach. Analyseer de portfolio en geef advies in het Nederlands.\n\nPORTFOLIO OVERZICHT:\nTotaal geïnvesteerd: €' + totalInvested.toFixed(0) + '\nHuidige waarde: €' + totalCurrent.toFixed(0) + '\nTotaal rendement: ' + (totalPnL >= 0 ? '+' : '') + totalPnL.toFixed(1) + '%\nSector verdeling: ' + (sectorBreakdown || 'onbekend') + '\n\nPOSITIES:\n' + portfolioSummary + '\n\nVRAAG VAN GEBRUIKER: "' + message + '"\n\nRetourneer EXACT dit JSON:\n{\n  "score": <0-100, overall portfolio score>,\n  "diversificationScore": <0-100>,\n  "summary": "<2-3 zinnen samenvatting van de portfolio>",\n  "strengths": ["<sterkte 1>", "<sterkte 2>"],\n  "risks": ["<risico 1>", "<risico 2>"],\n  "actions": [\n    { "priority": "hoog|middel|laag", "action": "<actie beschrijving>", "ticker": "<optioneel ticker>" }\n  ],\n  "comment": "<Persoonlijk advies, max 2 zinnen>"\n}';

      let raw = await callOpenAI([
        { role: 'system', content: 'Portfolio manager. Geef altijd geldig JSON.' },
        { role: 'user', content: prompt }
      ], userApiKey, { json: true, max_tokens: 1000 });

      let result;
      try { result = safeJSONParse(raw); }
      catch (e) {
        const response = { type: 'text', content: String(raw || e.message || 'AI parse fout'), fetchedAt: new Date().toISOString(), fallback: 'llm_parse_failed' };
        CACHE.set(cacheKey, { data: response, ts: Date.now() });
        return res.json(response);
      }
      const response = { type: 'coach', result, fetchedAt: new Date().toISOString() };
      CACHE.set(cacheKey, { data: response, ts: Date.now() });
      return res.json(response);
    }

    return res.status(400).json({ error: 'Onbekend type: ' + type });

  } catch (error) {
    console.error('AI Stock Chat error:', error.message);
    return res.status(500).json({ error: error.message || 'Interne serverfout' });
  }
};
