// /api/market-intelligence.js
// Market Intelligence Hub: Reddit + X + News → AI Analysis
// Provides: trending tickers, news intelligence, influencer alerts, AI briefing

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const CACHE = new Map();
const CACHE_TTL_NEWS = 10 * 60 * 1000;   // 10 min for news
const CACHE_TTL_AI   = 30 * 60 * 1000;   // 30 min for AI briefing

// ─── Fetch Reddit posts ────────────────────────────────────────────────────────
const fetchRedditPosts = async (subreddits = [], tickers = []) => {
  const results = [];
  
  for (const sub of subreddits.slice(0, 4)) {
    try {
      const url = `https://www.reddit.com/r/${sub}/hot.json?limit=25`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'MarketIntelBot/1.0' }
      });
      if (!r.ok) continue;
      const data = await r.json();
      const posts = data?.data?.children || [];
      
      posts.forEach(({ data: p }) => {
        const text = `${p.title} ${p.selftext || ''}`.toLowerCase();
        const mentionedTickers = tickers.filter(t =>
          text.includes(`$${t.toLowerCase()}`) || text.includes(` ${t.toLowerCase()} `) || text.includes(` ${t.toLowerCase()}.`)
        );
        
        results.push({
          id: p.id,
          source: 'reddit',
          subreddit: sub,
          title: p.title,
          text: (p.selftext || '').slice(0, 300),
          url: `https://reddit.com${p.permalink}`,
          score: p.score,
          comments: p.num_comments,
          created: p.created_utc * 1000,
          tickers: mentionedTickers,
          engagement: p.score + p.num_comments * 3,
        });
      });
    } catch (e) {
      console.error(`Reddit fetch error for r/${sub}:`, e.message);
    }
  }
  
  return results.sort((a, b) => b.engagement - a.engagement);
};

// Helper: get X bearer token (use provided bearer or exchange API key/secret)
const getXBearerToken = async () => {
  console.log('X Token Debug: Checking credentials...', {
    hasBearer: !!X_BEARER_TOKEN,
    hasApiKey: !!X_API_KEY,
    hasApiSecret: !!X_API_SECRET,
    apiKeyLength: X_API_KEY?.length,
    apiSecretLength: X_API_SECRET?.length
  });
  
  if (X_BEARER_TOKEN) {
    console.log('X Token Debug: Using provided bearer token');
    return X_BEARER_TOKEN;
  }
  
  if (!X_API_KEY || !X_API_SECRET) {
    console.log('X Token Debug: Missing API key or secret');
    return null;
  }
  
  try {
    const creds = Buffer.from(`${X_API_KEY}:${X_API_SECRET}`).toString('base64');
    console.log('X Token Debug: Attempting bearer exchange...');
    
    const r = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: 'grant_type=client_credentials'
    });
    
    console.log('X Token Debug: Bearer exchange response status:', r.status);
    
    if (!r.ok) {
      const errorText = await r.text();
      console.error('X bearer exchange failed:', r.status, errorText);
      return null;
    }
    
    const data = await r.json();
    console.log('X Token Debug: Successfully got bearer token, type:', data.token_type);
    return data.access_token || null;
  } catch (e) {
    console.error('X bearer exchange error:', e.message);
    return null;
  }
};

