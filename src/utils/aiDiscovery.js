// AI-powered stock discovery + portfolio analysis
// Wraps /api/ai-explain with the new 'semantic_discover' and 'portfolio_analysis' types.
// Returns parsed JSON objects with sane fallbacks.

import axios from 'axios';

const getKey = () => (typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') : null);

// Strip code fences / leading text if model wrapped JSON despite instructions
const parseLooseJSON = (text) => {
  if (!text || typeof text !== 'string') return null;
  let s = text.trim();
  s = s.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  // Try direct parse
  try { return JSON.parse(s); } catch (_) {}
  // Try extracting first {...} block
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)); } catch (_) {}
  }
  return null;
};

const callAIExplain = async (type, ticker, data) => {
  const userKey = getKey();
  if (!userKey) {
    const err = new Error('OpenAI API key niet ingesteld. Voeg je key toe in de AI instellingen.');
    err.code = 'NO_KEY';
    throw err;
  }
  const res = await axios.post('/api/ai-explain', { type, ticker, data }, {
    headers: { 'x-openai-key': userKey },
    timeout: 45000,
  });
  return res.data?.explanation || '';
};

/**
 * Semantic stock discovery.
 * @param {string} query — natural language description, e.g. "AI infrastructuur met sterke moat".
 * @param {object} ctx — { portfolio:[{ticker,name,sector}], watchlist:[{ticker,name}], avoid?:[ticker] }
 * @returns {Promise<{strategy:string, results:Array, warnings:string[]}>}
 */
export const semanticStockSearch = async (query, ctx = {}) => {
  const text = await callAIExplain('semantic_discover', 'DISCOVER', {
    query,
    portfolio: ctx.portfolio || [],
    watchlist: ctx.watchlist || [],
    avoid: ctx.avoid || [],
  });
  const parsed = parseLooseJSON(text);
  if (!parsed || !Array.isArray(parsed.results)) {
    throw new Error('AI gaf geen geldige resultaten terug. Probeer een specifiekere zoekopdracht.');
  }
  // Normalize + clamp
  parsed.results = parsed.results
    .filter(r => r && r.ticker && r.name)
    .map(r => ({
      ticker: String(r.ticker).trim().toUpperCase(),
      name: String(r.name).trim(),
      sector: r.sector || '',
      type: r.type || 'aandeel',
      fit_score: Math.max(0, Math.min(100, parseInt(r.fit_score, 10) || 0)),
      thesis: r.thesis || '',
      risk: r.risk || 'midden',
      horizon: r.horizon || 'midden',
    }))
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, 12);
  return {
    strategy: parsed.strategy || '',
    results: parsed.results,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  };
};

/**
 * Portfolio AI analysis.
 * @param {object} input — { investments:[{ticker_symbol,name,sector,amount,shares}], stockPrices:{ticker:{currentPrice,growth1yr,dailyChange,currency}} }
 * @returns {Promise<object>} parsed analysis
 */
export const analyzePortfolio = async ({ investments = [], stockPrices = {} }) => {
  // Build position-level snapshot with EUR-ish weight (amount is already EUR per BeleggenPage logic).
  const positions = investments
    .filter(inv => inv && (inv.ticker_symbol || inv.name))
    .map(inv => {
      const t = inv.ticker_symbol || inv.name;
      const px = stockPrices[t] || {};
      const valueEUR = Number(inv.amount) || (Number(inv.shares) * Number(inv.purchase_price)) || 0;
      return {
        ticker: t,
        name: inv.name || t,
        sector: inv.sector || px.sector || '',
        valueEUR,
        growth1yr: px.growth1yr ?? null,
        dailyChange: px.dailyChange ?? null,
      };
    })
    .filter(p => p.valueEUR > 0);

  const totalValueEUR = positions.reduce((s, p) => s + p.valueEUR, 0);
  if (totalValueEUR <= 0 || positions.length === 0) {
    throw new Error('Geen waardevolle posities gevonden. Voeg eerst beleggingen toe.');
  }
  positions.forEach(p => { p.weightPct = (p.valueEUR / totalValueEUR) * 100; });

  // Sector breakdown
  const sectorMap = new Map();
  positions.forEach(p => {
    const s = p.sector || 'Onbekend';
    sectorMap.set(s, (sectorMap.get(s) || 0) + p.weightPct);
  });
  const topSectors = [...sectorMap.entries()]
    .map(([sector, pct]) => ({ sector, pct }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8);

  const text = await callAIExplain('portfolio_analysis', 'PORTFOLIO', {
    positions,
    totalValueEUR,
    topSectors,
  });
  const parsed = parseLooseJSON(text);
  if (!parsed) {
    throw new Error('AI gaf geen geldige analyse terug. Probeer het later opnieuw.');
  }
  // Attach the locally computed snapshot for the UI
  return {
    ...parsed,
    _snapshot: { totalValueEUR, topSectors, positionCount: positions.length },
  };
};
