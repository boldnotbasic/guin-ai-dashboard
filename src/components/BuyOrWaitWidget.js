import React, { useState, useRef, useCallback } from 'react';
import {
  Search, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle,
  AlertCircle, Calendar, Activity, BarChart2, Newspaper, Sparkles,
  RefreshCw, ChevronDown, ChevronUp, Info, Zap, Shield, Bot,
} from 'lucide-react';
import axios from 'axios';
import { earningsCalendar } from '../utils/earningsCalendar';

// ─── robust earnings fetcher (multi-strategy, handles small caps) ────────────
async function fetchEarningsRobust(ticker) {
  const proxies = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
  ];

  const tryProxy = async (url) => {
    for (const proxy of proxies) {
      try {
        const r = await axios.get(`${proxy}${encodeURIComponent(url)}`, { timeout: 7000 });
        if (r.data) return r.data;
      } catch (_) {}
    }
    return null;
  };

  // Strategy A: direct browser fetch (sometimes works)
  const tryDirect = async (url) => {
    try {
      const r = await axios.get(url, { timeout: 5000, headers: { Accept: 'application/json' } });
      return r.data || null;
    } catch (_) { return null; }
  };

  // Strategy 1: v7/quote — earningsTimestamp (works for most tickers incl. small caps)
  const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
  const quoteData = (await tryDirect(quoteUrl)) || (await tryProxy(quoteUrl));
  const quote = quoteData?.quoteResponse?.result?.[0];

  let nextDate = null;
  let pastDate = null;
  let estimatedEPS = null;
  let companyName = ticker;

  if (quote) {
    companyName = quote.shortName || quote.longName || ticker;
    estimatedEPS = quote.epsForward ?? null;
    // upcoming
    const ts = quote.earningsTimestamp || quote.earningsTimestampStart;
    if (ts && ts > 0) nextDate = new Date(ts * 1000);
    // past (to detect "vandaag was earnings")
    const pastTs = quote.earningsTimestampEnd || null;
    if (pastTs && pastTs > 0) {
      const candidate = new Date(pastTs * 1000);
      if (candidate <= new Date()) pastDate = candidate;
    }
  }

  // Strategy 2: v10/quoteSummary calendarEvents (richer data)
  if (!nextDate) {
    const summaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=calendarEvents,earnings`;
    const sumData = (await tryDirect(summaryUrl)) || (await tryProxy(summaryUrl));
    const res = sumData?.quoteSummary?.result?.[0];
    if (res) {
      const dates = res.calendarEvents?.earnings?.earningsDate || [];
      const eps = res.calendarEvents?.earnings?.epsEstimate;
      if (eps?.raw != null) estimatedEPS = eps.raw;
      dates.forEach(d => {
        const ts2 = typeof d === 'object' ? d.raw : d;
        const dt = new Date(ts2 * 1000);
        if (dt >= new Date()) { if (!nextDate) nextDate = dt; }
        else { if (!pastDate || dt > pastDate) pastDate = dt; }
      });
    }
  }

  // Strategy 3: /api/earnings Vercel endpoint (our own backend)
  if (!nextDate) {
    try {
      const r = await axios.get('/api/earnings', { params: { tickers: ticker }, timeout: 12000 });
      const d = r.data?.results?.[ticker];
      if (d?.nextEarningsDate) {
        nextDate = new Date(d.nextEarningsDate);
        if (d.estimatedEPS != null) estimatedEPS = d.estimatedEPS;
      }
    } catch (_) {}
  }

  // Detect if earnings were TODAY or YESTERDAY (the market just reacted)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  let earningsTodayOrYesterday = false;
  let recentEarningsDate = null;
  if (pastDate) {
    const pastDay = new Date(pastDate.getFullYear(), pastDate.getMonth(), pastDate.getDate());
    if (pastDay >= yesterday) {
      earningsTodayOrYesterday = true;
      recentEarningsDate = pastDate;
    }
  }
  // Also check if nextDate is today/yesterday (some sources report as "next" until after market)
  if (nextDate) {
    const nextDay = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
    if (nextDay <= today) {
      earningsTodayOrYesterday = true;
      recentEarningsDate = nextDate;
      nextDate = null; // it's already past
    }
  }

  return {
    nextEarningsDate: nextDate,
    pastEarningsDate: pastDate,
    recentEarningsDate,
    earningsTodayOrYesterday,
    estimatedEPS,
    name: companyName,
    history: [],
  };
}

// ─── helpers ────────────────────────────────────────────────────────────────

const VERDICT = {
  BUY:        { label: 'KOPEN',          color: 'green',  icon: CheckCircle },
  BUY_WAIT:   { label: 'KOPEN (DIP)',    color: 'emerald', icon: TrendingDown },
  WAIT_EARN:  { label: 'WACHT – earnings nabij', color: 'orange', icon: Calendar },
  WAIT_TECH:  { label: 'WACHT – overbought',     color: 'yellow', icon: Activity },
  WAIT_NEWS:  { label: 'WACHT – negatief nieuws',color: 'red',    icon: Newspaper },
  WAIT_MKTM:  { label: 'WACHT – markt risk-off', color: 'red',    icon: Shield },
  NEUTRAL:    { label: 'NEUTRAAL',       color: 'blue',   icon: Info },
};

const verdictColors = {
  green:   { bg: 'bg-green-500/20',   border: 'border-green-500/40',   text: 'text-green-400',   badge: 'bg-green-500' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  orange:  { bg: 'bg-orange-500/20',  border: 'border-orange-500/40',  text: 'text-orange-400',  badge: 'bg-orange-500' },
  yellow:  { bg: 'bg-yellow-500/20',  border: 'border-yellow-500/40',  text: 'text-yellow-400',  badge: 'bg-yellow-500' },
  red:     { bg: 'bg-red-500/20',     border: 'border-red-500/40',     text: 'text-red-400',     badge: 'bg-red-500' },
  blue:    { bg: 'bg-blue-500/20',    border: 'border-blue-500/40',    text: 'text-blue-400',    badge: 'bg-blue-500' },
};

function daysUntil(date) {
  if (!date) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target - today) / 86400000);
}

function scoreBar(value, max = 100, color = 'purple') {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colors = { green: 'bg-green-500', red: 'bg-red-500', yellow: 'bg-yellow-500', blue: 'bg-blue-500', purple: 'bg-purple-500', orange: 'bg-orange-500' };
  return (
    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colors[color] || colors.purple}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── local decision engine (no API needed) ──────────────────────────────────

function localDecision({ technicals, earningsDays, news, marketRiskOff, earningsTodayOrYesterday }) {
  const signals = [];
  let buyScore = 50;

  // 1. EARNINGS PROXIMITY
  if (earningsTodayOrYesterday) {
    signals.push({ key: 'EARN_TODAY', text: 'Earnings waren vandaag/gisteren — koers kan sterk reageren, wacht op stof neerdalen', type: 'warn', weight: -20 });
    buyScore -= 20;
  } else if (earningsDays !== null) {
    if (earningsDays >= 0 && earningsDays <= 7) {
      signals.push({ key: 'EARN_NEAR', text: `Earnings over ${earningsDays} dag${earningsDays !== 1 ? 'en' : ''} — hoog risico`, type: 'warn', weight: -30 });
      buyScore -= 30;
    } else if (earningsDays > 7 && earningsDays <= 14) {
      signals.push({ key: 'EARN_SOON', text: `Earnings over ${earningsDays} dagen — overweeg na rapport te kopen`, type: 'caution', weight: -10 });
      buyScore -= 10;
    } else if (earningsDays > 14) {
      signals.push({ key: 'EARN_FAR', text: `Earnings nog ${earningsDays} dagen ver — geen timing-risico`, type: 'ok', weight: +5 });
      buyScore += 5;
    }
  }

  // 2. TECHNICAL: RSI
  const rsi = technicals?.rsi;
  if (rsi != null) {
    if (rsi > 78) { signals.push({ key: 'RSI_HIGH', text: `RSI ${rsi.toFixed(0)} — sterk overbought, wacht op pullback`, type: 'warn', weight: -20 }); buyScore -= 20; }
    else if (rsi > 70) { signals.push({ key: 'RSI_OB', text: `RSI ${rsi.toFixed(0)} — licht overbought`, type: 'caution', weight: -8 }); buyScore -= 8; }
    else if (rsi < 30) { signals.push({ key: 'RSI_OS', text: `RSI ${rsi.toFixed(0)} — oversold, potentiële kans`, type: 'ok', weight: +15 }); buyScore += 15; }
    else if (rsi >= 40 && rsi <= 65) { signals.push({ key: 'RSI_OK', text: `RSI ${rsi.toFixed(0)} — gezonde zone`, type: 'ok', weight: +10 }); buyScore += 10; }
  }

  // 3. TECHNICAL: Signal overall
  const sig = technicals?.signal?.overall || technicals?.signal;
  if (sig) {
    if (sig === 'STRONG BUY') { signals.push({ key: 'SIG_SB', text: 'Technisch: Strong Buy signaal', type: 'ok', weight: +20 }); buyScore += 20; }
    else if (sig === 'BUY') { signals.push({ key: 'SIG_B', text: 'Technisch: Buy signaal', type: 'ok', weight: +10 }); buyScore += 10; }
    else if (sig === 'SELL') { signals.push({ key: 'SIG_S', text: 'Technisch: Sell signaal', type: 'warn', weight: -15 }); buyScore -= 15; }
    else if (sig === 'STRONG SELL') { signals.push({ key: 'SIG_SS', text: 'Technisch: Strong Sell signaal', type: 'warn', weight: -25 }); buyScore -= 25; }
  }

  // 4. TECHNICAL: Moving average position
  const { currentPrice, sma50, sma200 } = technicals || {};
  if (currentPrice && sma50 && sma200) {
    if (currentPrice > sma50 && sma50 > sma200) {
      signals.push({ key: 'MA_UP', text: 'Prijs boven SMA50 & SMA200 — bullish uptrend', type: 'ok', weight: +10 });
      buyScore += 10;
    } else if (currentPrice < sma50 && sma50 < sma200) {
      signals.push({ key: 'MA_DOWN', text: 'Prijs onder SMA50 & SMA200 — bearish downtrend', type: 'warn', weight: -15 });
      buyScore -= 15;
    } else if (currentPrice > sma200) {
      signals.push({ key: 'MA_MIX', text: 'Boven SMA200, gemengd signaal', type: 'caution', weight: 0 });
    }
  }

  // 5. MACD
  if (technicals?.macd?.trend) {
    if (technicals.macd.trend === 'bullish') { signals.push({ key: 'MACD_B', text: 'MACD bullish — positief momentum', type: 'ok', weight: +8 }); buyScore += 8; }
    else { signals.push({ key: 'MACD_S', text: 'MACD bearish — momentum zwakt', type: 'caution', weight: -5 }); buyScore -= 5; }
  }

  // 6. ADX trend strength
  if (technicals?.adx != null) {
    if (technicals.adx >= 25) {
      signals.push({ key: 'ADX_STR', text: `ADX ${technicals.adx.toFixed(0)} — sterke trend aanwezig`, type: 'ok', weight: +5 });
      buyScore += 5;
    }
  }

  // 7. NEWS SENTIMENT (basic)
  const negativeWords = ['recall', 'lawsuit', 'fraud', 'investigation', 'loss', 'miss', 'decline', 'downgrade', 'cut', 'warning', 'risk', 'drop', 'fell', 'plunges', 'collapse'];
  const positiveWords = ['beat', 'upgrade', 'record', 'growth', 'surge', 'rally', 'strong', 'raised', 'profit', 'wins', 'launches', 'expands', 'breakthrough'];
  if (news && news.length > 0) {
    let negCount = 0, posCount = 0;
    news.slice(0, 5).forEach(n => {
      const title = (n.title || '').toLowerCase();
      if (negativeWords.some(w => title.includes(w))) negCount++;
      if (positiveWords.some(w => title.includes(w))) posCount++;
    });
    if (negCount >= 2) { signals.push({ key: 'NEWS_NEG', text: `${negCount} negatieve nieuwsberichten recent`, type: 'warn', weight: -15 }); buyScore -= 15; }
    else if (posCount >= 2) { signals.push({ key: 'NEWS_POS', text: `${posCount} positieve nieuwsberichten recent`, type: 'ok', weight: +10 }); buyScore += 10; }
    else { signals.push({ key: 'NEWS_NEUT', text: 'Neutraal nieuws sentiment', type: 'caution', weight: 0 }); }
  }

  // 8. MARKET REGIME
  if (marketRiskOff) {
    signals.push({ key: 'MKT_OFF', text: 'Markt in risk-off modus — defensieve positionering aanbevolen', type: 'warn', weight: -15 });
    buyScore -= 15;
  } else {
    signals.push({ key: 'MKT_ON', text: 'Markt in risk-on modus — gunstig voor aankopen', type: 'ok', weight: +5 });
    buyScore += 5;
  }

  // ── determine verdict ──
  buyScore = Math.max(0, Math.min(100, buyScore));
  let verdictKey;
  const hasEarningsNear = signals.some(s => s.key === 'EARN_NEAR');
  const hasBadNews = signals.some(s => s.key === 'NEWS_NEG');
  const hasBadTech = signals.some(s => s.key === 'RSI_HIGH' || s.key === 'SIG_SS');
  const hasMktOff = signals.some(s => s.key === 'MKT_OFF');

  if (hasEarningsNear) verdictKey = 'WAIT_EARN';
  else if (hasMktOff && buyScore < 40) verdictKey = 'WAIT_MKTM';
  else if (hasBadNews && buyScore < 45) verdictKey = 'WAIT_NEWS';
  else if (hasBadTech && buyScore < 45) verdictKey = 'WAIT_TECH';
  else if (buyScore >= 65) verdictKey = 'BUY';
  else if (buyScore >= 52) verdictKey = 'BUY_WAIT';
  else verdictKey = 'NEUTRAL';

  return { verdictKey, buyScore, signals };
}

// ─── component ──────────────────────────────────────────────────────────────

export default function BuyOrWaitWidget({
  screenerData = {},
  stockPrices = {},
  tickerNewsMap = {},
  earningsData = {},
  aiBuyScores = {},
  loadingAiBuy = {},
  onRunBuyCheck,
  onFetchNews,
  userApiKey,
}) {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { ticker, technicals, earningsDays, earningsDate, news, localDecision, marketRiskOff, stockData }
  const [expanded, setExpanded] = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const inputRef = useRef(null);

  const analyze = useCallback(async (overrideTicker) => {
    const t = (overrideTicker || ticker).trim().toUpperCase();
    if (!t) return;
    setLoading(true);
    setResult(null);

    try {
      // 1. Gather stock data (screener cache + stockPrices)
      const sp = stockPrices[t] || {};
      const spTech = sp.technicals || {};
      const spGrowth = sp.growthData || {};
      const sd = { ...spGrowth, currentPrice: sp.current, dailyChange: spGrowth.dailyChange ?? sp.changePercent, ...spTech, ...(screenerData[t] || {}) };

      const technicals = {
        rsi: sd.rsi,
        macd: sd.macd,
        sma50: sd.sma50,
        sma200: sd.sma200,
        currentPrice: sd.currentPrice || sp.current,
        signal: sd.signal,
        adx: sd.adx,
        emaTrendUp: sd.emaTrendUp,
        growth1mo: sd.growth1mo,
        growth6mo: sd.growth6mo,
        growth1yr: sd.growth1yr,
      };

      // 2. Earnings check — robust multi-strategy
      setEarningsLoading(true);
      let earningsInfo = null;
      let earningsDays = null;
      let earningsDate = null;
      let earningsTodayOrYesterday = false;
      let recentEarningsDate = null;
      try {
        // Always run our robust fetcher (covers small caps better)
        const robust = await fetchEarningsRobust(t);
        earningsTodayOrYesterday = robust.earningsTodayOrYesterday;
        recentEarningsDate = robust.recentEarningsDate;

        if (robust.nextEarningsDate) {
          earningsDate = robust.nextEarningsDate;
          earningsDays = daysUntil(earningsDate);
          earningsInfo = robust;
        } else {
          // Fallback to earningsCalendar for extra history data
          const cal = earningsData[t] || await earningsCalendar.fetchEarnings(t).catch(() => null);
          if (cal?.nextEarningsDate) {
            earningsDate = cal.nextEarningsDate;
            earningsDays = daysUntil(earningsDate);
            earningsInfo = { ...robust, ...cal };
          } else {
            earningsInfo = robust;
          }
        }
        // If earnings were today/yesterday, treat daysUntil as 0
        if (earningsTodayOrYesterday && earningsDays === null) {
          earningsDays = 0;
          earningsDate = recentEarningsDate;
        }
      } catch (_) {}
      setEarningsLoading(false);

      // 3. Fetch news if needed
      let news = tickerNewsMap[t] || [];
      if (news.length === 0 && typeof onFetchNews === 'function') {
        try { await onFetchNews([t]); news = tickerNewsMap[t] || []; } catch (_) {}
      }

      // 4. Market regime (simple heuristic: if any major index down >1% = risk-off)
      const marketRiskOff = false; // Could be enhanced with MarketMeters data

      // 5. Local decision engine
      const decision = localDecision({ technicals, earningsDays, news, marketRiskOff, earningsTodayOrYesterday });

      setResult({ ticker: t, technicals, earningsDays, earningsDate, earningsInfo, news, decision, stockData: sd, earningsTodayOrYesterday, recentEarningsDate });

      // 6. Trigger AI analysis in background
      if (typeof onRunBuyCheck === 'function') {
        onRunBuyCheck(t);
      }
    } catch (e) {
      console.warn('BuyOrWait analyze error:', e);
    } finally {
      setLoading(false);
    }
  }, [ticker, screenerData, stockPrices, tickerNewsMap, earningsData, onRunBuyCheck, onFetchNews]);

  const handleKey = (e) => { if (e.key === 'Enter') analyze(); };

  const aiScore = result ? aiBuyScores[result.ticker] : null;
  const aiLoading = result ? loadingAiBuy[result.ticker] : false;

  // Merge local + AI verdict for final display
  const localDec = result?.decision;
  const verdictKey = aiScore && !aiScore._error
    ? (aiScore.verdict === 'kopen' ? (localDec?.verdictKey === 'WAIT_EARN' ? 'WAIT_EARN' : 'BUY') : aiScore.verdict === 'verkopen' ? 'WAIT_TECH' : 'NEUTRAL')
    : localDec?.verdictKey || 'NEUTRAL';
  const conf = aiScore?.confidence ?? (localDec ? Math.round(localDec.buyScore) : null);
  const vData = VERDICT[verdictKey] || VERDICT.NEUTRAL;
  const vColors = verdictColors[vData.color];
  const VIcon = vData.icon;

  return (
    <div className="glass-effect rounded-xl border border-purple-500/20 p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/30 to-emerald-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-green-300" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Buy of Wachten?</h3>
            <p className="text-white/40 text-[10px]">Voer een ticker in — AI + technische analyse + earnings timing</p>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-white/40 hover:text-white/70 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Search bar */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                ref={inputRef}
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                onKeyDown={handleKey}
                placeholder="AAPL, MSFT, VWCE.DE…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
            <button
              onClick={() => analyze()}
              disabled={!ticker.trim() || loading}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-40 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all flex items-center space-x-2 whitespace-nowrap"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>{loading ? 'Analyseren…' : 'Analyseer'}</span>
            </button>
          </div>

          {/* Quick suggestion pills */}
          {!result && !loading && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['AAPL', 'NVDA', 'MSFT', 'VWCE.DE', 'AMZN', 'ASML'].map(s => (
                <button
                  key={s}
                  onClick={() => { setTicker(s); analyze(s); }}
                  className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 text-white/50 hover:text-purple-300 border border-white/10 hover:border-purple-500/30 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Result ── */}
          {result && (
            <div className="space-y-3">
              {/* EARNINGS TODAY ALERT — full width banner */}
              {result.earningsTodayOrYesterday && (
                <div className="bg-orange-500/20 border-2 border-orange-500/60 rounded-xl px-4 py-3 flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-orange-300 font-bold text-sm">
                      {(() => { const d = result.recentEarningsDate ? daysUntil(result.recentEarningsDate) : -1; return d === 0 ? '⚡ Earnings VANDAAG gepubliceerd!' : '📅 Earnings GISTEREN gepubliceerd!'; })()}
                    </div>
                    <div className="text-orange-200/70 text-[10px]">
                      Koers kan de komende 24-48u sterk bewegen. Wacht op stabilisatie voor je instapt.
                    </div>
                  </div>
                </div>
              )}

              {/* Main verdict card */}
              <div className={`rounded-xl p-4 border-2 ${vColors.bg} ${vColors.border} transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${vColors.badge}`}>
                      <VIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[10px] text-white/50 uppercase tracking-wider">Verdict voor {result.ticker}</div>
                      <div className={`font-bold text-lg ${vColors.text}`}>{vData.label}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/40">Koopscore</div>
                    <div className={`text-2xl font-bold ${vColors.text}`}>{conf ?? '—'}</div>
                    <div className="text-[9px] text-white/30">/100</div>
                  </div>
                </div>

                {/* AI one-liner */}
                {aiScore && !aiScore._error && aiScore.one_liner && (
                  <div className={`rounded-lg p-2.5 ${vColors.bg} border ${vColors.border} mb-2`}>
                    <div className="flex items-start space-x-1.5">
                      <Bot className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <p className="text-white/90 text-xs leading-snug">"{aiScore.one_liner}"</p>
                    </div>
                  </div>
                )}
                {aiLoading && !aiScore && (
                  <div className="flex items-center space-x-2 text-white/50 text-xs">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>AI analyse in de achtergrond…</span>
                  </div>
                )}
              </div>

              {/* Signal grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Earnings timing */}
                <div className={`rounded-xl p-3 ${result.earningsTodayOrYesterday ? 'bg-orange-500/15 border border-orange-500/40' : 'glass-effect'}`}>
                  <div className="flex items-center space-x-1.5 mb-2">
                    <Calendar className={`w-3.5 h-3.5 ${result.earningsTodayOrYesterday ? 'text-orange-400' : 'text-orange-400'}`} />
                    <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Earnings Timing</span>
                    {earningsLoading && <RefreshCw className="w-3 h-3 text-white/30 animate-spin" />}
                  </div>

                  {/* VANDAAG/GISTEREN EARNINGS — prominent banner */}
                  {result.earningsTodayOrYesterday && (
                    <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg px-2.5 py-2 mb-2">
                      <div className="flex items-center space-x-1.5">
                        <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        <div>
                          <div className="text-orange-300 font-bold text-xs">
                            {result.recentEarningsDate ? (() => {
                              const d = daysUntil(result.recentEarningsDate);
                              return d === 0 ? '⚡ Earnings VANDAAG!' : '📅 Earnings gisteren';
                            })() : '⚡ Earnings vandaag/gisteren!'}
                          </div>
                          {result.recentEarningsDate && (
                            <div className="text-orange-200/70 text-[10px]">
                              {result.recentEarningsDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {result.earningsDate ? (
                    <div>
                      <div className={`text-sm font-bold ${result.earningsDays !== null && result.earningsDays <= 7 ? 'text-red-400' : result.earningsDays !== null && result.earningsDays <= 14 ? 'text-orange-400' : 'text-green-400'}`}>
                        {earningsCalendar.formatEarningsDate(result.earningsDate)}
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        {result.earningsDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      {result.earningsInfo?.estimatedEPS != null && (
                        <div className="text-[10px] text-white/50 mt-1">
                          EPS verwacht: <span className="text-white/70 font-medium">${result.earningsInfo.estimatedEPS.toFixed(2)}</span>
                        </div>
                      )}
                      {result.earningsInfo?.history?.length > 0 && (() => {
                        const beatRate = earningsCalendar.getBeatRate(result.earningsInfo.history);
                        const avgSurprise = earningsCalendar.getAverageSurprise(result.earningsInfo.history);
                        return beatRate != null ? (
                          <div className="text-[10px] text-white/50 mt-1">
                            Beat rate: <span className={`font-medium ${beatRate >= 70 ? 'text-green-400' : beatRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{Math.round(beatRate)}%</span>
                            {avgSurprise != null && <span className="ml-2">Gem. surprise: <span className={`font-medium ${avgSurprise > 0 ? 'text-green-400' : 'text-red-400'}`}>{avgSurprise > 0 ? '+' : ''}{avgSurprise.toFixed(1)}%</span></span>}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : !result.earningsTodayOrYesterday ? (
                    <div className="text-white/40 text-xs">Geen aankomende earnings datum gevonden</div>
                  ) : null}
                </div>

                {/* Technicals snapshot */}
                <div className="glass-effect rounded-xl p-3">
                  <div className="flex items-center space-x-1.5 mb-2">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Technisch</span>
                  </div>
                  <div className="space-y-1.5">
                    {result.technicals.rsi != null && (
                      <div className="flex items-center space-x-2">
                        <span className="text-white/40 text-[10px] w-16">RSI</span>
                        {scoreBar(result.technicals.rsi, 100, result.technicals.rsi > 70 ? 'red' : result.technicals.rsi < 30 ? 'green' : 'blue')}
                        <span className={`text-[10px] font-bold w-8 text-right ${result.technicals.rsi > 70 ? 'text-red-400' : result.technicals.rsi < 30 ? 'text-green-400' : 'text-white/70'}`}>
                          {result.technicals.rsi.toFixed(0)}
                        </span>
                      </div>
                    )}
                    {result.technicals.adx != null && (
                      <div className="flex items-center space-x-2">
                        <span className="text-white/40 text-[10px] w-16">ADX</span>
                        {scoreBar(result.technicals.adx, 60, result.technicals.adx >= 25 ? 'green' : 'yellow')}
                        <span className="text-[10px] font-bold text-white/70 w-8 text-right">{result.technicals.adx.toFixed(0)}</span>
                      </div>
                    )}
                    {result.technicals.signal && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-[10px]">Signaal</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          String(result.technicals.signal?.overall || result.technicals.signal).includes('STRONG BUY') ? 'bg-green-500/20 text-green-400' :
                          String(result.technicals.signal?.overall || result.technicals.signal).includes('BUY') ? 'bg-emerald-500/20 text-emerald-400' :
                          String(result.technicals.signal?.overall || result.technicals.signal).includes('STRONG SELL') ? 'bg-red-500/20 text-red-400' :
                          String(result.technicals.signal?.overall || result.technicals.signal).includes('SELL') ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/10 text-yellow-300'
                        }`}>
                          {result.technicals.signal?.overall || result.technicals.signal}
                        </span>
                      </div>
                    )}
                    {result.technicals.macd?.trend && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-[10px]">MACD</span>
                        <span className={`text-[10px] font-bold ${result.technicals.macd.trend === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                          {result.technicals.macd.trend === 'bullish' ? '↑ Bullish' : '↓ Bearish'}
                        </span>
                      </div>
                    )}
                    {result.technicals.currentPrice && result.technicals.sma50 && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-[10px]">vs SMA50</span>
                        <span className={`text-[10px] font-bold ${result.technicals.currentPrice > result.technicals.sma50 ? 'text-green-400' : 'text-red-400'}`}>
                          {result.technicals.currentPrice > result.technicals.sma50 ? '▲ Erboven' : '▼ Eronder'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance */}
                {(result.stockData.growth1mo != null || result.stockData.growth6mo != null || result.stockData.growth1yr != null) && (
                  <div className="glass-effect rounded-xl p-3">
                    <div className="flex items-center space-x-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Performance</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[['1M', result.stockData.growth1mo], ['6M', result.stockData.growth6mo], ['1J', result.stockData.growth1yr]].map(([label, val]) =>
                        val != null ? (
                          <div key={label} className="text-center">
                            <div className="text-white/40 text-[9px]">{label}</div>
                            <div className={`text-xs font-bold ${val >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {/* News sentiment */}
                {result.news.length > 0 && (
                  <div className="glass-effect rounded-xl p-3">
                    <div className="flex items-center space-x-1.5 mb-2">
                      <Newspaper className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Nieuws ({result.news.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {result.news.slice(0, 3).map((n, i) => (
                        <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                          className="block text-[10px] text-white/60 hover:text-purple-300 truncate transition-colors">
                          • {n.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Decision signals list */}
              <div className="glass-effect rounded-xl p-3">
                <div className="flex items-center space-x-1.5 mb-2.5">
                  <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">Signalen & Redenen</span>
                </div>
                <div className="space-y-1.5">
                  {localDec?.signals.map((s, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <span className="mt-0.5 flex-shrink-0">
                        {s.type === 'ok' && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                        {s.type === 'warn' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        {s.type === 'caution' && <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />}
                      </span>
                      <span className="text-[10px] text-white/70 leading-snug">{s.text}</span>
                    </div>
                  ))}
                  {/* AI reasons supplement */}
                  {aiScore && !aiScore._error && aiScore.reasons?.length > 0 && (
                    <>
                      <div className="border-t border-white/10 pt-2 mt-1">
                        <div className="flex items-center space-x-1 mb-1.5">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span className="text-white/40 text-[9px]">AI aanvulling</span>
                        </div>
                        {aiScore.reasons.slice(0, 3).map((r, i) => (
                          <div key={i} className="flex items-start space-x-2 mb-1">
                            <Bot className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                            <span className="text-[10px] text-white/60 leading-snug">{r}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tactical tip */}
              <div className={`rounded-xl p-3 ${vColors.bg} border ${vColors.border}`}>
                <div className="flex items-start space-x-2">
                  <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${vColors.text}`} />
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${vColors.text}`}>Tactisch advies</div>
                    <p className="text-white/80 text-xs leading-snug">
                      {verdictKey === 'WAIT_EARN' && (result.earningsTodayOrYesterday ? `Earnings waren vandaag/gisteren — de koers verwerkt nu de resultaten. Wacht 24-48 uur tot het stof neerdaalt en de richting duidelijker is voor je instapt.` : `Wacht tot na de earnings publicatie. Koersen kunnen sterk bewegen rondom earnings. Stel een alert in voor de dag na het rapport.`)}
                      {verdictKey === 'WAIT_TECH' && `Het aandeel is technisch overbought of toont zwakke signalen. Wacht op een pullback richting SMA50 of RSI onder 60 voor een beter instappunt.`}
                      {verdictKey === 'WAIT_NEWS' && `Recent negatief nieuws kan de koers drukken. Wacht op nieuws-stabilisatie (48-72u) voor je instapt.`}
                      {verdictKey === 'WAIT_MKTM' && `De bredere markt is in risk-off modus. Overweeg te wachten op markt-stabilisatie of koop in kleine tranches.`}
                      {verdictKey === 'BUY' && `Sterke signalen over de board. Goed moment voor een positie of bijkopen. Stel een stop-loss in op -${result.technicals.sma200 ? Math.round((1 - result.technicals.sma200 / (result.technicals.currentPrice || result.technicals.sma200)) * 100) : '8'}% onder SMA200.`}
                      {verdictKey === 'BUY_WAIT' && `Redelijk koopmoment, maar overweeg om in tranches in te stappen (bijv. 50% nu, 50% bij een dip). Biedt een betere gemiddelde aankoopprijs.`}
                      {verdictKey === 'NEUTRAL' && `Gemengde signalen. Zet het aandeel op je watchlist en wacht op een duidelijkere richting voor je instapt.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Re-analyze / new search */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setResult(null); setTicker(''); setTimeout(() => inputRef.current?.focus(), 100); }}
                  className="text-white/40 hover:text-white/70 text-xs flex items-center space-x-1 transition-colors"
                >
                  <Search className="w-3 h-3" />
                  <span>Andere ticker</span>
                </button>
                <button
                  onClick={() => analyze(result.ticker)}
                  className="text-purple-400 hover:text-purple-300 text-xs flex items-center space-x-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Heranalyseer {result.ticker}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
