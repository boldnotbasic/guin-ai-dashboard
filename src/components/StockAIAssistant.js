import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  MessageSquare, Search, Sun, BarChart2, Send, Loader2,
  Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  RefreshCw, Plus, Eye, ExternalLink, ChevronRight, Bot,
  X, Lightbulb, Target, Shield, Award, Clock
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VerdictBadge = ({ verdict, confidence }) => {
  const cfg = {
    kopen: { bg: 'bg-green-500/20 border-green-500/30 text-green-400', icon: <TrendingUp className="w-3 h-3" />, label: 'Kopen' },
    houden: { bg: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300', icon: <Target className="w-3 h-3" />, label: 'Houden' },
    verkopen: { bg: 'bg-red-500/20 border-red-500/30 text-red-400', icon: <TrendingDown className="w-3 h-3" />, label: 'Verkopen' },
  };
  const c = cfg[verdict] || cfg.houden;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${c.bg}`}>
      {c.icon} {c.label} {confidence != null && <span className="opacity-70">· {confidence}%</span>}
    </span>
  );
};

const MoodBadge = ({ mood }) => {
  const m = { bullish: '🟢', neutraal: '🟡', voorzichtig: '🔴' };
  return <span className="text-sm">{m[mood] || '🟡'} {mood}</span>;
};

const SectionCard = ({ section }) => (
  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
    <p className="text-white font-semibold text-sm mb-1.5">{section.title}</p>
    <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line">{section.content}</p>
  </div>
);

const STOPWORDS = new Set(['AI', 'ETF', 'RSI', 'SMA', 'EMA', 'AND', 'OR', 'NOT', 'THE', 'FOR', 'IS', 'VS', 'IN', 'OF', 'TO', 'A', 'AN', 'EEN', 'IS', 'DE', 'HET', 'UCITS']);

const extractTickers = (msg) => {
  const matches = msg.match(/\b([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\b/g) || [];
  return [...new Set(matches.filter(m => !STOPWORDS.has(m)))];
};

// Detect intent from user message
// NOTE: 'screener' mode is NEVER used from the chat assistant.
// The AI assistant is fully independent - it answers everything via GPT + live web search.
const detectIntent = (text) => {
  // Brief/Coach commands
  if (/(brief|morning|ochtend|dagelijkse|\/brief)/i.test(text)) return 'brief';
  if (/(coach|portfolio|spreiding|risico|beoordeel|\/coach)/i.test(text)) return 'coach';
  
  // Specific ticker mentioned → ticker analysis
  const tickers = extractTickers(text);
  if (tickers.length > 0) return 'ticker';
  
  // Everything else → market mode (GPT answers independently via web search)
  return 'market';
};

// Parse constraints from screener queries
const parseConstraints = (text) => {
  const constraints = {};
  
  // Price constraints
  const priceMatch = text.match(/onder €?([0-9]+)/i);
  if (priceMatch) constraints.maxPrice = parseInt(priceMatch[1]);
  const minPriceMatch = text.match(/boven €?([0-9]+)/i);
  if (minPriceMatch) constraints.minPrice = parseInt(minPriceMatch[1]);
  
  // Count
  const countMatch = text.match(/([0-9]+)\s*(beste|goede|top)/i) || text.match(/(top|beste)\s*([0-9]+)/i);
  if (countMatch) constraints.count = parseInt(countMatch[1] || countMatch[2]);
  
  // Keywords
  if (/dividend/i.test(text)) constraints.dividend = true;
  if (/etf/i.test(text)) constraints.etf = true;
  if (/groei/i.test(text)) constraints.growth = true;
  if (/laag risico|veilig/i.test(text)) constraints.lowRisk = true;
  if (/(tech|technologie|ai)/i.test(text)) constraints.sector = 'Technology';
  
  return constraints;
};

const QUICK_SUGGESTIONS = [
  { label: 'Geef 3 goede koper ETF\'s', icon: <Search className="w-3 h-3" />, category: 'screener' },
  { label: 'Wat is je advies voor VWCE.DE?', icon: <MessageSquare className="w-3 h-3" />, category: 'ticker' },
  { label: 'Waarom is de beurs negatief vandaag?', icon: <Target className="w-3 h-3" />, category: 'market' },
  { label: 'Beste AI aandelen onder €50', icon: <Search className="w-3 h-3" />, category: 'screener' },
  { label: 'Hoe is mijn portfolio spreiding?', icon: <BarChart2 className="w-3 h-3" />, category: 'coach' },
  { label: 'Genereer morning brief', icon: <Sun className="w-3 h-3" />, category: 'brief' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StockAIAssistant({
  investments = [],
  stockPrices = {},
  screenerData = {},
  myWatchlist = [],
  analystData = {},
  onAddToWatchlist,
  onRunBuyCheck,
  userApiKey,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
  };

  // ─── API call ────────────────────────────────────────────────────────────────
  const sendMessage = async (overrideInput) => {
    const text = (overrideInput || input).trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    addMessage({ role: 'user', content: text, timestamp: new Date().toISOString() });

    try {
      // Detect intent automatically
      const intent = detectIntent(text);
      const constraints = intent === 'screener' ? parseConstraints(text) : {};
      
      let body = { type: intent, message: text, apiKey: userApiKey, constraints };

      // For ticker mode: pre-fetch stock data
      if (intent === 'ticker') {
        const mentionedTickers = extractTickers(text);
        body.tickers = mentionedTickers;
        const snapshotData = {};
        await Promise.allSettled(mentionedTickers.map(async (t) => {
          try {
            if (stockPrices[t]?.current) {
              snapshotData[t] = stockPrices[t];
            } else {
              const r = await axios.get('/api/stock-price', { params: { ticker: t, range: '6mo', interval: '1d' } });
              snapshotData[t] = r.data;
            }
          } catch (e) { /* ticker not found */ }
        }));
        if (Object.keys(snapshotData).length > 0) body.snapshotData = snapshotData;
      }

      if (intent === 'screener') {
        const sdList = Object.entries(screenerData).map(([ticker, s]) => ({
          ticker, name: s.name, currentPrice: s.currentPrice, rsi: s.rsi,
          growth1mo: s.growth1mo, growth6mo: s.growth6mo, qualityScore: s.qualityScore,
          sector: s.sector, signal: s.signal?.overall,
        }));
        body.screenerData = sdList;
      }

      if (intent === 'brief' || intent === 'coach') {
        const portfolioWithPrices = investments.map(inv => ({
          ticker_symbol: inv.ticker_symbol,
          name: inv.name,
          sector: inv.sector,
          amount: inv.amount,
          shares: inv.shares,
          purchase_price: inv.purchase_price,
          currentValue: (() => {
            const sp = stockPrices[inv.ticker_symbol];
            const shares = Number(inv.shares) || 0;
            const price = sp?.current || 0;
            return shares > 0 && price > 0 ? shares * price : inv.amount || 0;
          })(),
          profitPercent: (() => {
            const sp = stockPrices[inv.ticker_symbol];
            const pp = Number(inv.purchase_price) || 0;
            const curr = sp?.current || 0;
            return pp > 0 && curr > 0 ? ((curr - pp) / pp) * 100 : null;
          })(),
          stockPrice: stockPrices[inv.ticker_symbol],
        }));
        body.portfolio = portfolioWithPrices;
        body.watchlist = myWatchlist.map(w => ({
          ticker: w.ticker,
          name: w.name,
          stockPrice: stockPrices[w.ticker],
        }));
      }

      const resp = await axios.post('/api/ai-stock-chat', body);
      const data = resp.data;

      addMessage({ 
        role: 'assistant', 
        type: data.type, 
        data,
        timestamp: new Date().toISOString(),
        intent
      });
    } catch (err) {
      addMessage({
        role: 'assistant', 
        type: 'error',
        content: err.response?.data?.error || err.message || 'Onbekende fout',
        timestamp: new Date().toISOString()
      });
    }
    setLoading(false);
  };


  // ─── Intent badge meta ─────────────────────────────────────────────────────
  const getIntentMeta = (msg) => {
    const rt = msg.data?.result?.responseType;
    if (msg.type === 'ticker') return { label: 'Ticker analyse', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <BarChart2 className="w-2.5 h-2.5" /> };
    if (msg.type === 'market') {
      if (rt === 'LIST') return { label: 'Aanbevelingen', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: <Sparkles className="w-2.5 h-2.5" /> };
      if (rt === 'MARKET_ANALYSIS') return { label: 'Marktanalyse', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: <TrendingUp className="w-2.5 h-2.5" /> };
      if (rt === 'COMPARE') return { label: 'Vergelijking', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <Target className="w-2.5 h-2.5" /> };
      return { label: 'Markt', color: 'text-white/40 bg-white/5 border-white/10', icon: <MessageSquare className="w-2.5 h-2.5" /> };
    }
    if (msg.type === 'brief') return { label: 'Morning Brief', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: <Sun className="w-2.5 h-2.5" /> };
    if (msg.type === 'coach') return { label: 'Portfolio Coach', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: <Award className="w-2.5 h-2.5" /> };
    if (msg.type === 'screener') return { label: 'Screener', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: <Search className="w-2.5 h-2.5" /> };
    return null;
  };

  // ─── Message renderers ────────────────────────────────────────────────────────

  const renderTickerResult = (msg) => {
    const { result, newsLinks } = msg.data;
    if (!result) return null;
    return (
      <div className="space-y-3 w-full">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {result.tickers?.map(t => (
              <span key={t} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs font-bold border border-blue-500/30">{t}</span>
            ))}
            {result.verdict && <VerdictBadge verdict={result.verdict} confidence={result.confidence} />}
          </div>
        </div>
        {/* One-liner */}
        {result.oneliner && (
          <p className="text-white/80 text-sm italic">"{result.oneliner}"</p>
        )}
        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {result.sections?.map((s, i) => <SectionCard key={i} section={s} />)}
        </div>
        {/* News citations */}
        {newsLinks?.length > 0 && (
          <div>
            <p className="text-white/40 text-[10px] mb-1.5 uppercase tracking-wider">Bronnen</p>
            <div className="flex flex-wrap gap-1.5">
              {newsLinks.map((n, i) => (
                <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-400/70 hover:text-blue-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 hover:border-blue-500/30 transition-all truncate max-w-[200px]">
                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{n.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {result.tickers?.map(t => (
            <React.Fragment key={t}>
              {onRunBuyCheck && (
                <button onClick={() => onRunBuyCheck(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs hover:bg-purple-500/30 transition-all">
                  <Sparkles className="w-3 h-3" /> AI Koop Analyse
                </button>
              )}
              {onAddToWatchlist && !myWatchlist.some(w => w.ticker === t) && (
                <button onClick={() => onAddToWatchlist({ ticker: t, name: t })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs hover:bg-yellow-500/30 transition-all">
                  <Eye className="w-3 h-3" /> Watchlist
                </button>
              )}
              <a href={`https://finance.yahoo.com/quote/${t}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:text-white hover:border-white/30 transition-all">
                <ExternalLink className="w-3 h-3" /> Yahoo Finance
              </a>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderMarketResult = (msg) => {
    const { result, newsLinks } = msg.data;
    if (!result) return null;

    // responseType drives layout — NEVER show stock picks for non-LIST responses
    const rt = result.responseType || 'GENERAL';
    const isList = rt === 'LIST';
    const sentimentDot = (s) => s === 'bullish' ? '🟢' : s === 'bearish' ? '🔴' : '🟡';
    const sources = (result.evidence?.length ? result.evidence : newsLinks || []).slice(0, 6);
    const hasDrivers = Array.isArray(result.drivers) && result.drivers.length > 0;
    const hasRisks = Array.isArray(result.risks) && result.risks.length > 0;

    return (
      <div className="space-y-3 w-full">

        {/* Summary answer — always shown first, prominent */}
        {result.answer && (
          <p className="text-white/88 text-sm leading-relaxed">{result.answer}</p>
        )}

        {/* MARKET_ANALYSIS / GENERAL: Drivers + Risks grid */}
        {!isList && (hasDrivers || hasRisks) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {hasDrivers && (
              <div className="bg-white/5 rounded-xl p-3 border border-green-500/20">
                <p className="text-green-400 text-[11px] font-semibold mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Drijvende factoren
                </p>
                <ul className="space-y-1.5">
                  {result.drivers.map((item, i) => (
                    <li key={i} className="text-white/70 text-xs flex gap-2">
                      <span className="text-green-400/50 shrink-0 mt-0.5">›</span><span className="text-white/70">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hasRisks && (
              <div className="bg-white/5 rounded-xl p-3 border border-red-500/20">
                <p className="text-red-400 text-[11px] font-semibold mb-2 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Risico's & zorgen
                </p>
                <ul className="space-y-1.5">
                  {result.risks.map((item, i) => (
                    <li key={i} className="text-white/70 text-xs flex gap-2">
                      <span className="text-red-400/50 shrink-0 mt-0.5">›</span><span className="text-white/70">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* COMPARE / GENERAL sections */}
        {Array.isArray(result.sections) && result.sections.length > 0 && (
          <div className="space-y-2">
            {result.sections.map((s, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-white font-semibold text-sm mb-1">{s.title}</p>
                <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line">{s.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* LIST: numbered stock picks — ONLY when responseType === 'LIST' */}
        {isList && Array.isArray(result.topPicks) && result.topPicks.length > 0 && (
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">
              {result.topPicks.length} Aanbevelingen
            </p>
            <div className="space-y-2">
              {result.topPicks.map((p, i) => (
                <div key={i} className="bg-white/5 rounded-xl border border-white/10 px-3 py-2.5 hover:border-purple-500/30 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-white/25 text-xs mt-0.5 w-4 shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white font-bold text-sm">{p.ticker}</span>
                          {p.name && <span className="text-white/50 text-xs truncate">{p.name}</span>}
                          {p.sector && (
                            <span className="text-purple-400/70 text-[10px] bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 shrink-0">
                              {p.sector}
                            </span>
                          )}
                          {p.sentiment && <span className="text-[11px] shrink-0">{sentimentDot(p.sentiment)}</span>}
                        </div>
                        {p.reason && <p className="text-white/60 text-xs leading-relaxed">{p.reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={'https://finance.yahoo.com/quote/' + p.ticker} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all focus-visible:ring-2 focus-visible:ring-blue-500/50"
                        aria-label={`Open ${p.ticker} op Yahoo Finance`}>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {onRunBuyCheck && (
                        <button onClick={() => onRunBuyCheck(p.ticker)}
                          className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50"
                          aria-label={`AI koop analyse ${p.ticker}`}>
                          <Sparkles className="w-3 h-3" />
                        </button>
                      )}
                      {onAddToWatchlist && !myWatchlist.some(w => w.ticker === p.ticker) && (
                        <button onClick={() => onAddToWatchlist({ ticker: p.ticker, name: p.name || p.ticker })}
                          className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all focus-visible:ring-2 focus-visible:ring-yellow-500/50"
                          aria-label={`Voeg ${p.ticker} toe aan watchlist`}>
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Verdict only for list */}
            {result.verdict && result.verdict !== 'neutraal' && (
              <div className="mt-2">
                <VerdictBadge verdict={result.verdict} confidence={result.confidence} />
              </div>
            )}
          </div>
        )}

        {/* Follow-up question pills */}
        {Array.isArray(result.followUpQuestions) && result.followUpQuestions.length > 0 && (
          <div>
            <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1.5">Dieper ingaan op</p>
            <div className="flex flex-wrap gap-1.5">
              {result.followUpQuestions.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div>
            <p className="text-white/35 text-[10px] uppercase tracking-wider mb-1.5">Bronnen</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((n, i) => (
                <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-400/60 hover:text-blue-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 hover:border-blue-500/30 transition-all truncate max-w-[220px] focus-visible:ring-2 focus-visible:ring-blue-500/50">
                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{n.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScreenerResult = (msg) => {
    const { result } = msg.data;
    if (!result) return null;
    return (
      <div className="space-y-3 w-full">
        <p className="text-white/80 text-sm leading-relaxed">{result.answer}</p>
        {result.topPicks?.length > 0 && (
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Top picks</p>
            <div className="space-y-1.5">
              {result.topPicks.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 text-xs">#{i + 1}</span>
                    <span className="text-white font-bold text-sm">{p.ticker}</span>
                    <span className="text-white/60 text-xs">{p.reason}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onRunBuyCheck && (
                      <button onClick={() => onRunBuyCheck(p.ticker)}
                        className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all">
                        <Sparkles className="w-3 h-3" />
                      </button>
                    )}
                    {onAddToWatchlist && !myWatchlist.some(w => w.ticker === p.ticker) && (
                      <button onClick={() => onAddToWatchlist({ ticker: p.ticker, name: p.ticker })}
                        className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all">
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {result.filters && (
          <p className="text-white/30 text-[10px]">Filters: {result.filters}</p>
        )}
      </div>
    );
  };

  const renderBriefResult = (msg) => {
    const { result } = msg.data;
    if (!result) return null;
    const highlightIcon = (type) => type === 'winner' ? '🟢' : type === 'loser' ? '🔴' : '🔔';
    return (
      <div className="space-y-3 w-full">
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
          <p className="text-white/90 text-sm leading-relaxed">{result.greeting}</p>
          <div className="mt-2"><MoodBadge mood={result.mood} /></div>
        </div>
        {result.highlights?.length > 0 && (
          <div className="space-y-1.5">
            {result.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5 text-xs">
                <span>{highlightIcon(h.type)}</span>
                <span className="text-white font-semibold">{h.ticker}</span>
                <span className="text-white/60">{h.message}</span>
              </div>
            ))}
          </div>
        )}
        {result.focus && (
          <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
            <p className="text-blue-300 text-xs font-semibold mb-0.5 flex items-center gap-1.5"><Eye className="w-3 h-3" /> Focus vandaag</p>
            <p className="text-white/70 text-xs">{result.focus}</p>
          </div>
        )}
        {result.tip && (
          <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
            <p className="text-purple-300 text-xs font-semibold mb-0.5 flex items-center gap-1.5"><Lightbulb className="w-3 h-3" /> Tip van de dag</p>
            <p className="text-white/70 text-xs">{result.tip}</p>
          </div>
        )}
      </div>
    );
  };

  const renderCoachResult = (msg) => {
    const { result } = msg.data;
    if (!result) return null;
    const priorityColor = (p) => p === 'hoog' ? 'text-red-400' : p === 'middel' ? 'text-yellow-400' : 'text-blue-400';
    return (
      <div className="space-y-3 w-full">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white/5 rounded-xl px-4 py-2 border border-white/10 text-center">
            <p className="text-white/40 text-[10px]">Portfolio score</p>
            <p className={`text-2xl font-bold ${result.score >= 70 ? 'text-green-400' : result.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{result.score}</p>
          </div>
          <div className="bg-white/5 rounded-xl px-4 py-2 border border-white/10 text-center">
            <p className="text-white/40 text-[10px]">Spreiding score</p>
            <p className={`text-2xl font-bold ${result.diversificationScore >= 70 ? 'text-green-400' : result.diversificationScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{result.diversificationScore}</p>
          </div>
        </div>
        <p className="text-white/80 text-sm">{result.summary}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {result.strengths?.length > 0 && (
            <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
              <p className="text-green-400 text-xs font-semibold mb-1.5 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sterktes</p>
              <ul className="space-y-1">{result.strengths.map((s, i) => <li key={i} className="text-white/70 text-xs flex gap-1.5"><span className="text-green-400/60">•</span>{s}</li>)}</ul>
            </div>
          )}
          {result.risks?.length > 0 && (
            <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
              <p className="text-red-400 text-xs font-semibold mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Risico's</p>
              <ul className="space-y-1">{result.risks.map((r, i) => <li key={i} className="text-white/70 text-xs flex gap-1.5"><span className="text-red-400/60">•</span>{r}</li>)}</ul>
            </div>
          )}
        </div>
        {result.actions?.length > 0 && (
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Aanbevolen acties</p>
            <div className="space-y-1.5">
              {result.actions.map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${priorityColor(a.priority)}`}>{a.priority}</span>
                    <span className="text-white/70 text-xs">{a.action}</span>
                  </div>
                  {a.ticker && onRunBuyCheck && (
                    <button onClick={() => onRunBuyCheck(a.ticker)}
                      className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all">
                      <Sparkles className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {result.comment && (
          <p className="text-white/50 text-xs italic border-l-2 border-purple-500/40 pl-3">{result.comment}</p>
        )}
      </div>
    );
  };

  const renderMessage = (msg, i) => {
    if (msg.role === 'user') {
      return (
        <div key={i} className="flex justify-end">
          <div className="bg-purple-600/30 border border-purple-500/30 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
            <p className="text-white text-sm">{msg.content}</p>
          </div>
        </div>
      );
    }

    if (msg.type === 'error') {
      return (
        <div key={i} className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl rounded-tl-sm px-4 py-2.5 flex-1">
            <p className="text-red-400 text-sm">{msg.content}</p>
          </div>
        </div>
      );
    }

    const meta = getIntentMeta(msg);
    return (
      <div key={i} className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Intent badge + timestamp */}
          {meta && (
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                {meta.icon} {meta.label}
              </span>
              {msg.timestamp && (
                <span className="text-white/20 text-[10px]">
                  {new Date(msg.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
          {msg.type === 'ticker' && renderTickerResult(msg)}
          {msg.type === 'market' && renderMarketResult(msg)}
          {msg.type === 'screener' && renderScreenerResult(msg)}
          {msg.type === 'brief' && renderBriefResult(msg)}
          {msg.type === 'coach' && renderCoachResult(msg)}
          {msg.type === 'text' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <p className="text-white/80 text-sm">{msg.content}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── UI helpers ──────────────────────────────────────────────────────────────

  return (
    <div className="gradient-card rounded-xl overflow-hidden mb-6">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Guin AI Scout</h2>
              <p className="text-white/40 text-xs">Stel elke vraag over aandelen, ETF's, markten of je portfolio</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-green-500/20 border border-green-500/30 rounded-full px-2 py-0.5">
              <span className="text-green-400 text-[10px] font-bold">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[420px] overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 border border-white/10">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-white font-semibold text-base mb-2">Welkom bij Guin AI Scout</p>
            <p className="text-white/50 text-sm mb-6 max-w-md">Stel elke vraag over aandelen, ETF's, markten of je portfolio. Ik detecteer automatisch wat je nodig hebt.</p>
            
            {/* Quick suggestions grid */}
            <div className="grid grid-cols-2 gap-2 max-w-lg">
              {QUICK_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.label)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition-all text-left group"
                >
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                    {s.icon}
                  </div>
                  <span className="text-xs flex-1">{s.label}</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-white/30 text-xs">
              <Lightbulb className="w-3 h-3" />
              <span>Tip: Vraag gewoon wat je wilt weten, ik begrijp je vanzelf</span>
            </div>
          </div>
        )}

        {messages.map((msg, i) => renderMessage(msg, i))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-white/50 text-sm">
                {(() => {
                  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
                  if (/(brief|morning|ochtend)/i.test(lastUserMsg)) return 'Briefing samenstellen...';
                  if (/(coach|portfolio|spreiding)/i.test(lastUserMsg)) return 'Portfolio analyseren...';
                  if (/[A-Z]{2,5}(?:\.[A-Z]{1,2})?/.test(lastUserMsg)) return 'Aandeel opzoeken...';
                  return 'Nieuws ophalen & analyseren...';
                })()}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions row (when there are messages) */}
      {messages.length > 0 && (
        <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
          {QUICK_SUGGESTIONS.slice(0, 3).map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s.label)}
              className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:border-purple-500/40 transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Stel elke vraag... bijv. 'Geef 3 goede koper ETF's' of 'Wat is je advies voor VWCE.DE?'"
            disabled={loading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white hover:opacity-90 transition-all disabled:opacity-40 flex-shrink-0 shadow-lg shadow-purple-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {!userApiKey && (
          <p className="text-amber-400/60 text-[10px] mt-1 text-center flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3" /> Geen API-sleutel ingesteld — open instellingen om GPT te activeren
          </p>
        )}
        <p className="text-white/20 text-[10px] mt-1 text-center">AI-analyses zijn informatief, geen beleggingsadvies • Powered by GPT-4</p>
      </div>
    </div>
  );
}