// ─── Fetch X/Twitter data ──────────────────────────────────────────────────────
const fetchXData = async (tickers = [], influencers = []) => {
  const bearer = await getXBearerToken();
  if (!bearer) return { ticker_tweets: {}, influencer_tweets: [] };
  
  const ticker_tweets = {};
  const influencer_tweets = [];
  
  // Fetch tweets mentioning tickers
  for (const ticker of tickers.slice(0, 5)) {
    try {
      const query = `$${ticker} OR "${ticker} stock" -is:retweet lang:en`;
      const params = new URLSearchParams({
        query,
        max_results: '15',
        'tweet.fields': 'created_at,public_metrics,author_id',
        'user.fields': 'username,name,verified',
        expansions: 'author_id'
      });
      
      const r = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
        headers: { 'Authorization': `Bearer ${bearer}` }
      });
      if (!r.ok) continue;
      const data = await r.json();
      
      const usersMap = (data.includes?.users || []).reduce((m, u) => {
        m[u.id] = u; return m;
      }, {});
      
      ticker_tweets[ticker] = (data.data || []).map(t => ({
        id: t.id,
        text: t.text,
        author: usersMap[t.author_id]?.username || 'unknown',
        authorName: usersMap[t.author_id]?.name || 'Unknown',
        verified: usersMap[t.author_id]?.verified || false,
        likes: t.public_metrics?.like_count || 0,
        retweets: t.public_metrics?.retweet_count || 0,
        created: t.created_at,
        url: `https://twitter.com/${usersMap[t.author_id]?.username}/status/${t.id}`,
        engagement: (t.public_metrics?.like_count || 0) + (t.public_metrics?.retweet_count || 0) * 2
      })).sort((a, b) => b.engagement - a.engagement);
      
    } catch (e) {
      console.error(`X fetch error for ${ticker}:`, e.message);
    }
  }
  
  // Fetch influencer timelines
  console.log('X Debug: Fetching timelines for influencers:', influencers);
  for (const username of influencers.slice(0, 5)) {
    try {
      console.log(`X Debug: Looking up user ${username}...`);
      const userRes = await fetch(
        `https://api.twitter.com/2/users/by/username/${username}?user.fields=id,username,name,verified`,
        { headers: { 'Authorization': `Bearer ${bearer}` } }
      );
      
      console.log(`X Debug: User lookup for ${username} status:`, userRes.status);
      
      if (!userRes.ok) {
        const errorText = await userRes.text();
        console.error(`X Debug: User lookup failed for ${username}:`, userRes.status, errorText);
        continue;
      }
      
      const userData = await userRes.json();
      console.log(`X Debug: User data for ${username}:`, userData.data ? 'found' : 'not found');
      
      if (!userData.data) continue;
      
      const userId = userData.data.id;
      const timelineParams = new URLSearchParams({
        max_results: '10',
        'tweet.fields': 'created_at,public_metrics',
        exclude: 'retweets'
      });
      
      console.log(`X Debug: Fetching timeline for ${username} (ID: ${userId})...`);
      const tlRes = await fetch(
        `https://api.twitter.com/2/users/${userId}/tweets?${timelineParams}`,
        { headers: { 'Authorization': `Bearer ${bearer}` } }
      );
      
      console.log(`X Debug: Timeline fetch for ${username} status:`, tlRes.status);
      
      if (!tlRes.ok) {
        const errorText = await tlRes.text();
        console.error(`X Debug: Timeline fetch failed for ${username}:`, tlRes.status, errorText);
        continue;
      }
      
      const tlData = await tlRes.json();
      console.log(`X Debug: Timeline for ${username}: ${tlData.data?.length || 0} tweets`);
      
      (tlData.data || []).forEach(t => {
        // Extract tickers from tweet
        const mentionedTickers = (t.text.match(/\$([A-Z]{1,5})\b/g) || []).map(c => c.slice(1));
        
        influencer_tweets.push({
          id: t.id,
          text: t.text,
          author: userData.data.username,
          authorName: userData.data.name,
          verified: userData.data.verified,
          likes: t.public_metrics?.like_count || 0,
          retweets: t.public_metrics?.retweet_count || 0,
          created: t.created_at,
          url: `https://twitter.com/${userData.data.username}/status/${t.id}`,
          tickers: mentionedTickers,
          engagement: (t.public_metrics?.like_count || 0) + (t.public_metrics?.retweet_count || 0) * 2
        });
      });
      
    } catch (e) {
      console.error(`X influencer fetch error for ${username}:`, e.message);
    }
  }
  
  return { ticker_tweets, influencer_tweets };
};

