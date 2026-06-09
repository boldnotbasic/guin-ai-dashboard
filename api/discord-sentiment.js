// /api/discord-sentiment.js
// Discord webhook listener + ticker sentiment analyzer
// POST endpoint to receive Discord messages, analyze ticker mentions, store sentiment

const DISCORD_WEBHOOK_SECRET = process.env.DISCORD_WEBHOOK_SECRET || 'your-secret-key';
const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

// In-memory store for recent messages (in production: use DB)
const messageStore = new Map();

// Extract tickers from text
const extractTickers = (text) => {
  const tickers = text.match(/\$([A-Z]{1,5})\b/g) || [];
  const cashtags = [...new Set(tickers.map(t => t.slice(1)))];
  // Also look for common tickers without $ (AAPL, NVDA, etc.)
  const plainTickers = text.match(/\b(AAPL|MSFT|NVDA|GOOGL|AMZN|META|TSLA|JPM|BAC|WMT|DIS|NFLX|AMD|AVGO|ORCL|CRM|UBER|SHOP|ABNB|PLTR|SPY|QQQ|BTC|ETH|SOL|DOGE|ADA|DOT|AVAX|LINK|MATIC|UNI|AAVE|COMP)\b/gi) || [];
  return [...new Set([...cashtags, ...plainTickers.map(t => t.toUpperCase())])];
};

// Sentiment scoring keywords
const sentimentWords = {
  bullish: ['moon', 'rocket', 'bullish', 'buy', 'long', 'diamond', 'hands', 'pump', 'rally', 'breakout', ' ATH', 'all time high', 'going up', 'to the moon', 'bull run', 'buying', 'calls', 'green', 'gain', 'profit', 'win', 'strong', 'bull', 'hold', 'hodl', 'accumulating', 'loading up', 'adding', 'stacking'],
  bearish: ['dump', 'bearish', 'sell', 'short', 'crash', 'dumping', 'falling', 'plummet', 'collapse', 'bear', 'red', 'loss', 'sell-off', 'correction', 'recession', 'fear', 'panic', 'puts', 'losing', 'bad', 'weak', 'crashing', 'dropping', 'getting rekt', 'liquidating', 'selling off', 'dumping']
};

const scoreSentiment = (text) => {
  const lower = text.toLowerCase();
  let score = 0;
  let signals = [];
  
  for (const word of sentimentWords.bullish) {
    if (lower.includes(word)) { score += 15; signals.push(word); }
  }
  for (const word of sentimentWords.bearish) {
    if (lower.includes(word)) { score -= 15; signals.push(word); }
  }
  
  // Emoji sentiment
  const bullishEmojis = ['🚀', '📈', '💎', '🌙', '🐂', '🟢', '🤑', '💰', '🔥', '⭐'];
  const bearishEmojis = ['📉', '🐻', '🔴', '😱', '💀', '📊', '📉', '📉', '📉', '📉'];
  
  bullishEmojis.forEach(e => { if (text.includes(e)) { score += 10; signals.push(e); }});
  bearishEmojis.forEach(e => { if (text.includes(e)) { score -= 10; signals.push(e); }});
  
  const label = score >= 20 ? 'bullish' : score <= -20 ? 'bearish' : 'neutral';
  return { score: Math.max(-100, Math.min(100, score)), label, signals };
};

// Store message in memory
const storeMessage = (data) => {
  const key = `${data.ticker}_${data.timestamp}`;
  messageStore.set(key, data);
  
  // Keep only last 100 messages per ticker
  const tickerMessages = [...messageStore.entries()].filter(([k]) => k.startsWith(data.ticker + '_'));
  if (tickerMessages.length > 100) {
    const toDelete = tickerMessages.slice(0, -100).map(([k]) => k);
    toDelete.forEach(k => messageStore.delete(k));
  }
};

// Get recent sentiment for ticker
const getTickerSentiment = (ticker, minutes = 60) => {
  const cutoff = Date.now() - (minutes * 60 * 1000);
  const messages = [...messageStore.values()]
    .filter(m => m.ticker === ticker && m.timestamp > cutoff);
  
  if (messages.length === 0) return null;
  
  const avgScore = messages.reduce((s, m) => s + m.sentiment.score, 0) / messages.length;
  const bullish = messages.filter(m => m.sentiment.label === 'bullish').length;
  const bearish = messages.filter(m => m.sentiment.label === 'bearish').length;
  const neutral = messages.length - bullish - bearish;
  
  const label = avgScore >= 15 ? 'bullish' : avgScore <= -15 ? 'bearish' : 'neutral';
  const color = label === 'bullish' ? 'green' : label === 'bearish' ? 'red' : 'yellow';
  
  return {
    ticker,
    score: Math.round(avgScore),
    label,
    color,
    messageCount: messages.length,
    bullish,
    bearish,
    neutral,
    recentMessages: messages.slice(-5).reverse(),
    updatedAt: new Date().toISOString()
  };
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Discord-Signature, X-Discord-Timestamp');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: Receive Discord webhook
  if (req.method === 'POST') {
    try {
      // Verify Discord webhook signature (optional but recommended)
      const signature = req.headers['x-discord-signature'];
      const timestamp = req.headers['x-discord-timestamp'];
      
      const body = JSON.stringify(req.body);
      // In production: verify HMAC signature with DISCORD_WEBHOOK_SECRET
      
      const { content, author, timestamp: msgTime, channel_name, guild_name } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Invalid Discord message format' });
      }
      
      // Extract tickers from message
      const tickers = extractTickers(content);
      if (tickers.length === 0) {
        return res.json({ status: 'no_tickers', message: 'No ticker mentions found' });
      }
      
      // Process each ticker
      const results = [];
      for (const ticker of tickers) {
        const sentiment = scoreSentiment(content);
        const messageData = {
          ticker,
          content,
          author: author?.username || 'Unknown',
          channel: channel_name || 'Unknown',
          guild: guild_name || 'Unknown',
          timestamp: Date.now(),
          discordTimestamp: msgTime,
          sentiment
        };
        
        storeMessage(messageData);
        results.push({ ticker, sentiment: sentiment.label, score: sentiment.score });
      }
      
      return res.json({ 
        status: 'processed', 
        tickers: results.length,
        data: results,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Discord webhook error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // GET: Get sentiment data for tickers
  if (req.method === 'GET') {
    try {
      const tickers = (req.query.tickers || '').split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
      const minutes = parseInt(req.query.minutes || '60', 10);
      
      if (!tickers.length) {
        return res.status(400).json({ error: 'tickers parameter required' });
      }
      
      const results = {};
      tickers.forEach(ticker => {
        const sentiment = getTickerSentiment(ticker, minutes);
        if (sentiment) {
          results[ticker] = sentiment;
        }
      });
      
      // Calculate overall sentiment
      const allSentiments = Object.values(results);
      const overall = allSentiments.length > 0 ? {
        avgScore: Math.round(allSentiments.reduce((s, r) => s + r.score, 0) / allSentiments.length),
        label: allSentiments.reduce((s, r) => s + (r.label === 'bullish' ? 1 : r.label === 'bearish' ? -1 : 0), 0) > 0 ? 'bullish' : 'bearish',
        messageCount: allSentiments.reduce((s, r) => s + r.messageCount, 0),
        alerts: allSentiments.filter(r => Math.abs(r.score) >= 40).map(r => ({ ticker: r.ticker, score: r.score, label: r.label }))
      } : null;
      
      return res.json({
        source: 'discord',
        tickers: results,
        overall,
        minutes,
        totalMessages: messageStore.size,
        updatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Discord sentiment GET error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};
