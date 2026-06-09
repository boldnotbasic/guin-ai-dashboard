import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, ExternalLink, Activity, Bell, BellOff, Settings, X, Plus, Trash2 } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SentimentBar = ({ score }) => {
  const pct = Math.round(((score + 100) / 200) * 100);
  const color = score >= 30 ? 'bg-green-500' : score <= -30 ? 'bg-red-500' : 'bg-yellow-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-bold w-8 text-right ${score >= 30 ? 'text-green-400' : score <= -30 ? 'text-red-400' : 'text-yellow-400'}`}>
        {score > 0 ? '+' : ''}{score}
      </span>
    </div>
  );
};

const SentimentIcon = ({ label, size = 'sm' }) => {
  const s = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  if (label === 'bullish') return <TrendingUp className={`${s} text-green-400`} />;
  if (label === 'bearish') return <TrendingDown className={`${s} text-red-400`} />;
  return <Minus className={`${s} text-yellow-400`} />;
};

const labelColor = (label) =>
  label === 'bullish' ? 'text-green-400 bg-green-500/10 border-green-500/20'
  : label === 'bearish' ? 'text-red-400 bg-red-500/10 border-red-500/20'
  : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';

const labelNL = (label) =>
  label === 'bullish' ? 'Positief' : label === 'bearish' ? 'Negatief' : 'Neutraal';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SentimentWidget({ investments = [], watchlist = [] }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedTicker, setExpandedTicker] = useState(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' | 'watchlist'
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings state with localStorage persistence
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('sentiment_settings');
      return saved ? JSON.parse(saved) : {
        reddit: {
          enabled: true,
          subreddits: ['wallstreetbets', 'stocks', 'investing', 'SecurityAnalysis']
        },
        discord: {
          enabled: false,
          webhookUrl: '',
          channels: ['trading-talk', 'sentiment-feed']
        },
        twitter: {
          enabled: true,
          keywords: ['stock', 'market', 'trading', 'investment', 'bullish', 'bearish'],
          influencers: ['elonmusk', 'chamath', 'cathiedwood', 'michael_saylor', 'VivekGRamaswamy']
        }
      };
    } catch {
      return {
        reddit: { enabled: true, subreddits: ['wallstreetbets', 'stocks', 'investing'] },
        discord: { enabled: false, webhookUrl: '', channels: [] },
        twitter: { enabled: true, keywords: ['stock', 'market'], influencers: [] }
      };
    }
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('sentiment_settings', JSON.stringify(settings));
  }, [settings]);

  const getTickers = useCallback((tab) => {
    const src = tab === 'portfolio' ? investments : watchlist;
    return src.map(i => i.ticker_symbol || i.ticker).filter(Boolean).slice(0, 12);
  }, [investments, watchlist]);

  const getNames = useCallback((tab) => {
    const src = tab === 'portfolio' ? investments : watchlist;
    return src.map(i => i.name || i.ticker_symbol || i.ticker || '').slice(0, 12);
  }, [investments, watchlist]);

  const load = useCallback(async (tab = activeTab) => {
    const tickers = getTickers(tab);
    if (!tickers.length) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      // Fetch from enabled sources in parallel
      const requests = [];
      if (settings.reddit.enabled) {
        requests.push(
          fetch(`/api/sentiment?tickers=${tickers.join(',')}&names=${getNames(tab).join(',')}&subreddits=${settings.reddit.subreddits.join(',')}`)
            .then(r => ({ source: 'reddit', promise: r }))
        );
      }
      if (settings.discord.enabled && settings.discord.webhookUrl) {
        requests.push(
          fetch(`/api/discord-sentiment?tickers=${tickers.join(',')}&minutes=60`)
            .then(r => ({ source: 'discord', promise: r }))
        );
      }
      if (settings.twitter.enabled) {
        const influencers = (settings.twitter.influencers || []).length > 0 ? (settings.twitter.influencers || []).join(',') : '';
        const keywords = (settings.twitter.keywords || []).length > 0 ? (settings.twitter.keywords || []).join(',') : '';
        let twitterUrl = `/api/twitter-sentiment?tickers=${tickers.join(',')}&maxResults=10`;
        if (keywords) twitterUrl += `&keywords=${keywords}`;
        if (influencers) twitterUrl += `&influencers=${influencers}`;
        
        requests.push(
          fetch(twitterUrl)
            .then(r => ({ source: 'twitter', promise: r }))
        );
      }
      
      const results = await Promise.allSettled(requests);
      const redditRes = results.find(r => r.value?.source === 'reddit')?.value || { status: 'rejected' };
      const discordRes = results.find(r => r.value?.source === 'discord')?.value || { status: 'rejected' };
      const twitterRes = results.find(r => r.value?.source === 'twitter')?.value || { status: 'rejected' };

      const reddit = redditRes.status === 'fulfilled' ? await redditRes.value.json() : null;
      const discord = discordRes.status === 'fulfilled' ? await discordRes.value.json() : null;
      const twitter = twitterRes.status === 'fulfilled' ? await twitterRes.value.json() : null;

      // Fuse sentiment from all sources
      const fused = {};
      tickers.forEach(ticker => {
        const sources = [];
        let totalScore = 0;
        let totalWeight = 0;
        let allHeadlines = [];
        let messageCount = 0;

        // Reddit (weight: 1.0)
        if (reddit?.tickers?.[ticker]) {
          const r = reddit.tickers[ticker];
          sources.push({ name: 'reddit', score: r.score, weight: 1.0, headlines: r.headlines });
          totalScore += r.score * 1.0;
          totalWeight += 1.0;
          allHeadlines.push(...(r.headlines || []));
          messageCount += (r.headlines?.length || 0);
        }

        // Discord (weight: 1.2 - real-time edge)
        if (discord?.tickers?.[ticker]) {
          const d = discord.tickers[ticker];
          sources.push({ name: 'discord', score: d.score, weight: 1.2, messages: d.recentMessages });
          totalScore += d.score * 1.2;
          totalWeight += 1.2;
          allHeadlines.push(...(d.recentMessages?.map(m => ({ title: m.content, link: null, score: m.sentiment.score })) || []));
          messageCount += d.messageCount || 0;
        }

        // X/Twitter (weight: 1.1 - influencer weight)
        if (twitter?.tickers?.[ticker]) {
          const x = twitter.tickers[ticker];
          sources.push({ name: 'twitter', score: x.score, weight: 1.1, tweets: x.recentTweets });
          totalScore += x.score * 1.1;
          totalWeight += 1.1;
          allHeadlines.push(...(x.recentTweets?.map(t => ({ title: t.text, link: t.url, score: t.sentiment.score })) || []));
          messageCount += x.messageCount || 0;
        }

        // Calculate weighted average
        const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
        const label = finalScore >= 25 ? 'bullish' : finalScore <= -25 ? 'bearish' : 'neutraal';
        const color = label === 'bullish' ? 'green' : label === 'bearish' ? 'red' : 'yellow';

        // Detect anomaly (strong deviation from average)
        const avgSourceScore = sources.length > 0 ? sources.reduce((s, src) => s + src.score, 0) / sources.length : 0;
        const anomaly = Math.abs(finalScore - avgSourceScore) >= 40
          ? { alert: true, message: `Sterke ${label} sentiment (${finalScore > 0 ? '+' : ''}${finalScore})` }
          : { alert: false };

        fused[ticker] = {
          ticker,
          name: reddit?.tickers?.[ticker]?.name || discord?.tickers?.[ticker]?.ticker || twitter?.tickers?.[ticker]?.ticker || ticker,
          score: finalScore,
          label,
          color,
          sources,
          headlines: allHeadlines.slice(0, 8), // Show top 8 items from all sources
          messageCount,
          anomaly,
          updatedAt: new Date().toISOString(),
        };
      });

      // Overall sentiment
      const allScores = Object.values(fused).map(f => f.score);
      const overallAvgScore = allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 0;
      const overallLabel = overallAvgScore >= 20 ? 'bullish' : overallAvgScore <= -20 ? 'bearish' : 'gemengd';
      
      const payload = {
        source: 'fused',
        tickers: fused,
        overall: {
          avgScore: overallAvgScore,
          label: overallLabel,
          alerts: Object.values(fused).filter(f => f.anomaly?.alert).map(f => ({ ticker: f.ticker, message: f.anomaly.message })),
        },
        sources: {
          reddit: reddit ? { available: true, cached: reddit.cached } : { available: false },
          discord: discord ? { available: true, totalMessages: discord.totalMessages } : { available: false },
          twitter: twitter ? { available: true, cached: twitter.cached } : { available: false },
        },
        updatedAt: new Date().toISOString(),
      };

      setData(payload);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, getTickers, getNames]);

  useEffect(() => {
    load(activeTab);
    const interval = setInterval(() => load(activeTab), 10 * 60 * 1000);
    const onVisibility = () => { if (!document.hidden) load(activeTab); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); };
  }, [activeTab, load]);

  const tickerList = data ? Object.values(data.tickers).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)) : [];
  const alerts = data?.overall?.alerts || [];
  const overallScore = data?.overall?.avgScore ?? 0;
  const overallLabel = data?.overall?.label || 'gemengd';

  const bullCount = tickerList.filter(t => t.label === 'bullish').length;
  const bearCount = tickerList.filter(t => t.label === 'bearish').length;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setData(null);
    setExpandedTicker(null);
  };

  return (
    <div className="gradient-card rounded-xl overflow-hidden mb-6" aria-label="Sentiment Analyse Widget">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Sentiment Radar</h2>
              <p className="text-white/40 text-xs">Real-time nieuwssentiment per positie</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              aria-label="Instellingen"
              title="Broninstellingen"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAlertsEnabled(v => !v)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              aria-label={alertsEnabled ? 'Alerts uitschakelen' : 'Alerts inschakelen'}
              title={alertsEnabled ? 'Alerts aan' : 'Alerts uit'}
            >
              {alertsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => load(activeTab)} disabled={loading}
              className="text-white/30 hover:text-white/60 transition-all p-1.5 rounded-lg hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              aria-label="Herlaad sentiment"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {[['portfolio', 'Portfolio'], ['watchlist', 'Watchlist']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${activeTab === key ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts strip */}
      {alertsEnabled && alerts.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 flex-wrap" role="alert">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          {alerts.map((a, i) => (
            <span key={i} className="text-amber-300 text-[11px]">
              <span className="font-bold">{a.ticker}</span>: {a.message}
            </span>
          ))}
        </div>
      )}

      {/* Source status indicators */}
      {data && data.sources && (
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap">
          <span className="text-white/30 text-[9px] uppercase tracking-wider shrink-0">Bronnen:</span>
          {data.sources.reddit?.available && (
            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300">
              Reddit {data.sources.reddit.cached && '(cached)'}
            </span>
          )}
          {data.sources.discord?.available && (
            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
              Discord {data.sources.discord.totalMessages > 0 && `(${data.sources.discord.totalMessages} msgs)`}
            </span>
          )}
          {data.sources.twitter?.available && (
            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
              X {data.sources.twitter.cached && '(cached)'}
            </span>
          )}
        </div>
      )}

      {/* Overall bar */}
      {data && (
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <span className="text-white/40 text-[10px] uppercase tracking-wider shrink-0">Overall</span>
          <div className="flex-1">
            <SentimentBar score={overallScore} />
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${labelColor(overallLabel)}`}>
            {labelNL(overallLabel)}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-white/30">
            <span className="text-green-400">{bullCount}↑</span>
            <span className="text-red-400">{bearCount}↓</span>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && !data && (
        <div className="p-4 space-y-2" aria-busy="true">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-12 h-3 bg-white/10 rounded" />
              <div className="flex-1 h-1.5 bg-white/10 rounded-full" />
              <div className="w-8 h-3 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400/70 text-xs px-4 py-3" role="alert">⚠️ {error}</p>
      )}

      {/* No tickers */}
      {!loading && !error && tickerList.length === 0 && (
        <p className="text-white/30 text-xs px-4 py-6 text-center">
          Voeg {activeTab === 'portfolio' ? 'posities' : 'watchlist items'} toe om sentiment te zien
        </p>
      )}

      {/* Ticker list */}
      {data && tickerList.length > 0 && (
        <div className="divide-y divide-white/5">
          {tickerList.map(t => (
            <div key={t.ticker}>
              <button
                onClick={() => setExpandedTicker(expandedTicker === t.ticker ? null : t.ticker)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/3 transition-all text-left group focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/40"
                aria-expanded={expandedTicker === t.ticker}
              >
                {/* Ticker badge */}
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border min-w-[52px] text-center ${labelColor(t.label)}`}>
                  {t.ticker}
                </span>
                {/* Bar */}
                <div className="flex-1">
                  <SentimentBar score={t.score} />
                </div>
                {/* Icon */}
                <SentimentIcon label={t.label} />
                {/* Alert dot */}
                {t.anomaly?.alert && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Sentimentanomalie" />
                )}
              </button>

              {/* Expanded: headlines */}
              {expandedTicker === t.ticker && t.headlines?.length > 0 && (
                <div className="px-4 pb-3 space-y-1.5 bg-white/2">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider pt-1 mb-2">Recente headlines</p>
                  {t.headlines.map((h, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${h.score >= 10 ? 'bg-green-500/5 border-green-500/10' : h.score <= -10 ? 'bg-red-500/5 border-red-500/10' : 'bg-white/3 border-white/5'}`}>
                      <span className={`text-[10px] font-bold shrink-0 mt-0.5 w-6 text-center ${h.score >= 10 ? 'text-green-400' : h.score <= -10 ? 'text-red-400' : 'text-white/30'}`}>
                        {h.score > 0 ? '+' : ''}{h.score}
                      </span>
                      <p className="text-white/70 text-[11px] leading-relaxed flex-1">{h.title}</p>
                      {h.link && (
                        <a href={h.link} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400/50 hover:text-blue-400 shrink-0 mt-0.5 focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded"
                          aria-label="Open artikel">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
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
            Bijgewerkt: {lastUpdated.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} · op basis van nieuwsheadlines
          </p>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-semibold text-base">Sentiment Broninstellingen</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                aria-label="Sluiten"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Content */}
            <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Reddit Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 text-sm">📰 Reddit</span>
                    <label className="text-white text-sm font-medium">Reddit Subreddits</label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.reddit.enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, reddit: { ...prev.reddit, enabled: e.target.checked } }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
                {settings.reddit.enabled && (
                  <div className="space-y-2">
                    <p className="text-white/40 text-xs">Kies subreddits om te monitoren:</p>
                    <div className="flex flex-wrap gap-2">
                      {settings.reddit.subreddits.map((sub, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs">
                          r/{sub}
                          <button
                            onClick={() => setSettings(prev => ({
                              ...prev,
                              reddit: { ...prev.reddit, subreddits: prev.reddit.subreddits.filter((_, idx) => idx !== i) }
                            }))}
                            className="ml-1 text-orange-400 hover:text-orange-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        onClick={() => {
                          const newSub = prompt('Voeg subreddit toe (zonder r/):');
                          if (newSub && newSub.trim()) {
                            setSettings(prev => ({
                              ...prev,
                              reddit: { ...prev.reddit, subreddits: [...prev.reddit.subreddits, newSub.trim()] }
                            }));
                          }
                        }}
                        className="px-2 py-1 rounded border border-dashed border-white/20 text-white/40 text-xs hover:border-white/40 hover:text-white/60 transition-all"
                      >
                        <Plus className="w-3 h-3 inline mr-1" /> Toevoegen
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['wallstreetbets', 'stocks', 'investing', 'SecurityAnalysis', 'options', 'ValueInvesting'].map(suggested => (
                        <button
                          key={suggested}
                          onClick={() => {
                            if (!settings.reddit.subreddits.includes(suggested)) {
                              setSettings(prev => ({
                                ...prev,
                                reddit: { ...prev.reddit, subreddits: [...prev.reddit.subreddits, suggested] }
                              }));
                            }
                          }}
                          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/40 text-xs hover:bg-white/10 hover:text-white/60 transition-all"
                          disabled={settings.reddit.subreddits.includes(suggested)}
                        >
                          r/{suggested}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Discord Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 text-sm">💬 Discord</span>
                    <label className="text-white text-sm font-medium">Discord Webhook</label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.discord.enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, discord: { ...prev.discord, enabled: e.target.checked } }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>
                {settings.discord.enabled && (
                  <div className="space-y-2">
                    <p className="text-white/40 text-xs">Webhook URL (zie setup guide):</p>
                    <input
                      type="url"
                      value={settings.discord.webhookUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, discord: { ...prev.discord, webhookUrl: e.target.value } }))}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                    <p className="text-white/30 text-xs mt-2">💡 Zie DISCORD_WEBHOOK_SETUP.md voor instructies</p>
                  </div>
                )}
              </div>

              {/* X/Twitter Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 text-sm">🐦 X/Twitter</span>
                    <label className="text-white text-sm font-medium">X/Twitter Keywords</label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.twitter.enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, twitter: { ...prev.twitter, enabled: e.target.checked } }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
                {settings.twitter.enabled && (
                  <div className="space-y-4">
                    {/* Keywords Section */}
                    <div className="space-y-2">
                      <p className="text-white/40 text-xs">Keywords voor sentiment filtering:</p>
                      <div className="flex flex-wrap gap-2">
                        {settings.twitter.keywords.map((keyword, i) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                            {keyword}
                            <button
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                twitter: { ...prev.twitter, keywords: prev.twitter.keywords.filter((_, idx) => idx !== i) }
                              }))}
                              className="ml-1 text-blue-400 hover:text-blue-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => {
                            const newKeyword = prompt('Voeg keyword toe:');
                            if (newKeyword && newKeyword.trim()) {
                              setSettings(prev => ({
                                ...prev,
                                twitter: { ...prev.twitter, keywords: [...prev.twitter.keywords, newKeyword.trim()] }
                              }));
                            }
                          }}
                          className="px-2 py-1 rounded border border-dashed border-white/20 text-white/40 text-xs hover:border-white/40 hover:text-white/60 transition-all"
                        >
                          <Plus className="w-3 h-3 inline mr-1" /> Toevoegen
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['stock', 'market', 'trading', 'investment', 'bullish', 'bearish', 'earnings', 'options'].map(suggested => (
                          <button
                            key={suggested}
                            onClick={() => {
                              if (!settings.twitter.keywords.includes(suggested)) {
                                setSettings(prev => ({
                                  ...prev,
                                  twitter: { ...prev.twitter, keywords: [...prev.twitter.keywords, suggested] }
                                }));
                              }
                            }}
                            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/40 text-xs hover:bg-white/10 hover:text-white/60 transition-all"
                            disabled={settings.twitter.keywords.includes(suggested)}
                          >
                            {suggested}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Influencers Section */}
                    <div className="space-y-2 border-t border-white/5 pt-3">
                      <p className="text-white/40 text-xs">X/Twitter Influencers om te volgen:</p>
                      <div className="flex flex-wrap gap-2">
                        {(settings.twitter.influencers || []).map((influencer, i) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                            @{influencer}
                            <button
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                twitter: { ...prev.twitter, influencers: prev.twitter.influencers.filter((_, idx) => idx !== i) }
                              }))}
                              className="ml-1 text-purple-400 hover:text-purple-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => {
                            const newInfluencer = prompt('Voeg influencer toe (zonder @):');
                            if (newInfluencer && newInfluencer.trim()) {
                              setSettings(prev => ({
                                ...prev,
                                twitter: { ...prev.twitter, influencers: [...(prev.twitter.influencers || []), newInfluencer.trim().replace('@', '')] }
                              }));
                            }
                          }}
                          className="px-2 py-1 rounded border border-dashed border-white/20 text-white/40 text-xs hover:border-white/40 hover:text-white/60 transition-all"
                        >
                          <Plus className="w-3 h-3 inline mr-1" /> Toevoegen
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['elonmusk', 'chamath', 'cathiedwood', 'michael_saylor', 'VivekGRamaswamy', 'RayDalio', 'peterthiel', 'naval', 'balajis', 'paulludwig'].map(suggested => (
                          <button
                            key={suggested}
                            onClick={() => {
                              if (!(settings.twitter.influencers || []).includes(suggested)) {
                                setSettings(prev => ({
                                  ...prev,
                                  twitter: { ...prev.twitter, influencers: [...(prev.twitter.influencers || []), suggested] }
                                }));
                              }
                            }}
                            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/40 text-xs hover:bg-white/10 hover:text-white/60 transition-all"
                            disabled={(settings.twitter.influencers || []).includes(suggested)}
                          >
                            @{suggested}
                          </button>
                        ))}
                      </div>
                      <p className="text-white/30 text-xs mt-2">💡 Influencer tweets krijgen 1.5x gewicht in sentiment score</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <p className="text-white/40 text-xs">Instellingen worden automatisch opgeslagen</p>
              <button
                onClick={() => {
                  load(activeTab);
                  setShowSettings(false);
                }}
                className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-all focus-visible:ring-2 focus-visible:ring-cyan-500/50"
              >
                Toepassen & Herladen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
