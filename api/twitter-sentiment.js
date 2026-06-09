// /api/twitter-sentiment.js
// X (Twitter) API Basic integration for ticker mentions sentiment analysis
// Uses X API v2 recent search, analyzes ticker mentions in real-time

const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN; // If using App-only auth

const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min for real-time data

// Get OAuth 2.0 Bearer Token (App-only auth - easier for search)
const getBearerToken = async () => {
  if (X_BEARER_TOKEN) return X_BEARER_TOKEN;
  
  // If no bearer token, try to get one from API keys
  const basic = Buffer.from(`${X_API_KEY}:${X_API_SECRET}`).toString('base64');
  const r = await fetch('https://api.twitter.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!r.ok) throw new Error('Failed to get X bearer token');
  const { access_token } = await r.json();
  return access_token;
};

// Search X for ticker mentions
const searchXTweets = async (ticker, maxResults = 20) => {
  const token = await getBearerToken();
  const query = `$${ticker} OR ${ticker} stock -is:retweet lang:en`;
  
  const params = new URLSearchParams({
    query,
    max_results: Math.min(maxResults, 100),
    'tweet.fields': 'created_at,author_id,public_metrics,lang',
    'user.fields': 'username,name,verified',
    expansions: 'author_id'
  });
  
  const r = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!r.ok) throw new Error(`X API error: ${r.status}`);
  const data = await r.json();
  return data;
};

