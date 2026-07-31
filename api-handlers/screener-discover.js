// screener-discover.js
// Fetches dynamic ticker lists from Yahoo Finance predefined screeners
// Maps to app categories: large (top performers), growth (potentiële groeiers), midcap, etf

const CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 min — screener lists don't change every minute
const CACHE_VER = 'v3'; // bump to include company description field

// Maps app category → Yahoo Finance predefined screener IDs (tried in order, merged & deduped)
const CATEGORY_SCREENERS = {
  large: ['growth_technology_stocks', 'most_actives', 'day_gainers'],
  growth: ['aggressive_small_caps', 'undervalued_growth_stocks', 'small_cap_gainers'],
  midcap: ['undervalued_growth_stocks', 'growth_technology_stocks'],
  etf: null, // ETFs have no good Yahoo predefined screener — use fallback
};

// Static ETF fallback (Yahoo screener doesn't surface ETF lists well)
const ETF_FALLBACK = [
  { ticker: 'SPY',  name: 'SPDR S&P 500 ETF',          sector: 'Index',         why: 'Benchmark S&P 500, meest liquide ETF ter wereld' },
  { ticker: 'QQQ',  name: 'Invesco QQQ Trust',          sector: 'Technology',    why: 'NASDAQ-100 tech focus, kernbezit voor groei' },
  { ticker: 'VGT',  name: 'Vanguard Info Tech ETF',     sector: 'Technology',    why: 'Brede tech exposure, lage kosten' },
  { ticker: 'SMH',  name: 'VanEck Semiconductor ETF',   sector: 'Technology',    why: 'Pure-play chips: NVDA TSMC ASML in één' },
  { ticker: 'ARKK', name: 'ARK Innovation ETF',         sector: 'Technology',    why: 'Disruptieve innovatie focus, hoog risico/rendement' },
  { ticker: 'IBIT', name: 'iShares Bitcoin ETF',        sector: 'Financial',     why: 'Institutionele Bitcoin exposure via BlackRock' },
  { ticker: 'XLE',  name: 'Energy Select SPDR',         sector: 'Energy',        why: 'Energiebedrijven VS, inflatiebescherming' },
  { ticker: 'XLV',  name: 'Health Care SPDR',           sector: 'Healthcare',    why: 'Defensieve healthcare, vergrijzing tailwind' },
  { ticker: 'XLF',  name: 'Financial SPDR',             sector: 'Financial',     why: 'Banken & verzekeraars, hoge rente profiteur' },
  { ticker: 'IWM',  name: 'iShares Russell 2000',       sector: 'Index',         why: 'Small-cap VS, profiteert van rentedaling' },
  { ticker: 'VOO',  name: 'Vanguard S&P 500',           sector: 'Index',         why: 'Laagste kosten S&P 500 ETF, ideaal langetermijn' },
  { ticker: 'GLD',  name: 'SPDR Gold Trust',            sector: 'Materials',     why: "Goud hedge vs inflatie en geopolitieke risico's" },
  { ticker: 'TLT',  name: '20+ Year Treasury ETF',      sector: 'Financial',     why: 'Lange obligaties, stijgt bij rentedaling' },
  { ticker: 'VEA',  name: 'Vanguard Developed Markets', sector: 'International', why: 'Europa + Japan, diversificatie buiten VS' },
  { ticker: 'VWO',  name: 'Vanguard Emerging Markets',  sector: 'International', why: 'India China Brazilië exposure' },
];

async function fetchScreenerPage(scrId, count = 25) {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?count=${count}&scrIds=${scrId}&region=US&lang=en-US`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; screener-bot/1.0)',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Yahoo screener ${scrId} returned ${res.status}`);
  const json = await res.json();
  const quotes = json?.finance?.result?.[0]?.quotes || [];
  return quotes.map(q => {
    // Yahoo Finance screener API uses various field names for sector
    const rawSector = q.sector || q.sectorDisp || q.industryDisp || q.industry || q.categoryName || '';
    return {
      ticker: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      sector: rawSector,
      marketCap: q.marketCap || 0,
      price: q.regularMarketPrice || 0,
      change1d: q.regularMarketChangePercent || 0,
    };
  });
}