// ─── Fetch Google News RSS ─────────────────────────────────────────────────────
const fetchNews = async (tickers = []) => {
  const allNews = [];
  
  for (const ticker of tickers.slice(0, 6)) {
    try {
      const url = `https://news.google.com/rss/search?q=${ticker}+stock&hl=nl&gl=NL&ceid=NL:nl`;
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) continue;
      const xml = await r.text();
      
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      items.slice(0, 5).forEach(item => {
        const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
        const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '';
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
        const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || 'Google News';
        
        if (title) {
          allNews.push({
            ticker,
            title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            link,
            source,
            pubDate,
            created: pubDate ? new Date(pubDate).getTime() : Date.now()
          });
        }
      });
    } catch (e) {
      console.error(`News fetch error for ${ticker}:`, e.message);
    }
  }
  
  return allNews.sort((a, b) => b.created - a.created);
};

// ─── Calculate Trending Score ──────────────────────────────────────────────────
const calcTrendingScore = (ticker, redditPosts, xData, news) => {
  let score = 0;
  let signals = [];
  
  const tickerPosts = redditPosts.filter(p => p.tickers.includes(ticker));
  const tickerTweets = xData.ticker_tweets[ticker] || [];
  const tickerNews = news.filter(n => n.ticker === ticker);
  const influencerMentions = xData.influencer_tweets.filter(t => t.tickers.includes(ticker));
  
  // Reddit engagement
  const redditEngagement = tickerPosts.reduce((s, p) => s + p.engagement, 0);
  score += Math.min(redditEngagement / 100, 40);
  if (tickerPosts.length > 0) signals.push(`${tickerPosts.length} Reddit posts`);
  
  // X/Twitter engagement
  const xEngagement = tickerTweets.reduce((s, t) => s + t.engagement, 0);
  score += Math.min(xEngagement / 50, 30);
  if (tickerTweets.length > 0) signals.push(`${tickerTweets.length} tweets`);
  
  // Influencer mentions (high value)
  score += influencerMentions.length * 15;
  if (influencerMentions.length > 0) signals.push(`${influencerMentions.length} influencer mention${influencerMentions.length > 1 ? 's' : ''}`);
  
  // News count
  score += tickerNews.length * 5;
  if (tickerNews.length > 0) signals.push(`${tickerNews.length} nieuws items`);
  
  return { score: Math.round(score), signals, mentionCount: tickerPosts.length + tickerTweets.length };
};

// ─── Summarize non-ticker influencer posts via GPT ─────────────────────────────
const summarizeInfluencerPosts = async (influencerPosts, tickers) => {
  if (!OPENAI_API_KEY || !influencerPosts.length) return null;
  
  try {
    // Filter out posts that mention portfolio tickers (we already show those separately)
    const nonTickerPosts = influencerPosts.filter(post => 
      !post.tickers.some(ticker => tickers.includes(ticker))
    ).slice(0, 8);
    
    if (nonTickerPosts.length === 0) return null;
    
    const postsText = nonTickerPosts.map(post =>
      `@${post.author}: ${post.text.slice(0, 150)}${post.text.length > 150 ? '...' : ''}`
    ).join('\n\n');
    
    const prompt = `Analyseer deze recente posts van influencers. Geef een BEKNOOPPE samenvatting in JSON:

${postsText}

Focus op:
- Belangrijke onderwerpen (politiek, economie, tech, etc)
- Marktsentiment of trends
- Eventuele waarschuwingen of voorspellingen

Geef antwoord in dit JSON format:
{
  "summary": "1-2 zinnen over wat de influencers bespreken",
  "keyTopics": ["politiek", "tech", "economie"],
  "marketSentiment": "bullish|bearish|neutraal|onduidelijk",
  "notableMentions": [
    {"influencer": "elonmusk", "topic": "AI regulering", "impact": "hoog|middel|laag"}
  ],
  "overallTheme": "algemeen thema van de posts"
}

Max 3 notableMentions. Wees specifiek en beknopt.`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 400,
        temperature: 0.3
      })
    });
    
    if (!r.ok) throw new Error(`OpenAI error: ${r.status}`);
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
    
  } catch (e) {
    console.error('Influencer summary error:', e.message);
    return null;
  }
};

