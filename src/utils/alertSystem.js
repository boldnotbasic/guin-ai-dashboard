// Alert system for stock notifications
// Monitors RSI, price targets, volume spikes, etc.

export class AlertSystem {
  constructor() {
    this.alerts = this.loadAlerts();
    this.triggered = new Set();
  }

  // Load alerts from localStorage
  loadAlerts() {
    try {
      const stored = localStorage.getItem('stock_alerts');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Save alerts to localStorage
  saveAlerts() {
    try {
      localStorage.setItem('stock_alerts', JSON.stringify(this.alerts));
    } catch (e) {
      console.error('Failed to save alerts:', e);
    }
  }

  // Add new alert
  addAlert(alert) {
    const newAlert = {
      id: Date.now() + Math.random(),
      ticker: alert.ticker,
      name: alert.name,
      type: alert.type, // 'rsi_oversold', 'rsi_overbought', 'price_above', 'price_below', 'volume_spike', 'macd_cross'
      value: alert.value,
      enabled: true,
      createdAt: new Date().toISOString(),
      triggeredAt: null
    };
    this.alerts.push(newAlert);
    this.saveAlerts();
    return newAlert;
  }

  // Remove alert
  removeAlert(id) {
    this.alerts = this.alerts.filter(a => a.id !== id);
    this.saveAlerts();
  }

  // Toggle alert enabled/disabled
  toggleAlert(id) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.enabled = !alert.enabled;
      this.saveAlerts();
    }
  }

  // Check alerts against current data
  checkAlerts(stockData) {
    const notifications = [];

    for (const alert of this.alerts) {
      if (!alert.enabled) continue;
      
      const stock = stockData[alert.ticker];
      if (!stock) continue;

      let triggered = false;
      let message = '';

      switch (alert.type) {
        case 'rsi_oversold':
          if (stock.rsi && stock.rsi < (alert.value || 30)) {
            triggered = true;
            message = `${alert.name} (${alert.ticker}) is oversold! RSI: ${stock.rsi.toFixed(0)}`;
          }
          break;

        case 'rsi_overbought':
          if (stock.rsi && stock.rsi > (alert.value || 70)) {
            triggered = true;
            message = `${alert.name} (${alert.ticker}) is overbought! RSI: ${stock.rsi.toFixed(0)}`;
          }
          break;

        case 'price_above':
          if (stock.currentPrice && stock.currentPrice > alert.value) {
            triggered = true;
            message = `${alert.name} (${alert.ticker}) is boven €${alert.value}! Huidige prijs: €${stock.currentPrice.toFixed(2)}`;
          }
          break;

        case 'price_below':
          if (stock.currentPrice && stock.currentPrice < alert.value) {
            triggered = true;
            message = `${alert.name} (${alert.ticker}) is onder €${alert.value}! Huidige prijs: €${stock.currentPrice.toFixed(2)}`;
          }
          break;

        case 'volume_spike':
          if (stock.volume && stock.avgVolume && stock.volume > stock.avgVolume * (alert.value || 2)) {
            triggered = true;
            message = `${alert.name} (${alert.ticker}) heeft abnormaal hoog volume! ${((stock.volume / stock.avgVolume) * 100).toFixed(0)}% van gemiddelde`;
          }
          break;

        case 'macd_cross':
          if (stock.macd && stock.macd.histogram > 0 && alert.value === 'bullish') {
            triggered = true;
            message = `${alert.name} (${alert.ticker}) heeft bullish MACD crossover!`;
          } else if (stock.macd && stock.macd.histogram < 0 && alert.value === 'bearish') {
            triggered = true;
            message = `${alert.name} (${alert.ticker}) heeft bearish MACD crossover!`;
          }
          break;

        case 'signal_buy':
          if (stock.signal && (stock.signal.overall === 'STRONG BUY' || stock.signal.overall === 'BUY')) {
            triggered = true;
            message = `${alert.name} (${alert.ticker}) heeft ${stock.signal.overall} signaal!`;
          }
          break;

        case 'signal_sell':
          if (stock.signal && (stock.signal.overall === 'STRONG SELL' || stock.signal.overall === 'SELL')) {
            triggered = true;
            message = `${alert.name} (${alert.ticker}) heeft ${stock.signal.overall} signaal!`;
          }
          break;
      }

      if (triggered) {
        // Check if already triggered recently (prevent spam)
        const key = `${alert.id}-${new Date().toDateString()}`;
        if (!this.triggered.has(key)) {
          this.triggered.add(key);
          alert.triggeredAt = new Date().toISOString();
          notifications.push({
            alert,
            message,
            timestamp: new Date()
          });
        }
      }
    }

    if (notifications.length > 0) {
      this.saveAlerts();
    }

    return notifications;
  }

  // Get all alerts
  getAlerts() {
    return this.alerts;
  }

  // Get alerts for specific ticker
  getAlertsForTicker(ticker) {
    return this.alerts.filter(a => a.ticker === ticker);
  }

  // Clear triggered cache (call daily)
  clearTriggeredCache() {
    this.triggered.clear();
  }
}

// Singleton instance
export const alertSystem = new AlertSystem();

// Alert type definitions
export const ALERT_TYPES = {
  rsi_oversold: { label: 'RSI Oversold', description: 'Trigger wanneer RSI onder waarde', defaultValue: 30 },
  rsi_overbought: { label: 'RSI Overbought', description: 'Trigger wanneer RSI boven waarde', defaultValue: 70 },
  price_above: { label: 'Prijs Boven', description: 'Trigger wanneer prijs boven target', defaultValue: 0 },
  price_below: { label: 'Prijs Onder', description: 'Trigger wanneer prijs onder target', defaultValue: 0 },
  volume_spike: { label: 'Volume Spike', description: 'Trigger bij abnormaal volume (x gemiddelde)', defaultValue: 2 },
  macd_cross: { label: 'MACD Crossover', description: 'Trigger bij bullish/bearish crossover', defaultValue: 'bullish' },
  signal_buy: { label: 'Buy Signal', description: 'Trigger bij BUY of STRONG BUY signaal', defaultValue: null },
  signal_sell: { label: 'Sell Signal', description: 'Trigger bij SELL of STRONG SELL signaal', defaultValue: null }
};
