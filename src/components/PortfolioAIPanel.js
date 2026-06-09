import React, { useState } from 'react';
import { Bot, Loader2, AlertCircle, AlertTriangle, CheckCircle2, ArrowRight, PieChart, Target, Lightbulb } from 'lucide-react';
import { analyzePortfolio } from '../utils/aiDiscovery';

const scoreColor = (score) => {
  if (score >= 75) return 'text-green-300';
  if (score >= 55) return 'text-yellow-300';
  if (score >= 35) return 'text-orange-300';
  return 'text-red-300';
};

const scoreRing = (score) => {
  // 0..100 → 0..360 deg
  const deg = Math.max(0, Math.min(100, score)) * 3.6;
  const color = score >= 75 ? '#34d399' : score >= 55 ? '#fbbf24' : score >= 35 ? '#fb923c' : '#f87171';
  return {
    background: `conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.08) ${deg}deg)`,
  };
};

const priorityColor = (p) => {
  if (p === 'hoog') return 'bg-red-500/15 text-red-300 border-red-500/30';
  if (p === 'midden') return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  return 'bg-white/5 text-white/60 border-white/10';
};

const actionColor = (a) => {
  switch (a) {
    case 'verkopen': return 'bg-red-500/20 text-red-300';
    case 'verkleinen': return 'bg-orange-500/20 text-orange-300';
    case 'hedgen': return 'bg-purple-500/20 text-purple-300';
    case 'uitbreiden': return 'bg-blue-500/20 text-blue-300';
    case 'toevoegen': return 'bg-green-500/20 text-green-300';
    default: return 'bg-white/10 text-white/70';
  }
};

const PortfolioAIPanel = ({ investments = [], stockPrices = {}, onOpenAISettings, onSearchTheme }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [collapsed, setCollapsed] = useState(true);

  const run = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await analyzePortfolio({ investments, stockPrices });
      setAnalysis(result);
      setCollapsed(false);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  const snap = analysis?._snapshot;

  return (
    <div className="glass-effect rounded-xl border border-blue-500/20 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Portfolio AI</h3>
            <p className="text-white/40 text-[10px]">Diversificatie, concentratierisico en rebalance-acties</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {analysis && (
            <button onClick={() => setCollapsed(c => !c)} className="text-white/40 hover:text-white/70 text-xs">
              {collapsed ? 'Toon' : 'Verberg'}
            </button>
          )}
          <button
            onClick={run}
            disabled={loading || investments.length === 0}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            <span>{loading ? 'Analyseren...' : analysis ? 'Opnieuw' : 'Analyseer'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start space-x-2">
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

      {loading && !analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-lg bg-white/5 border border-white/5 animate-pulse" />)}
        </div>
      )}

      {analysis && !collapsed && (
        <div className="space-y-3">
          {/* Headline + score */}
          <div className="flex items-start space-x-3">
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0" style={scoreRing(analysis.diversification_score || 0)}>
              <div className="absolute inset-1.5 rounded-full bg-[#0a0a0f] flex flex-col items-center justify-center">
                <span className={`text-xl font-bold ${scoreColor(analysis.diversification_score || 0)}`}>
                  {Math.round(analysis.diversification_score || 0)}
                </span>
                <span className="text-white/40 text-[9px] uppercase tracking-wider">Diversif.</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-snug">{analysis.headline}</p>
              <div className="flex items-center space-x-2 mt-1.5 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                  analysis.risk_level === 'laag' ? 'bg-green-500/15 text-green-300 border-green-500/30' :
                  analysis.risk_level === 'hoog' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                  'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                }`}>
                  Risico: {analysis.risk_level || 'midden'}
                </span>
                {snap && (
                  <span className="text-white/40 text-[10px]">
                    {snap.positionCount} posities • €{Math.round(snap.totalValueEUR).toLocaleString('nl-NL')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Strengths */}
          {Array.isArray(analysis.strengths) && analysis.strengths.length > 0 && (
            <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-2.5">
              <p className="text-green-300 text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" /><span>Sterke punten</span>
              </p>
              <ul className="space-y-0.5">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="text-white/70 text-xs">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Concentration risks */}
          {Array.isArray(analysis.concentration_risks) && analysis.concentration_risks.length > 0 && (
            <div>
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-orange-300" /><span>Concentratierisico's</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {analysis.concentration_risks.map((r, i) => (
                  <div key={i} className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-semibold text-xs">{r.subject}</span>
                      <span className="text-orange-300 text-xs font-bold">{r.weight_pct != null ? Math.round(r.weight_pct) + '%' : ''}</span>
                    </div>
                    <p className="text-white/60 text-[11px] leading-snug">{r.why}</p>
                    <span className="text-white/30 text-[9px] uppercase">{r.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0 && (
            <div>
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Target className="w-3 h-3 text-blue-300" /><span>Aanbevelingen</span>
              </p>
              <div className="space-y-1.5">
                {analysis.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start space-x-2 bg-white/5 border border-white/10 rounded-lg p-2">
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${actionColor(s.action)}`}>{s.action}</span>
                    <span className="text-white font-semibold text-xs flex-shrink-0">{s.subject}</span>
                    <span className="text-white/70 text-[11px] flex-1 leading-snug">{s.rationale}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 ${priorityColor(s.priority)}`}>{s.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing exposure */}
          {Array.isArray(analysis.missing_exposure) && analysis.missing_exposure.length > 0 && (
            <div>
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <PieChart className="w-3 h-3 text-purple-300" /><span>Ontbrekende exposure</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missing_exposure.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => onSearchTheme && onSearchTheme(m)}
                    className="text-[11px] px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200 hover:bg-purple-500/20 transition-all flex items-center space-x-1"
                    title="Zoek met AI Discovery"
                  >
                    <span>{m}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next actions */}
          {Array.isArray(analysis.next_actions) && analysis.next_actions.length > 0 && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5">
              <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center space-x-1">
                <Lightbulb className="w-3 h-3" /><span>Volgende stappen</span>
              </p>
              <ol className="space-y-0.5 list-decimal list-inside">
                {analysis.next_actions.map((a, i) => (
                  <li key={i} className="text-white/80 text-xs">{a}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {!analysis && !loading && !error && (
        <p className="text-white/40 text-xs">
          Klik op <span className="text-blue-300 font-semibold">Analyseer</span> om je portfolio door AI te laten beoordelen op diversificatie, concentratierisico en rebalance-kansen.
        </p>
      )}
    </div>
  );
};

export default PortfolioAIPanel;
