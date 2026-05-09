// Earnings Calendar - Track upcoming earnings reports
// Uses Financial Modeling Prep API (free, reliable) + Yahoo Finance fallback
import axios from 'axios';

const CORS_PROXY = 'https://corsproxy.io/?';
const FALLBACK_PROXY = 'https://api.allorigins.win/raw?url=';

// Alpha Vantage API - reliable earnings data
const ALPHA_VANTAGE_KEY = 'UGNO5IK8X988V0LK';
const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

// Hardcoded earnings data as fallback when APIs fail (update manually or via scraping)
// Data from stockanalysis.com and other sources - updated May 6, 2026
const HARDCODED_EARNINGS = {
  'IREN': { date: '2026-05-07', eps: -0.24, name: 'Iris Energy' },
  'BABA': { date: '2026-05-15', eps: 8.92, name: 'Alibaba Group' },
  'RGTI': { date: '2026-05-13', eps: -0.15, name: 'Rigetti Computing' },
  'TTWO': { date: '2026-05-20', eps: 1.45, name: 'Take-Two Interactive' },
  'DOCN': { date: '2026-05-08', eps: 0.42, name: 'DigitalOcean' },
  'FIG': { date: '2026-05-14', eps: 0.28, name: 'Figma' },
  'GMAB': { date: '2026-05-09', eps: 0.65, name: 'Genmab' },
  'ANTH': { date: '2026-05-12', eps: null, name: 'Anthemis' },
  'LUNR': { date: '2026-05-16', eps: -0.18, name: 'Intuitive Machines' },
};

// Convert TradingView/exchange-specific tickers to Yahoo Finance format
const convertToYahooTicker = (tvTicker) => {
  if (!tvTicker) return tvTicker;
  if (!tvTicker.includes(':')) return tvTicker;
  
  const parts = tvTicker.split(':');
  
  // Determine which part is exchange and which is symbol
  // Exchange codes are typically 3-5 chars, all uppercase (XNAS, XETR, NYSE, etc)
  // Symbols can be any length but are the ticker we want
  let exchange, symbol;
  
  if (parts[0].length <= 6 && parts[0] === parts[0].toUpperCase() && /^[A-Z]+$/.test(parts[0])) {
    // First part looks like exchange: "XNAS:IREN" or "NYSE:BABA"
    exchange = parts[0];
    symbol = parts[1];
  } else {
    // First part is symbol: "IREN:XNAS" or "VWCE:XETR"
    symbol = parts[0];
    exchange = parts[1];
  }
  
  // Map exchange codes to Yahoo Finance suffixes
  const exchangeMap = {
    'XETR': '.DE', 'XFRA': '.F', 'XAMS': '.AS', 'XBRU': '.BR',
    'XPAR': '.PA', 'XLON': '.L', 'XSWX': '.SW', 'XMIL': '.MI',
    'XLIS': '.LS', 'XSTO': '.ST', 'XCSE': '.CO', 'XHEL': '.HE',
    'XOSL': '.OL', 'XMAD': '.MC', 'XHKG': '.HK', 'XTKS': '.T',
    'XASX': '.AX', 'XTSE': '.TO', 'XSHG': '.SS', 'XSHE': '.SZ',
    'NASDAQ': '', 'NYSE': '', 'XNAS': '', 'XNYS': '', 'AMEX': '',
  };
  
  const suffix = exchangeMap[exchange];
  if (suffix === undefined) {
    // Unknown exchange, just return the symbol
    console.log(`Unknown exchange '${exchange}' for ticker ${tvTicker}, using symbol: ${symbol}`);
    return symbol;
  }
  
  const result = symbol + suffix;
  console.log(`Converted ${tvTicker} → ${result} (exchange: ${exchange}, symbol: ${symbol}, suffix: ${suffix})`);
  return result;
};

