// AI Explanation API - Uses OpenAI GPT-4o-mini for financial data explanations
// Provides Dutch explanations of analyst data, news, and stock performance

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Simple in-memory cache (1 hour TTL)
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Increment this when prompts change to invalidate old cache
const CACHE_VERSION = 'v6';

const getCacheKey = (type, ticker, data) => {
  return `${CACHE_VERSION}-${type}-${ticker}-${JSON.stringify(data).substring(0, 100)}`;
};

const callOpenAI = async (prompt, apiKeyOverride, opts = {}) => {
  const key = apiKeyOverride || OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY not configured in environment variables');
  }

  const body = {
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'Je bent een financieel analist die complexe data uitlegt in begrijpelijk Nederlands. Gebruik duidelijke structuur met bullets en nummering waar gevraagd.'
    }, {
      role: 'user',
      content: prompt
    }],
    max_tokens: opts.max_tokens || 900,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.json) body.response_format = { type: 'json_object' };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-openai-key, X-OpenAI-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body if it's a string (handles cases where body parser doesn't run)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    if (!body) {
      // Try reading raw body from request stream
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
        });
        req.on('error', () => resolve({}));
      });
    }
    const { type, ticker, data } = body || {};

    if (!type || !ticker) {
      return res.status(400).json({ error: 'Missing required fields: type, ticker' });
    }

    // Check cache
    const cacheKey = getCacheKey(type, ticker, data);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ Cache hit for ${type} - ${ticker}`);
      return res.json({ explanation: cached.explanation, cached: true });
    }

    let prompt = '';

    switch (type) {
      case 'market_barometer':
        const baroArticles = Array.isArray(data) ? data.slice(0, 20) : [];
        const baroSummary = baroArticles.map((a, i) => `${i + 1}. ${a.title} | ${a.link || ''}`).join('\n');
        prompt = `Je bent een senior beursstrateeg. Classificeer het verwachte MARKTsentiment (niet één aandeel) op basis van onderstaande nieuwsitems en retourneer UITSLUITEND een geldig JSON-object.

Nieuws:
${baroSummary}

Retourneer PRECIES dit JSON-formaat:
{
  "sentiment": "bullish|bearish|neutraal",
  "confidence": <geheel 0-100>,
  "drivers": [
    {
      "theme": "<1-3 woorden thema, bv. Olie schaarste / FED-rente / Oorlog>",
      "direction": "bullish|bearish|neutraal",
      "why": "<max 2 zinnen over markteffect (bv. olie-tekort → inflatie omhoog → winstmarges onder druk)>",
      "link": "<link naar meest relevante artikel>"
    }
  ],
  "summary": "<één zin: wat mag een belegger vandaag verwachten?>"
}

Regels:
- Kies de TOP-3 belangrijkste drivers
- Koppel OLIEvoorraad/OLIEschaarste → inflatie → renteverwachting → risk assets (bearish als schaarste; bullish bij voorraadaanvulling)
- Koppel oorlog/geopolitiek aan risico-aversie (bearish) tenzij de-escalatie (bullish)
- Noem rente/FED/ECB signalen expliciet als ze in het nieuws staan (impact op waarderingen)
- Gebruik altijd de meegegeven nieuwslinks
- Schrijf alles in het Nederlands
- Alleen JSON teruggeven`;
        break;

      case 'buy_check':
        // Expect: { news: [{title, link}], technicals: {...}, performance: {...}, qualityScore, analyst: {...}, risk: {...} }
        const newsList = Array.isArray(data?.news) ? data.news.slice(0, 5) : [];
        const newsLines = newsList.map((a, i) => `${i + 1}. ${a.title} | ${a.link || ''}`).join('\n');
        const t = data?.technicals || {};
        const p = data?.performance || {};
        const a = data?.analyst || {};
        const r = data?.risk || {};
        const qs = data?.qualityScore ?? '';
        prompt = `Je bent een portfoliomanager. Beoordeel of ${ticker} NU interessant is om te kopen op basis van TECHNIEK + NIEUWS. Geef UITSLUITEND geldig JSON terug.

