import React, { useState, useEffect, useCallback } from 'react';
import { Radar, TrendingUp, TrendingDown, Volume2, Zap, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Plus } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const signalConfig = {
  volume:       { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: '📊' },
  volume_high:  { color: 'text-blue-300 bg-blue-500/15 border-blue-500/30', icon: '🔥' },
  rsi:          { color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: '📉' },
  rsi_ob:       { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: '📈' },
  breakout:     { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: '🚀' },
  low52:        { color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: '🔍' },
  momentum:     { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: '⚡' },
  momentum_bear:{ color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: '🔻' },
  move:         { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: '💥' },
};

const SignalPill = ({ signal }) => {
  const cfg = signalConfig[signal.type] || signalConfig.move;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
      <span>{cfg.icon}</span> {signal.label}
    </span>
  );
};

const CategoryTab = ({ id, label, count, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
      active ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
    }`}
  >
    {label} {count > 0 && <span className="opacity-60">({count})</span>}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketScannerWidget({
  investments = [],
  watchlist = [],
  onAddToWatchlist,
  onRunBuyCheck,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [scanMode, setScanMode] = useState('market'); // 'market' | 'portfolio' | 'watchlist'

  const getTickers = useCallback(() => {
    if (scanMode === 'portfolio') return investments.map(i => i.ticker_symbol).filter(Boolean);
    if (scanMode === 'watchlist') return watchlist.map(w => w.ticker).filter(Boolean);
    return [];
  }, [scanMode, investments, watchlist]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tickers = getTickers();
      const params = new URLSearchParams({ limit: '20' });
      if (tickers.length > 0) params.set('tickers', tickers.join(','));
      const r = await fetch(`/api/market-scanner?${params}`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      setData(j);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getTickers]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8 * 60 * 1000);
    const onVisibility = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); };
  }, [load]);

  const cats = data?.categories || {};
  const tabItems = {
    all:       data?.signals || [],
    volume:    cats.volumeAlerts || [],
    breakout:  cats.breakouts || [],
    oversold:  cats.oversold || [],
    momentum:  cats.topMomentum || [],
  };
  const tabLabels = {
    all: 'Alle signalen',
    volume: '📊 Volume',
    breakout: '🚀 Breakout',
    oversold: '📉 Oververkocht',
    momentum: '⚡ Momentum',
  };
  const currentList = tabItems[activeTab] || [];

  return (
    <div className="gradient-card rounded-xl overflow-hidden mb-6" aria-label="Market Scanner Widget">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Radar className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Market Scanner</h2>
              <p className="text-white/40 text-xs">
                {loading && !data ? 'Scannen...' : data ? `${data.scanned} tickers gescand` : 'Volume · Breakout · RSI · Momentum'}
              </p>
            </div>
          </div>
          <button
            onClick={load} disabled={loading}
            className="text-white/30 hover:text-white/60 transition-all p-1.5 rounded-lg hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-purple-500/50"
            aria-label="Herlaad scanner"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Scan mode */}
        <div className="flex gap-1 mt-3">
          {[['market', '🌍 Markt'], ['portfolio', '💼 Portfolio'], ['watchlist', '👁 Watchlist']].map(([key, label]) => (
            <button key={key} onClick={() => setScanMode(key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                scanMode === key ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      {data && (
        <div className="px-4 pt-3 flex gap-1.5 flex-wrap">
          {Object.entries(tabLabels).map(([key, label]) => (
            <CategoryTab key={key} id={key} label={label} count={tabItems[key].length} active={activeTab === key} onClick={setActiveTab} />
          ))}
        </div>
      )}

      {/* Skeleton */}
      {loading && !data && (
        <div className="p-4 space-y-3" aria-busy="true">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3 py-1">
              <div className="w-14 h-4 bg-white/10 rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="w-3/4 h-2.5 bg-white/10 rounded" />
                <div className="flex gap-1.5">
                  <div className="w-20 h-4 bg-white/8 rounded-full" />
                  <div className="w-16 h-4 bg-white/6 rounded-full" />
                </div>
              </div>
              <div className="w-10 h-4 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-red-400/70 text-xs px-4 py-3" role="alert">⚠️ {error}</p>}

      {/* Empty */}
      {!loading && data && currentList.length === 0 && (
        <p className="text-white/30 text-xs px-4 py-6 text-center">Geen signalen gevonden in deze categorie</p>
      )}

      {/* Signal list */}
      {data && currentList.length > 0 && (
        <div className="divide-y divide-white/5 mt-2">
          {currentList.map((item) => (
            <div key={item.ticker}>
              <button
                onClick={() => setExpanded(expanded === item.ticker ? null : item.ticker)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/3 transition-all text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500/40"
                aria-expanded={expanded === item.ticker}
              >
                {/* Score badge */}
                <div className="flex flex-col items-center shrink-0 w-10">
                  <span className="text-[10px] font-bold text-white/30">#{item.score}</span>
                  {item.changePercent >= 0
                    ? <TrendingUp className="w-3.5 h-3.5 text-green-400 mt-0.5" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400 mt-0.5" />}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-white font-bold text-sm">{item.ticker}</span>
                    <span className="text-white/50 text-xs truncate max-w-[140px]">{item.name}</span>
                    <span className={`text-xs font-bold ${item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {item.changePercent >= 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.signals.map((s, i) => <SignalPill key={i} signal={s} />)}
                  </div>
                </div>

                {/* Price + chevron */}
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="text-white text-sm font-semibold">
                    {item.currency === 'EUR' ? '€' : '$'}{item.currentPrice?.toFixed(2)}
                  </span>
                  {expanded === item.ticker
                    ? <ChevronUp className="w-3 h-3 text-white/30" />
                    : <ChevronDown className="w-3 h-3 text-white/30" />}
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === item.ticker && (
                <div className="px-4 pb-3 bg-white/2">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1">RSI (14)</p>
                      <p className={`text-lg font-bold ${item.rsi <= 30 ? 'text-green-400' : item.rsi >= 70 ? 'text-orange-400' : 'text-white'}`}>
                        {item.rsi}
                      </p>
                      <p className="text-white/40 text-[10px]">{item.rsi <= 30 ? 'Oververkocht' : item.rsi >= 70 ? 'Overkocht' : 'Neutraal'}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1">Volume ratio</p>
                      <p className={`text-lg font-bold ${item.volumeRatio >= 2 ? 'text-blue-400' : 'text-white'}`}>
                        {item.volumeRatio?.toFixed(1)}x
                      </p>
                      <p className="text-white/40 text-[10px]">vs 20-daags gemiddelde</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1">52-wk positie</p>
                      <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                          style={{ width: `${item.rangePercent?.toFixed(0)}%` }} />
                      </div>
                      <p className="text-white/40 text-[10px] mt-1">{item.rangePercent?.toFixed(0)}% van 52-wk range</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
                      <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1">Momentum</p>
                      <p className={`text-sm font-bold ${item.momentum === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                        {item.momentum === 'bullish' ? '▲ Bullish' : '▼ Bearish'}
                      </p>
                      <p className="text-white/40 text-[10px]">MA5 {item.momentum === 'bullish' ? '>' : '<'} MA20</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={`https://finance.yahoo.com/quote/${item.ticker}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:text-white hover:border-white/30 transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50"
                      aria-label={`Open ${item.ticker} op Yahoo Finance`}>
                      <ExternalLink className="w-3 h-3" /> Yahoo Finance
                    </a>
                    {onRunBuyCheck && (
                      <button onClick={() => onRunBuyCheck(item.ticker)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs hover:bg-purple-500/30 transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50"
                        aria-label={`AI koop analyse ${item.ticker}`}>
                        <Zap className="w-3 h-3" /> AI Analyse
                      </button>
                    )}
                    {onAddToWatchlist && !watchlist.some(w => w.ticker === item.ticker) && (
                      <button onClick={() => onAddToWatchlist({ ticker: item.ticker, name: item.name })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs hover:bg-yellow-500/30 transition-all focus-visible:ring-2 focus-visible:ring-yellow-500/50"
                        aria-label={`Voeg ${item.ticker} toe aan watchlist`}>
                        <Plus className="w-3 h-3" /> Watchlist
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {lastUpdated && (
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-white/20 text-[9px] text-right">
            {lastUpdated.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} · auto-refresh elke 8 min
          </p>
        </div>
      )}
    </div>
  );
}