// ─── AI Briefing via GPT ───────────────────────────────────────────────────────
const generateAIBriefing = async (tickers, redditPosts, xData, news) => {
  console.log('AI Briefing: Starting generation for tickers:', tickers);
  
  if (!OPENAI_API_KEY) {
    console.log('AI Briefing: No OpenAI API key found');
    return null;
  }
  
  try {
    // Build context for AI
    const topNews = news.slice(0, 10).map(n => `[${n.ticker}] ${n.title}`).join('\n');
    const topReddit = redditPosts.slice(0, 8).map(p =>
      `r/${p.subreddit} (${p.score}pts): ${p.title}`
    ).join('\n');
    const topInfluencer = xData.influencer_tweets.slice(0, 5).map(t =>
      `@${t.author}: ${t.text.slice(0, 120)}`
    ).join('\n');
    
    const prompt = `Je bent een hedgefund analist. Analyseer het volgende nieuws, Reddit buzz en influencer activiteit voor tickers: ${tickers.join(', ')}.

NIEUWS:
${topNews || 'Geen nieuws beschikbaar'}

REDDIT BUZZ:
${topReddit || 'Geen Reddit data beschikbaar'}

INFLUENCER TWEETS:
${topInfluencer || 'Geen influencer data beschikbaar'}

Geef een BEKNOPTE analyse in JSON:
{
  "headline": "1 zin kernboodschap voor vandaag",
  "keyStories": [
    { "ticker": "AAPL", "title": "Wat speelt er", "impact": "bullish|bearish|neutraal", "source": "reddit|twitter|news", "urgency": "hoog|middel|laag" }
  ],
  "trendingTickers": ["NVDA", "TSLA"],
  "marketMood": "risk-on|risk-off|gemengd",
  "topOpportunity": { "ticker": "XX", "reason": "korte uitleg" },
  "topRisk": { "ticker": "XX", "reason": "korte uitleg" },
  "summary": "2-3 zinnen AI samenvatting van wat er speelt"
}

Max 3 keyStories. Wees specifiek en actionabel.`;

    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.3
    };
    
    console.log('AI Briefing: Making OpenAI request with body length:', JSON.stringify(requestBody).length);
    
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('AI Briefing: OpenAI response status:', r.status);
    
    if (!r.ok) {
      const errorText = await r.text();
      console.error('AI Briefing: OpenAI error response:', errorText);
      throw new Error(`OpenAI error: ${r.status} - ${errorText}`);
    }
    
    const data = await r.json();
    console.log('AI Briefing: OpenAI response data keys:', Object.keys(data));
    
    const content = data.choices?.[0]?.message?.content;
    console.log('AI Briefing: Content received:', !!content, content?.length);
    
    if (!content) {
      console.error('AI Briefing: No content in OpenAI response');
      return null;
    }
    
    try {
      const parsed = JSON.parse(content);
      console.log('AI Briefing: Successfully parsed JSON');
      return parsed;
    } catch (parseError) {
      console.error('AI Briefing: JSON parse error:', parseError.message, 'Content was:', content);
      return null;
    }
    
  } catch (e) {
    console.error('AI briefing error:', e.message);
    return null;
  }
};

