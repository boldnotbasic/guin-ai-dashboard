import React from 'react';
import { X, Bell, Calendar, Sparkles, TrendingUp, AlertTriangle, ExternalLink, Newspaper, Clock } from 'lucide-react';
import { ALERT_TYPES } from '../utils/alertSystem';

// Alert Modal Component
export const AlertModal = ({ 
  show, 
  onClose, 
  alerts, 
  newAlert, 
  setNewAlert, 
  onAddAlert, 
  onRemoveAlert, 
  onToggleAlert,
  screenerData 
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="gradient-card rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bell className="w-6 h-6 text-yellow-400" />
            <h2 className="text-white text-xl font-semibold">Alerts Beheren</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Add New Alert */}
        <div className="glass-effect rounded-lg p-4 mb-4">
          <h3 className="text-white font-medium mb-3">Nieuwe Alert</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Ticker (bijv. AAPL)"
              value={newAlert.ticker}
              onChange={(e) => setNewAlert({ ...newAlert, ticker: e.target.value.toUpperCase() })}
              className="input-plain rounded-lg px-3 py-2"
            />
            <input
              type="text"
              placeholder="Naam"
              value={newAlert.name}
              onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
              className="input-plain rounded-lg px-3 py-2"
            />
            <select
              value={newAlert.type}
              onChange={(e) => {
                const type = e.target.value;
                setNewAlert({ ...newAlert, type, value: ALERT_TYPES[type].defaultValue });
              }}
              className="input-plain rounded-lg px-3 py-2"
            >
              {Object.entries(ALERT_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            {newAlert.type !== 'signal_buy' && newAlert.type !== 'signal_sell' && (
              <input
                type="number"
                placeholder="Waarde"
                value={newAlert.value}
                onChange={(e) => setNewAlert({ ...newAlert, value: parseFloat(e.target.value) || 0 })}
                className="input-plain rounded-lg px-3 py-2"
              />
            )}
          </div>
          <button onClick={onAddAlert} className="btn-primary w-full mt-3 py-2 rounded-lg">
            Alert Toevoegen
          </button>
        </div>

        {/* Existing Alerts */}
        <div>
          <h3 className="text-white font-medium mb-3">Actieve Alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-4">Geen alerts ingesteld</p>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="glass-effect rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{alert.name}</span>
                      <span className="text-white/40 text-sm">{alert.ticker}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${alert.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {alert.enabled ? 'Actief' : 'Uit'}
                      </span>
                    </div>
                    <p className="text-white/60 text-xs mt-1">
                      {ALERT_TYPES[alert.type]?.label} 
                      {alert.value !== null && alert.value !== undefined && `: ${alert.value}`}
                    </p>
                    {alert.triggeredAt && (
                      <p className="text-yellow-400 text-xs mt-1">
                        Laatste trigger: {new Date(alert.triggeredAt).toLocaleString('nl-NL')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onToggleAlert(alert.id)}
                      className={`px-3 py-1 rounded text-xs ${alert.enabled ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}
                    >
                      {alert.enabled ? 'Pauzeer' : 'Activeer'}
                    </button>
                    <button
                      onClick={() => onRemoveAlert(alert.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Earnings Calendar Modal
export const EarningsModal = ({ show, onClose, earningsData, loadingEarnings, earningsCalendar, onRefresh }) => {
  if (!show) return null;

  const upcomingEarnings = earningsCalendar.getUpcomingEarnings(earningsData, 90, 7);
  const groups = earningsCalendar.groupEarnings(upcomingEarnings);
  const totalCount = upcomingEarnings.length;
  const totalTrackedTickers = Object.keys(earningsData).length;

  const renderEarning = (earning) => {
    const avgSurprise = earningsCalendar.getAverageSurprise(earning.history);
    const beatRate = earningsCalendar.getBeatRate(earning.history);
    const isPortfolio = earning.source === 'portfolio';
    const dateLabel = earningsCalendar.formatEarningsDate(earning.nextEarningsDate);
    const isImminent = earning.nextEarningsDate && 
      (earning.nextEarningsDate - new Date()) / (1000 * 60 * 60 * 24) <= 7 &&
      (earning.nextEarningsDate - new Date()) / (1000 * 60 * 60 * 24) >= 0;
    const currencySymbol = earning.currency === 'EUR' ? '€' : '$';

    return (
      <div 
        key={earning.ticker} 
        className={`glass-effect rounded-lg p-4 border ${isImminent ? 'border-yellow-500/30' : 'border-white/5'}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="text-white font-semibold">{earning.displayName || earning.name || earning.ticker}</h3>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/70 font-mono">{earning.ticker}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                isPortfolio 
                  ? 'bg-blue-500/20 text-blue-300' 
                  : 'bg-purple-500/20 text-purple-300'
              }`}>
                {isPortfolio ? 'Portfolio' : 'Watchlist'}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <p className={`text-sm ${isImminent ? 'text-yellow-400 font-medium' : 'text-white/60'}`}>
                {dateLabel}
              </p>
              {isImminent && <span className="text-yellow-400 text-xs">⚡ Binnenkort!</span>}
            </div>
          </div>
          {earning.estimatedEPS != null && (
            <div className="text-right ml-3 flex-shrink-0">
              <p className="text-white/40 text-xs">Verwachte EPS</p>
              <p className="text-white font-medium">{currencySymbol}{earning.estimatedEPS.toFixed(2)}</p>
            </div>
          )}
        </div>
        
        {earning.history && earning.history.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
            {earning.history[0]?.epsActual != null && (
              <div>
                <p className="text-white/40 text-xs">Laatste EPS</p>
                <p className="text-white text-sm font-medium">
                  {currencySymbol}{earning.history[0].epsActual.toFixed(2)}
                </p>
              </div>
            )}
            {avgSurprise !== null && (
              <div>
                <p className="text-white/40 text-xs">Gem. Surprise</p>
                <p className={`text-sm font-medium ${avgSurprise >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {avgSurprise >= 0 ? '+' : ''}{avgSurprise.toFixed(1)}%
                </p>
              </div>
            )}
            {beatRate !== null && (
              <div>
                <p className="text-white/40 text-xs">Beat Rate</p>
                <p className={`text-sm font-medium ${beatRate >= 60 ? 'text-green-400' : beatRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {beatRate.toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderGroup = (title, items, color = 'text-white/60') => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-4">
        <h3 className={`text-sm font-semibold mb-2 ${color} flex items-center space-x-2`}>
          <span>{title}</span>
          <span className="text-xs text-white/40">({items.length})</span>
        </h3>
        <div className="space-y-2">
          {items.map(renderEarning)}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="gradient-card rounded-xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-white text-xl font-semibold">Earnings Calendar</h2>
              <p className="text-white/40 text-xs">
                {totalTrackedTickers > 0
                  ? `${totalCount} earnings • ${totalTrackedTickers} aandelen gevolgd`
                  : 'Portfolio + Watchlist'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href="https://stockanalysis.com/stocks/earnings-calendar/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-white/60 hover:text-white text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
              title="Bekijk volledige earnings calendar"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Volledige Calendar</span>
            </a>
            {onRefresh && (
              <button 
                onClick={onRefresh} 
                disabled={loadingEarnings}
                className="text-white/60 hover:text-white text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50"
                title="Earnings opnieuw ophalen"
              >
                Vernieuwen
              </button>
            )}
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {loadingEarnings ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-white/60">Earnings data laden...</p>
            <p className="text-white/30 text-xs mt-2">Dit kan een moment duren voor alle aandelen</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 mb-2">Geen earnings gevonden</p>
            <p className="text-white/40 text-xs">
              {totalTrackedTickers === 0 
                ? 'Voeg eerst aandelen toe aan je portfolio of watchlist'
                : 'Geen earnings gepland in de komende 90 dagen voor je aandelen'}
            </p>
          </div>
        ) : (
          <div>
            {renderGroup('Vandaag', groups.today, 'text-yellow-400')}
            {renderGroup('Deze week', groups.thisWeek, 'text-orange-400')}
            {renderGroup('Deze maand', groups.thisMonth, 'text-blue-400')}
            {renderGroup('Later', groups.later, 'text-white/60')}
            {renderGroup('Recente reports', groups.past, 'text-white/40')}
          </div>
        )}
      </div>
    </div>
  );
};

// AI Analysis Modal
export const AIModal = ({ show, onClose, aiAnalysis, loadingAI, selectedStock, tickerNews = [] }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="gradient-card rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h2 className="text-white text-xl font-semibold">AI Stock Analyse</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {selectedStock && (
          <div className="glass-effect rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">{selectedStock.name}</h3>
                <p className="text-white/60 text-sm">{selectedStock.ticker}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">€{selectedStock.currentPrice?.toFixed(2)}</p>
                <p className={`text-sm ${selectedStock.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedStock.dailyChange >= 0 ? '+' : ''}{selectedStock.dailyChange?.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {loadingAI ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-white/60">AI analyseert {selectedStock?.name}...</p>
            <p className="text-white/40 text-xs mt-2">Dit kan 10-20 seconden duren</p>
          </div>
        ) : aiAnalysis?.error ? (
          <div className="glass-effect rounded-lg p-4 border border-red-500/20">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Fout bij AI analyse</p>
                <p className="text-white/60 text-sm mt-1">{aiAnalysis.error}</p>
              </div>
            </div>
          </div>
        ) : aiAnalysis?.analysis ? (
          <div className="glass-effect rounded-lg p-4">
            <div className="prose prose-invert max-w-none">
              <div className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">
                {aiAnalysis.analysis}
              </div>
            </div>
            <p className="text-white/30 text-xs mt-4">
              Gegenereerd op: {new Date(aiAnalysis.timestamp).toLocaleString('nl-NL')}
            </p>
          </div>
        ) : (
          <p className="text-white/40 text-center py-8">Selecteer een aandeel om te analyseren</p>
        )}

        {tickerNews && tickerNews.length > 0 && (
          <div className="glass-effect rounded-lg p-4 mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Newspaper className="w-4 h-4 text-cyan-400" />
              <h3 className="text-white font-medium text-sm">Recent nieuws</h3>
            </div>
            <div className="space-y-2">
              {tickerNews.slice(0, 3).map((n, i) => (
                <a key={i} href={n.link || n.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-white/5 rounded p-2 transition-colors">
                  <p className="text-white text-sm leading-snug line-clamp-2 hover:text-cyan-300">{n.title}</p>
                  <div className="flex items-center space-x-2 mt-1.5">
                    {n.publisher && <span className="text-white/40 text-xs">{n.publisher}</span>}
                    {n.publishedAt && (
                      <span className="text-white/30 text-xs flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(n.publishedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                      </span>
                    )}
                    <ExternalLink className="w-3 h-3 text-white/20 ml-auto" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Notifications Toast
export const NotificationsToast = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 space-y-2 max-w-md">
      {notifications.slice(0, 3).map((notif, index) => (
        <div
          key={index}
          className="glass-effect rounded-lg p-4 shadow-xl border border-yellow-500/20 animate-slide-in-right"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium text-sm">{notif.message}</p>
                <p className="text-white/40 text-xs mt-1">
                  {notif.timestamp.toLocaleTimeString('nl-NL')}
                </p>
              </div>
            </div>
            <button
              onClick={() => onDismiss(index)}
              className="text-white/40 hover:text-white ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
