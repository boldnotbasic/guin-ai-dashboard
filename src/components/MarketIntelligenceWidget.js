import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Newspaper, TrendingUp, User, Brain, RefreshCw, ExternalLink, Settings, X, Plus, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (ts) => {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'zojuist';
  if (diff < 3600) return `${Math.floor(diff / 60)}m geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}u geleden`;
  return `${Math.floor(diff / 86400)}d geleden`;
};

const impactColor = (impact) => {
  if (!impact) return 'text-white/40 border-white/20 bg-white/5';
  if (impact === 'bullish') return 'text-green-400 border-green-500/30 bg-green-500/10';
  if (impact === 'bearish') return 'text-red-400 border-red-500/30 bg-red-500/10';
  return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
};

const urgencyDot = (urgency) => {
  if (urgency === 'hoog') return 'bg-red-400 animate-pulse';
  if (urgency === 'middel') return 'bg-yellow-400';
  return 'bg-white/30';
};

const sourceIcon = (source) => {
  if (source === 'reddit') return '🔴';
  if (source === 'twitter' || source === 'x') return '🐦';
  if (source === 'news') return '📰';
  return '📊';
};

const moodColor = (mood) => {
  if (mood === 'risk-on') return 'text-green-400 bg-green-500/10 border-green-500/20';
  if (mood === 'risk-off') return 'text-red-400 bg-red-500/10 border-red-500/20';
  return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
};

const SourceBadge = ({ source }) => (
  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/30">
    {sourceIcon(source)} {source}
  </span>
);