Technisch:
- RSI: ${t.rsi ?? ''}
- MACD: ${t.macd?.histogram != null ? (t.macd.histogram > 0 ? 'bullish' : 'bearish') : (t.macd?.trend || '')}
- SMA50: ${t.sma50 ?? ''} | SMA200: ${t.sma200 ?? ''} | Prijs: ${t.currentPrice ?? ''}
- EMA-trend: ${t.emaTrendUp === true ? 'up' : (t.emaTrendUp === false ? 'down' : '')}
- ADX: ${t.adx ?? ''}
- StochRSI: ${t.stochRsi ?? ''}
- ATR%: ${t.atr && t.currentPrice ? ((t.atr / t.currentPrice) * 100).toFixed(1) : ''}
- 52w: nearHigh ${t.near52wHigh ?? ''}% | nearLow ${t.near52wLow ?? ''}%
- OBV up: ${t.obvUp === true ? 'ja' : (t.obvUp === false ? 'nee' : '')}
- MFI: ${t.mfi ?? ''}
- Samengesteld signaal: ${t.signal ?? ''}

Performance:
- Dag: ${p.dailyChange ?? ''}% | 1m: ${p.growth1mo ?? ''}% | 6m: ${p.growth6mo ?? ''}% | 1y: ${p.growth1yr ?? ''}%
- QualityScore: ${qs}

Analisten:
- Mean: ${a?.mean ?? ''} | Target: ${a?.targetPrice ?? ''}

Risico:
- Volatility30d: ${r?.volatility30d ?? ''}% | MaxDD30d: ${r?.maxDrawdown30d ?? ''}%

Nieuws:
${newsLines}

Retourneer EXACT dit JSON-formaat:
{
  "score": <geheel 0-100>,
  "verdict": "kopen|houden|verkopen",
  "confidence": <geheel 0-100>,
  "reasons": ["<max 12 woorden>", "<max 12 woorden>", "<max 12 woorden>"],
  "timeframe": "korte termijn|middellang|lange termijn",
  "one_liner": "<één krachtige zin waarom dit (niet) een koop is nu>"
}

Weging:
- Bullish: RSI 35-60 met MACD↑, EMA20>EMA50, ADX>=20, OBV↑, MFI 40-60, dichtbij 52w high (<5%), positief nieuws
- Oversold instap: RSI<30 of StochRSI<0.2 met sterk nieuws/fundamenteel
- Vermijd: RSI>70 + MFI>80 of EMA20<EMA50 met zwak nieuws
- Score: 0 (slecht) - 100 (uitstekende koop nu). Schrijf in Nederlands. Alleen JSON teruggeven.`;
        break;
      case 'analyst':
        const { mean, analysts, breakdown, targetPrice } = data;
        prompt = `Leg uit wat deze analyst aanbevelingen betekenen voor ${ticker}:
        
- Gemiddelde score: ${mean} (1=Strong Buy, 5=Strong Sell)
- Aantal analisten: ${analysts}
- Breakdown: ${breakdown?.strongBuy || 0} Strong Buy, ${breakdown?.buy || 0} Buy, ${breakdown?.hold || 0} Hold, ${breakdown?.sell || 0} Sell, ${breakdown?.strongSell || 0} Strong Sell
${targetPrice ? `- Doelkoers: €${targetPrice}` : ''}

Geef een korte uitleg (max 3 zinnen) in Nederlands over wat dit betekent voor een belegger.`;
        break;

      case 'news':
        const newsArticles = Array.isArray(data) ? data.slice(0, 5) : [];
        const newsSummary = newsArticles.map((a, i) => `${i + 1}. ${a.title} | ${a.link || ''}`).join('\n');
        prompt = `Je bent een senior beursanalist. Analyseer dit recente nieuws voor ${ticker} en retourneer UITSLUITEND een geldig JSON-object (geen uitleg, geen markdown, geen codefences).

Nieuws:
${newsSummary}

