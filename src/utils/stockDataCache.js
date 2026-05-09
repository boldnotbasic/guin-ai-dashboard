// Smart caching system for stock data
// Reduces API calls and improves performance

const CACHE_DURATION = {
  QUOTE: 5 * 60 * 1000,        // 5 minutes for quotes
  CHART: 15 * 60 * 1000,       // 15 minutes for chart data
  NEWS: 30 * 60 * 1000,        // 30 minutes for news
  FUNDAMENTALS: 60 * 60 * 1000 // 1 hour for fundamentals
};

class StockDataCache {
  constructor() {
    this.cache = new Map();
    this.loadFromLocalStorage();
  }

  // Generate cache key
  _key(type, symbol, params = {}) {
    const paramStr = Object.keys(params).sort().map(k => `${k}:${params[k]}`).join('|');
    return `${type}:${symbol}${paramStr ? ':' + paramStr : ''}`;
  }

  // Check if cache entry is valid
  _isValid(entry, duration) {
    if (!entry) return false;
    return Date.now() - entry.timestamp < duration;
  }

  // Get from cache
  get(type, symbol, params = {}) {
    const key = this._key(type, symbol, params);
    const entry = this.cache.get(key);
    const duration = CACHE_DURATION[type.toUpperCase()] || CACHE_DURATION.QUOTE;
    
    if (this._isValid(entry, duration)) {
      return entry.data;
    }
    return null;
  }

