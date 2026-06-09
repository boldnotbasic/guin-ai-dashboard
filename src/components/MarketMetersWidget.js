import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink, BarChart2 } from 'lucide-react';

// ─── Gauge SVG — 3-segment color arc (green → yellow → red or reversed) ────
// reversed=true  → left=red, right=green  (used for Barometer: high score = good)
// reversed=false → left=green, right=red  (used for Trump/Oil: high score = bad)
const Gauge = ({ value, min = 0, max = 100, size = 72, reversed = false }) => {
  const clamp = Math.max(min, Math.min(max, value));
  const pct = (clamp - min) / (max - min);
  const needleAngle = -135 + pct * 270;
  const r = size * 0.38;
  const sw = size * 0.07;
  const cx = size / 2;
  const cy = size / 2 + 4;

  const toXY = (deg, rad) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
  };

  // Arc segment helper: from deg1 to deg2 (both in gauge-degrees, -135 = left end)
  const arc = (d1, d2) => {
    const s = toXY(d1, r), e = toXY(d2, r);
    const large = d2 - d1 > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  // Three equal segments over 270°: each = 90°
  const [c1, c2, c3] = reversed
    ? ['#ef4444', '#eab308', '#22c55e']   // Barometer: red→yellow→green
    : ['#22c55e', '#eab308', '#ef4444'];  // Risk/Oil:  green→yellow→red

  // Needle
  const needle = toXY(needleAngle, r * 0.72);
  // Needle color based on position
  const needleColor = reversed
    ? (pct > 0.66 ? '#22c55e' : pct > 0.33 ? '#eab308' : '#ef4444')
    : (pct < 0.33 ? '#22c55e' : pct < 0.66 ? '#eab308' : '#ef4444');

  return (
    <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
      {/* Background track */}
      <path d={arc(-135, 135)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} strokeLinecap="round" />
      {/* Colored segments */}
      <path d={arc(-135, -45)}  fill="none" stroke={c1} strokeWidth={sw} strokeLinecap="round" opacity={0.55} />
      <path d={arc(-45,   45)}  fill="none" stroke={c2} strokeWidth={sw} strokeLinecap="round" opacity={0.55} />
      <path d={arc(45,   135)}  fill="none" stroke={c3} strokeWidth={sw} strokeLinecap="round" opacity={0.55} />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
        stroke="white" strokeWidth={size * 0.028} strokeLinecap="round" opacity={0.95} />
      <circle cx={cx} cy={cy} r={size * 0.055} fill={needleColor}
        style={{ filter: `drop-shadow(0 0 4px ${needleColor}cc)` }} />
    </svg>
  );
};

// ─── Score helpers ────────────────────────────────────────────────────────────
// Trump: combines VIX volatility (base) + news sentiment adjustment
const computeTrumpScore = (vix, sentimentAdj = 0) => {
  let base;
  if (!vix) base = 40;
  else if (vix <= 12) base = 10;
  else if (vix <= 16) base = 22;
  else if (vix <= 20) base = 35;
  else if (vix <= 25) base = 50;
  else if (vix <= 30) base = 65;
  else if (vix <= 40) base = 78;
  else base = 90;
  return Math.max(0, Math.min(100, base + sentimentAdj));
};

// Oil: 0=cheap, 100=very expensive — based on $/barrel
const computeOilScore = (price) => {
  if (!price) return 50;
  if (price <= 55) return 10; if (price <= 65) return 25; if (price <= 75) return 45;
  if (price <= 85) return 62; if (price <= 95) return 78; if (price <= 110) return 90;
  return 98;
};

// Barometer: average % change of SPX + NDX + AEX → 0-100
const computeBarometerScore = (changes) => {
  if (!changes.length) return 50;
  const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
  if (avg >= 1.5) return 85; if (avg >= 0.5) return 70; if (avg >= 0.1) return 58;
  if (avg >= -0.1) return 50; if (avg >= -0.5) return 42; if (avg >= -1.5) return 28;
  return 12;
};

