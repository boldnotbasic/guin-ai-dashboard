import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Search, Plus, Loader2, AlertCircle, TrendingUp, ShieldCheck, Zap, Clock } from 'lucide-react';
import { semanticStockSearch } from '../utils/aiDiscovery';

const SUGGESTED_QUERIES = [
  'AI infrastructuur met sterke moat',
  'Defensieve dividend aandelen Europa',
  'Ondergewaardeerde mid-cap groeiers',
  'Crypto exposure zonder direct Bitcoin',
  'Healthcare met sterke pipeline',
  'Renewable energy lange termijn',
];

const riskColor = (r) => {
  if (r === 'laag') return 'bg-green-500/15 text-green-300 border-green-500/30';
  if (r === 'hoog') return 'bg-red-500/15 text-red-300 border-red-500/30';
  return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
};

const horizonIcon = (h) => {
  if (h === 'kort') return <Zap className="w-3 h-3" />;
  if (h === 'lang') return <Clock className="w-3 h-3" />;
  return <TrendingUp className="w-3 h-3" />;
};

const scoreBar = (score) => {
  const color = score >= 80 ? 'from-green-500 to-emerald-400'
    : score >= 60 ? 'from-blue-500 to-cyan-400'
    : score >= 40 ? 'from-yellow-500 to-amber-400'
    : 'from-white/20 to-white/30';
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(4, score)}%` }} />
    </div>
  );
};

const SemanticSearchPanel = ({ portfolio = [], watchlist = [], onAddToWatchlist, onOpenAISettings, prefill = null }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null); // { strategy, results, warnings }
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef(null);
  const lastPrefillRef = useRef(null);

  // Allow parent to trigger a search externally via prefill prop
  useEffect(() => {
    if (!prefill || !prefill.query) return;
    if (lastPrefillRef.current === prefill.token) return;
    lastPrefillRef.current = prefill.token;
    setCollapsed(false);
    setQuery(prefill.query);
    doSearch(prefill.query);
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const doSearch = async (q) => {
    const trimmed = (q ?? query).trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const ctx = {
        portfolio: portfolio.map(p => ({ ticker: p.ticker_symbol || p.ticker, name: p.name, sector: p.sector })).filter(p => p.ticker),
        watchlist: watchlist.map(w => ({ ticker: w.ticker, name: w.name })).filter(w => w.ticker),
      };
      const res = await semanticStockSearch(trimmed, ctx);
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (r) => {
    if (typeof onAddToWatchlist === 'function') {
      onAddToWatchlist({ ticker: r.ticker, name: r.name, sector: r.sector });
    }
  };

  return (
    <div ref={containerRef} className="glass-effect rounded-xl border border-purple-500/20 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">AI Discovery</h3>
            <p className="text-white/40 text-[10px]">Beschrijf wat je zoekt — AI vindt aandelen & ETF's die passen</p>
          </div>
        </div>
        <button onClick={() => setCollapsed(c => !c)} className="text-white/40 hover:text-white/70 text-xs">
          {collapsed ? 'Open' : 'Verberg'}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex items-center space-x-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
                placeholder="Bijv. 'AI groei met sterke earnings en lage P/E' of 'Defensief dividend Europa'"
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => doSearch()}
              disabled={loading || !query.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center space-x-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{loading ? 'Zoeken...' : 'AI zoek'}</span>
            </button>
          </div>

          {/* Suggested queries */}
          {!data && !loading && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUGGESTED_QUERIES.map((s) => (
                <button
                  key={s}
                  onClick={() => doSearch(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-red-300 text-xs">{error.message || 'Er ging iets mis.'}</p>
                {error.code === 'NO_KEY' && (
                  <button onClick={onOpenAISettings} className="text-red-300 underline text-xs mt-1">
                    Open AI instellingen
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="mt-3 space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-16 rounded-lg bg-white/5 border border-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {/* Results */}
          {data && data.results.length > 0 && (
            <div className="mt-3">
              {data.strategy && (
                <p className="text-white/60 text-xs mb-2 italic">
                  <ShieldCheck className="w-3 h-3 inline mr-1 text-purple-300" />
                  {data.strategy}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.results.map((r) => {
                  const alreadyOwned = portfolio.some(p => (p.ticker_symbol || p.ticker) === r.ticker);
                  const alreadyWl = watchlist.some(w => w.ticker === r.ticker);
                  return (
                    <div key={r.ticker} className="bg-white/5 border border-white/10 rounded-lg p-2.5 hover:border-purple-500/30 transition-all">
                      <div className="flex items-start justify-between mb-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="text-white font-bold text-sm">{r.ticker}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${r.type === 'etf' ? 'bg-blue-500/20 text-blue-300' : r.type === 'crypto' ? 'bg-orange-500/20 text-orange-300' : 'bg-purple-500/20 text-purple-300'}`}>{r.type}</span>
                            {r.sector && <span className="text-white/40 text-[10px]">{r.sector}</span>}
                          </div>
                          <p className="text-white/60 text-[11px] truncate">{r.name}</p>
                        </div>
                        <button
                          onClick={() => handleAdd(r)}
                          disabled={alreadyOwned || alreadyWl}
                          className={`flex-shrink-0 ml-2 px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                            alreadyOwned ? 'bg-green-500/15 text-green-400 cursor-default'
                            : alreadyWl ? 'bg-yellow-500/15 text-yellow-400 cursor-default'
                            : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30'
                          }`}
                        >
                          {alreadyOwned ? '✓ Portfolio' : alreadyWl ? '✓ Watchlist' : <span className="flex items-center space-x-0.5"><Plus className="w-3 h-3" /><span>Watchlist</span></span>}
                        </button>
                      </div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="text-purple-300 font-bold text-xs">{r.fit_score}</span>
                        <div className="flex-1">{scoreBar(r.fit_score)}</div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${riskColor(r.risk)}`}>{r.risk}</span>
                        <span className="text-white/40 text-[9px] flex items-center space-x-0.5">
                          {horizonIcon(r.horizon)}<span>{r.horizon}</span>
                        </span>
                      </div>
                      <p className="text-white/70 text-[11px] leading-snug">{r.thesis}</p>
                    </div>
                  );
                })}
              </div>

              {data.warnings && data.warnings.length > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  {data.warnings.map((w, i) => (
                    <p key={i} className="text-yellow-300 text-[11px] flex items-start space-x-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{w}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SemanticSearchPanel;