export class EarningsCalendar {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
  }

  // Try a request through the primary proxy, fall back to alternatives
  async tryFetch(url) {
    const proxies = [CORS_PROXY, FALLBACK_PROXY];
    for (const proxy of proxies) {
      try {
        const fullUrl = `${proxy}${encodeURIComponent(url)}`;
        const response = await axios.get(fullUrl, { timeout: 8000 });
        if (response.data) return response.data;
      } catch (e) {
        // Try next proxy
        continue;
      }
    }
    return null;
  }

  // Strategy 0: Alpha Vantage earnings calendar (most reliable with API key)
  async fetchAlphaVantageEarnings(symbol) {
    try {
      // Alpha Vantage uses plain symbols without exchange suffixes
      const cleanSymbol = symbol.replace(/\.(DE|F|AS|L|PA|MI|etc)$/i, '');
      
      // Get earnings calendar - returns CSV with upcoming earnings
      const url = `${ALPHA_VANTAGE_BASE}?function=EARNINGS_CALENDAR&symbol=${cleanSymbol}&apikey=${ALPHA_VANTAGE_KEY}`;
      const response = await axios.get(url, { timeout: 8000 });
      
      if (response.data?.Note) {
        console.log(`${cleanSymbol}: Alpha Vantage rate limit hit`);
        return null;
      }

      if (response.data?.Information) {
        console.log(`${cleanSymbol}: Alpha Vantage error - ${response.data?.Information}`);
        return null;
      }

      // EARNINGS_CALENDAR returns CSV data
      const csvData = response.data;
      if (typeof csvData !== 'string' || !csvData.includes('symbol')) {
        console.log(`${cleanSymbol}: NO earnings calendar data from Alpha Vantage`);
        return null;
      }

      // Parse CSV
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        console.log(`${cleanSymbol}: Empty earnings calendar`);
        return null;
      }

      const headers = lines[0].split(',');
      const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
          obj[header.trim()] = values[i]?.trim() || '';
        });
        return obj;
      });

      // Filter for this symbol and find upcoming earnings
      const symbolEarnings = rows.filter(r => r.symbol === cleanSymbol);
      if (symbolEarnings.length === 0) {
        console.log(`${cleanSymbol}: No earnings found in calendar`);
        return null;
      }

      const now = new Date();
      const upcoming = symbolEarnings.filter(e => {
        const reportDate = new Date(e.reportDate);
        return reportDate >= now;
      }).sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));

      if (upcoming.length === 0) {
        console.log(`${cleanSymbol}: NO upcoming earnings (all past)`);
        return null;
      }

      const nextEarnings = upcoming[0];
      const earningsDate = new Date(nextEarnings.reportDate);
      const estimatedEPS = parseFloat(nextEarnings.estimate) || null;

      console.log(`${cleanSymbol}: Alpha Vantage found earnings = ${earningsDate.toLocaleDateString('nl-NL')}, EPS: ${estimatedEPS}`);

      return {
        nextEarningsDate: earningsDate,
        estimatedEPS: estimatedEPS,
        fiscalDateEnding: nextEarnings.fiscalDateEnding,
        name: nextEarnings.name || cleanSymbol,
        currency: nextEarnings.currency || 'USD',
      };
    } catch (error) {
      console.log(`${symbol}: Alpha Vantage fetch failed - ${error.message}`);
      return null;
    }
  }

  // Strategy 1: Try direct Yahoo Finance (works from browser, bypasses CORS in some cases)
  async fetchDirectYahoo(yahooTicker) {
    try {
      // Try direct fetch - browser may allow it
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooTicker)}`;
      const response = await axios.get(url, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const quote = response.data?.quoteResponse?.result?.[0];
      if (!quote || !quote.earningsTimestamp) {
        console.log(`${yahooTicker}: NO earnings in direct Yahoo fetch`);
        return null;
      }

      const earningsDate = new Date(quote.earningsTimestamp * 1000);
      console.log(`${yahooTicker}: Direct Yahoo found earnings = ${earningsDate.toLocaleDateString('nl-NL')}`);

      return {
        nextEarningsDate: earningsDate,
        estimatedEPS: quote.epsForward || null,
        name: quote.shortName || quote.longName || yahooTicker,
        currency: quote.currency || 'USD',
        currentPrice: quote.regularMarketPrice,
      };
    } catch (error) {
      // Expected to fail due to CORS, will fall back to proxy methods
      return null;
    }
  }

  // Strategy 1: Quick earnings date via v7/quote endpoint (most reliable)
  async fetchQuickEarnings(yahooTicker) {
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooTicker)}`;
      const data = await this.tryFetch(url);
      const quote = data?.quoteResponse?.result?.[0];
      if (!quote) return null;

      const result = {
        nextEarningsDate: null,
        earningsTimestampStart: null,
        earningsTimestampEnd: null,
        estimatedEPS: null,
        name: quote.shortName || quote.longName || yahooTicker,
        currency: quote.currency || 'USD',
        currentPrice: quote.regularMarketPrice,
      };

      // earningsTimestamp is unix seconds
      if (quote.earningsTimestamp && quote.earningsTimestamp > 0) {
        result.nextEarningsDate = new Date(quote.earningsTimestamp * 1000);
        console.log(`${yahooTicker}: earningsTimestamp = ${result.nextEarningsDate.toLocaleDateString('nl-NL')}`);
      }
      if (quote.earningsTimestampStart) {
        result.earningsTimestampStart = new Date(quote.earningsTimestampStart * 1000);
        console.log(`${yahooTicker}: earningsTimestampStart = ${result.earningsTimestampStart.toLocaleDateString('nl-NL')}`);
      }
      if (quote.earningsTimestampEnd) {
        result.earningsTimestampEnd = new Date(quote.earningsTimestampEnd * 1000);
      }
      // Use start as the date if no specific earnings timestamp
      if (!result.nextEarningsDate && result.earningsTimestampStart) {
        result.nextEarningsDate = result.earningsTimestampStart;
        console.log(`${yahooTicker}: Using earningsTimestampStart as nextEarningsDate`);
      }

      if (!result.nextEarningsDate) {
        console.log(`${yahooTicker}: NO earnings date found in quick fetch`);
      }

      return result;
    } catch (error) {
      return null;
    }
  }

  // Strategy 2: Detailed earnings via v10/quoteSummary
  async fetchDetailedEarnings(yahooTicker) {
    try {
      const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooTicker}?modules=calendarEvents,earnings,earningsHistory,price`;
      const data = await this.tryFetch(url);
      const result = data?.quoteSummary?.result?.[0];
      if (!result) return null;

      const calendarEvents = result.calendarEvents || {};
      const earnings = result.earnings || {};
      const earningsHistory = result.earningsHistory?.history || [];
      const price = result.price || {};

      let nextEarningsDate = null;
      let earningsTimestampStart = null;
      let earningsTimestampEnd = null;
      
      const dates = calendarEvents.earnings?.earningsDate || [];
      if (dates[0]) {
        const ts = typeof dates[0] === 'object' ? dates[0].raw : dates[0];
        nextEarningsDate = new Date(ts * 1000);
        earningsTimestampStart = nextEarningsDate;
        console.log(`${yahooTicker}: detailed fetch found earnings date = ${nextEarningsDate.toLocaleDateString('nl-NL')}`);
      } else {
        console.log(`${yahooTicker}: NO earnings date in detailed fetch (calendarEvents)`);
      }
      if (dates[1]) {
        const ts = typeof dates[1] === 'object' ? dates[1].raw : dates[1];
        earningsTimestampEnd = new Date(ts * 1000);
      }

      return {
        nextEarningsDate,
        earningsTimestampStart,
        earningsTimestampEnd,
        estimatedEPS: calendarEvents.earnings?.epsEstimate?.raw || null,
        estimatedRevenue: calendarEvents.earnings?.revenueEstimate?.raw || null,
        quarterlyEarnings: earnings.financialsChart?.quarterly || [],
        yearlyEarnings: earnings.financialsChart?.yearly || [],
        history: earningsHistory.map(h => ({
          date: h.quarter?.fmt ? new Date(h.quarter.fmt) : null,
          epsActual: h.epsActual?.raw,
          epsEstimate: h.epsEstimate?.raw,
          surprise: h.surprisePercent?.raw,
          quarter: h.quarter?.fmt
        })),
        name: price.shortName || price.longName || yahooTicker,
        currency: price.currency || 'USD',
      };
    } catch (error) {
      return null;
    }
  }

  // Fetch earnings data for a ticker - uses multiple strategies
  async fetchEarnings(originalTicker, displayName = null) {
    try {
      const yahooTicker = convertToYahooTicker(originalTicker);
      const cacheKey = yahooTicker;

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      // Strategy 0: Try Alpha Vantage first (most reliable with API key)
      let alphaData = await this.fetchAlphaVantageEarnings(yahooTicker);
      
      // Check hardcoded data as fallback (instant, reliable for known tickers)
      const cleanSymbol = yahooTicker.replace(/\.(DE|F|AS|L|PA|MI|etc)$/i, '');
      const hardcoded = HARDCODED_EARNINGS[cleanSymbol];
      let hardcodedData = null;
      if (hardcoded && !alphaData?.nextEarningsDate) {
        hardcodedData = {
          nextEarningsDate: new Date(hardcoded.date),
          estimatedEPS: hardcoded.eps,
          name: hardcoded.name,
          currency: 'USD',
        };
        console.log(`${cleanSymbol}: Using HARDCODED earnings date = ${hardcoded.date}`);
      }

      // Strategy 1: Try direct Yahoo (no proxy, fastest if it works)
      let directData = !alphaData?.nextEarningsDate && !hardcodedData ? await this.fetchDirectYahoo(yahooTicker) : null;
      
      // Strategy 2: Quick Yahoo fetch via proxy (faster, more reliable than detailed)
      let quickData = !alphaData?.nextEarningsDate && !directData && !hardcodedData ? await this.fetchQuickEarnings(yahooTicker) : null;
      
      // Strategy 3: Detailed Yahoo fetch for richer info (history, surprises)
      let detailedData = await this.fetchDetailedEarnings(yahooTicker);

      // Combine results - prefer Alpha Vantage (live API), then hardcoded, then Yahoo sources
      const merged = {
        ticker: originalTicker,
        yahooTicker,
        name: displayName || alphaData?.name || hardcodedData?.name || directData?.name || detailedData?.name || quickData?.name || originalTicker,
        nextEarningsDate: alphaData?.nextEarningsDate || hardcodedData?.nextEarningsDate || directData?.nextEarningsDate || detailedData?.nextEarningsDate || quickData?.nextEarningsDate || null,
        earningsTimestampStart: detailedData?.earningsTimestampStart || quickData?.earningsTimestampStart || alphaData?.nextEarningsDate || hardcodedData?.nextEarningsDate || null,
        earningsTimestampEnd: detailedData?.earningsTimestampEnd || quickData?.earningsTimestampEnd || null,
        estimatedEPS: alphaData?.estimatedEPS ?? hardcodedData?.estimatedEPS ?? directData?.estimatedEPS ?? detailedData?.estimatedEPS ?? quickData?.estimatedEPS ?? null,
        estimatedRevenue: detailedData?.estimatedRevenue ?? null,
        quarterlyEarnings: alphaData?.quarterlyEarnings || detailedData?.quarterlyEarnings || [],
        yearlyEarnings: alphaData?.yearlyEarnings || detailedData?.yearlyEarnings || [],
        history: detailedData?.history || [],
        currency: alphaData?.currency || hardcodedData?.currency || directData?.currency || detailedData?.currency || quickData?.currency || 'USD',
        currentPrice: directData?.currentPrice ?? quickData?.currentPrice ?? null,
      };

      console.log(`${originalTicker} (${yahooTicker}): FINAL nextEarningsDate = ${merged.nextEarningsDate ? merged.nextEarningsDate.toLocaleDateString('nl-NL') : 'NULL'} [Alpha: ${alphaData?.nextEarningsDate ? '✓' : '✗'}, Hardcoded: ${hardcodedData?.nextEarningsDate ? '✓' : '✗'}, Yahoo: ${(directData?.nextEarningsDate || detailedData?.nextEarningsDate || quickData?.nextEarningsDate) ? '✓' : '✗'}]`);

      // Cache the result (even if no earnings date found, to avoid hammering)
      this.cache.set(cacheKey, {
        data: merged,
        timestamp: Date.now()
      });

      return merged;
    } catch (error) {
      console.error(`Failed to fetch earnings for ${originalTicker}:`, error.message);
      return null;
    }
  }

  // Fetch earnings for multiple tickers via Vercel API
  async fetchMultipleEarnings(tickerList) {
    const normalized = tickerList.map(t => 
      typeof t === 'string' ? { ticker: t, name: null } : t
    );

    if (normalized.length === 0) return {};

    try {
      const tickerStr = normalized.map(t => t.ticker).join(',');
      const response = await axios.get(`/api/earnings`, {
        params: { tickers: tickerStr },
        timeout: 30000
      });
      
      const apiResults = response.data.results || {};
      const results = {};
      
      // Convert dates from epoch ms to Date objects and add user-supplied names
      Object.entries(apiResults).forEach(([ticker, data]) => {
        const userTicker = normalized.find(t => t.ticker === ticker);
        results[ticker] = {
          ...data,
          nextEarningsDate: data.nextEarningsDate ? new Date(data.nextEarningsDate) : null,
          displayName: userTicker?.name || data.name || ticker,
          history: (data.history || []).map(h => ({
            ...h,
            date: h.date ? new Date(h.date) : null,
            surprise: h.surprisePercent
          }))
        };
      });
      
      return results;
    } catch (error) {
      console.error('Earnings API error:', error.message);
      return {};
    }
  }

  // Get upcoming earnings (default: next 90 days, configurable)
  getUpcomingEarnings(earningsData, daysAhead = 90, daysBack = 7) {
    const now = new Date();
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return Object.entries(earningsData)
      .filter(([_, data]) => {
        if (!data || !data.nextEarningsDate) return false;
        const d = data.nextEarningsDate;
        return d >= startDate && d <= endDate;
      })
      .map(([ticker, data]) => ({
        ticker,
        ...data
      }))
      .sort((a, b) => a.nextEarningsDate - b.nextEarningsDate);
  }

  // Group earnings by time period for organized display
  groupEarnings(upcomingEarnings) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const groups = {
      past: [],       // last 7 days (recent reports)
      today: [],      // today
      thisWeek: [],   // next 7 days
      thisMonth: [],  // next 30 days
      later: []       // beyond 30 days
    };

    upcomingEarnings.forEach(e => {
      const d = e.nextEarningsDate;
      if (d < today) groups.past.push(e);
      else if (d < tomorrow) groups.today.push(e);
      else if (d < weekEnd) groups.thisWeek.push(e);
      else if (d < monthEnd) groups.thisMonth.push(e);
      else groups.later.push(e);
    });

    return groups;
  }

  // Calculate average earnings surprise
  getAverageSurprise(history) {
    if (!history || history.length === 0) return null;
    
    const surprises = history
      .filter(h => h.surprise !== null && h.surprise !== undefined)
      .map(h => h.surprise);
    
    if (surprises.length === 0) return null;
    
    return surprises.reduce((sum, s) => sum + s, 0) / surprises.length;
  }

  // Get earnings beat rate (% of times beat estimates)
  getBeatRate(history) {
    if (!history || history.length === 0) return null;
    
    const beats = history.filter(h => 
      h.epsActual !== null && 
      h.epsEstimate !== null && 
      h.epsActual > h.epsEstimate
    ).length;
    
    return (beats / history.length) * 100;
  }

  // Format earnings date for display
  formatEarningsDate(date) {
    if (!date) return 'Onbekend';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Vandaag';
    if (diffDays === 1) return 'Morgen';
    if (diffDays === -1) return 'Gisteren';
    if (diffDays > 1 && diffDays <= 7) return `Over ${diffDays} dagen`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} dagen geleden`;
    
    const formatted = date.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'short', 
      year: target.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
    
    return diffDays < 0 ? formatted + ' (verstreken)' : formatted;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
export const earningsCalendar = new EarningsCalendar();