// ─── Label factories ──────────────────────────────────────────────────────────
const trumpLabel = (s) => s <= 20
  ? { label: 'Laag Risico', color: '#22c55e', bg: 'bg-green-500/10 border-green-500/20' }
  : s <= 40 ? { label: 'Beperkt', color: '#84cc16', bg: 'bg-lime-500/10 border-lime-500/20' }
  : s <= 58 ? { label: 'Matig', color: '#eab308', bg: 'bg-yellow-500/10 border-yellow-500/20' }
  : s <= 75 ? { label: 'Verhoogd', color: '#f97316', bg: 'bg-orange-500/10 border-orange-500/20' }
  : { label: 'Hoog Risico', color: '#ef4444', bg: 'bg-red-500/10 border-red-500/20' };

const oilLabel = (p) => !p
  ? { label: 'Laden…', color: '#6b7280', bg: 'bg-white/5 border-white/10' }
  : p <= 60 ? { label: 'Goedkoop', color: '#22c55e', bg: 'bg-green-500/10 border-green-500/20' }
  : p <= 75 ? { label: 'Neutraal', color: '#eab308', bg: 'bg-yellow-500/10 border-yellow-500/20' }
  : p <= 90 ? { label: 'Duur', color: '#f97316', bg: 'bg-orange-500/10 border-orange-500/20' }
  : { label: 'Zeer Duur', color: '#ef4444', bg: 'bg-red-500/10 border-red-500/20' };

const barometerLabel = (s) => s >= 70
  ? { label: 'Bullish', color: '#22c55e', bg: 'bg-green-500/10 border-green-500/20', emoji: '📈' }
  : s >= 56 ? { label: 'Licht Bullish', color: '#84cc16', bg: 'bg-lime-500/10 border-lime-500/20', emoji: '🟢' }
  : s >= 44 ? { label: 'Neutraal', color: '#eab308', bg: 'bg-yellow-500/10 border-yellow-500/20', emoji: '🟡' }
  : s >= 28 ? { label: 'Licht Bearish', color: '#f97316', bg: 'bg-orange-500/10 border-orange-500/20', emoji: '🔶' }
  : { label: 'Bearish', color: '#ef4444', bg: 'bg-red-500/10 border-red-500/20', emoji: '📉' };