Retourneer dit formaat:
{
  "intro": "<één zin over de algemene situatie voor ${ticker}>",
  "sentiment": "<bullish|neutraal|bearish>",
  "items": [
    {
      "title": "<Korte Nederlandse titel, max 5 woorden>",
      "body": "<2-3 zinnen uitleg van impact op ${ticker}>",
      "sentiment": "<bullish|neutraal|bearish>",
      "link": "<de originele link uit het nieuwsartikel>"
    }
  ],
  "conclusie": "<één krachtige slotconclusie voor beleggers>"
}

Regels:
- Exact 3 items
- link: gebruik de exacte link uit het nieuwsartikel
- sentiment per item: bullish = positief voor ${ticker}, bearish = negatief, neutraal = gemengd
- Schrijf in het Nederlands
- Alleen JSON teruggeven`;
        break;

      case 'performance':
        const { dailyChange, growth1mo, growth6mo, growth1yr } = data;
        prompt = `Analyseer de koersontwikkeling van ${ticker}:

- Vandaag: ${dailyChange >= 0 ? '+' : ''}${dailyChange}%
- 1 maand: ${growth1mo >= 0 ? '+' : ''}${growth1mo}%
- 6 maanden: ${growth6mo >= 0 ? '+' : ''}${growth6mo}%
- 1 jaar: ${growth1yr >= 0 ? '+' : ''}${growth1yr}%

Geef een korte analyse (max 3 zinnen) van de trend en wat dit betekent.`;
        break;

      case 'technical':
        const { rsi, sma50, sma200, signal, currentPrice } = data;
        prompt = `Leg deze technische indicatoren uit voor ${ticker}:

- RSI: ${rsi}
- Prijs vs SMA50: ${currentPrice > sma50 ? 'Boven' : 'Onder'} (${sma50})
- Prijs vs SMA200: ${currentPrice > sma200 ? 'Boven' : 'Onder'} (${sma200})
- Signaal: ${signal}

Wat betekenen deze indicatoren voor een belegger? (max 3 zinnen)`;
        break;

      case 'macro_news':
        const macroArticles = Array.isArray(data) ? data.slice(0, 15) : [];
        const macroSummary = macroArticles.map((a, i) => `${i + 1}. ${a.title} | ${a.link || ''}`).join('\n');
        prompt = `Je bent een senior beursanalist. Analyseer dit beursnieuws en retourneer UITSLUITEND een geldig JSON-object (geen uitleg, geen markdown, geen codefences).

Nieuws:
${macroSummary}

Retourneer dit formaat:
{
  "intro": "<één zin over de algemene marktsituatie, positief/negatief sentiment>",
  "sentiment": "<bullish|neutraal|bearish>",
  "items": [
    {
      "title": "<Korte Nederlandse titel, max 5 woorden>",
      "body": "<2-3 zinnen uitleg van de impact op markten/beleggers>",
      "sentiment": "<bullish|neutraal|bearish>",
      "tickers": ["<TICKERSYMBOOL>", ...],
      "link": "<de originele link uit het nieuwsartikel>"
    }
  ],
  "conclusie": "<één krachtige slotconclusie voor beleggers>"
}

Regels:
- Exact 5 items
- tickers: alleen bekende beurstickets (bv. AAPL, NVDA, GBL) die DIRECT in het nieuws worden vermeld, anders []
- link: gebruik de exacte link uit het nieuwsartikel
- sentiment per item: bullish = positief voor markt, bearish = negatief, neutraal = gemengd
- Schrijf in het Nederlands
- Alleen JSON teruggeven`;
        break;

      case 'portfolio_news':
        const { news: portNews = [], tickers: portTickers = [], names: portNames = [] } = Array.isArray(data) ? {} : (data || {});
        const portNewsList = portNews.slice(0, 15).map((a, i) => `${i + 1}. ${a.title} | ${a.link || ''}`).join('\n');
        const portTickerList = portTickers.join(', ');
        const portNameList = portNames.join(', ');
        prompt = `Je bent een senior beursanalist die een gepersonaliseerde nieuwsanalyse maakt voor een belegger.

