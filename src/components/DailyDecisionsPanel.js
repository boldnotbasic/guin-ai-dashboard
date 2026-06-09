import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus, ExternalLink, Zap, Eye, AlertTriangle, Info, Bell, BellOff, Calendar, ChevronDown } from 'lucide-react';
import { computeSignal, rankSignals, deriveProactiveAlerts, VERDICT_STYLE } from '../utils/signalEngine';

const ALERT_STYLE = {
  earnings: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', Icon: Calendar },
  buy: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', Icon: TrendingUp },
  sell: { text: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/30', Icon: TrendingDown },
};

const curSymbol = (c) => ({ EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', JPY: '¥', CAD: 'C$', AUD: 'A$', HKD: 'HK$' }[c] || (c ? c + ' ' : ''));

const VerdictBadge = ({ verdict }) => {
  const s = VERDICT_STYLE[verdict] || VERDICT_STYLE.HOUD;
  const Icon = verdict === 'KOOP' ? TrendingUp : verdict === 'VERKOOP' ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${s.text} ${s.bg} ${s.border}`}>
      <Icon className="w-3.5 h-3.5" /> {s.label}
    </span>
  );
};

const ReasonChip = ({ reason }) => {
  const color = reason.dir === 'bull'
    ? 'text-emerald-300/90 bg-emerald-500/10 border-emerald-500/20'
    : reason.dir === 'bear'
      ? 'text-red-300/90 bg-red-500/10 border-red-500/20'
      : 'text-white/50 bg-white/5 border-white/10';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${color}`}>{reason.label}</span>
  );
};

export default function DailyDecisionsPanel({
  investments = [],
  watchlist = [],
  stockPrices = {},
  analystData = {},
  earningsData = {},
  screenerData = {},
  aiBuyScores = {},
  onRunBuyCheck,
  onAddToWatchlist,
}) {
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'portfolio' | 'watchlist'
  const [verdictFilter, setVerdictFilter] = useState('all'); // 'all' | 'KOOP' | 'VERKOOP' | 'HOUD'
  const [notifyEnabled, setNotifyEnabled] = useState(() => {
    try { return localStorage.getItem('decisions_notify') === '1'; } catch { return false; }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('decisions_collapsed') === '1'; } catch { return false; }
  });
  const notifiedRef = useRef(new Set());
  
  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    try { localStorage.setItem('decisions_collapsed', newState ? '1' : '0'); } catch {}
  };

  const signals = useMemo(() => {
    // Dedupe tickers, portfolio takes priority for the source label.
    const map = new Map();
    investments.forEach((inv) => {
      const t = inv.ticker_symbol;
      if (t && !map.has(t)) map.set(t, { ticker: t, name: inv.name || t, source: 'portfolio' });
    });
    watchlist.forEach((w) => {
      const t = w.ticker || w.symbol;
      if (t && !map.has(t)) map.set(t, { ticker: t, name: w.name || t, source: 'watchlist' });
    });

    const out = [];
    for (const { ticker, name, source } of map.values()) {
      const sp = stockPrices[ticker] || {};
      const sd = screenerData[ticker] || {};
      const technicals = { ...sd, ...(sp.technicals || {}) };
      const a = analystData[ticker] || (sd.recommendation ? { mean: sd.recommendation.mean, targetPrice: sd.targetPrice } : null);
      const analyst = a ? { mean: a.mean, targetPrice: a.targetPrice ?? sd.targetPrice, analysts: a.analysts } : null;
      const earnings = earningsData[ticker] || null;
      const growth = sp.growthData || null;
      const aiScore = aiBuyScores?.[ticker] && typeof aiBuyScores[ticker].score === 'number' ? aiBuyScores[ticker].score : null;
      const price = {
        current: sp.current ?? sd.currentPrice ?? null,
        changePercent: sp.changePercent ?? sp.growthData?.dailyChange ?? sd.dailyChange ?? null,
        currency: sp.currency || sd.currency || 'EUR',
      };
      const sig = computeSignal({ ticker, name, price, technicals, analyst, earnings, growth, aiScore });
      sig.source = source;
      sig.price = price;
      out.push(sig);
    }
    return rankSignals(out);
  }, [investments, watchlist, stockPrices, analystData, earningsData, screenerData, aiBuyScores]);

  const counts = useMemo(() => {
    const c = { KOOP: 0, VERKOOP: 0, HOUD: 0 };
    signals.forEach((s) => { c[s.verdict] = (c[s.verdict] || 0) + 1; });
    return c;
  }, [signals]);

  const alerts = useMemo(() => deriveProactiveAlerts(signals), [signals]);

  // Optional desktop notifications for high-severity proactive alerts.
  useEffect(() => {
    if (!notifyEnabled || typeof window === 'undefined' || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    alerts.forEach((a) => {
      if (a.severity !== 'high' || notifiedRef.current.has(a.id)) return;
      notifiedRef.current.add(a.id);
      const title = a.kind === 'earnings' ? 'Earnings binnenkort' : a.kind === 'buy' ? 'Koopsignaal' : 'Verkoopsignaal';
      try { new Notification(`Guin AI — ${title}`, { body: a.message }); } catch { /* ignore */ }
    });
  }, [alerts, notifyEnabled]);

  const toggleNotify = async () => {
    if (notifyEnabled) {
      setNotifyEnabled(false);
      try { localStorage.setItem('decisions_notify', '0'); } catch { /* ignore */ }
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
      } catch { return; }
    }
    setNotifyEnabled(true);
    try { localStorage.setItem('decisions_notify', '1'); } catch { /* ignore */ }
  };

  const visible = signals.filter((s) =>
    (sourceFilter === 'all' || s.source === sourceFilter) &&
    (verdictFilter === 'all' || s.verdict === verdictFilter)
  );

  const sourcePills = [
    ['all', 'Alles'],
    ['portfolio', 'Portfolio'],
    ['watchlist', 'Watchlist'],
  ];

  return (
    <div className="gradient-card rounded-xl overflow-hidden mb-6" aria-label="Dagelijkse beslissingen">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Dagelijkse beslissingen</h2>
              <p className="text-white/40 text-xs">Gefuseerd uit techniek · analist · earnings · momentum</p>
            </div>
          </div>
          {/* Verdict summary — click to filter */}
          <div className="flex items-center gap-1.5">
            {['KOOP', 'VERKOOP', 'HOUD'].map((v) => {
              const s = VERDICT_STYLE[v];
              const active = verdictFilter === v;
              return (
                <button key={v} onClick={() => setVerdictFilter(active ? 'all' : v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${active ? `${s.bg} ${s.border} ${s.text}` : 'border-white/10 text-white/40 hover:text-white/70'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {counts[v]} {s.label}
                </button>
              );
            })}
            <button onClick={toggleNotify}
              className={`p-1.5 rounded-lg border transition-all ${notifyEnabled ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 text-white/40 hover:text-white/70'}`}
              title={notifyEnabled ? 'Desktop-meldingen aan' : 'Desktop-meldingen uit'}>
              {notifyEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={toggleCollapse}
              className="p-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 transition-all"
              title={collapsed ? 'Uitklappen' : 'Inklappen'}>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {!collapsed && (
        <>
        {/* Source filter */}
        <div className="flex gap-1.5">
          {sourcePills.map(([key, label]) => (
            <button key={key} onClick={() => setSourceFilter(key)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${sourceFilter === key ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}>
              {label}
            </button>
          ))}
        </div>
        </>
        )}
      </div>

      {!collapsed && (
      <>
      {/* Proactive alerts strip */}
      {alerts.length > 0 && (
        <div className="px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-white/50 text-[10px] uppercase tracking-widest">Proactieve signalen ({alerts.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {alerts.slice(0, 8).map((a) => {
              const st = ALERT_STYLE[a.kind] || ALERT_STYLE.buy;
              const AIcon = st.Icon;
              return (
                <span key={a.id}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${st.text} ${st.bg} ${st.border} ${a.severity === 'high' ? 'font-semibold' : ''}`}>
                  <AIcon className="w-3 h-3" /> {a.message}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {signals.length === 0 && (
        <div className="px-4 py-10 text-center">
          <Info className="w-6 h-6 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">Voeg aandelen toe aan je portfolio of watchlist om dagelijkse verdicts te zien.</p>
        </div>
      )}

      {signals.length > 0 && visible.length === 0 && (
        <p className="text-white/30 text-xs px-4 py-6 text-center">Geen aandelen in deze selectie.</p>
      )}

      {/* List */}
      {visible.length > 0 && (
        <div className="divide-y divide-white/5">
          {visible.map((s) => {
            const style = VERDICT_STYLE[s.verdict];
            const chg = s.price?.changePercent;
            const topReasons = s.reasons.slice(0, 4);
            return (
              <div key={s.ticker} className="px-4 py-3 hover:bg-white/3 transition-all">
                <div className="flex items-start gap-3">
                  {/* Verdict + confidence */}
                  <div className="flex flex-col items-start gap-1.5 shrink-0 w-[92px]">
                    <VerdictBadge verdict={s.verdict} />
                    <div className="w-full">
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full ${style.bar}`} style={{ width: `${s.confidence}%` }} />
                      </div>
                      <p className="text-white/30 text-[9px] mt-0.5">{s.confidence}% zekerheid</p>
                    </div>
                  </div>

                  {/* Main */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-bold text-sm">{s.ticker}</span>
                      <span className="text-white/50 text-xs truncate max-w-[160px]">{s.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${s.source === 'portfolio' ? 'text-blue-300/80 border-blue-500/20 bg-blue-500/10' : 'text-purple-300/80 border-purple-500/20 bg-purple-500/10'}`}>
                        {s.source === 'portfolio' ? 'Portfolio' : 'Watchlist'}
                      </span>
                      {s.earningsSoon && (
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border text-amber-300/90 border-amber-500/30 bg-amber-500/10">
                          <AlertTriangle className="w-2.5 h-2.5" /> Earnings {s.daysToEarnings === 0 ? 'vandaag' : `${s.daysToEarnings}d`}
                        </span>
                      )}
                    </div>
                    {topReasons.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {topReasons.map((r, i) => <ReasonChip key={i} reason={r} />)}
                      </div>
                    ) : (
                      <p className="text-white/30 text-[11px]">Onvoldoende data voor een sterk signaal.</p>
                    )}
                  </div>

                  {/* Price + actions */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {s.price?.current != null && (
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold leading-tight">
                          {curSymbol(s.price.currency)}{Number(s.price.current).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {typeof chg === 'number' && (
                          <p className={`text-[11px] font-medium ${chg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {onRunBuyCheck && (
                        <button onClick={() => onRunBuyCheck(s.ticker)}
                          className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all"
                          title="AI koop-analyse">
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onAddToWatchlist && s.source !== 'watchlist' && !watchlist.some((w) => (w.ticker || w.symbol) === s.ticker) && (
                        <button onClick={() => onAddToWatchlist({ ticker: s.ticker, name: s.name })}
                          className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-all"
                          title="Naar watchlist">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <a href={`https://finance.yahoo.com/quote/${s.ticker}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                        title="Yahoo Finance">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {signals.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-white/20 text-[9px]">
            Verdicts zijn een hulpmiddel, geen beleggingsadvies. Vlak voor earnings adviseert de engine afwachten.
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