  // Set cache entry
  set(type, symbol, data, params = {}) {
    const key = this._key(type, symbol, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.saveToLocalStorage();
  }

  // Clear cache for specific symbol
  clear(symbol) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(`:${symbol}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveToLocalStorage();
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
    localStorage.removeItem('stock_data_cache');
  }

  // Save to localStorage (max 5MB, keep most recent)
  saveToLocalStorage() {
    try {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, 100); // Keep only 100 most recent entries
      
      localStorage.setItem('stock_data_cache', JSON.stringify(entries));
    } catch (e) {
      // If quota exceeded, clear old entries
      if (e.name === 'QuotaExceededError') {
        const entries = Array.from(this.cache.entries())
          .sort((a, b) => b[1].timestamp - a[1].timestamp)
          .slice(0, 50);
        this.cache = new Map(entries);
        localStorage.setItem('stock_data_cache', JSON.stringify(entries));
      }
    }
  }

  // Load from localStorage
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('stock_data_cache');
      if (stored) {
        const entries = JSON.parse(stored);
        this.cache = new Map(entries);
      }
    } catch (e) {
      console.error('Failed to load cache from localStorage:', e);
    }
  }

  // Get cache stats
  getStats() {
    let totalSize = 0;
    let validCount = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      const type = key.split(':')[0].toUpperCase();
      const duration = CACHE_DURATION[type] || CACHE_DURATION.QUOTE;
      if (now - entry.timestamp < duration) {
        validCount++;
      }
      totalSize += JSON.stringify(entry).length;
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      sizeKB: (totalSize / 1024).toFixed(2)
    };
  }
}

// Singleton instance
export const stockCache = new StockDataCache();

// Technical indicators calculator
export const technicalIndicators = {
  // Calculate RSI (Relative Strength Index)
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    let avgGain = 0;
    let avgLoss = 0;
    
    // Initial average
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) avgGain += changes[i];
      else avgLoss += Math.abs(changes[i]);
    }
    avgGain /= period;
    avgLoss /= period;
    
    // Smooth with remaining values
    for (let i = period; i < changes.length; i++) {
      if (changes[i] > 0) {
        avgGain = (avgGain * (period - 1) + changes[i]) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(changes[i])) / period;
      }
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  },

  // Calculate MACD (Moving Average Convergence Divergence)
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return null;
    
    const ema = (data, period) => {
      const k = 2 / (period + 1);
      let emaValue = data[0];
      for (let i = 1; i < data.length; i++) {
        emaValue = data[i] * k + emaValue * (1 - k);
      }
      return emaValue;
    };
    
    const fastEMA = ema(prices.slice(-fastPeriod), fastPeriod);
    const slowEMA = ema(prices.slice(-slowPeriod), slowPeriod);
    const macdLine = fastEMA - slowEMA;
    
    // Calculate signal line (EMA of MACD)
    const macdHistory = [];
    for (let i = slowPeriod; i < prices.length; i++) {
      const fEMA = ema(prices.slice(i - fastPeriod, i), fastPeriod);
      const sEMA = ema(prices.slice(i - slowPeriod, i), slowPeriod);
      macdHistory.push(fEMA - sEMA);
    }
    
    const signalLine = macdHistory.length >= signalPeriod 
      ? ema(macdHistory.slice(-signalPeriod), signalPeriod)
      : macdLine;
    
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram,
      trend: histogram > 0 ? 'bullish' : 'bearish'
    };
  },

  // Calculate Simple Moving Average
  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  },

  // Calculate Exponential Moving Average
  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  },

  // Calculate Bollinger Bands
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
    
    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);
    
    // Calculate standard deviation
    const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
    const sd = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * sd),
      middle: sma,
      lower: sma - (stdDev * sd),
      bandwidth: ((sma + stdDev * sd) - (sma - stdDev * sd)) / sma * 100
    };
  },

  // Get signal interpretation
  getSignal(rsi, macd, price, sma50, sma200) {
    const signals = [];
    let score = 0;
    
    // RSI signals
    if (rsi !== null) {
      if (rsi < 30) {
        signals.push({ type: 'RSI', signal: 'Oversold', strength: 'strong', impact: +2 });
        score += 2;
      } else if (rsi > 70) {
        signals.push({ type: 'RSI', signal: 'Overbought', strength: 'strong', impact: -2 });
        score -= 2;
      } else if (rsi < 40) {
        signals.push({ type: 'RSI', signal: 'Bearish', strength: 'weak', impact: +1 });
        score += 1;
      } else if (rsi > 60) {
        signals.push({ type: 'RSI', signal: 'Bullish', strength: 'weak', impact: -1 });
        score -= 1;
      }
    }
    
    // MACD signals
    if (macd) {
      if (macd.histogram > 0 && macd.macd > macd.signal) {
        signals.push({ type: 'MACD', signal: 'Bullish', strength: 'strong', impact: +2 });
        score += 2;
      } else if (macd.histogram < 0 && macd.macd < macd.signal) {
        signals.push({ type: 'MACD', signal: 'Bearish', strength: 'strong', impact: -2 });
        score -= 2;
      }
    }
    
    // Moving Average signals
    if (sma50 && sma200) {
      if (price > sma50 && sma50 > sma200) {
        signals.push({ type: 'MA', signal: 'Golden Cross', strength: 'strong', impact: +3 });
        score += 3;
      } else if (price < sma50 && sma50 < sma200) {
        signals.push({ type: 'MA', signal: 'Death Cross', strength: 'strong', impact: -3 });
        score -= 3;
      } else if (price > sma50) {
        signals.push({ type: 'MA', signal: 'Above 50-day', strength: 'weak', impact: +1 });
        score += 1;
      } else if (price < sma50) {
        signals.push({ type: 'MA', signal: 'Below 50-day', strength: 'weak', impact: -1 });
        score -= 1;
      }
    }
    
    // Overall signal
    let overall = 'NEUTRAL';
    if (score >= 4) overall = 'STRONG BUY';
    else if (score >= 2) overall = 'BUY';
    else if (score <= -4) overall = 'STRONG SELL';
    else if (score <= -2) overall = 'SELL';
    
    return {
      signals,
      score,
      overall,
      confidence: Math.min(100, Math.abs(score) * 15)
    };
  }
};

// Performance metrics calculator
export const performanceMetrics = {
  // Calculate Sharpe Ratio (risk-adjusted return)
  calculateSharpeRatio(returns, riskFreeRate = 0.04) {
    if (returns.length < 2) return null;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return null;
    
    const annualizedReturn = avgReturn * 252; // 252 trading days
    const annualizedStdDev = stdDev * Math.sqrt(252);
    
    return (annualizedReturn - riskFreeRate) / annualizedStdDev;
  },

  // Calculate Beta (volatility vs market)
  calculateBeta(stockReturns, marketReturns) {
    if (stockReturns.length !== marketReturns.length || stockReturns.length < 2) return null;
    
    const avgStock = stockReturns.reduce((sum, r) => sum + r, 0) / stockReturns.length;
    const avgMarket = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
    
    let covariance = 0;
    let marketVariance = 0;
    
    for (let i = 0; i < stockReturns.length; i++) {
      covariance += (stockReturns[i] - avgStock) * (marketReturns[i] - avgMarket);
      marketVariance += Math.pow(marketReturns[i] - avgMarket, 2);
    }
    
    covariance /= stockReturns.length;
    marketVariance /= marketReturns.length;
    
    if (marketVariance === 0) return null;
    
    return covariance / marketVariance;
  },

  // Calculate Alpha (excess return vs expected)
  calculateAlpha(stockReturn, beta, marketReturn, riskFreeRate = 0.04) {
    const expectedReturn = riskFreeRate + beta * (marketReturn - riskFreeRate);
    return stockReturn - expectedReturn;
  },

  // Calculate Maximum Drawdown
  calculateMaxDrawdown(prices) {
    if (prices.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > peak) {
        peak = prices[i];
      }
      const drawdown = (peak - prices[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100; // Return as percentage
  },

  // Calculate annualized return
  calculateAnnualizedReturn(startValue, endValue, days) {
    if (days === 0 || startValue === 0) return 0;
    const totalReturn = (endValue - startValue) / startValue;
    const years = days / 365;
    return (Math.pow(1 + totalReturn, 1 / years) - 1) * 100;
  }
};