De belegger heeft de volgende aandelen in portefeuille: ${portTickerList} (${portNameList})

Beschikbaar nieuws van vandaag:
${portNewsList}

Analyseer dit nieuws en retourneer UITSLUITEND een geldig JSON-object (geen uitleg, geen markdown, geen codefences).

Retourneer dit formaat:
{
  "intro": "<één zin wat de huidige marktsituatie betekent voor deze specifieke portfolio>",
  "sentiment": "<bullish|neutraal|bearish>",
  "items": [
    {
      "title": "<Korte Nederlandse titel, max 5 woorden>",
      "body": "<2-3 zinnen: wat dit nieuws betekent voor één of meer van de portefeuille-aandelen. Als er geen direct nieuws is voor een aandeel, geef dan aan wat de macro-trend betekent voor dat aandeel.>",
      "sentiment": "<bullish|neutraal|bearish>",
      "tickers": ["<alleen tickers uit de portefeuille die relevant zijn>"],
      "link": "<link uit het meest relevante nieuwsartikel>"
    }
  ],
  "conclusie": "<één krachtige slotconclusie specifiek voor deze portfolio>"
}

Regels:
- Exact 5 items, elk gericht op minimaal één portefeuille-aandeel
- Als er geen direct nieuws is voor een aandeel, gebruik dan macro-trends om impact te schatten
- tickers: alleen uit de lijst [${portTickerList}]
- Schrijf in het Nederlands
- Alleen JSON teruggeven`;
        break;

      case 'semantic_discover': {
        // data: { query, portfolio: [{ticker, name, sector}], watchlist: [{ticker, name}], avoid: [tickers] }
        const q = String(data?.query || '').slice(0, 300);
        const pf = Array.isArray(data?.portfolio) ? data.portfolio.slice(0, 30) : [];
        const wl = Array.isArray(data?.watchlist) ? data.watchlist.slice(0, 30) : [];
        const avoid = Array.from(new Set([...(pf.map(p => p.ticker)), ...(wl.map(w => w.ticker)), ...(Array.isArray(data?.avoid) ? data.avoid : [])])).filter(Boolean);
        const pfLine = pf.map(p => `${p.ticker}${p.sector ? ' ('+p.sector+')' : ''}`).join(', ') || 'leeg';
        const wlLine = wl.map(w => w.ticker).join(', ') || 'leeg';

        prompt = `Je bent een senior beleggingsadviseur. De gebruiker zoekt aandelen/ETF's die passen bij deze omschrijving:
"${q}"

Huidige portfolio (vermijd duplicaten): ${pfLine}
Watchlist (vermijd duplicaten): ${wlLine}

Geef UITSLUITEND geldig JSON terug (geen markdown):
{
  "strategy": "<1 zin: wat is de gemeenschappelijke beleggingsthese?>",
  "results": [
    {
      "ticker": "<exact Yahoo-Finance ticker, bv. NVDA, ASML.AS, VWCE.DE>",
      "name": "<bedrijfsnaam>",
      "sector": "<bv. Technology, Healthcare, Financial, Energy, Industrial, Consumer, Materials, Utilities, Real Estate, Communication, Index>",
      "type": "aandeel|etf|crypto",
      "fit_score": <geheel 1-100>,
      "thesis": "<1-2 zinnen: WAAROM dit aandeel past bij de query>",
      "risk": "laag|midden|hoog",
      "horizon": "kort|midden|lang"
    }
  ],
  "warnings": ["<optioneel: max 2 korte risico-waarschuwingen>"]
}