// ─── Main Handler ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log('Market Intelligence API: Request received', {
      tickers: req.query.tickers,
      influencers: req.query.influencers,
      skipAI: req.query.skipAI
    });
    
    const tickers = (req.query.tickers || '').split(',').map(t => t.trim().toUpperCase()).filter(Boolean).slice(0, 10);
    const subreddits = (req.query.subreddits || 'wallstreetbets,stocks,investing').split(',').map(s => s.trim()).filter(Boolean);
    const influencers = (req.query.influencers || '').split(',').map(i => i.trim().replace('@', '')).filter(Boolean);
    const mode = req.query.mode || 'all'; // 'news' | 'trending' | 'influencers' | 'briefing' | 'all'
    const skipAI = req.query.skipAI === 'true';

    if (!tickers.length) return res.status(400).json({ error: 'tickers required' });

    const cacheKey = `intel_${tickers.join(',')}_${subreddits.join(',')}_${influencers.join(',')}_${skipAI}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_NEWS) {
      return res.json({ ...cached.data, cached: true });
    }

    // Fetch all sources in parallel
    const [redditPosts, xData, news] = await Promise.all([
      fetchRedditPosts(subreddits, tickers),
      fetchXData(tickers, influencers),
      fetchNews(tickers)
    ]);

    // Full influencer timeline (all recent posts) + ticker alerts
    const influencerTimeline = xData.influencer_tweets.slice(0, 15);
    const influencerAlerts = xData.influencer_tweets
      .filter(t => t.tickers.some(ticker => tickers.includes(ticker)))
      .slice(0, 10);

    // Calculate trending scores per ticker
    const trending = tickers.map(ticker => ({
      ticker,
      ...calcTrendingScore(ticker, redditPosts, xData, news),
      topNews: news.filter(n => n.ticker === ticker).slice(0, 3),
      topReddit: redditPosts.filter(p => p.tickers.includes(ticker)).slice(0, 3),
      topTweets: (xData.ticker_tweets[ticker] || []).slice(0, 3),
      influencerMentions: xData.influencer_tweets.filter(t => t.tickers.includes(ticker)).slice(0, 2)
    })).sort((a, b) => b.score - a.score);

    // AI briefing (separate cache)
    let aiBriefing = null;
    let influencerSummary = null;
    
    // Debug: Check if API key is available
    console.log('Market Intelligence AI Debug:', {
      skipAI,
      hasOpenAIKey: !!OPENAI_API_KEY,
      keyLength: OPENAI_API_KEY?.length,
      keyPrefix: OPENAI_API_KEY?.substring(0, 7) + '...'
    });
    
    if (!skipAI && OPENAI_API_KEY) {
      const aiCacheKey = `ai_brief_${tickers.join(',')}`;
      const aiCached = CACHE.get(aiCacheKey);
      if (aiCached && Date.now() - aiCached.ts < CACHE_TTL_AI) {
        aiBriefing = aiCached.data;
      } else {
        aiBriefing = await generateAIBriefing(tickers, redditPosts, xData, news);
        if (aiBriefing) CACHE.set(aiCacheKey, { data: aiBriefing, ts: Date.now() });
      }
      
      // Generate influencer summary
      const infSummaryCacheKey = `inf_summary_${influencers.join(',')}`;
      const infCached = CACHE.get(infSummaryCacheKey);
      if (infCached && Date.now() - infCached.ts < CACHE_TTL_AI) {
        influencerSummary = infCached.data;
      } else {
        influencerSummary = await summarizeInfluencerPosts(influencerTimeline, tickers);
        if (influencerSummary) CACHE.set(infSummaryCacheKey, { data: influencerSummary, ts: Date.now() });
      }
    }

    const payload = {
      trending,
      news: news.slice(0, 20),
      redditTop: redditPosts.slice(0, 15),
      influencerTimeline,
      influencerAlerts,
      influencerSummary,
      aiBriefing,
      sources: {
        reddit: { available: redditPosts.length > 0, count: redditPosts.length },
        twitter: { available: Object.keys(xData.ticker_tweets).length > 0, influencers: influencers.length },
        news: { available: news.length > 0, count: news.length }
      },
      updatedAt: new Date().toISOString()
    };

    CACHE.set(cacheKey, { data: payload, ts: Date.now() });
    return res.json(payload);

  } catch (error) {
    console.error('Market intelligence error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