// ─── News list ────────────────────────────────────────────────────────────────
const NewsList = ({ news, loading }) => {
  if (loading) return (
    <div className="mt-2 space-y-1.5">
      {[0, 1, 2].map(i => <div key={i} className="h-3 bg-white/5 rounded-full animate-pulse" style={{ width: `${70 + i * 10}%` }} />)}
    </div>
  );
  if (!news || !news.length) return <p className="text-white/20 text-[10px] mt-2 italic">Geen recent nieuws gevonden</p>;
  return (
    <ul className="mt-2 space-y-1.5">
      {news.slice(0, 3).map((n, i) => (
        <li key={i}>
          <a href={n.link} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1 group">
            <ExternalLink className="w-2.5 h-2.5 text-white/20 group-hover:text-blue-400 mt-0.5 shrink-0 transition-colors" />
            <span className="text-white/55 text-[10px] leading-snug group-hover:text-white/85 transition-colors line-clamp-2">
              {n.title}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
};

// ─── Main Widget ──────────────────────────────────────────────────────────────
export default function MarketMetersWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(new Date());

  const loadData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = force ? '/api/market-data?bust=' + Date.now() : '/api/market-data';
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      setData(j);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    // Pause polling when tab hidden, force-refresh on return
    const onVisibilityChange = () => {
      if (!document.hidden) loadData(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    // Live "X min ago" ticker
    const nowTick = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(interval);
      clearInterval(nowTick);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────
  const vix = data?.vix?.price;
  const vixChange = data?.vix?.change;
  const sentimentAdj = data?.trumpSentimentAdj || 0;
  const trumpScore = computeTrumpScore(vix, sentimentAdj);
  const tInfo = trumpLabel(trumpScore);

  const oilPrice = data?.oil?.price;
  const oilChange = data?.oil?.change;
  const oilScore = computeOilScore(oilPrice);
  const oInfo = oilLabel(oilPrice);
  const oilName = data?.oil?.name || 'Crude';
  const oilSource = data?.oil?.symbol?.startsWith('OILPRICE')
    ? 'oilprice.com'
    : data?.oil?.symbol?.startsWith('STOOQ')
      ? 'stooq'
      : data?.oil?.symbol
        ? 'yahoo'
        : null;

  const idx = data?.indices || {};
  const indiceChanges = [idx.spx?.change, idx.ndx?.change, idx.aex?.change].filter(v => v != null);
  const barometerScore = computeBarometerScore(indiceChanges);
  const bInfo = barometerLabel(barometerScore);

  const trumpNews = data?.news?.trump || [];
  const oilNews = data?.news?.oil || [];
  const marketNews = data?.news?.market || [];

  return (
    <div className="gradient-card rounded-xl p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-semibold text-sm">Markt Meters</h3>
          {data?.cached && <span className="text-white/20 text-[9px]">gecached</span>}
        </div>
        <button onClick={() => loadData(true)} disabled={loading}
          className="text-white/30 hover:text-white/60 transition-all p-1 rounded-lg hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-purple-500/50"
          aria-label="Herlaad marktdata">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <p className="text-red-400/70 text-xs mb-3" role="alert">⚠️ Data tijdelijk niet beschikbaar — {error}</p>
      )}

      {/* Skeleton: first load only */}
      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-busy="true" aria-label="Marktdata laden">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl border border-white/10 p-3 animate-pulse">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-8 h-8 rounded-sm bg-white/10" />
                <div className="space-y-1">
                  <div className="w-20 h-2.5 bg-white/10 rounded" />
                  <div className="w-14 h-2 bg-white/8 rounded" />
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-16 h-12 bg-white/8 rounded-lg" />
                <div className="space-y-1.5 text-right">
                  <div className="w-14 h-3 bg-white/10 rounded ml-auto" />
                  <div className="w-10 h-2.5 bg-white/8 rounded ml-auto" />
                  <div className="w-8 h-2 bg-white/6 rounded ml-auto" />
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 space-y-1.5">
                <div className="w-full h-2 bg-white/6 rounded" />
                <div className="w-5/6 h-2 bg-white/5 rounded" />
                <div className="w-4/6 h-2 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {data && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* ── Trump Meter ──────────────────────────────────────────────────── */}
        <div className={`rounded-xl border p-3 ${tInfo.bg} flex flex-col`}
          role="region" aria-label="Trump Meter – politiek en handelsrisico">
          <div className="flex items-center gap-1.5 mb-2">
            <img src="/visuals/trump.png" alt="Trump" className="w-8 h-8 rounded-sm object-cover" />
            <div>
              <p className="text-white/85 text-xs font-semibold leading-tight">Trump Meter</p>
              <p className="text-white/35 text-[9px]">Politiek & handelsrisico</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Gauge value={trumpScore} size={72} />
            <div className="text-right">
              <p className="text-xs font-bold" style={{ color: tInfo.color }}>{tInfo.label}</p>
              {vix != null && (
                <p className="text-white/55 text-xs">VIX <span className="font-bold text-white/75">{vix.toFixed(1)}</span></p>
              )}
              {vixChange != null && (
                <p className={`text-[10px] font-medium ${vixChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {vixChange >= 0 ? '▲' : '▼'} {Math.abs(vixChange).toFixed(1)}%
                </p>
              )}
              {sentimentAdj !== 0 && (
                <p className={`text-[9px] leading-tight ${sentimentAdj > 0 ? 'text-red-400/60' : 'text-green-400/60'}`}>
                  {sentimentAdj > 0 ? '⬆ risico nieuws' : '⬇ positief nieuws'}
                </p>
              )}
              <p className="text-white/20 text-[9px]">{trumpScore}/100</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-2 mt-auto">
            <p className="text-white/25 text-[9px] uppercase tracking-wider">Laatste nieuws</p>
            <NewsList news={trumpNews} loading={loading} />
          </div>
        </div>

        {/* ── Oil Meter ────────────────────────────────────────────────────── */}
        <div className={`rounded-xl border p-3 ${oInfo.bg} flex flex-col`}
          role="region" aria-label="Olie Meter – prijs per vat">
          <div className="flex items-center gap-1.5 mb-2">
            <img src="/visuals/olie.png" alt="Olie" className="w-8 h-8 rounded-sm object-cover" />
            <div>
              <p className="text-white/85 text-xs font-semibold leading-tight">Olie Meter</p>
              <p className="text-white/35 text-[9px]">{oilName} ($ per vat)</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Gauge value={oilScore} size={72} />
            <div className="text-right">
              {oilPrice != null ? (
                <>
                  <p className="text-xl font-bold leading-tight" style={{ color: oInfo.color }}>
                    ${oilPrice.toFixed(2)}
                    <span className="text-[10px] font-normal text-white/40 ml-0.5">/vat</span>
                  </p>
                  <p className="text-xs font-semibold" style={{ color: oInfo.color }}>{oInfo.label}</p>
                  {oilChange != null && (
                    <div className="flex items-center justify-end gap-0.5 mt-0.5">
                      {oilChange >= 0
                        ? <TrendingUp className="w-3 h-3 text-red-400" />
                        : <TrendingDown className="w-3 h-3 text-green-400" />}
                      <span className={`text-[10px] font-semibold ${oilChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {oilChange >= 0 ? '+' : ''}{oilChange.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-white/40 text-xs">Laden…</p>
              )}
              {oilSource && (
                <p className="text-[9px] text-white/30 mt-0.5">bron: {oilSource}</p>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 pt-2 mt-auto">
            <p className="text-white/25 text-[9px] uppercase tracking-wider">Laatste nieuws</p>
            <NewsList news={oilNews} loading={loading} />
          </div>
        </div>

        {/* ── Marktbarometer ───────────────────────────────────────────────── */}
        <div className={`rounded-xl border p-3 ${bInfo.bg} flex flex-col`}
          role="region" aria-label="Marktbarometer – S&P 500, NASDAQ, AEX">
          <div className="flex items-center gap-1.5 mb-2">
            <img src="/visuals/Beurs.png" alt="Markt" className="w-8 h-8 rounded-sm object-cover" />
            <div>
              <p className="text-white/85 text-xs font-semibold leading-tight">Marktbarometer</p>
              <p className="text-white/35 text-[9px]">S&amp;P 500 · NASDAQ · AEX</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Gauge value={barometerScore} size={72} reversed={true} />
            <div className="text-right space-y-0.5">
              <p className="text-xs font-bold" style={{ color: bInfo.color }}>{bInfo.label}</p>
              {idx.spx && (
                <p className={`text-[10px] font-medium ${idx.spx.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  S&amp;P {idx.spx.change >= 0 ? '+' : ''}{idx.spx.change.toFixed(2)}%
                </p>
              )}
              {idx.aex && (
                <p className={`text-[10px] font-medium ${idx.aex.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  AEX {idx.aex.change >= 0 ? '+' : ''}{idx.aex.change.toFixed(2)}%
                </p>
              )}
              {idx.ndx && (
                <p className={`text-[10px] ${idx.ndx.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  NDX {idx.ndx.change >= 0 ? '+' : ''}{idx.ndx.change.toFixed(2)}%
                </p>
              )}
              <p className="text-white/20 text-[9px]">{barometerScore}/100</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-2 mt-auto">
            <p className="text-white/25 text-[9px] uppercase tracking-wider">Laatste nieuws</p>
            <NewsList news={marketNews} loading={loading} />
          </div>
        </div>
      </div>}

      {lastUpdated && (
        <p className="text-white/20 text-[9px] mt-3 text-right">
          {(() => {
            const mins = Math.round((now - lastUpdated) / 60000);
            if (mins < 1) return 'Zojuist bijgewerkt';
            if (mins === 1) return '1 min geleden bijgewerkt';
            return `${mins} min geleden bijgewerkt`;
          })()}
          {loading && !data && ' · laden…'}
        </p>
      )}
    </div>
  );
}