Regels:
- Geef 6-10 results, gesorteerd op fit_score aflopend
- Gebruik ALLEEN bestaande, verhandelbare tickers (Yahoo Finance formaat met exchange-suffix indien niet-VS, bv. ASML.AS, MC.PA, SAP.DE)
- Sla tickers uit deze lijst over: ${avoid.join(', ') || '(geen)'}
- Mix indien zinvol: aandelen + 1-2 thematische ETF's
- thesis: concreet, geen vage marketing — noem product/moat/groei
- Schrijf in het Nederlands. Alleen JSON.`;
        break;
      }

      case 'portfolio_analysis': {
        // data: { positions: [{ticker, name, sector, valueEUR, weightPct, growth1yr, dailyChange}], totalValueEUR, topSectors:[{sector,pct}], cashPct? }
        const positions = Array.isArray(data?.positions) ? data.positions : [];
        const total = data?.totalValueEUR || 0;
        const sectorBreak = Array.isArray(data?.topSectors) ? data.topSectors : [];
        const top = positions
          .slice()
          .sort((a, b) => (b.weightPct || 0) - (a.weightPct || 0))
          .slice(0, 25)
          .map(p => `${p.ticker} ${p.sector || '?'} • ${(p.weightPct || 0).toFixed(1)}% • 1y ${p.growth1yr != null ? p.growth1yr.toFixed(0)+'%' : 'n/a'}`)
          .join('\n');
        const sectorLine = sectorBreak.map(s => `${s.sector}: ${s.pct.toFixed(1)}%`).join(' | ') || 'onbekend';

        prompt = `Je bent een portfoliomanager. Analyseer dit portfolio op diversificatie, concentratierisico en geef concrete rebalance-acties. UITSLUITEND geldig JSON (geen markdown):

Totale waarde: €${Math.round(total).toLocaleString('nl-NL')}
Sectorverdeling: ${sectorLine}
Posities (max 25):
${top || '(leeg)'}

Retourneer EXACT:
{
  "diversification_score": <geheel 0-100, 100 = perfect verdeeld>,
  "risk_level": "laag|midden|hoog",
  "headline": "<1 zin samenvatting>",
  "strengths": ["<bullet>", "<bullet>"],
  "concentration_risks": [
    { "type": "ticker|sector|geografie|currency", "subject": "<bv. NVDA of Technology>", "weight_pct": <getal>, "why": "<max 2 zinnen risico>" }
  ],
  "suggestions": [
    { "action": "verkleinen|uitbreiden|toevoegen|verkopen|hedgen", "subject": "<ticker of sector>", "rationale": "<1 zin waarom>", "priority": "hoog|midden|laag" }
  ],
  "missing_exposure": ["<bv. Healthcare, Emerging Markets, Bonds — sectoren/themas die ontbreken>"],
  "next_actions": ["<concrete actie 1>", "<concrete actie 2>", "<concrete actie 3>"]
}

Regels:
- diversification_score: straf zware concentratie (>20% in één positie of >40% in één sector)
- 2-4 concentration_risks (alleen relevante)
- 3-5 suggestions, sorteer op priority
- Schrijf in het Nederlands. Alleen JSON.`;
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown type: ${type}` });
    }

    // Allow client to supply an API key via header if server env is not configured
    const clientKey = req.headers['x-openai-key'] || req.headers['X-OpenAI-Key'];

    console.log(`🤖 Generating ${type} explanation for ${ticker}...`);
    const jsonTypes = new Set(['semantic_discover', 'portfolio_analysis', 'market_barometer', 'buy_check', 'news', 'macro_news', 'portfolio_news']);
    const bigTypes = new Set(['semantic_discover', 'portfolio_analysis']);
    const callOpts = {
      json: jsonTypes.has(type),
      max_tokens: bigTypes.has(type) ? 1800 : 900,
      temperature: bigTypes.has(type) ? 0.4 : 0.7,
    };
    const explanation = await callOpenAI(prompt, clientKey, callOpts);

    // Cache the result
    cache.set(cacheKey, {
      explanation,
      timestamp: Date.now()
    });

    // Clean old cache entries (simple cleanup)
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    console.log(`✅ Generated ${type} explanation for ${ticker}`);
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.json({ 
      explanation,
      type,
      ticker,
      cached: false
    });

  } catch (error) {
    console.error('AI Explain API error:', error);
    return res.status(500).json({ 
      error: error.message,
      fallback: 'AI uitleg tijdelijk niet beschikbaar. Probeer het later opnieuw.'
    });
  }
};
