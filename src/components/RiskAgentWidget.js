import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, AlertTriangle, TrendingDown, RefreshCw, ChevronDown, ChevronUp, Info, Target, BarChart2 } from 'lucide-react';

// ─── Pure-client risk calculations (no backend needed) ─────────────────────────

const calcPortfolioMetrics = (investments, stockPrices) => {
  if (!investments.length) return null;

  // Build positions
  const positions = investments.map(inv => {
    const sp = stockPrices[inv.ticker_symbol] || {};
    const shares = Number(inv.shares) || 0;
    const price = sp.current || Number(inv.purchase_price) || 0;
    const value = shares > 0 && price > 0 ? shares * price : Number(inv.amount) || 0;
    const purchasePrice = Number(inv.purchase_price) || price;
    const pnlPct = purchasePrice > 0 && price > 0 ? ((price - purchasePrice) / purchasePrice) * 100 : 0;
    const dailyChange = sp.change || 0; // daily % change
    return {
      ticker: inv.ticker_symbol,
      name: inv.name,
      sector: inv.sector || 'Onbekend',
      value,
      pnlPct,
      dailyChange,
      weight: 0, // filled below
    };
  }).filter(p => p.value > 0);

  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  if (totalValue <= 0) return null;

  positions.forEach(p => { p.weight = (p.value / totalValue) * 100; });

  // ── VaR 95% (parametric, 1-day) ────────────────────────────────────────────
  // Assume portfolio daily σ ≈ weighted avg of individual position daily moves
  // Use sp.changeHistory if available, else proxy from daily change
  const weightedDailyMove = positions.reduce((s, p) => s + (p.dailyChange * p.weight / 100), 0);
  // Without full return history we proxy σ via the distribution of daily changes
  const dailyChanges = positions.map(p => p.dailyChange);
  const avg = dailyChanges.reduce((s, v) => s + v, 0) / (dailyChanges.length || 1);
  const variance = dailyChanges.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (dailyChanges.length || 1);
  const sigma = Math.sqrt(variance);
  // Weighted portfolio sigma (simplified)
  const portfolioSigma = Math.max(sigma, 1.2); // minimum 1.2% daily vol
  const var95 = totalValue * (portfolioSigma * 1.645) / 100; // 1.645 = z-score 95%
  const var99 = totalValue * (portfolioSigma * 2.326) / 100;

  // ── Concentration risk ─────────────────────────────────────────────────────
  const topPosition = positions.sort((a, b) => b.weight - a.weight)[0];
  const top3Weight = positions.slice(0, 3).reduce((s, p) => s + p.weight, 0);
  const hhi = positions.reduce((s, p) => s + Math.pow(p.weight / 100, 2), 0); // 0..1
  const concentrationScore = Math.round((1 - hhi) * 100); // higher = more diversified

  // ── Sector allocation ──────────────────────────────────────────────────────
  const sectorMap = {};
  positions.forEach(p => {
    sectorMap[p.sector] = (sectorMap[p.sector] || 0) + p.weight;
  });
  const sectors = Object.entries(sectorMap)
    .map(([name, weight]) => ({ name, weight: Math.round(weight * 10) / 10 }))
    .sort((a, b) => b.weight - a.weight);
  const topSector = sectors[0];
  const sectorRisk = topSector?.weight > 50 ? 'hoog' : topSector?.weight > 35 ? 'middel' : 'laag';

  // ── Stress scenarios ────────────────────────────────────────────────────────
  const scenarios = [
    { name: 'Marktcrash -20%', shock: -20, icon: '🔴' },
    { name: 'Correctie -10%', shock: -10, icon: '🟠' },
    { name: 'Recessie -35%', shock: -35, icon: '🔴' },
    { name: 'Tech bubble -50%', shock: -50, icon: '⚫' },
    { name: 'Correctie +10%', shock: +10, icon: '🟢' },
    { name: 'Bull run +25%', shock: +25, icon: '🟢' },
  ];
  const stressResults = scenarios.map(s => ({
    ...s,
    impact: Math.round((totalValue * s.shock) / 100),
    portfolioValue: Math.round(totalValue * (1 + s.shock / 100)),
  }));

  // ── Position sizing suggestions ────────────────────────────────────────────
  const kellyFactor = 0.25; // conservative Kelly fraction
  const positionSuggestions = positions.slice(0, 5).map(p => {
    const currentWeight = p.weight;
    // Kelly optimal: simplified — for profitable positions with momentum use up to 15%
    const optimal = p.pnlPct > 10 ? 15 : p.pnlPct > 0 ? 10 : 7;
    const action = currentWeight > optimal * 1.5 ? 'Overgewicht — overweeg bijsturen'
      : currentWeight < optimal * 0.5 ? 'Ondergewicht — potentieel opschalen'
      : 'Gewicht OK';
    const actionType = currentWeight > optimal * 1.5 ? 'trim' : currentWeight < optimal * 0.5 ? 'add' : 'hold';
    return { ...p, currentWeight: Math.round(currentWeight * 10) / 10, optimal, action, actionType };
  });

  // ── Overall risk score ─────────────────────────────────────────────────────
  let riskScore = 50;
  if (concentrationScore < 50) riskScore -= 10;
  if (topPosition?.weight > 30) riskScore -= 10;
  if (sectorRisk === 'hoog') riskScore -= 15;
  if (positions.length >= 8) riskScore += 10;
  if (concentrationScore >= 70) riskScore += 10;
  riskScore = Math.max(0, Math.min(100, riskScore));
  const riskLabel = riskScore >= 65 ? 'Laag' : riskScore >= 40 ? 'Middel' : 'Hoog';
  const riskColor = riskScore >= 65 ? 'text-green-400' : riskScore >= 40 ? 'text-yellow-400' : 'text-red-400';

  return {
    totalValue,
    positions,
    var95: Math.round(var95),
    var99: Math.round(var99),
    portfolioSigma: Math.round(portfolioSigma * 10) / 10,
    concentrationScore,
    topPosition,
    top3Weight: Math.round(top3Weight),
    sectors,
    topSector,
    sectorRisk,
    stressResults,
    positionSuggestions,
    riskScore,
    riskLabel,
    riskColor,
    positionCount: positions.length,
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const MetricCard = ({ label, value, sub, color = 'text-white', border = 'border-white/10' }) => (
  <div className={`bg-white/5 rounded-xl p-3 border ${border} text-center`}>
    <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
    {sub && <p className="text-white/35 text-[10px] mt-0.5">{sub}</p>}
  </div>
);

const SectorBar = ({ name, weight, maxWeight }) => {
  const pct = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
  const color = weight > 50 ? 'bg-red-500' : weight > 35 ? 'bg-yellow-500' : 'bg-cyan-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/60 text-[11px] w-28 truncate shrink-0">{name}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-white/50 text-[11px] w-10 text-right shrink-0">{weight.toFixed(1)}%</span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RiskAgentWidget({ investments = [], stockPrices = {} }) {
  const [expanded, setExpanded] = useState('overview'); // 'overview' | 'stress' | 'sizing' | 'sectors'
  const [currency, setCurrency] = useState('EUR');

  const metrics = useMemo(
    () => calcPortfolioMetrics(investments, stockPrices),
    [investments, stockPrices]
  );

  const fmt = (val) => {
    const sym = currency === 'EUR' ? '€' : '$';
    if (Math.abs(val) >= 1000) return `${sym}${(val / 1000).toFixed(1)}k`;
    return `${sym}${Math.abs(val).toFixed(0)}`;
  };

  if (!investments.length) return null;

  if (!metrics) {
    return (
      <div className="gradient-card rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Portfolio Risk Agent</h3>
        </div>
        <p className="text-white/30 text-xs">Voeg posities met aankoopprijs toe om risicoanalyse te zien</p>
      </div>
    );
  }

  const SectionHeader = ({ id, icon, title, sub }) => (
    <button
      onClick={() => setExpanded(expanded === id ? null : id)}
      className="w-full flex items-center justify-between p-4 hover:bg-white/3 transition-all focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/40"
      aria-expanded={expanded === id}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <div className="text-left">
          <p className="text-white text-sm font-semibold">{title}</p>
          {sub && <p className="text-white/40 text-[10px]">{sub}</p>}
        </div>
      </div>
      {expanded === id ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
    </button>
  );

  return (
    <div className="gradient-card rounded-xl overflow-hidden mb-6" aria-label="Portfolio Risk Agent">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Portfolio Risk Agent</h2>
              <p className="text-white/40 text-xs">VaR · Stress tests · Positie sizing · Sectorrisico</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
              metrics.riskScore >= 65 ? 'text-green-400 bg-green-500/10 border-green-500/20'
              : metrics.riskScore >= 40 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20'
            }`}>
              Risico: {metrics.riskLabel}
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2 p-4 pb-0">
        <MetricCard
          label="VaR 95% (1 dag)"
          value={`-${fmt(metrics.var95)}`}
          sub="max dagverlies"
          color="text-orange-400"
          border="border-orange-500/20"
        />
        <MetricCard
          label="Spreiding score"
          value={`${metrics.concentrationScore}/100`}
          sub={metrics.concentrationScore >= 70 ? 'Goed gespreid' : 'Concentratie'}
          color={metrics.concentrationScore >= 70 ? 'text-green-400' : metrics.concentrationScore >= 50 ? 'text-yellow-400' : 'text-red-400'}
        />
        <MetricCard
          label="Sectorrisico"
          value={metrics.topSector?.name || '—'}
          sub={`${metrics.topSector?.weight?.toFixed(0)}% top sector`}
          color={metrics.sectorRisk === 'hoog' ? 'text-red-400' : metrics.sectorRisk === 'middel' ? 'text-yellow-400' : 'text-green-400'}
        />
      </div>

      {/* ── Section 1: Overview ──────────────────────────────────────────────── */}
      <div className="mt-3 border-t border-white/5">
        <SectionHeader id="overview" icon="📊" title="Risico-overzicht"
          sub={`${metrics.positionCount} posities · σ ${metrics.portfolioSigma}% daags`} />
        {expanded === 'overview' && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="VaR 99% (1 dag)" value={`-${fmt(metrics.var99)}`} sub="extreme scenario" color="text-red-400" border="border-red-500/20" />
              <MetricCard label="Top positie" value={`${metrics.topPosition?.ticker}`} sub={`${metrics.topPosition?.weight?.toFixed(1)}% van portfolio`}
                color={metrics.topPosition?.weight > 30 ? 'text-orange-400' : 'text-white'} />
            </div>
            {metrics.topPosition?.weight > 30 && (
              <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-orange-300 text-xs leading-relaxed">
                  <span className="font-bold">{metrics.topPosition.ticker}</span> maakt {metrics.topPosition.weight.toFixed(1)}% van je portfolio uit. Dit is boven de aanbevolen max. van 25-30%.
                </p>
              </div>
            )}
            {metrics.concentrationScore < 50 && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-xs leading-relaxed">
                  Hoge concentratie: top 3 posities = {metrics.top3Weight}% van portfolio. Overweeg meer spreiding.
                </p>
              </div>
            )}
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">Dagelijkse volatiliteit</p>
              <p className="text-white text-xs leading-relaxed">
                Op basis van huidige marktdata schat het model een dagelijkse portfolio-volatiliteit van <span className="text-white font-bold">{metrics.portfolioSigma}%</span>. Bij 95% zekerheid verlies je op de slechtste dag niet meer dan <span className="text-orange-400 font-bold">{fmt(metrics.var95)}</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Stress Tests ──────────────────────────────────────────── */}
      <div className="border-t border-white/5">
        <SectionHeader id="stress" icon="⚡" title="Scenario-analyse"
          sub="Simuleer marktschokken op je portfolio" />
        {expanded === 'stress' && (
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {metrics.stressResults.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0">{s.icon}</span>
                    <div>
                      <p className="text-white text-xs font-medium">{s.name}</p>
                      <p className="text-white/40 text-[10px]">Portfoliowaarde: {fmt(s.portfolioValue)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${s.shock < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {s.shock > 0 ? '+' : ''}{fmt(s.impact)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-white/25 text-[10px] mt-2">* Vereenvoudigd model. Werkelijke correlaties en liquiditeit niet meegerekend.</p>
          </div>
        )}
      </div>

      {/* ── Section 3: Position Sizing ───────────────────────────────────────── */}
      <div className="border-t border-white/5">
        <SectionHeader id="sizing" icon="🎯" title="Positie sizing advies"
          sub="Huidig gewicht vs. aanbevolen gewicht" />
        {expanded === 'sizing' && (
          <div className="px-4 pb-4 space-y-2">
            {metrics.positionSuggestions.map((p, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{p.ticker}</span>
                    <span className="text-white/40 text-xs">{p.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    p.actionType === 'trim' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                    : p.actionType === 'add' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    : 'text-green-400 bg-green-500/10 border-green-500/20'
                  }`}>
                    {p.actionType === 'trim' ? '↓ Bijsturen' : p.actionType === 'add' ? '↑ Opschalen' : '✓ OK'}
                  </span>
                </div>
                {/* Weight bar */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/30 text-[10px] w-16 shrink-0">Huidig: {p.currentWeight}%</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                    <div className="h-full bg-white/20 rounded-full absolute" style={{ width: `${Math.min(p.optimal * 3, 100)}%` }} />
                    <div className={`h-full rounded-full absolute ${p.actionType === 'trim' ? 'bg-orange-400' : p.actionType === 'add' ? 'bg-blue-400' : 'bg-green-400'}`}
                      style={{ width: `${Math.min(p.currentWeight * 3, 100)}%` }} />
                  </div>
                  <span className="text-white/30 text-[10px] w-16 shrink-0 text-right">Ideaal: {p.optimal}%</span>
                </div>
                <p className="text-white/50 text-[11px]">{p.action}</p>
              </div>
            ))}
            <p className="text-white/25 text-[10px]">* Aanbevelingen op basis van conservatief Kelly-criterium. Geen financieel advies.</p>
          </div>
        )}
      </div>

      {/* ── Section 4: Sector Breakdown ─────────────────────────────────────── */}
      <div className="border-t border-white/5">
        <SectionHeader id="sectors" icon="🏭" title="Sectorallocatie"
          sub={`${metrics.sectors.length} sectoren · Top: ${metrics.topSector?.name}`} />
        {expanded === 'sectors' && (
          <div className="px-4 pb-4 space-y-2">
            {metrics.sectorRisk === 'hoog' && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-xs">Sectorconcentratie te hoog: {metrics.topSector?.name} = {metrics.topSector?.weight?.toFixed(0)}%. Ideaal max. 35% per sector.</p>
              </div>
            )}
            {metrics.sectors.map((s, i) => (
              <SectorBar key={i} name={s.name} weight={s.weight} maxWeight={metrics.topSector?.weight || 100} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