function sectorLabel(raw) {
  if (!raw) return '';
  const map = {
    // Technology
    'Technology': 'Technology',
    'Information Technology': 'Technology',
    'Communication Services': 'Technology',
    'Electronic Technology': 'Technology',
    'Technology Services': 'Technology',
    // Healthcare
    'Healthcare': 'Healthcare',
    'Health Care': 'Healthcare',
    'Health Technology': 'Healthcare',
    'Health Services': 'Healthcare',
    'Biotechnology': 'Healthcare',
    'Pharmaceuticals': 'Healthcare',
    // Financial
    'Financials': 'Financial',
    'Financial Services': 'Financial',
    'Finance': 'Financial',
    'Banking': 'Financial',
    'Insurance': 'Financial',
    // Consumer
    'Consumer Discretionary': 'Consumer',
    'Consumer Staples': 'Consumer',
    'Consumer Cyclical': 'Consumer',
    'Consumer Defensive': 'Consumer',
    'Consumer Non-Durables': 'Consumer',
    'Consumer Durables': 'Consumer',
    'Consumer Services': 'Consumer',
    // Energy
    'Energy': 'Energy',
    'Energy Minerals': 'Energy',
    'Oil & Gas': 'Energy',
    // Industrial
    'Industrials': 'Industrial',
    'Industrial': 'Industrial',
    'Industrial Services': 'Industrial',
    'Industrial Conglomerates': 'Industrial',
    'Producer Manufacturing': 'Industrial',
    'Transportation': 'Industrial',
    // Materials
    'Materials': 'Materials',
    'Basic Materials': 'Materials',
    'Chemicals': 'Materials',
    'Mining': 'Materials',
    'Non-Energy Minerals': 'Materials',
    'Process Industries': 'Materials',
    // Other
    'Real Estate': 'Real Estate',
    'Utilities': 'Utilities',
    'Communication': 'Technology',
  };
  const val = map[raw] || raw;
  const lc = String(val).trim().toLowerCase();
  if (!lc || lc === 'unknown' || lc === 'n/a' || lc === '-' || lc === 'none') return '';
  return val; // Prefer mapped value, otherwise raw
}

// Fallback: fetch sector + short description from Yahoo quoteSummary assetProfile
async function fetchSectorProfile(ticker) {
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=assetProfile`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; screener-bot/1.0)',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return { sector: '', description: '' };
    const json = await res.json();
    const profile = json?.quoteSummary?.result?.[0]?.assetProfile || {};
    const sector = sectorLabel(profile.sector || '');
    // Take only the first sentence of the business summary (max 120 chars)
    const summary = profile.longBusinessSummary || '';
    const firstSentence = summary.split(/\.\s+/)[0];
    const description = firstSentence.length > 120
      ? firstSentence.substring(0, 117) + '...'
      : firstSentence;
    return { sector, description };
  } catch {
    return { sector: '', description: '' };
  }
}

async function buildCategory(category) {
  const scrIds = CATEGORY_SCREENERS[category];
  if (!scrIds) return ETF_FALLBACK; // ETF static fallback

  const seen = new Set();
  const tickers = [];

  for (const scrId of scrIds) {
    try {
      const results = await fetchScreenerPage(scrId, 30);
      for (const r of results) {
        if (!r.ticker || seen.has(r.ticker)) continue;
        seen.add(r.ticker);
        let sector = sectorLabel(r.sector);
        let description = '';
        // Always fetch profile to get company description; also fixes missing sector
        try {
          const profile = await fetchSectorProfile(r.ticker);
          if (!sector) sector = profile.sector;
          description = profile.description;
        } catch { /* ignore */ }
        tickers.push({
          ticker: r.ticker,
          name: r.name,
          sector,
          description,
          why: buildWhy(category, r),
        });
        if (tickers.length >= 20) break;
      }
    } catch (e) {
      console.warn(`Screener ${scrId} failed:`, e.message);
    }
    if (tickers.length >= 20) break;
  }
  return tickers;
}

function buildWhy(category, stock) {
  const sector = sectorLabel(stock.sector);
  const capBn = stock.marketCap ? Math.round(stock.marketCap / 1e9) : null;
  const change = stock.change1d ? `${stock.change1d > 0 ? '+' : ''}${stock.change1d.toFixed(1)}% vandaag` : null;

  const categoryLabel = {
    large: 'Top performer',
    growth: 'Hoog groeipotentieel',
    midcap: 'Mid-cap groeier',
  }[category] || 'Dynamisch geselecteerd';

  const parts = [categoryLabel];
  if (sector && sector !== 'Other') parts.push(sector);
  if (capBn) parts.push(`$${capBn}B`);
  if (change) parts.push(change);
  return parts.join(' • ');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=1800');

  const category = req.query.category || 'large';
  const cacheKey = `${CACHE_VER}:discover:${category}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    // Validate cached sectors; if any is missing/Unknown, ignore cache
    const hasBadSector = (cached.data || []).some(t => {
      const s = String(t.sector || '').trim().toLowerCase();
      return !s || s === 'unknown' || s === 'n/a' || s === '-' || s === 'none';
    });
    if (!hasBadSector) {
      return res.json({ tickers: cached.data, cached: true });
    }
  }

  try {
    const tickers = await buildCategory(category);
    CACHE.set(cacheKey, { data: tickers, ts: Date.now() });
    res.json({ tickers, cached: false });
  } catch (err) {
    console.error('screener-discover error:', err.message);
    res.status(500).json({ error: err.message, tickers: [] });
  }
};