const TrendBadge = ({ score }) => {
  const level = score >= 60 ? { label: 'Heet', color: 'text-red-400 bg-red-500/10 border-red-500/20' }
    : score >= 30 ? { label: 'Trending', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' }
    : { label: 'Actief', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${level.color}`}>
      {level.label}
    </span>
  );
};

const platformEmoji = (p) => {
  const k = String(p || '').toLowerCase();
  if (k === 'x' || k === 'twitter') return '🐦';
  if (k === 'reddit') return '🔴';
  if (k === 'youtube') return '▶️';
  if (k === 'substack') return '📬';
  if (k === 'website') return '🌐';
  return '👤';
};

const buildInfluencerUrl = ({ platform, handle, url }) => {
  if (url) return url;
  const h = String(handle || '').replace(/^@/, '');
  const p = String(platform || 'x').toLowerCase();
  if (p === 'x' || p === 'twitter') return `https://twitter.com/${h}`;
  if (p === 'reddit') return `https://reddit.com/u/${h}`;
  if (p === 'youtube') return `https://www.youtube.com/@${h}`;
  if (p === 'substack') return `https://${h}.substack.com/`;
  if (p === 'website') return h.startsWith('http') ? h : `https://${h}`;
  return `https://twitter.com/${h}`;
};

// ─── Default Settings ─────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  subreddits: ['wallstreetbets', 'stocks', 'investing', 'SecurityAnalysis'],
  influencers: [],
  customInfluencers: [],
  skipAI: false
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketIntelligenceWidget({ investments = [], watchlist = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('briefing');
  const [activeSource, setActiveSource] = useState('portfolio');
  const [expandedItem, setExpandedItem] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('market_intel_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  useEffect(() => {
    localStorage.setItem('market_intel_settings', JSON.stringify(settings));
  }, [settings]);

  const getTickers = useCallback(() => {
    const src = activeSource === 'portfolio' ? investments : watchlist;
    return src.map(i => i.ticker_symbol || i.ticker).filter(Boolean).slice(0, 10);
  }, [activeSource, investments, watchlist]);

  const load = useCallback(async () => {
    const tickers = getTickers();
    if (!tickers.length) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        tickers: tickers.join(','),
        subreddits: (settings.subreddits || []).join(','),
        influencers: (settings.influencers || []).join(','),
        skipAI: settings.skipAI ? 'true' : 'false'
      });
      const r = await fetch(`/api/market-intelligence?${params}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getTickers, settings]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    const onVisibility = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); };
  }, [load]);

  const TABS = [
    { id: 'briefing', label: 'AI Briefing', icon: Brain },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'news', label: 'Nieuws', icon: Newspaper },
    { id: 'influencers', label: 'Influencers', icon: User },
  ];

  return (
    <div className="gradient-card rounded-xl overflow-hidden mb-6" aria-label="Market Intelligence Hub">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Market Intelligence</h2>
              <p className="text-white/40 text-xs">
                Reddit · X/Twitter · Nieuws · AI Analyse
                {lastUpdated && ` · ${timeAgo(lastUpdated)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Source indicator dots */}
            {data?.sources && (
              <div className="flex items-center gap-1 mr-2">
                <span title={`Reddit: ${data.sources.reddit?.count || 0} posts`}
                  className={`w-2 h-2 rounded-full ${data.sources.reddit?.available ? 'bg-orange-400' : 'bg-white/10'}`} />
                <span title={`X/Twitter: ${data.sources.twitter?.available ? 'actief' : 'inactief'}`}
                  className={`w-2 h-2 rounded-full ${data.sources.twitter?.available ? 'bg-blue-400' : 'bg-white/10'}`} />
                <span title={`Nieuws: ${data.sources.news?.count || 0} items`}
                  className={`w-2 h-2 rounded-full ${data.sources.news?.available ? 'bg-green-400' : 'bg-white/10'}`} />
              </div>
            )}
            <button onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
              title="Instellingen">
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button onClick={load} disabled={loading}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Source tabs: Portfolio / Watchlist */}
        <div className="flex gap-1.5 mb-3">
          {['portfolio', 'watchlist'].map(src => (
            <button key={src} onClick={() => setActiveSource(src)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                activeSource === src ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
              }`}>
              {src === 'portfolio' ? 'Portfolio' : 'Watchlist'}
            </button>
          ))}
        </div>

        {/* Main tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  activeTab === tab.id
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-300'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                }`}>
                <Icon className="w-3 h-3" />
                {tab.label}
                {tab.id === 'influencers' && data?.influencerAlerts?.length > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {data.influencerAlerts.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skeleton */}
      {loading && !data && (
        <div className="p-4 space-y-3" aria-busy="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="divide-y divide-white/5">

          {/* ── Tab: AI Briefing ───────────────────────────────────────────── */}
          {activeTab === 'briefing' && (
            <div className="p-4 space-y-3">
              {data.aiBriefing ? (
                <>
                  {/* Headline */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${moodColor(data.aiBriefing.marketMood)}`}>
                    <Brain className="w-3.5 h-3.5 shrink-0" />
                    <p className="text-sm font-medium">{data.aiBriefing.headline}</p>
                    <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border ${moodColor(data.aiBriefing.marketMood)}`}>
                      {data.aiBriefing.marketMood}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-white/60 text-xs leading-relaxed px-1">{data.aiBriefing.summary}</p>

                  {/* Key Stories */}
                  {(data.aiBriefing.keyStories || []).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Key Stories</p>
                      {data.aiBriefing.keyStories.map((story, i) => (
                        <div key={i} className={`rounded-xl p-3 border ${impactColor(story.impact)}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm">{story.ticker}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${urgencyDot(story.urgency)}`} />
                            <SourceBadge source={story.source} />
                            <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${impactColor(story.impact)}`}>
                              {story.impact}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed opacity-90">{story.title}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Top Opportunity & Risk */}
                  <div className="grid grid-cols-2 gap-2">
                    {data.aiBriefing.topOpportunity && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                        <p className="text-green-400 text-[10px] uppercase tracking-wider mb-1">🎯 Kans</p>
                        <p className="text-white font-bold text-sm">{data.aiBriefing.topOpportunity.ticker}</p>
                        <p className="text-white/50 text-xs mt-0.5">{data.aiBriefing.topOpportunity.reason}</p>
                      </div>
                    )}
                    {data.aiBriefing.topRisk && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        <p className="text-red-400 text-[10px] uppercase tracking-wider mb-1">⚠️ Risico</p>
                        <p className="text-white font-bold text-sm">{data.aiBriefing.topRisk.ticker}</p>
                        <p className="text-white/50 text-xs mt-0.5">{data.aiBriefing.topRisk.reason}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <Brain className="w-8 h-8 text-white/20 mx-auto" />
                  <p className="text-white/40 text-sm">AI Briefing niet beschikbaar</p>
                  <p className="text-white/25 text-xs">Voeg OPENAI_API_KEY toe om AI analyse te activeren</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Trending Tickers ──────────────────────────────────────── */}
          {activeTab === 'trending' && (
            <div className="divide-y divide-white/5">
              {(data.trending || []).filter(t => t.score > 0).slice(0, 10).map((item, i) => (
                <div key={item.ticker}>
                  <button
                    onClick={() => setExpandedItem(expandedItem === item.ticker ? null : item.ticker)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-all text-left"
                  >
                    <span className="text-white/20 text-xs w-4 shrink-0">{i + 1}</span>
                    <span className="text-white font-bold text-sm w-14 shrink-0">{item.ticker}</span>
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      {item.signals.slice(0, 2).map((sig, j) => (
                        <span key={j} className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{sig}</span>
                      ))}
                    </div>
                    <TrendBadge score={item.score} />
                    {expandedItem === item.ticker ? <ChevronUp className="w-3 h-3 text-white/30" /> : <ChevronDown className="w-3 h-3 text-white/30" />}
                  </button>

                  {expandedItem === item.ticker && (
                    <div className="px-4 pb-3 space-y-2">
                      {item.influencerMentions.length > 0 && (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                          <p className="text-purple-300 text-[10px] uppercase tracking-wider mb-1">👤 Influencer Mention</p>
                          {item.influencerMentions.map((t, j) => (
                            <p key={j} className="text-white/60 text-xs">@{t.author}: {t.text.slice(0, 100)}...</p>
                          ))}
                        </div>
                      )}
                      {item.topNews.slice(0, 2).map((n, j) => (
                        <a key={j} href={n.link} target="_blank" rel="noopener noreferrer"
                          className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                          <span className="text-xs shrink-0">📰</span>
                          <p className="text-white/70 text-xs leading-relaxed flex-1">{n.title}</p>
                          <ExternalLink className="w-3 h-3 text-white/20 shrink-0 mt-0.5" />
                        </a>
                      ))}
                      {item.topReddit.slice(0, 2).map((p, j) => (
                        <a key={j} href={p.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                          <span className="text-xs shrink-0">🔴</span>
                          <p className="text-white/70 text-xs leading-relaxed flex-1">{p.title}</p>
                          <span className="text-white/30 text-[9px] shrink-0">↑{p.score}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(data.trending || []).filter(t => t.score === 0).length === (data.trending || []).length && (
                <div className="p-4 text-center">
                  <p className="text-white/30 text-xs">Geen trending activiteit gevonden voor je portfolio</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Nieuws ────────────────────────────────────────────────── */}
          {activeTab === 'news' && (
            <div className="divide-y divide-white/5">
              {(data.news || []).slice(0, 15).map((item, i) => (
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-all group">
                  <span className="text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded shrink-0 mt-0.5">
                    {item.ticker}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-xs leading-relaxed group-hover:text-white transition-colors">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white/30 text-[10px]">{item.source}</span>
                      <span className="text-white/20 text-[10px]">·</span>
                      <span className="text-white/30 text-[10px]">{timeAgo(item.created)}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/40 shrink-0 mt-0.5 transition-colors" />
                </a>
              ))}
              {!data.news?.length && (
                <div className="p-4 text-center">
                  <p className="text-white/30 text-xs">Geen nieuws beschikbaar</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Influencers ───────────────────────────────────────────── */}
          {activeTab === 'influencers' && (
            <div>
              {(settings.customInfluencers?.length > 0 || settings.influencers?.length > 0) && (
                <div className="p-4 border-b border-white/5">
                  <p className="text-white/40 text-xs mb-2">Jouw influencers</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {(settings.customInfluencers || []).map((inf, i) => (
                      <a key={`ci-${i}`} href={buildInfluencerUrl(inf)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                        <span className="text-base">{platformEmoji(inf.platform)}</span>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-semibold truncate">@{String(inf.handle || '')}</p>
                          <p className="text-white/40 text-[10px] truncate">{String(inf.platform || 'x').toUpperCase()}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-white/20 ml-auto" />
                      </a>
                    ))}
                    {(settings.influencers || []).map((h, i) => (
                      <a key={`x-${i}`} href={`https://twitter.com/${String(h).replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                        <span className="text-base">🐦</span>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-semibold truncate">@{String(h).replace(/^@/, '')}</p>
                          <p className="text-white/40 text-[10px] truncate">X</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-white/20 ml-auto" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {/* AI Summary Section */}
              {data.influencerSummary && (
                <div className="p-4 border-b border-white/5 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-3.5 h-3.5 text-violet-400" />
                    <p className="text-white font-medium text-sm">AI Samenvatting</p>
                  </div>
                  
                  <p className="text-white/70 text-xs leading-relaxed">{data.influencerSummary.summary}</p>
                  
                  {data.influencerSummary.keyTopics?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {data.influencerSummary.keyTopics.map((topic, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {data.influencerSummary.marketSentiment && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-[10px]">Marktsentiment:</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        data.influencerSummary.marketSentiment === 'bullish' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                        data.influencerSummary.marketSentiment === 'bearish' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                        'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                      }`}>
                        {data.influencerSummary.marketSentiment}
                      </span>
                    </div>
                  )}
                  
                  {data.influencerSummary.notableMentions?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Opvallende Posts</p>
                      {data.influencerSummary.notableMentions.map((mention, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-violet-400 font-medium">@{mention.influencer}</span>
                          <span className="text-white/50">over {mention.topic}</span>
                          <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded ${
                            mention.impact === 'hoog' ? 'bg-red-500/20 text-red-300' :
                            mention.impact === 'middel' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-white/10 text-white/40'
                          }`}>
                            {mention.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Ticker Alerts Section */}
              {data.influencerAlerts?.length > 0 && (
                <div className="border-b border-white/5">
                  <div className="px-4 py-2 bg-violet-500/5 border-b border-violet-500/10">
                    <p className="text-violet-300 text-xs font-medium">📈 Ticker Alerts ({data.influencerAlerts.length})</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {data.influencerAlerts.map((tweet, i) => (
                      <a key={i} href={tweet.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-all group">
                        <div className="shrink-0">
                          <p className="text-white font-bold text-xs">@{tweet.author}</p>
                          {tweet.verified && <span className="text-blue-400 text-[9px]">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-xs leading-relaxed">{tweet.text}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {tweet.tickers.map(t => (
                              <span key={t} className="text-violet-400 text-[10px] font-bold">${t}</span>
                            ))}
                            <span className="text-white/25 text-[10px]">❤️ {tweet.likes}</span>
                            <span className="text-white/25 text-[10px]">🔁 {tweet.retweets}</span>
                            <span className="text-white/25 text-[10px] ml-auto">{timeAgo(tweet.created)}</span>
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-white/20 shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Timeline Section */}
              {data.influencerTimeline?.length > 0 ? (
                <div>
                  <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                    <p className="text-white/50 text-xs font-medium">Volledige Timeline</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {data.influencerTimeline.map((tweet, i) => (
                      <a key={i} href={tweet.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-all group">
                        <div className="shrink-0">
                          <p className="text-white font-bold text-xs">@{tweet.author}</p>
                          {tweet.verified && <span className="text-blue-400 text-[9px]">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/60 text-xs leading-relaxed">{tweet.text}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {tweet.tickers.length > 0 && (
                              <div className="flex gap-1">
                                {tweet.tickers.map(t => (
                                  <span key={t} className="text-violet-400 text-[10px] font-bold">${t}</span>
                                ))}
                              </div>
                            )}
                            <span className="text-white/25 text-[10px]">❤️ {tweet.likes}</span>
                            <span className="text-white/25 text-[10px]">🔁 {tweet.retweets}</span>
                            <span className="text-white/25 text-[10px] ml-auto">{timeAgo(tweet.created)}</span>
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-white/20 shrink-0 mt-0.5" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-2">
                  <User className="w-8 h-8 text-white/20 mx-auto" />
                  {settings.influencers?.length === 0 ? (
                    <>
                      <p className="text-white/40 text-sm">Geen influencers ingesteld</p>
                      <button onClick={() => setShowSettings(true)}
                        className="text-violet-400 text-xs hover:text-violet-300 transition-colors">
                        → Voeg influencers toe in instellingen
                      </button>
                    </>
                  ) : (
                    <p className="text-white/30 text-xs">Geen recente posts van gevolgde influencers</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings Modal — rendered via portal so overflow-hidden doesn't clip */}
      {showSettings && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-xl max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold text-base">Market Intelligence Instellingen</h3>
              <button onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Reddit */}
              <div className="space-y-2">
                <p className="text-white font-medium text-sm">🔴 Reddit Subreddits</p>
                <div className="flex flex-wrap gap-2">
                  {(settings.subreddits || []).map((sub, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs">
                      r/{sub}
                      <button onClick={() => setSettings(prev => ({ ...prev, subreddits: prev.subreddits.filter((_, idx) => idx !== i) }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button onClick={() => {
                    const val = prompt('Subreddit (zonder r/):');
                    if (val?.trim()) setSettings(prev => ({ ...prev, subreddits: [...(prev.subreddits || []), val.trim()] }));
                  }} className="px-2 py-1 rounded border border-dashed border-white/20 text-white/40 text-xs hover:text-white/60">
                    <Plus className="w-3 h-3 inline mr-1" /> Toevoegen
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['wallstreetbets', 'stocks', 'investing', 'SecurityAnalysis', 'options', 'ValueInvesting'].map(s => (
                    <button key={s} disabled={(settings.subreddits || []).includes(s)}
                      onClick={() => setSettings(prev => ({ ...prev, subreddits: [...(prev.subreddits || []), s] }))}
                      className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/60 disabled:opacity-30">
                      r/{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Influencers */}
              <div className="space-y-2">
                <p className="text-white font-medium text-sm">🐦 X/Twitter Influencers</p>
                <div className="flex flex-wrap gap-2">
                  {(settings.influencers || []).map((inf, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                      @{inf}
                      <button onClick={() => setSettings(prev => ({ ...prev, influencers: prev.influencers.filter((_, idx) => idx !== i) }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button onClick={() => {
                    const val = prompt('X username (zonder @):');
                    if (val?.trim()) setSettings(prev => ({ ...prev, influencers: [...(prev.influencers || []), val.trim().replace('@', '')] }));
                  }} className="px-2 py-1 rounded border border-dashed border-white/20 text-white/40 text-xs hover:text-white/60">
                    <Plus className="w-3 h-3 inline mr-1" /> Toevoegen
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['elonmusk', 'chamath', 'cathiedwood', 'michael_saylor', 'naval', 'RayDalio', 'peterthiel'].map(s => (
                    <button key={s} disabled={(settings.influencers || []).includes(s)}
                      onClick={() => setSettings(prev => ({ ...prev, influencers: [...(prev.influencers || []), s] }))}
                      className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 text-xs hover:text-white/60 disabled:opacity-30">
                      @{s}
                    </button>
                  ))}
                </div>
                <p className="text-white/30 text-[10px]">X API key vereist voor influencer feed</p>
              </div>

              <div className="space-y-2">
                <p className="text-white font-medium text-sm">⭐ Mijn Influencers (klikbare profielen)</p>
                <div className="flex flex-wrap gap-2">
                  {(settings.customInfluencers || []).map((inf, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70 text-xs">
                      {platformEmoji(inf.platform)} @{String(inf.handle || '')}
                      <button onClick={() => setSettings(prev => ({ ...prev, customInfluencers: prev.customInfluencers.filter((_, idx) => idx !== i) }))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button onClick={() => {
                    const handle = prompt('Gebruikersnaam (zonder @):');
                    if (!handle?.trim()) return;
                    const platform = prompt('Platform (x, reddit, youtube, substack, website):', 'x');
                    if (!platform?.trim()) return;
                    let url = '';
                    if (String(platform).toLowerCase() === 'website') {
                      url = prompt('Volledige URL (https://...):', 'https://') || '';
                    }
                    const entry = { platform: String(platform).trim().toLowerCase(), handle: String(handle).trim().replace('@','') };
                    if (url && url.startsWith('http')) entry.url = url;
                    setSettings(prev => ({ ...prev, customInfluencers: [...(prev.customInfluencers || []), entry] }));
                  }} className="px-2 py-1 rounded border border-dashed border-white/20 text-white/40 text-xs hover:text-white/60">
                    <Plus className="w-3 h-3 inline mr-1" /> Toevoegen
                  </button>
                </div>
                <p className="text-white/30 text-[10px]">Klik op een tegel om het profiel te openen. Geen API vereist.</p>
              </div>

              {/* AI Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">🧠 AI Briefing (GPT)</p>
                  <p className="text-white/40 text-xs">Vereist OpenAI API key</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={!settings.skipAI}
                    onChange={e => setSettings(prev => ({ ...prev, skipAI: !e.target.checked }))}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 border-t border-white/10">
              <p className="text-white/30 text-xs">Opgeslagen in browser</p>
              <button onClick={() => { load(); setShowSettings(false); }}
                className="px-4 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-lg text-sm font-medium hover:bg-violet-500/30 transition-all">
                Toepassen & Herladen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