// Get user timeline for specific influencers
const getUserTimeline = async (username, maxResults = 10) => {
  const token = await getBearerToken();
  
  // First get user ID from username
  const userParams = new URLSearchParams({
    'user.fields': 'id,username,name,verified,public_metrics'
  });
  
  const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${username}?${userParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!userRes.ok) throw new Error(`X API user lookup error for ${username}: ${userRes.status}`);
  const userData = await userRes.json();
  
  if (!userData.data) {
    throw new Error(`User ${username} not found`);
  }
  
  const user = userData.data;
  
  // Get user's recent tweets
  const timelineParams = new URLSearchParams({
    max_results: Math.min(maxResults, 100),
    'tweet.fields': 'created_at,public_metrics,lang,context_annotations',
    'exclude': 'retweets'
  });
  
  const timelineRes = await fetch(`https://api.twitter.com/2/users/${user.id}/tweets?${timelineParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!timelineRes.ok) throw new Error(`X API timeline error for ${username}: ${timelineRes.status}`);
  const timelineData = await timelineRes.json();
  
  // Attach user info to tweets
  if (timelineData.data) {
    timelineData.data = timelineData.data.map(tweet => ({
      ...tweet,
      author_id: user.id,
      author: {
        username: user.username,
        name: user.name,
        verified: user.verified
      }
    }));
  }
  
  return {
    data: timelineData.data || [],
    includes: {
      users: [user]
    }
  };
};

// Extract tickers from tweet text (for broader search)
const extractTickersFromText = (text) => {
  const cashtags = text.match(/\$([A-Z]{1,5})\b/g) || [];
  const tickers = [...new Set(cashtags.map(t => t.slice(1)))];
  return tickers;
};

// Sentiment analysis for tweet
const scoreTweetSentiment = (text, metrics) => {
  const lower = text.toLowerCase();
  let score = 0;
  let signals = [];
  
  // Sentiment keywords
  const bullish = ['bullish', 'buy', 'long', 'moon', 'rocket', '🚀', '📈', '💎', '🌙', 'going up', 'rally', 'breakout', 'strong', 'buying', 'calls', 'green', 'gain', 'profit', 'win', 'hold', 'hodl', 'accumulating', 'loading up', 'adding'];
  const bearish = ['bearish', 'sell', 'short', 'dump', 'crash', '📉', '🐻', '🔴', 'falling', 'plummet', 'collapse', 'red', 'loss', 'sell-off', 'correction', 'fear', 'panic', 'puts', 'losing', 'bad', 'weak', 'dropping', 'selling off'];
  
  bullish.forEach(word => {
    if (lower.includes(word)) { score += 12; signals.push(word); }
  });
  bearish.forEach(word => {
    if (lower.includes(word)) { score -= 12; signals.push(word); }
  });
  
  // Emoji sentiment
  const bullishEmojis = ['🚀', '📈', '💎', '🌙', '🐂', '🟢', '🤑', '💰', '🔥', '⭐', '💪', '🎯'];
  const bearishEmojis = ['📉', '🐻', '🔴', '😱', '💀', '📊', '📉', '😭', '🤦', '🚨'];
  
  bullishEmojis.forEach(e => { if (text.includes(e)) { score += 8; signals.push(e); }});
  bearishEmojis.forEach(e => { if (text.includes(e)) { score -= 8; signals.push(e); }});
  
  // Account for engagement (likes, retweets) - higher weight for influential tweets
  const engagementWeight = Math.min((metrics?.like_count || 0) + (metrics?.retweet_count || 0) * 2, 20);
  score = score * (1 + engagementWeight / 100);
  
  const label = score >= 15 ? 'bullish' : score <= -15 ? 'bearish' : 'neutral';
  return { 
    score: Math.max(-100, Math.min(100, Math.round(score))), 
    label, 
    signals,
    engagement: metrics?.like_count || 0,
    retweets: metrics?.retweet_count || 0
  };
};

// Process X search response
const processXTweets = (data, ticker) => {
  const tweets = data.data || [];
  const users = data.includes?.users || [];
  const userMap = users.reduce((map, user) => {
    map[user.id] = user;
    return map;
  }, {});
  
  const processed = tweets.map(tweet => {
    const user = userMap[tweet.author_id] || {};
    const sentiment = scoreTweetSentiment(tweet.text, tweet.public_metrics);
    
    return {
      id: tweet.id,
      text: tweet.text,
      author: user.username || 'unknown',
      authorName: user.name || 'Unknown',
      verified: user.verified || false,
      createdAt: tweet.created_at,
      sentiment,
      likes: tweet.public_metrics?.like_count || 0,
      retweets: tweet.public_metrics?.retweet_count || 0,
      replies: tweet.public_metrics?.reply_count || 0,
      url: `https://twitter.com/${user.username}/status/${tweet.id}`
    };
  });
  
  // Calculate aggregate sentiment
  if (processed.length === 0) return null;
  
  const avgScore = processed.reduce((s, t) => s + t.sentiment.score, 0) / processed.length;
  const bullish = processed.filter(t => t.sentiment.label === 'bullish').length;
  const bearish = processed.filter(t => t.sentiment.label === 'bearish').length;
  const neutral = processed.length - bullish - bearish;
  
  // Weight by engagement for more accurate sentiment
  const weightedScore = processed.reduce((s, t) => {
    const weight = 1 + (t.likes + t.retweets * 2) / 100;
    return s + (t.sentiment.score * weight);
  }, 0) / processed.reduce((s, t) => {
    return s + (1 + (t.likes + t.retweets * 2) / 100);
  }, 0);
  
  const label = weightedScore >= 12 ? 'bullish' : weightedScore <= -12 ? 'bearish' : 'neutral';
  const color = label === 'bullish' ? 'green' : label === 'bearish' ? 'red' : 'yellow';
  
  return {
    ticker,
    score: Math.round(weightedScore),
    label,
    color,
    messageCount: processed.length,
    bullish,
    bearish,
    neutral,
    avgEngagement: Math.round(processed.reduce((s, t) => s + t.likes + t.retweets, 0) / processed.length),
    recentTweets: processed.slice(-5).reverse(),
    topInfluencer: processed
      .filter(t => t.verified || t.likes > 100)
      .sort((a, b) => (b.likes + b.retweets * 2) - (a.likes + a.retweets * 2))[0],
    updatedAt: new Date().toISOString()
  };
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const tickers = (req.query.tickers || '').split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    const influencers = (req.query.influencers || '').split(',').map(i => i.trim().replace('@', '')).filter(Boolean);
    const maxResults = parseInt(req.query.maxResults || '20', 10);
    
    if (!tickers.length && !influencers.length) {
      return res.status(400).json({ error: 'tickers or influencers parameter required' });
    }
    
    if (!X_BEARER_TOKEN && (!X_API_KEY || !X_API_SECRET)) {
      return res.status(500).json({ error: 'X API credentials not configured' });
    }
    
    const cacheKey = `twitter_${tickers.sort().join('_')}_${influencers.sort().join('_')}_${maxResults}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json({ ...cached.data, cached: true });
    }
    
    const results = {};
    const allTweets = [];
    
    // Search for ticker mentions
    await Promise.allSettled(
      tickers.map(async (ticker) => {
        try {
          const data = await searchXTweets(ticker, maxResults);
          const processed = processXTweets(data, ticker);
          if (processed) {
            results[ticker] = processed;
            allTweets.push(...(processed.recentTweets || []));
          }
        } catch (e) {
          console.error(`X API error for ${ticker}:`, e.message);
          results[ticker] = {
            ticker,
            error: e.message,
            score: 0,
            label: 'neutral',
            color: 'yellow',
            messageCount: 0
          };
        }
      })
    );
    
    // Get influencer timelines
    const influencerResults = {};
    await Promise.allSettled(
      influencers.map(async (username) => {
        try {
          const data = await getUserTimeline(username, Math.max(5, Math.floor(maxResults / 2)));
          const processed = processXTweets(data, 'influencer');
          
          // Extract tickers from influencer tweets
          const influencerTickers = {};
          if (data.data) {
            data.data.forEach(tweet => {
              const tickersInTweet = extractTickersFromText(tweet.text);
              tickersInTweet.forEach(ticker => {
                if (!influencerTickers[ticker]) {
                  influencerTickers[ticker] = [];
                }
                influencerTickers[ticker].push(tweet);
              });
            });
          }
          
          influencerResults[username] = {
            username,
            user: data.includes?.users?.[0],
            tweets: data.data || [],
            tickers: influencerTickers,
            updatedAt: new Date().toISOString()
          };
          
          // Add influencer tweets to overall pool
          allTweets.push(...(data.data || []));
        } catch (e) {
          console.error(`X API error for influencer ${username}:`, e.message);
          influencerResults[username] = {
            username,
            error: e.message,
            tweets: [],
            tickers: {}
          };
        }
      })
    );
    
    // Calculate overall sentiment
    const allSentiments = Object.values(results).filter(r => !r.error);
    const overall = allSentiments.length > 0 ? {
      avgScore: Math.round(allSentiments.reduce((s, r) => s + r.score, 0) / allSentiments.length),
      label: allSentiments.reduce((s, r) => s + (r.label === 'bullish' ? 1 : r.label === 'bearish' ? -1 : 0), 0) > 0 ? 'bullish' : 'bearish',
      messageCount: allSentiments.reduce((s, r) => s + r.messageCount, 0),
      alerts: allSentiments.filter(r => Math.abs(r.score) >= 35).map(r => ({ ticker: r.ticker, score: r.score, label: r.label }))
    } : null;
    
    // Merge influencer ticker data with main results
    Object.entries(influencerResults).forEach(([username, influencer]) => {
      if (influencer.tickers) {
        Object.entries(influencer.tickers).forEach(([ticker, tweets]) => {
          if (!results[ticker]) {
            results[ticker] = {
              ticker,
              score: 0,
              label: 'neutral',
              color: 'yellow',
              messageCount: 0,
              recentTweets: []
            };
          }
          
          // Add influencer tweets with higher weight
          const influencerTweets = tweets.map(tweet => ({
            ...tweet,
            fromInfluencer: username,
            influencerWeight: 1.5 // Higher weight for influencer tweets
          }));
          
          results[ticker].recentTweets.push(...influencerTweets);
          results[ticker].messageCount += tweets.length;
          
          // Recalculate sentiment with influencer weight
          if (results[ticker].recentTweets.length > 0) {
            const weightedScore = results[ticker].recentTweets.reduce((s, t) => {
              const weight = t.fromInfluencer ? 1.5 : 1.0;
              const sentiment = scoreTweetSentiment(t.text, t.public_metrics);
              return s + (sentiment.score * weight);
            }, 0) / results[ticker].recentTweets.reduce((s, t) => s + (t.fromInfluencer ? 1.5 : 1.0), 0);
            
            results[ticker].score = Math.round(weightedScore);
            results[ticker].label = weightedScore >= 15 ? 'bullish' : weightedScore <= -15 ? 'bearish' : 'neutral';
            results[ticker].color = results[ticker].label === 'bullish' ? 'green' : results[ticker].label === 'bearish' ? 'red' : 'yellow';
          }
        });
      }
    });

    const payload = {
      source: 'twitter',
      tickers: results,
      influencers: influencerResults,
      overall,
      maxResults,
      updatedAt: new Date().toISOString()
    };
    
    CACHE.set(cacheKey, { data: payload, ts: Date.now() });
    res.json(payload);
    
  } catch (error) {
    console.error('X sentiment API error:', error);
    return res.status(500).json({ error: error.message });
  }
};
