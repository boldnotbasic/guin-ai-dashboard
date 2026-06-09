import React, { useState, useEffect, useRef } from 'react';
import { Plus, TrendingUp, DollarSign, Edit, Trash2, Search, ExternalLink, Link as LinkIcon, X, TrendingDown, Activity, Upload, Image, BarChart2, RefreshCw, Newspaper, Clock, Eye, Star, Info, FileText, TrendingUpIcon, Filter, SortAsc, Bell, Calendar, Sparkles, Download, BellRing, Trophy, Gem, AlertCircle, Bot, ChevronDown, Building, GitCompare, Check, Lightbulb, Sliders } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import axios from 'axios';
import { db, supabase, storage } from '../utils/supabaseClient';
import { stockCache, technicalIndicators, performanceMetrics } from '../utils/stockDataCache';
import { alertSystem, ALERT_TYPES } from '../utils/alertSystem';
import { earningsCalendar } from '../utils/earningsCalendar';
import { aiAnalyzer } from '../utils/aiAnalyzer';
import { dataExporter } from '../utils/exportData';
import { getAIExplanation } from '../utils/aiExplain';
import { fetchYahooAnalystBatch } from '../utils/yahooAnalyst';
import etfMetadata from '../data/etfMetadata.json';
import { AlertModal, EarningsModal, AIModal, NotificationsToast } from './BeleggenModals';
import SemanticSearchPanel from './SemanticSearchPanel';
import PortfolioAIPanel from './PortfolioAIPanel';
import StockAIAssistant from './StockAIAssistant';
import MarketMetersWidget from './MarketMetersWidget';
import MarketIntelligenceWidget from './MarketIntelligenceWidget';
import MarketScannerWidget from './MarketScannerWidget';
import RiskAgentWidget from './RiskAgentWidget';
import DailyDecisionsPanel from './DailyDecisionsPanel';
import BuyOrWaitWidget from './BuyOrWaitWidget';

// Sparkline component for mini charts
const Sparkline = ({ data, color, width = 100, height = 30 }) => {
  if (!data || data.length === 0) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
};

// Get currency symbol from currency code
const getCurrencySymbol = (currency) => {
  switch (currency) {
    case 'EUR': return '€';
    case 'USD': return '$';
    case 'GBP': return '£';
    case 'SEK': return 'kr';
    case 'NOK': return 'kr';
    case 'DKK': return 'kr';
    case 'CHF': return 'CHF ';
    case 'JPY': return '¥';
    case 'CAD': return 'C$';
    case 'AUD': return 'A$';
    case 'HKD': return 'HK$';
    default: return currency ? currency + ' ' : '$';
  }
};

// Format market cap to readable string
const formatMcap = (mc) => {
  if (!mc) return '?';
  if (mc >= 1e12) return `${(mc / 1e12).toFixed(1)}T`;
  if (mc >= 1e9) return `${(mc / 1e9).toFixed(1)}B`;
  if (mc >= 1e6) return `${(mc / 1e6).toFixed(1)}M`;
  if (mc >= 1e3) return `${(mc / 1e3).toFixed(1)}K`;
  return mc.toFixed(0);
};

// Check if market is open based on timezone
const isMarketOpen = (currency, exchange) => {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sunday, 6=Saturday
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // US markets (NYSE, NASDAQ): 9:30 AM - 4:00 PM EST (UTC-5) = 14:30 - 21:00 UTC
  // During DST (EDT, UTC-4): 13:30 - 20:00 UTC
  if (currency === 'USD') {
    // Simplified: check both EST and EDT ranges
    return (timeInMinutes >= 13 * 60 + 30 && timeInMinutes < 21 * 60);
  }
  
  // European markets: 9:00 AM - 5:30 PM CET (UTC+1) = 8:00 - 16:30 UTC
  // During CEST (UTC+2): 7:00 - 15:30 UTC
  if (currency === 'EUR') {
    // Simplified: check both CET and CEST ranges
    return (timeInMinutes >= 7 * 60 && timeInMinutes < 16 * 60 + 30);
  }
  
  // Default: use Yahoo's marketState if available
  return null;
};

// Get full company description for modal
const getFullDescription = ({ ticker, name, sector, type, sd = {}, sp = {} }) => {
  const t = (ticker || '').toUpperCase();
  const s = sector || sd.sector || sp.sector || '';
  let d = sp.description || sd.description || '';
  
  if (!d) {
    const ETF_MAP = {
      RENW: { sector: 'Duurzame energie ETF', text: 'focust op hernieuwbare energie zoals zonne- en windenergie.' },
      COPX: { sector: 'Grondstoffen ETF', text: 'biedt blootstelling aan koper-mijnbouwers wereldwijd.' },
      URA:  { sector: 'Uranium ETF', text: 'volgt producenten en mijnbouwers in de uraniummarkt.' },
      JEDI: { sector: 'Ruimtevaart & Innovatie ETF', text: 'legt de nadruk op ruimtevaart- en defensie-innovators.' },
      DFEN: { sector: 'Defensie & Aerospace ETF', text: 'richt zich op defensie- en luchtvaartbedrijven.' },
      VWCE: { sector: 'Wereldwijde Aandelen ETF', text: 'geeft brede, gediversifieerde blootstelling aan wereldwijde aandelen.' },
      SPY:  { sector: 'S&P 500 ETF', text: 'volgt de 500 grootste Amerikaanse bedrijven.' },
      QQQ:  { sector: 'NASDAQ 100 ETF', text: 'richt zich op toonaangevende technologie- en groeiaandelen.' }
    };
    const EQ_MAP = {
      AMZN: { sector: 'Consumentengoederen', text: 'is één van de bekendste e‑commerce spelers en cloudproviders (AWS).' }
    };
    const etf = ETF_MAP[t];
    const eq = EQ_MAP[t];
    if (type === 'etf' && etf) return etf.text;
    if (eq) return eq.text;
    if (type === 'etf') return `Biedt gespreide blootstelling binnen ${(s || 'ETF').toLowerCase()}.`;
    if (s) return `${name || t} is actief binnen de ${s.toLowerCase()} sector.`;
    return 'Bedrijfsomschrijving niet beschikbaar.';
  }
  return d;
};

// One-line sector display with "Lees meer" button
const oneLineDesc = ({ ticker, name, sector, type, sd = {}, sp = {} }) => {
  const s = sector || sd.sector || sp.sector || '';
  return s || 'Sector onbekend';
};

// ETF Holdings display (top 10 holdings with percentages)
const ETFHoldings = ({ ticker }) => {
  // Clean ticker - strip exchange suffix/prefix for lookup
  const cleanTicker = (t) => {
    if (!t) return '';
    if (t.includes(':')) {
      const parts = t.split(':');
      const tickerPart = parts.find(p => /^[A-Z0-9]{1,6}$/.test(p));
      if (tickerPart) return tickerPart;
    }
    if (t.includes('.')) return t.split('.')[0];
    return t;
  };



  // Top holdings data for major ETFs (hardcoded for now, could be API later)
  const ETF_HOLDINGS = {
    'SPY': [
      { symbol: 'AAPL', name: 'Apple Inc.', weight: 7.1 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 6.8 },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 5.2 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 3.8 },
      { symbol: 'META', name: 'Meta Platforms Inc.', weight: 2.4 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', weight: 2.1 },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', weight: 1.8 },
      { symbol: 'TSLA', name: 'Tesla Inc.', weight: 1.7 },
      { symbol: 'LLY', name: 'Eli Lilly', weight: 1.5 },
      { symbol: 'V', name: 'Visa Inc.', weight: 1.3 },
    ],
    'QQQ': [
      { symbol: 'AAPL', name: 'Apple Inc.', weight: 8.9 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 8.5 },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 7.2 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', weight: 5.1 },
      { symbol: 'META', name: 'Meta Platforms Inc.', weight: 4.8 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', weight: 2.9 },
      { symbol: 'TSLA', name: 'Tesla Inc.', weight: 2.7 },
      { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 2.4 },
      { symbol: 'COST', name: 'Costco', weight: 2.1 },
      { symbol: 'NFLX', name: 'Netflix Inc.', weight: 1.9 },
    ],
    'ARKK': [
      { symbol: 'TSLA', name: 'Tesla Inc.', weight: 9.7 },
      { symbol: 'COIN', name: 'Coinbase', weight: 8.2 },
      { symbol: 'ROKU', name: 'Roku Inc.', weight: 7.5 },
      { symbol: 'SHOP', name: 'Shopify Inc.', weight: 6.1 },
      { symbol: 'CRSP', name: 'CRISPR Therapeutics', weight: 5.0 },
      { symbol: 'RBLX', name: 'Roblox Corp.', weight: 4.8 },
      { symbol: 'PATH', name: 'UiPath Inc.', weight: 4.2 },
      { symbol: 'PLTR', name: 'Palantir', weight: 3.9 },
      { symbol: 'HOOD', name: 'Robinhood', weight: 3.7 },
      { symbol: 'DKNG', name: 'DraftKings', weight: 3.5 },
    ],
    // VanEck Space Innovators UCITS ETF (JEDI)
    'JEDI': [
      { symbol: 'RKLB', name: 'Rocket Lab', weight: 8.4 },
      { symbol: 'IRDM', name: 'Iridium Communications', weight: 7.9 },
      { symbol: 'TXT', name: 'Textron', weight: 6.8 },
      { symbol: 'TDY', name: 'Teledyne Technologies', weight: 6.5 },
      { symbol: 'VSAT', name: 'Viasat', weight: 5.7 },
      { symbol: 'GD', name: 'General Dynamics', weight: 5.2 },
      { symbol: 'LMT', name: 'Lockheed Martin', weight: 4.8 },
      { symbol: 'NOC', name: 'Northrop Grumman', weight: 4.5 },
      { symbol: 'BA', name: 'Boeing', weight: 4.1 },
      { symbol: 'HEI', name: 'HEICO Corp', weight: 3.9 },
    ],
    // VanEck Defense UCITS ETF (DFEN)
    'DFEN': [
      { symbol: 'RTX', name: 'RTX Corporation', weight: 9.2 },
      { symbol: 'LMT', name: 'Lockheed Martin', weight: 8.7 },
      { symbol: 'NOC', name: 'Northrop Grumman', weight: 7.5 },
      { symbol: 'GD', name: 'General Dynamics', weight: 6.9 },
      { symbol: 'PLTR', name: 'Palantir', weight: 6.2 },
      { symbol: 'HII', name: 'Huntington Ingalls', weight: 5.4 },
      { symbol: 'BA', name: 'Boeing', weight: 5.1 },
      { symbol: 'LDOS', name: 'Leidos Holdings', weight: 4.8 },
      { symbol: 'AXON', name: 'Axon Enterprise', weight: 4.5 },
      { symbol: 'TXT', name: 'Textron', weight: 4.0 },
    ],
    // Global X Uranium ETF (URA / URNM)
    'URA': [
      { symbol: 'CCJ', name: 'Cameco Corp', weight: 22.5 },
      { symbol: 'CCO.TO', name: 'Cameco Corp (CA)', weight: 8.4 },
      { symbol: 'NXE', name: 'NexGen Energy', weight: 6.7 },
      { symbol: 'PDN.AX', name: 'Paladin Energy', weight: 5.8 },
      { symbol: 'BHP', name: 'BHP Group', weight: 5.2 },
      { symbol: 'KAP.IL', name: 'Kazatomprom', weight: 4.9 },
      { symbol: 'DNN', name: 'Denison Mines', weight: 4.5 },
      { symbol: 'UEC', name: 'Uranium Energy', weight: 3.8 },
      { symbol: 'URG', name: 'Ur-Energy', weight: 3.1 },
      { symbol: 'BOE.AX', name: 'Boss Energy', weight: 2.8 },
    ],
    // Global X Copper Miners ETF (COPX)
    'COPX': [
      { symbol: 'FM.TO', name: 'First Quantum Minerals', weight: 6.8 },
      { symbol: 'FCX', name: 'Freeport-McMoRan', weight: 6.5 },
      { symbol: 'BHP', name: 'BHP Group', weight: 5.9 },
      { symbol: 'TECK', name: 'Teck Resources', weight: 5.5 },
      { symbol: 'SCCO', name: 'Southern Copper', weight: 4.8 },
      { symbol: 'ANTO.L', name: 'Antofagasta', weight: 4.5 },
      { symbol: 'GLEN.L', name: 'Glencore', weight: 4.2 },
      { symbol: 'CS.TO', name: 'Capstone Copper', weight: 3.9 },
      { symbol: 'HBM', name: 'Hudbay Minerals', weight: 3.6 },
      { symbol: 'IVN.TO', name: 'Ivanhoe Mines', weight: 3.3 },
    ],
    // Vanguard FTSE All-World UCITS ETF (VWCE / VWRL)
    'VWCE': [
      { symbol: 'AAPL', name: 'Apple Inc.', weight: 4.2 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', weight: 3.9 },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', weight: 3.5 },
      { symbol: 'AMZN', name: 'Amazon.com', weight: 2.4 },
      { symbol: 'META', name: 'Meta Platforms', weight: 1.5 },
      { symbol: 'GOOGL', name: 'Alphabet Class A', weight: 1.2 },
      { symbol: 'GOOG', name: 'Alphabet Class C', weight: 1.0 },
      { symbol: 'TSLA', name: 'Tesla Inc.', weight: 1.0 },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', weight: 0.9 },
      { symbol: 'AVGO', name: 'Broadcom Inc.', weight: 0.9 },
    ],
    // L&G Clean Energy UCITS ETF (RENW)
    'RENW': [
      { symbol: 'FSLR', name: 'First Solar', weight: 7.8 },
      { symbol: 'ENPH', name: 'Enphase Energy', weight: 6.5 },
      { symbol: 'NEE', name: 'NextEra Energy', weight: 5.9 },
      { symbol: 'IBE.MC', name: 'Iberdrola', weight: 5.2 },
      { symbol: 'ORSTED.CO', name: 'Ørsted A/S', weight: 4.7 },
      { symbol: 'VWS.CO', name: 'Vestas Wind Systems', weight: 4.5 },
      { symbol: 'SEDG', name: 'SolarEdge', weight: 4.1 },
      { symbol: 'PLUG', name: 'Plug Power', weight: 3.8 },
      { symbol: 'RUN', name: 'Sunrun', weight: 3.5 },
      { symbol: 'BEPC', name: 'Brookfield Renewable', weight: 3.2 },
    ],
  };

  const lookupTicker = cleanTicker(ticker).toUpperCase();

  // Try lookup with cleaned ticker first, then original
  const holdings = ETF_HOLDINGS[lookupTicker] || ETF_HOLDINGS[ticker];
  if (!holdings) return null;

  return (
    <div className="mt-2 pt-2 border-t border-white/5 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/60 text-xs font-medium">Top 10 Holdings</span>
        <span className="text-xs text-white/40">{holdings.length} posities</span>
      </div>
      <div className="space-y-1.5">
        {holdings.map((holding, idx) => {
          // Clean symbol for display (remove exchange suffixes)
          const cleanSymbol = holding.symbol.includes('.') ? holding.symbol.split('.')[0] : holding.symbol;
          const exchangeSuffix = holding.symbol.includes('.') ? holding.symbol.split('.')[1] : '';
          
          return (
            <div key={idx} className="flex items-center justify-between text-[10px]">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-white/40 font-mono w-4">{idx + 1}</span>
                <span className="text-blue-400 font-medium">{cleanSymbol}</span>
                {exchangeSuffix && (
                  <span className="text-white/30 text-[8px] font-mono">.{exchangeSuffix}</span>
                )}
                <span className="text-white/60 truncate">{holding.name}</span>
              </div>
              <span className="text-white font-semibold ml-2">{typeof holding.weight === 'number' ? holding.weight.toFixed(1) : '---'}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper: render 3 news items for a ticker
const TickerNews = ({ news }) => {
  if (!news || news.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <div className="flex items-center space-x-1.5 mb-2">
        <Newspaper className="w-3 h-3 text-cyan-400" />
        <span className="text-white/50 text-[10px] font-medium">Recent Nieuws</span>
      </div>
      <div className="space-y-1.5">
        {news.slice(0, 3).map((article, idx) => (
          <a
            key={idx}
            href={article.link || article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block hover:bg-white/5 rounded px-1.5 py-1 -mx-1.5 transition-colors"
          >
            <p className="text-white/80 text-[11px] leading-snug line-clamp-2 hover:text-cyan-300">
              {article.title}
            </p>
            {article.publishedAt && (
              <p className="text-white/30 text-[9px] mt-0.5">
                {new Date(article.publishedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                {article.publisher && <span className="ml-1">• {article.publisher}</span>}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
};

// Analyst recommendation meter (1=Strong Buy ... 5=Strong Sell)
const AnalystMeter = ({ recommendation, growthData, targetPrice, currentPrice, ticker, isETF, hideAIButton }) => {
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  const handleAIExplanation = async () => {
    if (aiExplanation) { setShowAI(!showAI); return; }
    setLoadingAI(true);
    setAiError(null);
    try {
      const explanation = await getAIExplanation('analyst', ticker, {
        mean: recommendation?.mean, analysts: recommendation?.analysts,
        breakdown: recommendation?.breakdown, targetPrice
      });
      setAiExplanation(explanation);
      setShowAI(true);
    } catch (error) {
      setAiError(error.message);
      setShowAI(true);
    } finally { setLoadingAI(false); }
  };

  const getColor = (p) => {
    if (p <= 20) return '#059669';
    if (p <= 40) return '#34d399';
    if (p <= 60) return '#f59e0b';
    if (p <= 80) return '#f97316';
    return '#ef4444';
  };
  const getLabel = (p) => {
    if (p <= 20) return 'Kopen';
    if (p <= 40) return 'Opbouwen';
    if (p <= 60) return 'Houden';
    if (p <= 80) return 'Afbouwen';
    return 'Verkopen';
  };

  // Calculate analyst data
  const hasAnalysts = recommendation && recommendation.mean !== null && recommendation.mean !== undefined;
  const analystMean = hasAnalysts ? recommendation.mean : null;
  const analystCount = hasAnalysts ? (recommendation.analysts || recommendation.numberOfAnalystOpinions || 0) : 0;
  const analystPct = analystMean ? ((analystMean - 1) / 4) * 100 : null;
  const breakdown = recommendation?.breakdown || null;

  // Calculate momentum data
  const hasMomentum = growthData && (growthData.dailyChange !== undefined || growthData.growth1mo !== undefined);
  let momentumMean = null;
  let momentumPct = null;
  if (hasMomentum) {
    const { dailyChange = 0, growth1mo = 0, growth6mo = 0, growth1yr = 0 } = growthData;
    const avgGrowth = (dailyChange * 0.1 + growth1mo * 0.3 + growth6mo * 0.3 + growth1yr * 0.3);
    momentumMean = Math.max(1, Math.min(5, 3 - (avgGrowth / 25)));
    momentumPct = ((momentumMean - 1) / 4) * 100;
  }

  // Target price upside/downside
  const hasTarget = targetPrice && currentPrice;
  const targetUpside = hasTarget ? ((targetPrice - currentPrice) / currentPrice) * 100 : null;

  // Hard color-stops gradient (5 distinct segments)
  const segmentedGradient = 'linear-gradient(to right, #059669 0%, #059669 20%, #34d399 20%, #34d399 40%, #f59e0b 40%, #f59e0b 60%, #f97316 60%, #f97316 80%, #ef4444 80%, #ef4444 100%)';

  // Determine what to show as primary meter
  // If we have analyst data, show that. Otherwise use momentum as primary.
  const showAnalystAsPrimary = hasAnalysts;
  const primaryPct = showAnalystAsPrimary ? analystPct : (hasMomentum ? momentumPct : 50);
  const primaryLabel = showAnalystAsPrimary ? 'Aanbevelingen analisten' : 'Momentum score';
  const primarySource = showAnalystAsPrimary ? (analystCount > 0 ? `${analystCount} analisten` : null) : 'Berekend op basis van groei';

  // Show ETF holdings if no analyst data and it's an ETF
  if (!hasAnalysts && isETF && ticker) {
    return <ETFHoldings ticker={ticker} />;
  }

  // ALWAYS show analyst section - either with data or explanation
  return (
    <div className="mt-2 pt-2 border-t border-white/5 mb-3">
      {hasAnalysts ? (
        // Show analyst bar when we have data
        <>
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-xs font-medium">Aanbevelingen analisten</span>
            <span className="text-xs font-bold" style={{ color: getColor(analystPct) }}>{getLabel(analystPct)}</span>
          </div>
          <div className="relative">
          {/* The colored bar with numbers */}
          <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: segmentedGradient }}>
            {/* Show numbers in each segment if we have breakdown */}
            {breakdown ? (
              <div className="absolute inset-0 flex items-center text-[10px] font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                <span className="flex-1 text-center" title="Strong Buy">{breakdown.strongBuy}</span>
                <span className="flex-1 text-center" title="Buy">{breakdown.buy}</span>
                <span className="flex-1 text-center" title="Hold">{breakdown.hold}</span>
                <span className="flex-1 text-center" title="Sell">{breakdown.sell}</span>
                <span className="flex-1 text-center" title="Strong Sell">{breakdown.strongSell}</span>
              </div>
            ) : (
              /* Fallback labels when no breakdown */
              <div className="absolute inset-0 flex items-center text-[9px] font-medium text-white/80">
                <span className="flex-1 text-center">Kopen</span>
                <span className="flex-1 text-center">Opb.</span>
                <span className="flex-1 text-center">Houden</span>
                <span className="flex-1 text-center">Afb.</span>
                <span className="flex-1 text-center">Verkopen</span>
              </div>
            )}
          </div>
        </div>
        {/* Breakdown summary */}
        {breakdown && (
          <div className="flex items-center justify-between mt-2 text-[10px]">
            <span className="text-green-600 font-semibold">Strong Buy</span>
            <span className="text-green-400">Buy</span>
            <span className="text-yellow-400">Hold</span>
            <span className="text-orange-400">Sell</span>
            <span className="text-red-400">Strong Sell</span>
          </div>
        )}
        {/* Source info */}
        {primarySource && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-white/40">{showAnalystAsPrimary ? 'Aantal analisten' : 'Bron'}</span>
            <span className="text-[10px] text-white font-semibold">{showAnalystAsPrimary ? analystCount : 'Momentum'}</span>
          </div>
        )}
        {/* Target price (only for analyst data) */}
        {showAnalystAsPrimary && hasTarget && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-white/40">Doelkoers</span>
            <span className={`text-[10px] font-semibold ${typeof targetUpside === 'number' && targetUpside >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {typeof targetPrice === 'number' ? '€' + targetPrice.toFixed(2) : '---'} ({typeof targetUpside === 'number' ? (targetUpside >= 0 ? '+' : '') + targetUpside.toFixed(1) + '%' : '---'})
            </span>
          </div>
        )}
        {/* Source badge */}
        {showAnalystAsPrimary && recommendation?.source && (
          <div className="mt-2 flex items-center justify-end">
            <span className="text-[8px] text-white/30 bg-white/5 px-2 py-0.5 rounded">{recommendation.source}</span>
          </div>
        )}

        

        {/* AI Explanation Button */}
        {hasAnalysts && !hideAIButton && (
          <button
            onClick={handleAIExplanation}
            disabled={loadingAI}
            className="mt-3 w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 text-purple-300 text-[11px] font-medium px-3 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
          >
            {loadingAI ? (
              <>
                <div className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
                <span>Laden...</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>{showAI ? 'Verberg AI Koop Analyse' : 'AI Koop Analyse'}</span>
              </>
            )}
          </button>
        )}

        {/* AI Explanation Display */}
        {showAI && (
          <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            {aiError ? (
              <div className="flex items-start space-x-2">
                <span className="text-lg">⚠️</span>
                <p className="text-[11px] text-red-300 leading-relaxed">{aiError}</p>
              </div>
            ) : aiExplanation ? (
              <div className="flex items-start space-x-2">
                <span className="text-lg">🤖</span>
                <p className="text-[11px] text-white/80 leading-relaxed">{aiExplanation}</p>
              </div>
            ) : null}
          </div>
        )}
        </div>

        {/* Secondary Momentum Score - Only show if we have analyst data as primary AND momentum data */}
        {showAnalystAsPrimary && hasMomentum && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/50 text-[11px]">Momentum</span>
              <span className="text-[11px] font-semibold" style={{ color: getColor(momentumPct) }}>{getLabel(momentumPct)}</span>
            </div>
            <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #059669, #34d399, #f59e0b, #f97316, #ef4444)' }}>
              <div
                className="absolute top-[-1px] w-2.5 h-2.5 rounded-full bg-white border-2 shadow-md"
                style={{ left: `calc(${Math.max(2, Math.min(98, momentumPct))}% - 5px)`, borderColor: getColor(momentumPct) }}
              />
            </div>
          </div>
        )}
        </>
      ) : (
        // Show explanation when no analyst data
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-xs font-medium">Aanbevelingen analisten</span>
            <span className="text-xs text-white/40">Geen data</span>
          </div>
          <div className="text-[10px] text-white/30 bg-white/5 px-3 py-2 rounded">
            {ticker ? (
              <>
                <div className="mb-1">📊 Geen analyst data voor {ticker}</div>
                <div className="text-white/20">
                  • recommendation: {recommendation ? 'object aanwezig' : 'null'}<br/>
                  • recommendation.mean: {recommendation?.mean ?? 'undefined'}<br/>
                  • Bron: {recommendation?.source || 'geen bron'}
                </div>
              </>
            ) : (
              'Geen ticker opgegeven'
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SECTOR_OPTIONS = [
  'Technologie',
  'Financieel',
  'Gezondheidszorg',
  'Energie',
  'Consumentengoederen',
  'Industrie',
  'Vastgoed',
  'Telecommunicatie',
  'Grondstoffen',
  'Defensie',
  'ETF',
  'Crypto',
  'Overig'
];

const CORS_PROXY = 'https://corsproxy.io/?';

// TradingView exchange to Yahoo Finance suffix mapping
const EXCHANGE_MAP = {
  'XETR': '.DE',      // Xetra
  'XNAS': '',         // NASDAQ (default)
  'XNYS': '',         // NYSE (default)
  'XPAR': '.PA',      // Paris
  'XAMS': '.AS',      // Amsterdam
  'XBRU': '.BR',      // Brussels
  'XSWX': '.SW',      // Swiss
  'XLON': '.L',       // London
  'XFRA': '.DE',      // Frankfurt
  'XBUD': '.BD',      // Budapest
  'XDUB': '.IR',      // Dublin
  'XMIL': '.MI',      // Milan
  'XMAD': '.MC',      // Madrid
  'XSTO': '.ST',      // Stockholm
  'XOSL': '.OL',      // Oslo
  'XHEL': '.HE',      // Helsinki
  'XCSE': '.CO',      // Copenhagen
  'XTSE': '.TO',      // Toronto
  'XSHG': '.SS',      // Shanghai
  'XHKG': '.HK',      // Hong Kong
  'XTKS': '.T',       // Tokyo
  'XJPX': '.T',       // Japan
  'XASX': '.AX',      // Australia
  'XNZE': '.NZ',      // New Zealand
  'XBOM': '.NS',      // Bombay/NSE
  'XNSE': '.NS',      // India NSE
  'XKRX': '.KS',      // Korea
  'XSGO': '.CL',      // Santiago
  'XMEX': '.MX',      // Mexico
  'XBOG': '.CO',      // Colombia
  'XSAU': '.SR',      // Saudi
  'XTAE': '.TA',      // Tel Aviv
  'XIDX': '.JK',      // Indonesia
  'XKLS': '.KL',      // Malaysia
  'XSGX': '.SI',      // Singapore
  'XBKK': '.BK',      // Thailand
  'XPHS': '.PH',      // Philippines
  'XTAI': '.TW',      // Taiwan
  'XIDX': '.JK',      // Indonesia
  'XKAR': '.KAR',     // Karachi
  'XDOH': '.QA',      // Qatar
  'XBAH': '.BH',      // Bahrain
  'XKUW': '.KW',      // Kuwait
  'XOMA': '.OM',      // Oman
  'XABU': '.AD',      // Abu Dhabi
  'XDFM': '.DFM',     // Dubai
  'XCAI': '.EG',      // Cairo
  'XJSE': '.JO',      // Johannesburg
  'XLME': '.LM',      // Lima
  'XBOG': '.CO',      // Colombia
  'XSAO': '.SA',      // Sao Paulo
  'XBUE': '.BA',      // Buenos Aires
  'XMEX': '.MX',      // Mexico
  'XTOR': '.TO',      // Toronto
  'XNEO': '.NEO',     // NEO
  'XCNQ': '.V',       // TSX Venture
  'BINANCE': '',      // Binance (crypto)
};

// Convert TradingView ticker to Yahoo Finance format
const tradingViewToYahoo = (tvTicker) => {
  if (!tvTicker.includes(':')) return tvTicker;
  const parts = tvTicker.split(':');
  // Determine which part is the exchange and which is the ticker
  // Check if first part is a known exchange key
  const firstIsExchange = EXCHANGE_MAP.hasOwnProperty(parts[0]) || ['SP', 'NASDAQ', 'NYSE', 'AMEX', 'BINANCE', 'LSE', 'EPA', 'AMS', 'FRA'].includes(parts[0]);
  const exchange = firstIsExchange ? parts[0] : parts[1];
  const symbol = firstIsExchange ? parts[1] : parts[0];
  // Special crypto handling
  if (exchange === 'BINANCE' && symbol.endsWith('USDT')) {
    return `${symbol.slice(0, -4)}-USD`;
  }
  // SP/NASDAQ/NYSE/AMEX don't need suffix
  if (['SP', 'NASDAQ', 'NYSE', 'AMEX'].includes(exchange)) return symbol;
  const suffix = EXCHANGE_MAP[exchange] || '';
  return symbol + suffix;
};

// Detect currency from exchange
const getCurrencyFromExchange = (tvTicker) => {
  if (!tvTicker.includes(':')) return 'USD';
  const parts = tvTicker.split(':');
  const firstIsExchange = EXCHANGE_MAP.hasOwnProperty(parts[0]) || ['SP', 'NASDAQ', 'NYSE', 'AMEX', 'BINANCE'].includes(parts[0]);
  const exchange = firstIsExchange ? parts[0] : parts[1];
  const eurExchanges = ['XETR', 'XFRA', 'XAMS', 'XBRU', 'XPAR', 'XMIL', 'XMAD', 'XSTO', 'XOSL', 'XHEL', 'XCSE', 'XBUD', 'XDUB'];
  const gbpExchanges = ['XLON'];
  const hkdExchanges = ['XHKG'];
  const jpyExchanges = ['XTKS', 'XJPX'];
  const audExchanges = ['XASX'];
  const cadExchanges = ['XTSE', 'XNEO', 'XCNQ'];
  const cnyExchanges = ['XSHG'];
  const krwExchanges = ['XKRX'];
  const inrExchanges = ['XBOM', 'XNSE'];
  const sgdExchanges = ['XSGX'];
  const myrExchanges = ['XKLS'];
  const thbExchanges = ['XBKK'];
  const twdExchanges = ['XTAI'];
  const nzdExchanges = ['XNZE'];
  const clpExchanges = ['XSGO'];
  const mxnExchanges = ['XMEX'];
  const zarExchanges = ['XJSE'];
  const ilsExchanges = ['XTAE'];
  const tryExchanges = ['XIST'];
  
  if (eurExchanges.includes(exchange)) return 'EUR';
  if (gbpExchanges.includes(exchange)) return 'GBP';
  if (hkdExchanges.includes(exchange)) return 'HKD';
  if (jpyExchanges.includes(exchange)) return 'JPY';
  if (audExchanges.includes(exchange)) return 'AUD';
  if (cadExchanges.includes(exchange)) return 'CAD';
  if (cnyExchanges.includes(exchange)) return 'CNY';
  if (krwExchanges.includes(exchange)) return 'KRW';
  if (inrExchanges.includes(exchange)) return 'INR';
  if (sgdExchanges.includes(exchange)) return 'SGD';
  if (myrExchanges.includes(exchange)) return 'MYR';
  if (thbExchanges.includes(exchange)) return 'THB';
  if (twdExchanges.includes(exchange)) return 'TWD';
  if (nzdExchanges.includes(exchange)) return 'NZD';
  if (clpExchanges.includes(exchange)) return 'CLP';
  if (mxnExchanges.includes(exchange)) return 'MXN';
  if (zarExchanges.includes(exchange)) return 'ZAR';
  if (ilsExchanges.includes(exchange)) return 'ILS';
  if (tryExchanges.includes(exchange)) return 'TRY';
  return 'USD';
};

// Human-readable relative timestamp (Dutch)
const timeAgo = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return 'Zojuist';
  if (diff < 3600) return `${Math.floor(diff / 60)}m geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}u geleden`;
  if (diff < 172800) return 'Gisteren';
  if (diff < 604800) return `${Math.floor(diff / 86400)}d geleden`;
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
};

// Helper: filter out quoteType values that are not real sectors
const getCleanSector = (...sources) => {
  const bad = ['equity','etf','mutualfund','cryptocurrency','index','future','option','warrant','unknown','n/a','-','none',''];
  for (const s of sources) {
    const v = String(s || '').trim();
    if (v && !bad.includes(v.toLowerCase())) return v;
  }
  return '';
};

const BeleggenPage = () => {
  const [investments, setInvestments] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'type', 'sector', 'profit'
  const [filterType, setFilterType] = useState('all'); // 'all', 'aandeel', 'etf', 'crypto', 'obligatie', 'fonds'
  const [filterSector, setFilterSector] = useState('all');
  const [filterProfit, setFilterProfit] = useState('all'); // 'all', 'profit', 'loss'
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    type: 'aandeel',
    amount: '',
    ticker_symbol: '',
    shares: '',
    purchase_price: '',
    sector: '',
    thumbnail_url: '',
    circular_thumbnail: false,
    description: '',
    links: [],
    is_short: false
  });
  const [stockPrices, setStockPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  // Investment Batches state (multiple purchases of same stock)
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  // Main page tabs: 'vandaag' | 'portfolio' | 'onderzoek'
  const [activeMainTab, setActiveMainTab] = useState('vandaag');
  // Top Buy section state
  const [topBuyOwnStock, setTopBuyOwnStock] = useState(null);
  const [topBuyHiddenGem, setTopBuyHiddenGem] = useState(null);
  const [topPerformer, setTopPerformer] = useState(null);
  const [topBuyGrowth, setTopBuyGrowth] = useState(null);
  const [newBatch, setNewBatch] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    shares: '',
    purchase_price: '',
    purchase_currency: 'EUR',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [myPricesTimeframe, setMyPricesTimeframe] = useState('5D');
  const [loadingMarketData, setLoadingMarketData] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const fileInputRef = useRef(null);
  const [loadingAllAi, setLoadingAllAi] = useState(false);
  const [gemScreenerTab, setGemScreenerTab] = useState('screener'); // 'screener', 'topPicks', 'knallers', 'news', 'links'
  const [gemWatchlist, setGemWatchlist] = useState([]);
  const [knallers, setKnallers] = useState([]);
  const [loadingKnallers, setLoadingKnallers] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [knallersFilterSector, setKnallersFilterSector] = useState('all');
  const [knallersFilterMinScore, setKnallersFilterMinScore] = useState('');
  const [knallersFilterPriceMax, setKnallersFilterPriceMax] = useState('');
  const [showKnallersFilters, setShowKnallersFilters] = useState(false);
  const [gemsWatchlistTab, setGemsWatchlistTab] = useState('gems'); // 'gems', 'watchlist'
  const [showTechLegend, setShowTechLegend] = useState(false);
  const [companyInfoModal, setCompanyInfoModal] = useState(null); // { ticker, name, sector, description }
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [screenerStrictness, setScreenerStrictness] = useState(50);
  const [showExplainability, setShowExplainability] = useState(true);
  
  // Widget collapse state - stored in localStorage
  const [widgetCollapsed, setWidgetCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('beleggen_widget_collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const toggleWidget = (widgetId) => {
    setWidgetCollapsed(prev => {
      const updated = { ...prev, [widgetId]: !prev[widgetId] };
      localStorage.setItem('beleggen_widget_collapsed', JSON.stringify(updated));
      return updated;
    });
  };
  const [loadingGems, setLoadingGems] = useState(false);
  const [gemFilterSector, setGemFilterSector] = useState('all');
  const [gemFilterMinScore, setGemFilterMinScore] = useState('');
  const [gemFilterPriceMax, setGemFilterPriceMax] = useState('');
  const [screenerFilterSector, setScreenerFilterSector] = useState('all');
  const [screenerFilterPriceMin, setScreenerFilterPriceMin] = useState('');
  const [screenerFilterPriceMax, setScreenerFilterPriceMax] = useState('');
  const [screenerFilterRSIMax, setScreenerFilterRSIMax] = useState('');
  const [screenerFilterAnalystMin, setScreenerFilterAnalystMin] = useState('');
  const [chartFavorites, setChartFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('beleggen_chart_favorites');
      return saved ? JSON.parse(saved) : [
        { symbol: 'SP:SPX', name: 'S&P 500' },
        { symbol: 'NASDAQ:NDX', name: 'NASDAQ 100' },
        { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin' }
      ];
    } catch {
      return [];
    }
  });
  const [showChartModal, setShowChartModal] = useState(false);
  const [newChartSymbol, setNewChartSymbol] = useState('');
  const [newChartName, setNewChartName] = useState('');
  const [chartData, setChartData] = useState({}); // { symbol: { data: [], timeframe: '1M' } }
  const [selectedChartTimeframe, setSelectedChartTimeframe] = useState({});
  const [loadingChartData, setLoadingChartData] = useState({});
  const [stockNews, setStockNews] = useState([]); // News for user's own stocks
  const [loadingNews, setLoadingNews] = useState(false);
  const [screenerNews, setScreenerNews] = useState([]); // News for screener
  const [loadingScreenerNews, setLoadingScreenerNews] = useState(false);
  const [screenerCategory, setScreenerCategory] = useState('large'); // 'large', 'growth', 'midcap'
  const [screenerData, setScreenerData] = useState({}); // { ticker: { price, change, growth, sparkline } }
  const [loadingScreenerData, setLoadingScreenerData] = useState(false);
  const [dynamicScreenerTickers, setDynamicScreenerTickers] = useState({}); // { category: [...tickers] }
  const [loadingDynamicTickers, setLoadingDynamicTickers] = useState(false);
  const [showDescPopup, setShowDescPopup] = useState(null); // investment id for description popup
  const [showNewsPopup, setShowNewsPopup] = useState(null); // investment id for news popup
  const [investmentNews, setInvestmentNews] = useState({}); // { investmentId: [news] }
  const [newsSummary, setNewsSummary] = useState({}); // { investmentId: summary }
  const [loadingNewsSummary, setLoadingNewsSummary] = useState({}); // { investmentId: boolean }
  const [dutchMacroNews, setDutchMacroNews] = useState([]);
  const [loadingDutchNews, setLoadingDutchNews] = useState(false);
  const [macroNewsSummary, setMacroNewsSummary] = useState(null);
  const [loadingMacroSummary, setLoadingMacroSummary] = useState(false);
  // marketBarometer moved to MarketMetersWidget
  const [tickerNewsMap, setTickerNewsMap] = useState({}); // { ticker: [news...] }
  const [aiBuyScores, setAiBuyScores] = useState({}); // { ticker: { score, verdict, confidence, reasons, one_liner, timeframe } }
  const [loadingAiBuy, setLoadingAiBuy] = useState({}); // { ticker: boolean }
  const [aiBuyModalTicker, setAiBuyModalTicker] = useState(null); // ticker string for the AI buy-check popup
  const [macroSummaryMeta, setMacroSummaryMeta] = useState({ lastHash: '', lastGeneratedAt: 0 });
  const [portfolioNewsSummary, setPortfolioNewsSummary] = useState(null);
  const [loadingPortfolioSummary, setLoadingPortfolioSummary] = useState(false);
  const [portfolioSummaryMeta, setPortfolioSummaryMeta] = useState({ lastHash: '', lastGeneratedAt: 0 });
  const [loadingInvNews, setLoadingInvNews] = useState({});
  const [myWatchlist, setMyWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('beleggen_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const [watchlistResults, setWatchlistResults] = useState([]);
  const [loadingWlSearch, setLoadingWlSearch] = useState(false);
  
  // Advanced screener features
  const [screenerSort, setScreenerSort] = useState('score'); // 'score', 'price', 'change', 'volume', 'rsi', 'marketCap'
  const [screenerSortDir, setScreenerSortDir] = useState('desc'); // 'asc', 'desc'
  const [showTechnicals, setShowTechnicals] = useState(true);
  const [showPerformance, setShowPerformance] = useState(true);
  
  // Analyst recommendations for user's investments
  const [analystData, setAnalystData] = useState({}); // { ticker: { mean, analysts, breakdown, targetPrice } }
  
  // AI Settings
  const [showAISettings, setShowAISettings] = useState(false);
  // AI Discovery prefill (set from Portfolio AI "missing exposure" buttons)
  const [aiDiscoveryPrefill, setAiDiscoveryPrefill] = useState(null);

  // Alerts system
  const [alerts, setAlerts] = useState([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState({ ticker: '', name: '', type: 'rsi_oversold', value: 30 });
  const [notifications, setNotifications] = useState([]);
  
  // Earnings calendar
  const [earningsData, setEarningsData] = useState({});
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  // Portfolio Evolutie view toggle: 'value' (intraday) or 'day' (yesterday vs today)
  const [evolutionView, setEvolutionView] = useState('value');
  // Day-by-day portfolio series (EUR)
  const [portfolioDaily, setPortfolioDaily] = useState({ dates: [], values: [], pnl: [] });
  // Daily chart view toggle: 'pnl' or 'value'
  const [dailyView, setDailyView] = useState('pnl');
  // Show old separate evolution sections? Keep off now that we have a combined widget
  const showLegacyEvolution = true;
  
  // AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedStockForAI, setSelectedStockForAI] = useState(null);
  // Funding source for new investments
  const [fundingSource, setFundingSource] = useState('new'); // 'new' or 'cash'
  const [fundingCashId, setFundingCashId] = useState('');

  const [exchangeRates, setExchangeRates] = useState({
    EUR: 1,
    USD: 0.92,
    SEK: 0.087,
    GBP: 1.16,
    NOK: 0.087,
    DKK: 0.134,
    CHF: 1.04,
    JPY: 0.0062,
    CAD: 0.67,
    AUD: 0.61,
    HKD: 0.12
  });

  const convertToEUR = (amount, fromCurrency) => {
    if (!amount || fromCurrency === 'EUR' || !exchangeRates[fromCurrency]) return amount;
    return amount * exchangeRates[fromCurrency];
  };

  const convertFromEUR = (amountEUR, toCurrency) => {
    if (!amountEUR || toCurrency === 'EUR' || !exchangeRates[toCurrency]) return amountEUR;
    return amountEUR / exchangeRates[toCurrency];
  };

  const convertBetween = (amount, fromCurrency, toCurrency) => {
    if (!amount) return amount;
    if ((fromCurrency || 'EUR') === (toCurrency || 'EUR')) return amount;
    const eur = convertToEUR(amount, fromCurrency || 'EUR') || 0;
    return convertFromEUR(eur, toCurrency || 'EUR') || 0;
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem('fx_rates_to_eur');
      const cachedDate = localStorage.getItem('fx_rates_date');
      const today = new Date().toISOString().slice(0, 10);
      if (cached && cachedDate === today) {
        const obj = JSON.parse(cached);
        if (obj && typeof obj === 'object') {
          setExchangeRates((prev) => ({ ...prev, ...obj }));
          return;
        }
      }
    } catch (_) {}
    fetch('https://api.frankfurter.app/latest?from=EUR')
      .then((r) => r.json())
      .then((data) => {
        if (!data || !data.rates) return;
        const toEur = { EUR: 1 };
        Object.entries(data.rates).forEach(([code, perEur]) => {
          if (typeof perEur === 'number' && perEur > 0) {
            toEur[code] = 1 / perEur;
          }
        });
        setExchangeRates((prev) => ({ ...prev, ...toEur }));
        try {
          localStorage.setItem('fx_rates_to_eur', JSON.stringify(toEur));
          localStorage.setItem('fx_rates_date', data.date || new Date().toISOString().slice(0, 10));
        } catch (_) {}
      })
      .catch(() => {});
  }, []);

  // Infer currency from common Yahoo/European suffixes when API doesn't provide it
  const inferCurrencyFromTicker = (t) => {
    if (!t) return null;
    const parts = String(t).toUpperCase().split('.');
    if (parts.length < 2) return null;
    const suf = parts[parts.length - 1];
    const map = {
      ST: 'SEK',   // Stockholm
      CO: 'DKK',   // Copenhagen
      HE: 'EUR',   // Helsinki (most quotes in EUR)
      OL: 'NOK',   // Oslo
      TO: 'CAD',   // Toronto
      L:  'GBP',   // London
      PA: 'EUR',   // Paris
      AS: 'EUR',   // Amsterdam
      DE: 'EUR',   // Germany
      MC: 'EUR',   // Madrid
      MI: 'EUR',   // Milan
      HK: 'HKD',   // Hong Kong
      T:  'JPY',   // Tokyo
      AX: 'AUD'    // Australia
    };
    return map[suf] || null;
  };

  useEffect(() => {
    loadInvestments();
    fetchDutchMacroNews();
  }, []);
  
  // Auto-fetch earnings when investments or watchlist change
  useEffect(() => {
    const hasData = investments.length > 0 || myWatchlist.length > 0;
    if (hasData && !loadingEarnings) {
      fetchEarningsData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments.length, myWatchlist.length]);

  useEffect(() => {
    if (investments.length > 0) {
      setStockPrices({}); // Clear cached data when timeframe changes
      fetchStockPrices(myPricesTimeframe);
      // Refresh prices every 60 seconds
      const interval = setInterval(() => fetchStockPrices(myPricesTimeframe), 60000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments, myPricesTimeframe]);

  // fetchMarketData niet meer nodig - TradingView iframes tonen live data
  // useEffect(() => {
  //   fetchMarketData();
  // }, [selectedTimeframe]);

  useEffect(() => {
    localStorage.setItem('beleggen_chart_favorites', JSON.stringify(chartFavorites));
  }, [chartFavorites]);

  const fetchMarketData = async () => {
    setLoadingMarketData(true);
    
    const symbols = {
      'BEL20': { name: 'BEL 20', logo: 'BE', type: 'index' },
      'SPX': { name: 'S&P 500', logo: 'SP', type: 'index' },
      'NDX': { name: 'NASDAQ 100', logo: 'NQ', type: 'index' },
      'DJI': { name: 'Dow Jones', logo: 'DJ', type: 'index' },
      'AAPL': { name: 'Apple', logo: 'AP', type: 'stock' },
      'MSFT': { name: 'Microsoft', logo: 'MS', type: 'stock' },
      'GOOGL': { name: 'Google', logo: 'GO', type: 'stock' },
      'TSLA': { name: 'Tesla', logo: 'TS', type: 'stock' },
      'NVDA': { name: 'NVIDIA', logo: 'NV', type: 'stock' },
      'BTCUSD': { name: 'Bitcoin', logo: 'BT', type: 'crypto' },
      'ETHUSD': { name: 'Ethereum', logo: 'ET', type: 'crypto' }
    };

    const rangeMap = {
      '1D': '1d',
      '1M': '1mo',
      '1Y': '1y',
      '5Y': '5y'
    };

    const data = {};
    
    for (const [symbol, info] of Object.entries(symbols)) {
      try {
        const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
          params: {
            interval: selectedTimeframe === '1D' ? '1h' : '1d',
            range: rangeMap[selectedTimeframe]
          }
        });
        
        const result = response.data.chart.result[0];
        const currentPrice = result.meta.regularMarketPrice;
        const timestamps = result.timestamp;
        const prices = result.indicators.quote[0].close;
        
        const firstPrice = prices.find(p => p !== null);
        const lastPrice = prices[prices.length - 1] || currentPrice;
        const change = lastPrice - firstPrice;
        const changePercent = (change / firstPrice) * 100;
        
        // Clean prices for sparkline (remove nulls)
        const cleanPrices = prices.filter(p => p !== null);
        
        data[symbol] = {
          ...info,
          current: currentPrice,
          change: change,
          changePercent: changePercent,
          firstPrice: firstPrice,
          sparklineData: cleanPrices
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        // Mock data for demo
        const mockChanges = {
          '1D': Math.random() * 4 - 2,
          '1M': Math.random() * 10 - 5,
          '1Y': Math.random() * 50 - 10,
          '5Y': Math.random() * 200 - 20
        };
        // Generate mock sparkline data
        const mockSparkline = Array.from({ length: 20 }, (_, i) => {
          const trend = mockChanges[selectedTimeframe] / 100;
          return 100 * (1 + (trend * i / 20) + (Math.random() * 0.02 - 0.01));
        });
        
        data[symbol] = {
          ...info,
          current: 100,
          change: mockChanges[selectedTimeframe],
          changePercent: mockChanges[selectedTimeframe],
          firstPrice: 100,
          sparklineData: mockSparkline
        };
      }
    }
    
    setMarketData(data);
    setLoadingMarketData(false);
  };

  const fetchStockPrices = async (timeframe = '5D') => {
    setLoadingPrices(true);
    const prices = {};
    const rangeMap = { '1D': '1d', '1W': '5d', '1M': '1mo', '6M': '6mo', '1Y': '1y', '5Y': '5y', '5D': '5d' };
    const intervalMap = { '1D': '5m', '1W': '15m', '1M': '1d', '6M': '1d', '1Y': '1wk', '5Y': '1mo', '5D': '1h' };
    const range = rangeMap[timeframe] || '5d';
    const interval = intervalMap[timeframe] || '1h';
    
    for (const inv of investments) {
      if (inv.ticker_symbol) {
        const originalTicker = inv.ticker_symbol;
        
        try {
          // Use our own Vercel API endpoint (no CORS issues!)
          const response = await axios.get(`/api/stock-price`, {
            params: {
              ticker: originalTicker,
              range: range,
              interval: interval
            }
          });
          
          const data = response.data;
          
          prices[originalTicker] = {
            current: data.current,
            change: data.change,
            changePercent: data.changePercent,
            previousClose: data.previousClose,
            sparklineData: data.sparklineData || [],
            currency: data.currency,
            resolvedTicker: data.yahooTicker,
            originalTicker: originalTicker,
            marketState: data.marketState || 'CLOSED',
            growthData: data.growthData || {
              dailyChange: data.changePercent,
              growth1mo: 0,
              growth6mo: 0,
              growth1yr: 0
            },
            // Raw series for aggregation
            timestamps: data.timestamps || [],
            closeSeries: data.closeSeries || [],
            // New fields from enhanced API
            technicals: data.technicals,
            riskMetrics: data.riskMetrics,
            volume: data.volume,
            // Company profile info
            sector: data.sector || '',
            description: data.description || '',
            // Analyst data now comes with stock-price response
            analystData: data.analystData || null
          };
          
          // Also store analyst data in separate state for easy access
          if (data.analystData) {
            setAnalystData(prev => ({
              ...prev,
              [originalTicker]: data.analystData
            }));
          }
          
        } catch (error) {
          console.error(`Error fetching ${originalTicker}:`, error.message);
          // Don't store anything on error - existing UI handles missing tickers
        }
      }
    }
    
    setStockPrices(prices);
    setLoadingPrices(false);
    
    // Fetch analyst data from Yahoo Finance (FREE!)
    const tickersWithPrices = Object.keys(prices);
    if (tickersWithPrices.length > 0) {
      fetchYahooAnalystData(tickersWithPrices);
    }

    // Compute day-by-day portfolio value (EUR) from available series
    // Use LAST close per day per ticker and forward-fill missing days to avoid cliffs
    try {
      const perTickerDayLast = []; // [{ currency, shares, sign, map(dayTs->lastClose) }]
      const allDaysSet = new Set();
      for (const t of tickersWithPrices) {
        const sp = prices[t];
        const inv = investments.find(i => i.ticker_symbol === t);
        const shares = Number(inv?.shares) || 0;
        if (!sp || shares <= 0 || !Array.isArray(sp.closeSeries) || !Array.isArray(sp.timestamps)) continue;
        const cur = sp.currency || 'EUR';
        const sign = inv?.is_short ? -1 : 1;
        const dayLast = new Map();
        const n = Math.min(sp.closeSeries.length, sp.timestamps.length);
        for (let i = 0; i < n; i++) {
          const px = sp.closeSeries[i];
          if (px == null) continue;
          const d = new Date(sp.timestamps[i]);
          d.setHours(0,0,0,0);
          const key = d.getTime();
          dayLast.set(key, px); // last close for the day
          allDaysSet.add(key);
        }
        perTickerDayLast.push({ currency: cur, shares, sign, dayLast });
      }
      const days = Array.from(allDaysSet.values()).sort((a,b)=>a-b).slice(-30);
      const values = days.map((ts, idx) => {
        let total = 0;
        for (const rec of perTickerDayLast) {
          // forward-fill: use today's value if present else previous day's carried value
          let px = rec.dayLast.get(ts);
          if (px == null && idx > 0) {
            const prevTs = days[idx - 1];
            px = rec.dayLast.get(prevTs);
          }
          if (px != null) {
            const effShares = rec.shares * rec.sign; // represent shorts as negative exposure for value series
            total += effShares * convertToEUR(px, rec.currency);
          }
        }
        return total;
      });
      // Add constant cash baseline across all days (does not affect P&L if unchanged)
      const totalCashEUR = investments
        .filter(inv => inv.type === 'cash')
        .reduce((s, inv) => s + (convertToEUR(parseFloat(inv.amount) || 0, inv.purchase_currency || 'EUR') || 0), 0);
      const valuesWithCash = values.map(v => v + totalCashEUR);
      const pnl = valuesWithCash.map((v, i) => i === 0 ? 0 : v - valuesWithCash[i-1]);
      setPortfolioDaily({ dates: days, values: valuesWithCash, pnl });
    } catch (e) {
      console.warn('Portfolio daily build failed:', e.message);
      setPortfolioDaily({ dates: [], values: [], pnl: [] });
    }
  };

  // Fetch analyst data from Yahoo Finance (FREE! Direct fetch)
  const fetchYahooAnalystData = async (tickers) => {
    if (!tickers || tickers.length === 0) return;
    
    console.log('🔍 Fetching Yahoo analyst data for tickers:', tickers);
    
    try {
      const results = await fetchYahooAnalystBatch(tickers);
      
      if (Object.keys(results).length > 0) {
        console.log(`✅ Got Yahoo analyst data for ${Object.keys(results).length} tickers`);
        
        setAnalystData(prev => {
          const merged = { ...prev, ...results };
          return merged;
        });
      } else {
        console.warn('⚠️ No results from Yahoo analyst fetch');
      }
    } catch (error) {
      console.error('❌ Error fetching Yahoo analyst data:', error.message);
    }
  };

  // Fetch Dutch macro news from nu.nl
  const fetchDutchMacroNews = async () => {
    setLoadingDutchNews(true);
    try {
      const response = await axios.get('/api/iex-news');
      if (response.data?.articles) {
        setDutchMacroNews(response.data.articles);
      }
    } catch (error) {
      console.error('❌ Error fetching Dutch macro news:', error.message);
    } finally {
      setLoadingDutchNews(false);
    }
  };


  const loadInvestments = async () => {
    try {
      const data = await db.investments.getAll();
      // Map investment_links to links for compatibility
      const mappedData = data.map(inv => ({
        ...inv,
        links: inv.investment_links || []
      }));
      setInvestments(mappedData);
    } catch (error) {
      console.error('Error loading investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingThumb(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;
      
      await storage.upload('investments', filePath, file);
      const publicUrl = storage.getPublicUrl('investments', filePath);
      
      if (editingInvestment) {
        setEditingInvestment({ ...editingInvestment, thumbnail_url: publicUrl });
      } else {
        setNewInvestment({ ...newInvestment, thumbnail_url: publicUrl });
      }
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      alert('Fout bij uploaden afbeelding');
    } finally {
      setUploadingThumb(false);
    }
  };

  const autoCalculateAmount = (shares, purchasePrice, currency = 'EUR') => {
    if (shares && purchasePrice) {
      const amountInCurrency = parseFloat(shares) * parseFloat(purchasePrice);
      // Always store amount in EUR for consistent calculations
      const amountInEUR = convertToEUR(amountInCurrency, currency);
      return amountInEUR.toFixed(2);
    }
    return '';
  };

  // Helper: robust parsing supporting comma decimals (e.g., "22,30")
  const parseNum = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const s = String(value).replace(',', '.').replace(/\s/g, '');
    const n = parseFloat(s);
    return Number.isNaN(n) ? null : n;
  };

  const addInvestment = async () => {
    if (!newInvestment.name.trim()) return;

    const sharesNum = parseNum(newInvestment.shares);
    const priceNum = parseNum(newInvestment.purchase_price);
    const amountField = parseNum(newInvestment.amount) || 0;
    const calculatedAmount = (sharesNum !== null && priceNum !== null)
      ? sharesNum * priceNum
      : amountField;

    const currency = newInvestment.purchase_currency || 'EUR';

    try {
      const investment = {
        name: newInvestment.name.trim(),
        type: newInvestment.type,
        // Store original-currency amount; we convert to EUR only when computing P&L/totals
        amount: calculatedAmount,
        purchase_currency: currency,
        ticker_symbol: newInvestment.ticker_symbol?.trim().toUpperCase() || null,
        shares: sharesNum,
        purchase_price: priceNum,
        sector: newInvestment.sector || null,
        thumbnail_url: newInvestment.thumbnail_url || null,
        circular_thumbnail: newInvestment.circular_thumbnail || false,
        description: newInvestment.description?.trim() || null,
        yahoo_finance_link: newInvestment.yahoo_finance_link?.trim() || null
      };
      
      console.debug('Creating investment payload', investment);
      const newInv = await db.investments.create(investment);
      
      // Add links if any
      if (newInvestment.links && newInvestment.links.length > 0) {
        const linkPromises = newInvestment.links.map(link => 
          db.investmentLinks.create({
            investment_id: newInv.id,
            label: link.label,
            url: link.url
          })
        );
        const createdLinks = await Promise.all(linkPromises);
        newInv.links = createdLinks;
      } else {
        newInv.links = [];
      }
      
      // If funded from a cash tile, deduct there (skip when creating the cash tile itself)
      if (newInvestment.type !== 'cash' && fundingSource === 'cash' && fundingCashId) {
        const cashInv = (investments.find(inv => String(inv.id) === String(fundingCashId) && inv.type === 'cash'));
        if (cashInv) {
          const cost = calculatedAmount; // value in original purchase_currency of new investment
          const costInCashCurrency = convertBetween(cost, currency, cashInv.purchase_currency || 'EUR');
          const oldAmt = parseFloat(cashInv.amount) || 0;
          const newAmt = Math.max(0, oldAmt - (costInCashCurrency || 0));
          try {
            await db.investments.update(cashInv.id, { amount: newAmt });
            // reflect in UI asap
            setInvestments(prev => prev.map(i => i.id === cashInv.id ? { ...i, amount: newAmt } : i));
          } catch (e) {
            console.warn('Kon cash tegel niet bijwerken:', e.message);
          }
        }
      }

      setInvestments([...investments, newInv]);
      resetForm();
    } catch (error) {
      console.error('Error adding investment:', error);
      const msg = error?.message || error?.details || error?.hint || 'Onbekende fout';
      alert('Fout bij toevoegen investering: ' + msg);
    }
  };

  const updateInvestment = async () => {
    if (!editingInvestment || !editingInvestment.name.trim()) return;

    const editShares = parseNum(editingInvestment.shares);
    const editPrice = parseNum(editingInvestment.purchase_price);
    const editAmountField = parseNum(editingInvestment.amount) || 0;
    const calculatedAmount = (editShares !== null && editPrice !== null)
      ? editShares * editPrice
      : editAmountField;

    const currency = editingInvestment.purchase_currency || 'EUR';

    try {
      const updates = {
        name: editingInvestment.name.trim(),
        type: editingInvestment.type,
        // Keep original-currency amount and persist currency
        amount: calculatedAmount,
        purchase_currency: currency,
        ticker_symbol: editingInvestment.ticker_symbol?.trim().toUpperCase() || null,
        shares: editShares,
        purchase_price: editPrice,
        sector: editingInvestment.sector || null,
        thumbnail_url: editingInvestment.thumbnail_url || null,
        circular_thumbnail: editingInvestment.circular_thumbnail || false,
        description: editingInvestment.description?.trim() || null,
        yahoo_finance_link: editingInvestment.yahoo_finance_link?.trim() || null
      };
      
      await db.investments.update(editingInvestment.id, updates);
      
      // Update links - delete old ones and create new ones
      const oldLinks = investments.find(inv => inv.id === editingInvestment.id)?.links || [];
      const oldLinkIds = oldLinks.map(l => l.id);
      
      // Delete removed links
      const currentLinkIds = (editingInvestment.links || []).map(l => l.id).filter(id => id);
      const linksToDelete = oldLinkIds.filter(id => !currentLinkIds.includes(id));
      await Promise.all(linksToDelete.map(id => db.investmentLinks.delete(id)));
      
      // Add new links (those without id)
      const newLinks = (editingInvestment.links || []).filter(l => !l.id);
      if (newLinks.length > 0) {
        const linkPromises = newLinks.map(link => 
          db.investmentLinks.create({
            investment_id: editingInvestment.id,
            label: link.label,
            url: link.url
          })
        );
        await Promise.all(linkPromises);
      }
      
      // Reload to get fresh data
      await loadInvestments();
      setEditingInvestment(null);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error updating investment:', error);
      alert('Fout bij updaten investering');
    }
  };

  const deleteInvestment = async (id) => {
    if (!window.confirm('Deze investering verwijderen?')) return;
    try {
      await db.investments.delete(id);
      setInvestments(investments.filter(inv => inv.id !== id));
    } catch (error) {
      console.error('Error deleting investment:', error);
      alert('Fout bij verwijderen investering');
    }
  };

  const resetForm = () => {
    setNewInvestment({
      name: '',
      type: 'aandeel',
      amount: '',
      ticker_symbol: '',
      shares: '',
      purchase_price: '',
      purchase_currency: 'EUR',
      sector: '',
      thumbnail_url: '',
      circular_thumbnail: false,
      description: '',
      links: [],
      is_short: false
    });
    setShowAddModal(false);
    setFundingSource('new');
    setFundingCashId('');
  };

  const calculateTotalValue = (investment) => {
    // Non-tracked items (incl. cash) -> use amount converted to EUR
    if (!investment.ticker_symbol || !investment.shares || !stockPrices[investment.ticker_symbol]) {
      const amt = parseFloat(investment.amount) || 0;
      const cur = investment.purchase_currency || 'EUR';
      return convertToEUR(amt, cur) || 0;
    }
    const priceData = stockPrices[investment.ticker_symbol];
    // For short positions, value is based on opening price (what you borrowed)
    // For long positions, value is based on current price
    if (investment.is_short) {
      const purchasePrice = investment.purchase_price || 0;
      // Safe default: if purchase currency is not explicitly stored, assume EUR
      const purchaseCurrency = investment.purchase_currency || 'EUR';
      return investment.shares * convertToEUR(purchasePrice, purchaseCurrency);
    }
    const currentPrice = priceData.current;
    const currency = priceData.currency || 'EUR';
    return investment.shares * convertToEUR(currentPrice, currency);
  };

  const calculateProfitLoss = (investment) => {
    if (!investment.ticker_symbol || !investment.shares || !investment.purchase_price) {
      return { amount: 0, percentage: 0, error: 'missing_data' };
    }

    const priceData = stockPrices[investment.ticker_symbol];
    if (!priceData || priceData.current === null) {
      return { amount: 0, percentage: 0, error: 'no_price_data' };
    }

    const currentPrice = priceData.current;
    const purchasePrice = investment.purchase_price;
    const shares = investment.shares;
    
    // Convert current price to EUR if needed (stockPrices already has currency info)
    const currentPriceEUR = priceData.currency === 'EUR' ? currentPrice : convertToEUR(currentPrice, priceData.currency);

    // Compute total purchase value in EUR using batches/amount where available
    let purchaseValueEUR = 0;
    if (Array.isArray(investment.investment_batches) && investment.investment_batches.length > 0) {
      purchaseValueEUR = investment.investment_batches.reduce((sum, batch) => {
        if (typeof batch.amount === 'number') {
          // Assume explicit batch amount is already in account currency (EUR)
          return sum + (isNaN(batch.amount) ? 0 : batch.amount);
        }
        const bShares = parseFloat(batch.shares || 0) || 0;
        const bPrice = parseFloat(batch.purchase_price || 0) || 0;
        const bCur = batch.purchase_currency || investment.purchase_currency || 'EUR';
        return sum + (bShares * convertToEUR(bPrice, bCur));
      }, 0);
    } else if (typeof investment.amount === 'number') {
      // Use stored amount (assumed EUR) when available
      purchaseValueEUR = isNaN(investment.amount) ? 0 : investment.amount;
    } else {
      // Fallback: single purchase_price * shares, safe default currency is EUR
      const purchaseCurrency = investment.purchase_currency || 'EUR';
      const purchasePriceEUR = convertToEUR(purchasePrice, purchaseCurrency);
      purchaseValueEUR = shares * purchasePriceEUR;
    }

    if (investment.is_short) {
      // For shorts: profit = opening value - closing value
      const closeValue = shares * currentPriceEUR; // current market value in EUR
      const profitLoss = purchaseValueEUR - closeValue;
      const base = purchaseValueEUR !== 0 ? Math.abs(purchaseValueEUR) : 1;
      const profitLossPercent = (profitLoss / base) * 100;
      return { amount: profitLoss, percentage: profitLossPercent };
    } else {
      // Longs: profit = current value - purchase value
      const currentValue = shares * currentPriceEUR;
      const profitLoss = currentValue - purchaseValueEUR;
      const base = purchaseValueEUR !== 0 ? Math.abs(purchaseValueEUR) : 1;
      const profitLossPercent = (profitLoss / base) * 100;
      return { amount: profitLoss, percentage: profitLossPercent };
    }
  };

  const openEditModal = (investment) => {
    if (!investment) return;
    // Prefill missing currency from price data or ticker suffix
    const t = investment.ticker_symbol;
    const inferred = investment.purchase_currency || stockPrices[t]?.currency || screenerData[t]?.currency || inferCurrencyFromTicker(t) || 'EUR';
    // Start with the investment as we have it (may already include batches)
    setEditingInvestment({ ...investment, investment_batches: investment.investment_batches || [], purchase_currency: inferred });
  // Initialize batch currency default to investment currency
  setNewBatch((prev) => ({
    ...prev,
    purchase_currency: inferred || 'EUR'
  }));
    setShowAddModal(true);

    // Always fetch latest batches from Supabase so splits are preserved, even after reload
    if (investment.id) {
      db.investmentBatches
        .getByInvestment(investment.id)
        .then((batches) => {
          setEditingInvestment((prev) => {
            if (!prev || prev.id !== investment.id) return prev;
            return { ...prev, investment_batches: batches };
          });
        })
        .catch((error) => {
          console.error('Error loading investment batches:', error);
        });
    }
  };

  // Add a new purchase batch to existing investment
  const addBatchToInvestment = async () => {
    if (!editingInvestment || !newBatch.shares || !newBatch.purchase_price) {
      alert('Vul aantal aandelen en aankoopprijs in');
      return;
    }
    
    const shares = parseFloat(newBatch.shares);
    const price = parseFloat(newBatch.purchase_price);
    const srcCurrency = newBatch.purchase_currency || editingInvestment.purchase_currency || 'EUR';
    const amountInSrc = shares * price;
    const amount = convertToEUR(amountInSrc, srcCurrency);
    
    try {
      const batch = await db.investmentBatches.create({
        investment_id: editingInvestment.id,
        purchase_date: newBatch.purchase_date,
        shares,
        purchase_price: price,
        amount,
        notes: newBatch.notes?.trim() || null
      });
      const batchWithCurrency = { ...batch, purchase_currency: srcCurrency };
      
      // Update local state
      const updatedBatches = [...(editingInvestment.investment_batches || []), batchWithCurrency];
      const totalShares = updatedBatches.reduce((sum, b) => sum + (b.shares || 0), 0);
      const totalAmount = updatedBatches.reduce((sum, b) => sum + (b.amount || 0), 0);
      const avgPrice = totalShares > 0 ? totalAmount / totalShares : 0;
      
      setEditingInvestment({
        ...editingInvestment,
        investment_batches: updatedBatches,
        shares: totalShares,
        amount: totalAmount,
        purchase_price: avgPrice
      });
      
      // Reset batch form
      setNewBatch({
        purchase_date: new Date().toISOString().split('T')[0],
        shares: '',
        purchase_price: '',
        purchase_currency: editingInvestment.purchase_currency || 'EUR',
        notes: ''
      });
      setShowAddBatchModal(false);
      
      // Reload investments to get fresh totals
      await loadInvestments();
    } catch (error) {
      console.error('Error adding batch:', error);
      alert('Fout bij toevoegen aankoop: ' + error.message);
    }
  };

  // Delete a batch
  const deleteBatch = async (batchId) => {
    if (!window.confirm('Weet je zeker dat je deze aankoop wilt verwijderen?')) return;
    
    try {
      await db.investmentBatches.delete(batchId);
      
      // Update local state
      const updatedBatches = (editingInvestment.investment_batches || []).filter(b => b.id !== batchId);
      const totalShares = updatedBatches.reduce((sum, b) => sum + (b.shares || 0), 0);
      const totalAmount = updatedBatches.reduce((sum, b) => sum + (b.amount || 0), 0);
      const avgPrice = totalShares > 0 ? totalAmount / totalShares : 0;
      
      setEditingInvestment({
        ...editingInvestment,
        investment_batches: updatedBatches,
        shares: totalShares || editingInvestment.shares,
        amount: totalAmount || editingInvestment.amount,
        purchase_price: avgPrice || editingInvestment.purchase_price
      });
      
      await loadInvestments();
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Fout bij verwijderen aankoop');
    }
  };

  // Convert existing single purchase to first batch (migration helper)
  const convertToBatchSystem = async () => {
    if (!editingInvestment || !editingInvestment.shares || !editingInvestment.purchase_price) {
      alert('Geen bestaande aankoopgegevens om te converteren');
      return;
    }
    
    if ((editingInvestment.investment_batches || []).length > 0) {
      alert('Deze investering heeft al batches');
      return;
    }
    
    try {
      const srcCur = editingInvestment.purchase_currency || 'EUR';
      const eShares = parseFloat(editingInvestment.shares);
      const ePrice = parseFloat(editingInvestment.purchase_price);
      const amtSrc = (parseFloat(editingInvestment.amount) || (eShares * ePrice));
      const amtEUR = convertToEUR(amtSrc, srcCur);
      const batch = await db.investmentBatches.create({
        investment_id: editingInvestment.id,
        purchase_date: editingInvestment.created_at ? editingInvestment.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        shares: eShares,
        purchase_price: ePrice,
        amount: amtEUR,
        notes: 'Initiële aankoop (geconverteerd)'
      });
      
      setEditingInvestment({
        ...editingInvestment,
        investment_batches: [batch]
      });
      
      await loadInvestments();
    } catch (error) {
      console.error('Error converting to batch:', error);
      alert('Fout bij conversie: ' + error.message);
    }
  };

  const addLinkToInvestment = () => {
    if (!newLink.label.trim() || !newLink.url.trim()) return;
    
    if (editingInvestment) {
      setEditingInvestment({
        ...editingInvestment,
        links: [...(editingInvestment.links || []), { ...newLink, id: Date.now() }]
      });
    } else {
      setNewInvestment({
        ...newInvestment,
        links: [...(newInvestment.links || []), { ...newLink, id: Date.now() }]
      });
    }
    
    setNewLink({ label: '', url: '' });
    setShowAddLinkModal(false);
  };

  const removeLinkFromInvestment = async (linkId) => {
    // If link has an id, it's already in database
    if (linkId && typeof linkId === 'number' && linkId > 1000) {
      try {
        await db.investmentLinks.delete(linkId);
      } catch (error) {
        console.error('Error deleting link:', error);
      }
    }
    
    if (editingInvestment) {
      setEditingInvestment({
        ...editingInvestment,
        links: editingInvestment.links.filter(l => l.id !== linkId)
      });
    } else {
      setNewInvestment({
        ...newInvestment,
        links: newInvestment.links.filter(l => l.id !== linkId)
      });
    }
  };

  // Hidden Gems: real small/micro-cap growth companies not yet mainstream
  const GEM_CANDIDATES = [
    // AI Infrastructure & Software (kleine spelers, hoge groei)
    { ticker: 'SOUN', name: 'SoundHound AI', sector: 'AI Voice', why: 'Voice AI platform, groeiende enterprise klanten' },
    { ticker: 'BBAI', name: 'BigBear.ai', sector: 'AI Analytics', why: 'AI voor defensie & overheid, groeiend orderboek' },
    { ticker: 'AI', name: 'C3.ai', sector: 'Enterprise AI', why: 'Enterprise AI platform, stijgende adoptie' },
    { ticker: 'APLD', name: 'Applied Digital', sector: 'AI Infra', why: 'AI cloud/GPU hosting, data centers' },
    { ticker: 'SERV', name: 'Serve Robotics', sector: 'Robotica', why: 'Autonome delivery robots, Uber partnership' },

    // Ruimtevaart & Defensie
    { ticker: 'RKLB', name: 'Rocket Lab', sector: 'Ruimtevaart', why: 'Kleine raketlanceerder, NASA contracten' },
    { ticker: 'ASTS', name: 'AST SpaceMobile', sector: 'Space Telecom', why: 'Direct-to-phone satelliet, unieke technologie' },
    { ticker: 'LUNR', name: 'Intuitive Machines', sector: 'Ruimtevaart', why: 'Maanlander diensten, NASA contracten' },
    { ticker: 'RDW', name: 'Redwire', sector: 'Space Infra', why: 'Ruimtevaart infrastructuur & 3D printing in space' },
    { ticker: 'KTOS', name: 'Kratos Defense', sector: 'Defensie', why: 'Drones & hypersonische systemen voor defensie' },

    // Quantum Computing
    { ticker: 'IONQ', name: 'IonQ', sector: 'Quantum', why: 'Leidende quantum hardware, groeiend commercieel gebruik' },
    { ticker: 'RGTI', name: 'Rigetti Computing', sector: 'Quantum', why: 'Quantum cloud computing platform' },
    { ticker: 'QUBT', name: 'Quantum Computing', sector: 'Quantum', why: 'Quantum software oplossingen' },

    // Clean Energy & EV (kleine innovators)
    { ticker: 'ACHR', name: 'Archer Aviation', sector: 'eVTOL', why: 'Elektrische luchttaxi, FAA certificering nadert' },
    { ticker: 'QS', name: 'QuantumScape', sector: 'Batterijen', why: 'Solid-state batterijen, VW partnership' },
    { ticker: 'ENVX', name: 'Enovix', sector: 'Batterijen', why: 'Next-gen silicon batterij technologie' },
    { ticker: 'STEM', name: 'Stem Inc', sector: 'Clean Energy', why: 'AI-gestuurde energieopslag' },

    // Biotech & MedTech (innovators)
    { ticker: 'PRCT', name: 'PROCEPT BioRobotics', sector: 'MedTech', why: 'Chirurgische robotica, snelgroeiend' },
    { ticker: 'RXRX', name: 'Recursion Pharma', sector: 'AI Biotech', why: 'AI-gedreven drug discovery platform' },
    { ticker: 'PCVX', name: 'Vaxcyte', sector: 'Biotech', why: 'Next-gen vaccins, veelbelovende pipeline' },
    { ticker: 'TMDX', name: 'TransMedics', sector: 'MedTech', why: 'Orgaantransport technologie, monopoliepositie' },
    { ticker: 'DNLI', name: 'Denali Therapeutics', sector: 'Biotech', why: 'Neurodegeneratie therapieën, unieke pipeline' },

    // FinTech (opkomend)
    { ticker: 'RELY', name: 'Remitly Global', sector: 'FinTech', why: 'Digitale geldoverdracht, snelgroeiend' },
    { ticker: 'FLYW', name: 'Flywire', sector: 'FinTech', why: 'Complexe betalingen voor onderwijs & zorg' },
    { ticker: 'CWAN', name: 'Clearwater Analytics', sector: 'FinTech', why: 'Beleggingsanalyse SaaS, hoge retentie' },
    { ticker: 'DLO', name: 'DLocal', sector: 'FinTech', why: 'Betalingen in opkomende markten' },

    // SaaS & Software (klein maar groeiend)
    { ticker: 'BRZE', name: 'Braze', sector: 'MarTech', why: 'Marketing automation platform, sterke groei' },
    { ticker: 'DOCN', name: 'DigitalOcean', sector: 'Cloud', why: 'Cloud voor kleine bedrijven & developers' },
    { ticker: 'GTLB', name: 'GitLab', sector: 'DevOps', why: 'DevSecOps platform, groeiend marktaandeel' },
    { ticker: 'S', name: 'SentinelOne', sector: 'Cybersecurity', why: 'AI-first cybersecurity, marktaandeel wint' },

    // Consumer & Emerging
    { ticker: 'DUOL', name: 'Duolingo', sector: 'EdTech', why: 'Taal-leerplatform, sterke gebruikersgroei & AI' },
    { ticker: 'DOCS', name: 'Doximity', sector: 'HealthTech', why: 'LinkedIn voor artsen, hoge marges' },
    { ticker: 'DNA', name: 'Ginkgo Bioworks', sector: 'Synth Bio', why: 'Synthetische biologie platform, breed toepasbaar' },
    { ticker: 'GENI', name: 'Genius Sports', sector: 'SportsTech', why: 'Officiële sportdata & betting technologie' },
    
    // Additional High-Potential Gems
    { ticker: 'PLTR', name: 'Palantir', sector: 'AI/Data', why: 'AI platform voor overheid & enterprise, sterke groei' },
    { ticker: 'CRWD', name: 'CrowdStrike', sector: 'Cybersecurity', why: 'Cloud security leader, hoge groei' },
    { ticker: 'NET', name: 'Cloudflare', sector: 'Cloud/CDN', why: 'Edge computing & security, groeiend' },
    { ticker: 'DDOG', name: 'Datadog', sector: 'Monitoring', why: 'Cloud monitoring platform, sterke retentie' },
    { ticker: 'MDB', name: 'MongoDB', sector: 'Database', why: 'NoSQL database leader, enterprise adoptie' },
    { ticker: 'SNOW', name: 'Snowflake', sector: 'Data Cloud', why: 'Cloud data platform, hoge groei' },
    { ticker: 'ZS', name: 'Zscaler', sector: 'Cloud Security', why: 'Zero trust security, groeiend marktaandeel' },
    { ticker: 'OKTA', name: 'Okta', sector: 'Identity', why: 'Identity management platform' },
    { ticker: 'ESTC', name: 'Elastic', sector: 'Search/Analytics', why: 'Search & analytics platform' },
    { ticker: 'BILL', name: 'Bill.com', sector: 'FinTech', why: 'SMB betalingsplatform, sterke groei' },
    { ticker: 'AFRM', name: 'Affirm', sector: 'FinTech', why: 'Buy now pay later platform' },
    { ticker: 'UPST', name: 'Upstart', sector: 'AI Lending', why: 'AI-gedreven kredietverlening' },
    { ticker: 'SOFI', name: 'SoFi', sector: 'FinTech', why: 'Digital banking platform, groeiend' },
    { ticker: 'NU', name: 'Nu Holdings', sector: 'FinTech', why: 'Latijns-Amerika digital bank, massale groei' },
    { ticker: 'RBLX', name: 'Roblox', sector: 'Gaming/Metaverse', why: 'Gaming platform, jonge gebruikersbasis' },
    { ticker: 'U', name: 'Unity', sector: 'Gaming Tech', why: 'Game development platform' },
    { ticker: 'RIVN', name: 'Rivian', sector: 'EV', why: 'Elektrische trucks & SUVs, Amazon partnership' },
    { ticker: 'LCID', name: 'Lucid Motors', sector: 'EV', why: 'Luxury EV maker, Saudi backing' },
    { ticker: 'CHPT', name: 'ChargePoint', sector: 'EV Charging', why: 'EV laadnetwerk leader' },
    { ticker: 'PLUG', name: 'Plug Power', sector: 'Hydrogen', why: 'Waterstof brandstofcellen' },
    { ticker: 'FSLR', name: 'First Solar', sector: 'Solar', why: 'US solar manufacturing, IRA profiteur' },
    { ticker: 'ENPH', name: 'Enphase', sector: 'Solar', why: 'Solar microinverters, sterke marges' },
    { ticker: 'SEDG', name: 'SolarEdge', sector: 'Solar', why: 'Solar inverters & optimizers' },
  ];

  const scanHiddenGems = async () => {
    setLoadingGems(true);
    const gems = [];

    // Batch fetch: try v7 quote API first for fundamental data
    const allTickers = GEM_CANDIDATES.map(c => c.ticker).join(',');
    let quoteData = {};

    try {
      const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${allTickers}`;
      const quoteResponse = await axios.get(`${CORS_PROXY}${encodeURIComponent(quoteUrl)}`);
      const quotes = quoteResponse.data.quoteResponse?.result || [];
      quotes.forEach(q => {
        quoteData[q.symbol] = {
          marketCap: q.marketCap,
          trailingPE: q.trailingPE,
          forwardPE: q.forwardPE,
          pegRatio: q.pegRatio,
          revenueGrowth: q.revenueGrowth,
          earningsGrowth: q.earningsGrowth,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
          averageAnalystRating: q.averageAnalystRating,
          shortName: q.shortName,
        };
      });
    } catch (e) {
      console.log('v7 quote API niet beschikbaar, fallback naar chart data');
    }

    // Fetch price/chart data per ticker
    for (const candidate of GEM_CANDIDATES) {
      try {
        // Check cache first
        const cached = stockCache.get('chart', candidate.ticker, { range: '6mo' });
        let result;
        
        if (cached) {
          result = cached;
        } else {
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${candidate.ticker}?interval=1d&range=6mo`;
          const response = await axios.get(`${CORS_PROXY}${encodeURIComponent(yahooUrl)}`);
          result = response.data.chart.result[0];
          stockCache.set('chart', candidate.ticker, result, { range: '6mo' });
        }
        
        const meta = result.meta;
        const closes = result.indicators.quote[0].close.filter(p => p !== null);
        const volumes = result.indicators.quote[0].volume?.filter(v => v !== null) || [];

        if (closes.length < 10) continue;

        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose;
        const dailyChange = ((currentPrice - previousClose) / previousClose) * 100;
        const price6moAgo = closes[0];
        const growth6mo = ((currentPrice - price6moAgo) / price6moAgo) * 100;
        const currency = meta.currency || 'USD';

        // 1-month growth
        const price1moAgo = closes.length >= 22 ? closes[closes.length - 22] : closes[0];
        const growth1mo = ((currentPrice - price1moAgo) / price1moAgo) * 100;

        // Volatility
        const dailyReturns = [];
        for (let i = 1; i < closes.length; i++) {
          dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
        }
        const avgReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
        const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
        const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
        
        // Calculate technical indicators
        const rsi = technicalIndicators.calculateRSI(closes, 14);
        const macd = technicalIndicators.calculateMACD(closes);
        const sma50 = technicalIndicators.calculateSMA(closes, 50);
        const sma200 = technicalIndicators.calculateSMA(closes, 200);
        const signal = technicalIndicators.getSignal(rsi, macd, currentPrice, sma50, sma200);
        const avgVolume = volumes.length > 0 ? volumes.reduce((sum, v) => sum + v, 0) / volumes.length : 0;
        const currentVolume = volumes[volumes.length - 1] || 0;

        // 52-week position (how close to 52w high)
        const quote = quoteData[candidate.ticker] || {};
        const high52w = quote.fiftyTwoWeekHigh || Math.max(...closes);
        const low52w = quote.fiftyTwoWeekLow || Math.min(...closes);
        const positionIn52w = high52w !== low52w ? ((currentPrice - low52w) / (high52w - low52w)) * 100 : 50;

        // Composite score (higher = better gem) - STRICTER CRITERIA
        let score = 0;
        
        // Positive 6M growth is REQUIRED (max 30 pts)
        if (growth6mo > 0) {
          score += Math.min(30, growth6mo * 0.4);
        } else {
          score -= 20; // Penalty for negative growth
        }
        
        // Recent acceleration is REQUIRED (1M growth > 6M average monthly growth)
        const monthlyAvg6m = growth6mo / 6;
        if (growth1mo > monthlyAvg6m && growth1mo > 0) {
          score += 20;
        } else if (growth1mo < 0) {
          score -= 10; // Penalty for recent decline
        }
        
        // Low volatility relative to growth is good (max 15 pts)
        if (volatility > 0 && growth6mo > 0) {
          score += Math.min(15, (growth6mo / volatility) * 12);
        }
        
        // Not at all-time high = still room to grow (max 10 pts)
        if (positionIn52w < 85) score += 10;
        if (positionIn52w < 60) score += 5;
        
        // Small market cap bonus (only for true small caps)
        if (quote.marketCap && quote.marketCap < 2e9) score += 15;
        else if (quote.marketCap && quote.marketCap < 5e9) score += 8;
        
        // Low PEG ratio is great (strict threshold)
        if (quote.pegRatio && quote.pegRatio > 0 && quote.pegRatio < 1.2) score += 20;
        else if (quote.pegRatio && quote.pegRatio > 0 && quote.pegRatio < 1.5) score += 10;
        
        // Technical signal bonus
        if (signal?.overall === 'STRONG BUY') score += 15;
        else if (signal?.overall === 'BUY') score += 10;
        else if (signal?.overall === 'SELL') score -= 15;

        const sparkline = closes.slice(-30);

        gems.push({
          ...candidate,
          currentPrice,
          dailyChange,
          growth6mo,
          growth1mo,
          volatility,
          score: Math.round(score),
          sparkline,
          currency,
          marketCap: quote.marketCap,
          trailingPE: quote.trailingPE,
          forwardPE: quote.forwardPE,
          pegRatio: quote.pegRatio,
          positionIn52w,
          analystRating: quote.averageAnalystRating,
          // Technical indicators
          rsi,
          macd,
          sma50,
          sma200,
          signal,
          volume: currentVolume,
          avgVolume
        });
      } catch (error) {
        continue;
      }
    }

    // Sort by composite score (best first)
    gems.sort((a, b) => b.score - a.score);
    
    // Filter: Show at least 10 gems, or all with score >= 20
    const MIN_GEMS = 10;
    const SCORE_THRESHOLD = 20;
    
    let topPicks = gems.filter(gem => gem.score >= SCORE_THRESHOLD);
    
    // If less than MIN_GEMS, take top MIN_GEMS regardless of score
    if (topPicks.length < MIN_GEMS && gems.length >= MIN_GEMS) {
      topPicks = gems.slice(0, MIN_GEMS);
    }
    
    setGemWatchlist(topPicks);
    setLoadingGems(false);
  };

  const scanKnallers = async () => {
    setLoadingKnallers(true);
    try {
      console.log('🔥 Starting comprehensive Knallers scan...');
      let allStocks = [];
      
      // Use existing screenerData from watchlist/scanner
      const existingTickers = Object.keys(screenerData);
      if (existingTickers.length > 0) {
        console.log(`🚀 Using ${existingTickers.length} stocks from existing screenerData`);
        allStocks = existingTickers.map(ticker => ({
          ticker,
          name: screenerData[ticker].name || ticker,
          sector: screenerData[ticker].sector,
          ...screenerData[ticker]
        }));
      }
      
      // Fetch fresh high-quality data with aggressive filters
      try {
        const response = await axios.get(`/api/screener`, {
          params: {
            minScore: 40,  // Higher quality threshold
            maxResults: 200,  // More stocks to analyze
            sortBy: 'qualityScore',
            sortDir: 'desc'
          },
          timeout: 15000  // Longer timeout for thorough search
        });
        
        if (response.data?.results) {
          console.log(`🚀 Got ${response.data.results.length} high-quality stocks from API`);
          // Merge with existing, avoid duplicates
          const apiTickers = new Set(response.data.results.map(s => s.ticker));
          const merged = [...response.data.results];
          allStocks.forEach(s => {
            if (!apiTickers.has(s.ticker)) {
              merged.push(s);
            }
          });
          allStocks = merged;
        }
      } catch (apiError) {
        console.warn('⚠️ API fetch failed, using existing data only:', apiError.message);
      }
      
      console.log(`🚀 Knallers scan: analyzing ${allStocks.length} total stocks`);
      
      if (allStocks.length === 0) {
        console.warn('⚠️ No stock data available');
        setKnallers([]);
        setLoadingKnallers(false);
        return;
      }

      const candidates = allStocks.map(stock => {
        let explosiveScore = 0;
        const catalysts = [];

        const earningsSurprise = stock.earningsSurprise || 0;
        const revenueGrowth = stock.revenueGrowth || 0;
        const currentVolume = stock.currentVolume || stock.volume || 0;
        const avgVolume = stock.avgVolume20d || stock.avgVolume || 1;
        const volumeRatio = stock.volumeRatio || (currentVolume > 0 && avgVolume > 0 ? currentVolume / avgVolume : 1);
        const rsi = stock.rsi || 50;
        const peRatio = stock.peRatio || stock.pe || stock.priceToEarnings || stock.trailingPE || 0;
        const pegRatio = stock.pegRatio || 0;
        const signal = (typeof stock.signal === 'object' && stock.signal?.overall) ? stock.signal.overall : (stock.signal || 'NEUTRAL');
        const growth1mo = stock.growth1mo || 0;
        const growth6mo = stock.growth6mo || 0;
        const sma50 = stock.sma50 || 0;
        const sma200 = stock.sma200 || 0;
        const currentPrice = stock.currentPrice || 0;
        const near52wHigh = stock.near52wHigh || 100;
        const emaTrendUp = stock.emaTrendUp || false;

        if (earningsSurprise > 5) {
          explosiveScore += 20;
          catalysts.push(`Earnings beat +${earningsSurprise.toFixed(1)}%`);
        } else if (earningsSurprise > 0) {
          explosiveScore += 10;
        }

        if (revenueGrowth > 0.25) {
          explosiveScore += 20;
          catalysts.push(`Revenue +${(revenueGrowth * 100).toFixed(0)}%`);
        } else if (revenueGrowth > 0.15) {
          explosiveScore += 12;
          catalysts.push(`Revenue +${(revenueGrowth * 100).toFixed(0)}%`);
        }

        if (signal === 'STRONG BUY') {
          explosiveScore += 18;
          catalysts.push('Strong Buy signaal');
        } else if (signal === 'BUY') {
          explosiveScore += 10;
        }

        if (volumeRatio > 2.5) {
          explosiveScore += 15;
          catalysts.push(`Volume spike ${volumeRatio.toFixed(1)}x`);
        } else if (volumeRatio > 1.8) {
          explosiveScore += 8;
        }

        if (rsi >= 40 && rsi <= 70) {
          explosiveScore += 8;
        } else if (rsi > 70) {
          explosiveScore -= 5;
        }

        if (peRatio > 0 && peRatio < 20) {
          explosiveScore += 10;
          catalysts.push(`Lage P/E ${peRatio.toFixed(1)}`);
        } else if (peRatio > 0 && peRatio < 30) {
          explosiveScore += 5;
        }

        if (pegRatio > 0 && pegRatio < 1.2) {
          explosiveScore += 12;
          catalysts.push(`PEG ${pegRatio.toFixed(2)}`);
        } else if (pegRatio > 0 && pegRatio < 1.8) {
          explosiveScore += 6;
        }

        if (growth1mo > 10) {
          explosiveScore += 10;
          catalysts.push(`1M momentum +${growth1mo.toFixed(1)}%`);
        } else if (growth1mo > 5) {
          explosiveScore += 5;
        }

        if (currentPrice > sma50 && sma50 > sma200 && emaTrendUp) {
          explosiveScore += 12;
          catalysts.push('Breakout boven MA');
        } else if (currentPrice > sma50 && sma50 > sma200) {
          explosiveScore += 6;
        }

        if (near52wHigh <= 5) {
          explosiveScore += 8;
          catalysts.push('Dicht bij 52w high');
        }

        if (growth6mo > 30 && growth1mo > growth6mo / 6) {
          explosiveScore += 8;
          catalysts.push('Accelererende groei');
        }

        if (growth6mo > 20) {
          explosiveScore += 5;
        }

        if (stock.qualityScore && stock.qualityScore > 70) {
          explosiveScore += 15;
          catalysts.push('Hoge quality score');
        } else if (stock.qualityScore && stock.qualityScore > 60) {
          explosiveScore += 8;
        }

        // Bonus for strong fundamentals
        if (peRatio > 0 && peRatio < 15 && pegRatio > 0 && pegRatio < 1) {
          explosiveScore += 10;
          catalysts.push('Sterke fundamentals');
        }

        // Penalty for weak signals
        if (catalysts.length === 0) {
          explosiveScore = Math.max(0, explosiveScore - 15);
        }
        
        // Bonus for multiple strong catalysts
        if (catalysts.length >= 4) {
          explosiveScore += 10;
        }

        return {
          ticker: stock.ticker,
          name: stock.name || stock.ticker,
          sector: stock.sector || 'Unknown',
          explosiveScore: Math.min(100, Math.round(explosiveScore)),
          catalysts: catalysts.slice(0, 5),
          currentPrice: stock.currentPrice,
          dailyChange: stock.dailyChange,
          growth1mo: stock.growth1mo,
          growth6mo: stock.growth6mo,
          growth1yr: stock.growth1yr,
          marketCap: stock.marketCap,
          volatility: stock.volatility,
          positionIn52w: stock.positionIn52w,
          rsi: stock.rsi,
          macd: stock.macd,
          sma50: stock.sma50,
          sma200: stock.sma200,
          volume: stock.currentVolume || stock.volume,
          avgVolume: stock.avgVolume20d || stock.avgVolume,
          trailingPE: peRatio,
          forwardPE: stock.forwardPE,
          pegRatio: pegRatio,
          signal: stock.signal,
          qualityScore: stock.qualityScore,
          sparkline: stock.sparkline || [],
          currency: stock.currency || 'USD',
          why: catalysts.join(' • ')
        };
      });

      // Filter for explosive stocks with relaxed criteria to get more results
      const topKnallers = candidates
        .filter(c => {
          // More relaxed criteria to ensure we get enough results
          const hasDecentScore = c.explosiveScore >= 35;  // Lowered from 50
          const hasCatalysts = c.catalysts.length >= 1;   // At least 1 catalyst
          const hasData = c.currentPrice > 0;             // Valid price data
          
          return hasDecentScore && hasCatalysts && hasData;
        })
        .sort((a, b) => b.explosiveScore - a.explosiveScore)
        .slice(0, 20);  // Get top 20 instead of 10

      if (topKnallers.length < 10) {
        // Even more relaxed fallback
        const fallbackKnallers = candidates
          .filter(c => c.explosiveScore >= 25 && c.currentPrice > 0)
          .sort((a, b) => b.explosiveScore - a.explosiveScore)
          .slice(0, 20);
        console.log(`✅ Knallers: ${fallbackKnallers.length} aandelen gevonden (relaxed criteria)`);
        console.log('Top 5 knallers:', fallbackKnallers.slice(0, 5).map(k => `${k.ticker} (${k.explosiveScore})`));
        setKnallers(fallbackKnallers);
      } else {
        console.log(`✅ Knallers: ${topKnallers.length} explosieve aandelen gevonden`);
        console.log('Top 5 knallers:', topKnallers.slice(0, 5).map(k => `${k.ticker} (${k.explosiveScore})`));
        setKnallers(topKnallers);
      }
    } catch (error) {
      console.error('❌ Error scanning knallers:', error);
      setKnallers([]);
    }
    setLoadingKnallers(false);
  };

  // Apple-style chart: fetch Yahoo Finance data for a symbol
  const fetchChartDataForSymbol = async (symbol, timeframe = '1M') => {
    const rangeMap = { '1D': '1d', '1W': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y', '5Y': '5y' };
    const intervalMap = { '1D': '5m', '1W': '15m', '1M': '1d', '3M': '1d', '6M': '1d', '1Y': '1wk', '5Y': '1mo' };
    const range = rangeMap[timeframe] || '1mo';
    const interval = intervalMap[timeframe] || '1d';

    setLoadingChartData(prev => ({ ...prev, [symbol]: true }));
    try {
      // Use our Vercel API endpoint
      const response = await axios.get(`/api/stock-price`, {
        params: {
          ticker: symbol,
          range: range,
          interval: interval
        }
      });
      
      const apiData = response.data;
      
      console.log(`📊 Chart data for ${symbol}:`, apiData);
      
      // Check if we have valid sparkline data
      if (!apiData || !apiData.sparklineData || !Array.isArray(apiData.sparklineData) || apiData.sparklineData.length === 0) {
        throw new Error('No sparkline data available');
      }
      
      // Transform sparkline data to chart format
      const data = apiData.sparklineData.map((value, i) => ({
        time: Date.now() - (apiData.sparklineData.length - i) * 60000, // Approximate timestamps
        value: value
      }));

      const currentPrice = apiData.current;
      const previousClose = apiData.previousClose;
      const priceChange = apiData.change;
      const changePercent = apiData.changePercent;

      setChartData(prev => ({
        ...prev,
        [symbol]: { 
          data, 
          currentPrice, 
          previousClose, 
          priceChange, 
          changePercent, 
          currency: apiData.currency || 'USD', 
          name: symbol,
          error: false
        }
      }));
    } catch (error) {
      console.error(`❌ Chart data error for ${symbol}:`, error.message);
      // Store placeholder so chart UI can show error state
      setChartData(prev => ({
        ...prev,
        [symbol]: { 
          data: [], 
          currentPrice: null, 
          previousClose: null, 
          priceChange: 0, 
          changePercent: 0, 
          currency: 'USD', 
          name: symbol,
          error: true
        }
      }));
    }
    setLoadingChartData(prev => ({ ...prev, [symbol]: false }));
  };

  // Load chart data for all user tickers + favorites on mount
  useEffect(() => {
    const allSymbols = [
      ...userTickers.map(t => t.symbol),
      ...chartFavorites.map(c => c.symbol)
    ];
    allSymbols.forEach(symbol => {
      const tf = selectedChartTimeframe[symbol] || '1M';
      fetchChartDataForSymbol(symbol, tf);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments.length, chartFavorites.length]);

  // Fetch news for user's own stocks
  const fetchStockNews = async () => {
    if (userTickers.length === 0) return;
    setLoadingNews(true);
    try {
      const tickersToFetch = userTickers.slice(0, 6).map(t => {
        return t.symbol.includes(':') ? tradingViewToYahoo(t.symbol) : t.symbol;
      });
      
      console.log('📰 Fetching news for tickers:', tickersToFetch);
      
      const response = await axios.get(`/api/news`, {
        params: { tickers: tickersToFetch.join(',') }
      });
      
      console.log('📰 News API response:', response.data);
      
      const news = (response.data.news || []).map(n => {
        const cleanBase = (t) => {
          if (!t) return '';
          let s = String(t).toUpperCase();
          if (s.includes(':')) {
            const [a, b] = s.split(':');
            const pickA = /^[A-Z0-9.-]{1,7}$/.test(a);
            const pickB = /^[A-Z0-9.-]{1,7}$/.test(b);
            s = pickA && !pickB ? a : (!pickA && pickB ? b : (a.length <= b.length ? a : b));
          }
          if (s.includes('.')) s = s.split('.')[0];
          return s.replace(/[^A-Z0-9-]/g, '');
        };
        // Find matching original symbol
        const matched = userTickers.find(t => {
          const ys = t.symbol.includes(':') ? tradingViewToYahoo(t.symbol) : t.symbol;
          return ys === n.query || (n.relatedTickers || []).includes(ys);
        });
        const badge = cleanBase(matched?.symbol || n.ticker || n.query);
        return {
          title: n.title,
          link: n.link,
          publisher: n.publisher,
          publishedAt: n.publishedAt ? new Date(n.publishedAt) : null,
          thumbnail: n.thumbnail,
          relatedTicker: badge || null,
          relatedName: matched?.name,
        };
      });
      
      setStockNews(news.slice(0, 12));
    } catch (e) {
      console.error('Stock news error:', e);
      setStockNews([]);
    }
    setLoadingNews(false);
  };

  // Fetch news for a single investment (for popup)
  const fetchInvestmentNews = async (investment) => {
    if (!investment.ticker_symbol) return;
    const id = investment.id;
    setLoadingInvNews(prev => ({ ...prev, [id]: true }));
    try {
      const yahooSymbol = investment.ticker_symbol.includes(':') ? tradingViewToYahoo(investment.ticker_symbol) : investment.ticker_symbol;
      let allNews = [];

      // Strategy 1: Search by ticker symbol in quotes for exact match
      try {
        const url1 = `https://query1.finance.yahoo.com/v1/finance/search?q="${yahooSymbol}"&newsCount=5&quotesCount=0`;
        const res1 = await axios.get(`${CORS_PROXY}${encodeURIComponent(url1)}`);
        (res1.data.news || []).forEach(n => allNews.push(n));
      } catch (e) { /* continue */ }

      // Strategy 2: Search by ticker without quotes (for broader results)
      if (allNews.length < 3) {
        try {
          const url2 = `https://query1.finance.yahoo.com/v1/finance/search?q=${yahooSymbol}&newsCount=5&quotesCount=0`;
          const res2 = await axios.get(`${CORS_PROXY}${encodeURIComponent(url2)}`);
          (res2.data.news || []).forEach(n => allNews.push(n));
        } catch (e) { /* continue */ }
      }

      // Strategy 4: Just company name as last resort
      if (allNews.length < 3) {
        try {
          const cleanName = investment.name.replace(/\s+(Inc|Corp|Ltd|plc|UCITS|ETF|SA|NV|AG|SE|GmbH)\b/gi, '').trim();
          const url4 = `https://query1.finance.yahoo.com/v1/finance/search?q=${cleanName}&newsCount=5&quotesCount=0`;
          const res4 = await axios.get(`${CORS_PROXY}${encodeURIComponent(url4)}`);
          (res4.data.news || []).forEach(n => allNews.push(n));
        } catch (e) { /* continue */ }
      }

      // Deduplicate by title
      const seen = new Set();
      const news = allNews
        .filter(n => { if (!n.title || seen.has(n.title)) return false; seen.add(n.title); return true; })
        .slice(0, 5)
        .map(n => ({
          title: n.title,
          link: n.link,
          publisher: n.publisher,
          publishedAt: n.providerPublishTime ? new Date((typeof n.providerPublishTime === 'number' ? n.providerPublishTime : parseInt(n.providerPublishTime)) * 1000) : null,
        }));
      setInvestmentNews(prev => ({ ...prev, [id]: news }));

      // Auto-trigger AI summary if we have news
      if (news.length > 0 && !newsSummary[investment.id]) {
        setLoadingNewsSummary(prev => ({ ...prev, [investment.id]: true }));
        try {
          const userKey = typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') : null;
          const summary = await getAIExplanation('news', investment.ticker_symbol || investment.name, news, userKey);
          setNewsSummary(prev => ({ ...prev, [investment.id]: summary }));
        } catch (error) {
          console.error('Error generating AI news summary:', error);
        } finally {
          setLoadingNewsSummary(prev => ({ ...prev, [investment.id]: false }));
        }
      }
    } catch (e) {
      setInvestmentNews(prev => ({ ...prev, [id]: [] }));
    }
    setLoadingInvNews(prev => ({ ...prev, [id]: false }));
  };

  // Extract ticker from news title or link
  const extractTicker = (title, link) => {
    const cleanBase = (t) => {
      if (!t) return '';
      let s = String(t).toUpperCase();
      if (s.includes(':')) {
        const [a, b] = s.split(':');
        const pickA = /^[A-Z0-9.-]{1,7}$/.test(a);
        const pickB = /^[A-Z0-9.-]{1,7}$/.test(b);
        s = pickA && !pickB ? a : (!pickA && pickB ? b : (a.length <= b.length ? a : b));
      }
      if (s.includes('.')) s = s.split('.')[0];
      return s.replace(/[^A-Z0-9-]/g, '');
    };

    // Build known ticker set from portfolio + watchlist (prefer matches from here)
    const knownTickers = new Set([
      ...investments.map((i) => cleanBase(i.ticker_symbol)).filter(Boolean),
      ...myWatchlist.map((w) => cleanBase(w.ticker || w.symbol)).filter(Boolean),
    ]);

    // 1) Try to parse explicit symbols from link URL
    try {
      if (link) {
        const u = new URL(link);
        // /quote/NVDA, /symbol/NVDA etc.
        const pathMatch = u.pathname.match(/\/(quote|symbol)\/([A-Za-z0-9.-]{1,10})/);
        if (pathMatch && pathMatch[2]) {
          const candidate = cleanBase(pathMatch[2]);
          if (candidate && (knownTickers.size === 0 || knownTickers.has(candidate))) return candidate;
        }
        // symbol=NVDA in query
        const qsym = u.searchParams.get('symbol') || u.searchParams.get('ticker');
        if (qsym) {
          const candidate = cleanBase(qsym);
          if (candidate && (knownTickers.size === 0 || knownTickers.has(candidate))) return candidate;
        }
      }
    } catch {}

    // 2) Match company names from portfolio/watchlist in the title
    try {
      const tl = (title || '').toLowerCase();
      for (const inv of investments) {
        if (!inv?.name || !inv?.ticker_symbol) continue;
        if (tl.includes(String(inv.name).toLowerCase())) return cleanBase(inv.ticker_symbol);
      }
      for (const wl of myWatchlist) {
        if (!wl?.name || !(wl?.ticker || wl?.symbol)) continue;
        if (tl.includes(String(wl.name).toLowerCase())) return cleanBase(wl.ticker || wl.symbol);
      }
    } catch {}

    // 3) Scan title for uppercase tickers and prefer ones we know
    const tickerRegex = /\b([A-Z]{1,5})\b/g;
    const matches = (title?.match(tickerRegex) || []).filter(Boolean);
    const stop = new Set(['THE','AND','FOR','WITH','FROM','THAT','THIS','WHAT','WHEN','WHY','HOW','ARE','WAS','WERE','BEEN','HAVE','HAS','HAD','WILL','CAN','COULD','SHOULD','WOULD','MAY','MIGHT','MUST','NEWS','USD','EUR','AI','IPO','ETF','CEO']);
    const filtered = matches.filter(t => !stop.has(t));
    const preferred = filtered.find(t => knownTickers.has(t));
    if (preferred) return preferred;
    return filtered[0] || null;
  };

  // Get Yahoo Finance URL for a symbol (works with all formats)
  const getYahooUrl = (symbol) => {
    const yahooSymbol = symbol.includes(':') ? tradingViewToYahoo(symbol) : symbol;
    return `https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}`;
  };

  // Fetch screener/market news
  const fetchScreenerNews = async () => {
    setLoadingScreenerNews(true);
    try {
      const queries = ['stock market today', 'growth stocks investing', 'NVIDIA AI stocks', 'S&P 500 market', 'tech stocks earnings'];
      console.log('📰 Fetching screener news with queries:', queries);
      
      const response = await axios.get(`/api/news`, {
        params: { queries: queries.join('|') }
      });
      
      console.log('📰 Screener news API response:', response.data);
      
      const news = (response.data.news || []).map(n => ({
        title: n.title,
        link: n.link,
        publisher: n.publisher,
        publishedAt: n.publishedAt ? new Date(n.publishedAt) : null,
        thumbnail: n.thumbnail,
        ticker: n.ticker || extractTicker(n.title, n.link),
      }));
      
      setScreenerNews(news.slice(0, 15));
    } catch (e) {
      console.error('News fetch error:', e);
      setScreenerNews([]);
    }
    setLoadingScreenerNews(false);
  };

  // Load news on mount
  useEffect(() => {
    if (userTickers.length > 0) fetchStockNews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments.length]);

  // Auto-fetch earnings when we have tickers but no data yet
  useEffect(() => {
    const hasTickers = investments.some(inv => inv.ticker_symbol) || (myWatchlist || []).some(w => w.ticker || w.symbol);
    if (hasTickers && !loadingEarnings && Object.keys(earningsData).length === 0) {
      fetchEarningsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments.length, myWatchlist.length, loadingEarnings]);

  // Persist watchlist
  useEffect(() => {
    localStorage.setItem('beleggen_watchlist', JSON.stringify(myWatchlist));
  }, [myWatchlist]);

  const addToWatchlist = (item) => {
    if (myWatchlist.some(w => w.ticker === item.ticker)) return;
    setMyWatchlist(prev => [...prev, { ticker: item.ticker, name: item.name, sector: item.sector, addedAt: Date.now() }]);
  };

  const removeFromWatchlist = (ticker) => {
    setMyWatchlist(prev => prev.filter(w => w.ticker !== ticker));
  };

  const searchWatchlistStocks = async (query) => {
    if (!query || query.length < 1) { setWatchlistResults([]); return; }
    setLoadingWlSearch(true);
    try {
      const res = await axios.get(`/api/search`, { params: { q: query, count: 8 } });
      setWatchlistResults(res.data.results || []);
    } catch (e) {
      console.error('Search error:', e);
      setWatchlistResults([]);
    }
    setLoadingWlSearch(false);
  };

  // Screener categories: curated ticker lists with strong selection rationale
  const SCREENER_CATEGORIES = {
    large: {
      label: 'Top Performers',
      description: 'Dominante marktleiders met sterke analyst buy-ratings en momentum',
      tickers: [
        { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology', why: 'Dominante AI-chipmaker, datacenter groei explosief' },
        { ticker: 'META', name: 'Meta Platforms', sector: 'Technology', why: 'AI-investering + advertentiegroei + Reality Labs' },
        { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology', why: 'Azure cloud + Copilot AI-integratie breed uitgerold' },
        { ticker: 'AVGO', name: 'Broadcom', sector: 'Technology', why: 'AI ASIC-chips + VMware-integratie versterkt marktpositie' },
        { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer', why: 'AWS cloud #1 + sterk e-commerce herstel' },
        { ticker: 'GOOGL', name: 'Alphabet', sector: 'Technology', why: 'AI Overviews + cloud groei + YouTube momentum' },
        { ticker: 'JPM', name: 'JPMorgan', sector: 'Financial', why: 'Sterkste bank VS, hoge rentemarge profiteur' },
        { ticker: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', why: 'GLP-1 (Mounjaro/Zepbound) marktleider obesitas/diabetes' },
        { ticker: 'V', name: 'Visa', sector: 'Financial', why: 'Monopolistisch betaalnetwerk, stabiele cashflow machine' },
        { ticker: 'COST', name: 'Costco', sector: 'Consumer', why: 'Uitzonderlijk loyale klantenbasis, consistente groei' },
        { ticker: 'NFLX', name: 'Netflix', sector: 'Technology', why: 'Ad-tier groei + live sport = nieuw groeistadium' },
        { ticker: 'MA', name: 'Mastercard', sector: 'Financial', why: 'Duopolie betalingsverkeer wereldwijd, pricing power' },
        { ticker: 'ORCL', name: 'Oracle', sector: 'Technology', why: 'Cloud database + AI training infrastructure boom' },
        { ticker: 'NOW', name: 'ServiceNow', sector: 'Technology', why: 'Enterprise AI-automatisering, hoge retention' },
        { ticker: 'AXON', name: 'Axon Enterprise', sector: 'Industrial', why: 'Monopolie publieke veiligheid + SaaS-platform groeit hard' },
      ]
    },
    growth: {
      label: 'Potentiële Groeiers',
      description: 'Disruptieve small-caps met exponentieel groeipotentieel en sterke thesis',
      tickers: [
        { ticker: 'PLTR', name: 'Palantir', sector: 'Technology', why: 'AI-platform overheid + enterprise, AIP groeit explosief' },
        { ticker: 'RKLB', name: 'Rocket Lab', sector: 'Industrial', why: 'Enige serieuze concurrent SpaceX small-launch markt' },
        { ticker: 'ASTS', name: 'AST SpaceMobile', sector: 'Technology', why: 'Satelliet-direct-naar-mobiel, nog pre-revenue maar uniek' },
        { ticker: 'HIMS', name: 'Hims & Hers', sector: 'Healthcare', why: 'Telehealth + GLP-1 compound groei, jong en schaalbaar' },
        { ticker: 'NU', name: 'Nu Holdings', sector: 'Financial', why: 'Grootste neobank LatAm, >100M klanten, winstgevend' },
        { ticker: 'IONQ', name: 'IonQ', sector: 'Technology', why: 'Kwantumcomputing leider, Microsoft/AWS partnerships' },
        { ticker: 'RXRX', name: 'Recursion Pharma', sector: 'Healthcare', why: 'AI drug discovery + NVIDIA-partnership, unieke aanpak' },
        { ticker: 'SERV', name: 'Serve Robotics', sector: 'Technology', why: 'Autonomous delivery robot, Uber/NVDA backed' },
        { ticker: 'ACHR', name: 'Archer Aviation', sector: 'Industrial', why: 'eVTOL luchtmobiliteit, FAA-certificering dichtbij' },
        { ticker: 'AFRM', name: 'Affirm', sector: 'Financial', why: 'BNPL-leider VS, Apple Pay Later fallout profiteur' },
        { ticker: 'JOBY', name: 'Joby Aviation', sector: 'Industrial', why: 'Air taxi, Toyota backed, commercieel rijp in 2025-26' },
        { ticker: 'SOUN', name: 'SoundHound AI', sector: 'Technology', why: 'Voice AI voor automotive/restaurant sector, niche leider' },
        { ticker: 'BBAI', name: 'BigBear.ai', sector: 'Technology', why: 'AI beslissingsintelligentie defensie + logistiek' },
        { ticker: 'QS', name: 'QuantumScape', sector: 'Industrial', why: 'Solid-state EV-batterij, Volkswagen backed' },
        { ticker: 'LUNR', name: 'Intuitive Machines', sector: 'Industrial', why: 'NASA CLPS maan-contracten, enige private maanlander' },
      ]
    },
    midcap: {
      label: 'Mid-cap Groeiers',
      description: 'Bewezen groeibedrijven met schaalvoordeel en sterke analyst consensus',
      tickers: [
        { ticker: 'CRWD', name: 'CrowdStrike', sector: 'Technology', why: 'Cybersec platform-leider, ARR groeit >30% YoY' },
        { ticker: 'DDOG', name: 'Datadog', sector: 'Technology', why: 'Cloud observability #1, AI-features in elke module' },
        { ticker: 'NET', name: 'Cloudflare', sector: 'Technology', why: 'Zero-trust netwerk + AI inference infra, sticky platform' },
        { ticker: 'DUOL', name: 'Duolingo', sector: 'Technology', why: 'AI-personalisatie + Max-tier groei, daily active users up' },
        { ticker: 'SNOW', name: 'Snowflake', sector: 'Technology', why: 'Data cloud + AI/ML workloads, Cortex AI lancering' },
        { ticker: 'MDB', name: 'MongoDB', sector: 'Technology', why: 'Document DB + Atlas cloud sterk, AI vector search groeier' },
        { ticker: 'ZS', name: 'Zscaler', sector: 'Technology', why: 'Zero-trust cloud security, enterprise migratie versnelt' },
        { ticker: 'SHOP', name: 'Shopify', sector: 'Technology', why: 'E-commerce infra + AI-tools merchant, internationale groei' },
        { ticker: 'CELH', name: 'Celsius', sector: 'Consumer', why: 'Energy drink challenger, Pepsi-distributie + int. expansie' },
        { ticker: 'GTLB', name: 'GitLab', sector: 'Technology', why: 'DevSecOps platform, AI code review integratie' },
        { ticker: 'S', name: 'SentinelOne', sector: 'Technology', why: 'AI-native endpoint security, concurreert sterk met CRWD' },
        { ticker: 'TEAM', name: 'Atlassian', sector: 'Technology', why: 'Jira/Confluence cloud + Rovo AI agent, hoge enterprise lock-in' },
        { ticker: 'HCP', name: 'HashiCorp', sector: 'Technology', why: 'Infrastructure automation, IBM overname biedt upside' },
        { ticker: 'APP', name: 'AppLovin', sector: 'Technology', why: 'Mobile gaming + ad-tech AI, explosieve margegroei' },
        { ticker: 'TTD', name: 'The Trade Desk', sector: 'Technology', why: 'Programmatic advertising + Kokai AI-platform heerlancering' },
      ]
    },
    etf: {
      label: 'ETFs',
      description: 'Gespreide indexfondsen voor breed marktbeheer',
      tickers: [
        // === WORLD / ALL-WORLD ===
        { ticker: 'VWCE.DE', name: 'Vanguard FTSE All-World', sector: 'World Index', why: 'Beste all-world ETF Europa, 0.22% TER, 3900+ aandelen' },
        { ticker: 'IWDA.AS', name: 'iShares Core MSCI World', sector: 'World Index', why: 'Populairste world ETF NL, 0.20% TER, zeer liquide' },
        { ticker: 'VWRL.AS', name: 'Vanguard FTSE All-World Dist', sector: 'World Index', why: 'Distributing variant VWCE, dividend uitkering' },
        { ticker: 'EUNL.DE', name: 'iShares Core MSCI World', sector: 'World Index', why: 'Goedkoopste world ETF, 0.20% TER, Duitse beurs' },
        
        // === S&P 500 ===
        { ticker: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'US Index', why: 'Meest liquide ETF ter wereld, benchmark S&P 500' },
        { ticker: 'VOO', name: 'Vanguard S&P 500', sector: 'US Index', why: 'Laagste kosten S&P 500 (0.03%), ideaal langetermijn' },
        { ticker: 'VUAA.AS', name: 'Vanguard S&P 500 EUR', sector: 'US Index', why: 'S&P 500 in EUR, 0.07% TER, Nederlandse beurs' },
        
        // === NASDAQ / TECH ===
        { ticker: 'QQQ', name: 'Invesco QQQ Trust', sector: 'Technology', why: 'NASDAQ-100 tech focus, kernbezit voor groei' },
        { ticker: 'VGT', name: 'Vanguard Info Tech', sector: 'Technology', why: 'Brede tech exposure lage kosten, sterk lange termijn' },
        { ticker: 'SMH', name: 'VanEck Semiconductor', sector: 'Technology', why: 'Pure-play chips ETF: NVDA TSMC ASML in één' },
        { ticker: 'EQQQ.DE', name: 'Invesco EQQQ NASDAQ-100', sector: 'Technology', why: 'NASDAQ-100 in EUR, 0.30% TER, Duitse beurs' },
        
        // === DIVIDEND ===
        { ticker: 'VHYL.AS', name: 'Vanguard FTSE All-World High Div', sector: 'Dividend', why: 'World dividend aristocrats, 2.9% yield, 0.29% TER' },
        { ticker: 'TDIV.AS', name: 'SPDR S&P US Dividend Aristocrats', sector: 'Dividend', why: 'US dividend growers 25+ jaar, 2.1% yield' },
        { ticker: 'VYM', name: 'Vanguard High Dividend Yield', sector: 'Dividend', why: 'US high yield, 3.0% dividend, 0.06% TER' },
        { ticker: 'SCHD', name: 'Schwab US Dividend Equity', sector: 'Dividend', why: 'Kwaliteit dividend growers, 3.5% yield, populair' },
        
        // === EMERGING MARKETS ===
        { ticker: 'EMIM.AS', name: 'iShares Core MSCI EM IMI', sector: 'Emerging Markets', why: 'Breed EM exposure, 0.18% TER, small+mid+large cap' },
        { ticker: 'VWO', name: 'Vanguard Emerging Markets', sector: 'Emerging Markets', why: 'EM large+mid cap, 0.08% TER, zeer liquide' },
        { ticker: 'IEMG', name: 'iShares Core MSCI EM', sector: 'Emerging Markets', why: 'Goedkoopste EM ETF (0.09%), breed gespreid' },
        
        // === SMALL CAP ===
        { ticker: 'IWM', name: 'iShares Russell 2000', sector: 'Small Cap', why: 'US small-cap, profiteert van rentedaling' },
        { ticker: 'IUSN.AS', name: 'iShares MSCI World Small Cap', sector: 'Small Cap', why: 'World small cap, 0.35% TER, diversificatie' },
        
        // === SECTOR / THEMATIC ===
        { ticker: 'ARKK', name: 'ARK Innovation ETF', sector: 'Innovation', why: 'Disruptieve innovatie focus, hoog risico/rendement' },
        { ticker: 'XLE', name: 'Energy Select SPDR', sector: 'Energy', why: 'Energiebedrijven VS, bescherming vs inflatie' },
        { ticker: 'XLV', name: 'Health Care SPDR', sector: 'Healthcare', why: 'Defensieve healthcare, vergrijzing tailwind' },
        { ticker: 'XLF', name: 'Financial SPDR', sector: 'Financial', why: 'Banken & verzekeraars, hoge rente profiteur' },
        
        // === COMMODITIES / ALTERNATIVES ===
        { ticker: 'GLD', name: 'SPDR Gold Trust', sector: 'Commodities', why: 'Goud hedge tegen inflatie en geopolitieke risico\'s' },
        { ticker: 'IBIT', name: 'iShares Bitcoin ETF', sector: 'Crypto', why: 'Institutionele Bitcoin exposure via BlackRock' },
        
        // === BONDS ===
        { ticker: 'TLT', name: '20+ Year Treasury', sector: 'Bonds', why: 'Lange obligaties, stijgt bij rentedaling verwachting' },
        { ticker: 'AGG', name: 'iShares Core US Aggregate Bond', sector: 'Bonds', why: 'Breed obligatie exposure VS, defensief' },
      ]
    }
  };

  // Fetch live data for screener category tickers
  const fetchScreenerCategoryData = async (category) => {
    // Use dynamic tickers from Yahoo screener if already fetched, otherwise fallback to hardcoded
    const dynamic = dynamicScreenerTickers[category];
    const tickers = (dynamic && dynamic.length > 0) ? dynamic : (SCREENER_CATEGORIES[category]?.tickers || []);
    if (tickers.length === 0) return;
    
    setLoadingScreenerData(true);

    try {
      // Send tickers as comma-separated string
      const tickerList = tickers.map(t => t.ticker).join(',');
      
      const response = await axios.get(`/api/screener`, {
        params: {
          tickers: tickerList,
          minScore: 0,
          maxResults: 50
        }
      });
      
      const { results, stats, filters } = response.data;
      
      console.log(`Screener loaded: ${results.length} stocks, ${stats.hiddenGems} hidden gems, avg score: ${stats.averageScore}`);
      
      // Map results to screenerData format
      const newScreenerData = {};
      results.forEach(stock => {
        console.log(`📊 Screener stock ${stock.ticker}:`, {
          recommendation: stock.recommendation,
          targetPrice: stock.targetPrice,
          hasRecommendation: !!stock.recommendation,
          recommendationMean: stock.recommendation?.mean
        });
        
        newScreenerData[stock.ticker] = {
          currentPrice: stock.currentPrice,
          dailyChange: stock.dailyChange,
          growth6mo: stock.growth6mo,
          growth1mo: stock.growth1mo,
          growth1yr: stock.growth1yr,
          sparkline: stock.sparkline || [],
          currency: stock.currency,
          recommendation: stock.recommendation || null,
          targetPrice: stock.targetPrice || null,
          rsi: stock.rsi,
          macd: stock.macd || null,
          sma50: stock.sma50,
          sma200: stock.sma200,
          ema20: stock.ema20,
          ema50: stock.ema50,
          emaTrendUp: stock.emaTrendUp,
          bb: stock.bb || null,
          adx: stock.adx,
          adxDirection: stock.adxDirection,
          stochRsi: stock.stochRsi,
          atr: stock.atr,
          near52wHigh: stock.near52wHigh,
          near52wLow: stock.near52wLow,
          obvUp: stock.obvUp,
          sma50SlopePositive: stock.sma50SlopePositive,
          mfi: stock.mfi,
          signal: {
            overall: stock.signal,
            score: stock.signalScore,
            reasons: stock.signalReasons
          },
          currentVolume: stock.currentVolume,
          avgVolume20d: stock.avgVolume20d,
          volumeRatio: stock.volumeRatio,
          marketCap: stock.marketCap,
          qualityScore: stock.qualityScore,
          opportunityType: stock.opportunityType,
          qualityFactors: stock.qualityFactors,
          maxDrawdown30d: stock.maxDrawdown30d,
          volatility30d: stock.volatility30d
        };
      });
      
      setScreenerData(prev => ({ ...prev, ...newScreenerData }));

      // Enrich with sector/description from stock-price API (more reliable for profile info)
      try {
        const profileMap = {};
        await Promise.allSettled(results.map(async (s) => {
          try {
            const r = await axios.get(`/api/stock-price`, { params: { ticker: s.ticker, range: '6mo', interval: '1d' } });
            const d = r.data;
            if (d && (d.sector || d.description)) {
              profileMap[s.ticker] = { sector: d.sector || '', description: d.description || '' };
            }
          } catch (e) {
            // ignore per-ticker errors
          }
        }));
        if (Object.keys(profileMap).length > 0) {
          setScreenerData(prev => {
            const updated = { ...prev };
            Object.entries(profileMap).forEach(([t, p]) => {
              updated[t] = { ...(updated[t] || {}), sector: p.sector, description: p.description };
            });
            return updated;
          });
        }
      } catch (e) {
        console.warn('Screener profile enrichment failed:', e.message);
      }
      
      // Also fetch Yahoo analyst data for screener tickers
      const screenerTickers = results.map(s => s.ticker);
      if (screenerTickers.length > 0) {
        fetchYahooAnalystData(screenerTickers);
      }
      
    } catch (error) {
      console.error('Screener API error:', error);
    }

    setLoadingScreenerData(false);
  };

  // Fetch dynamic ticker list from Yahoo Finance screener for a category
  const fetchDynamicScreenerTickers = async (category, force = false) => {
    if (!force && (dynamicScreenerTickers[category] || loadingDynamicTickers)) return;
    setLoadingDynamicTickers(true);
    try {
      const res = await axios.get('/api/screener-discover', { params: { category } });
      const tickers = res.data.tickers || [];
      if (tickers.length > 0) {
        setDynamicScreenerTickers(prev => ({ ...prev, [category]: tickers }));
      }
    } catch (e) {
      console.warn('Dynamic screener fetch failed, using fallback:', e.message);
    }
    setLoadingDynamicTickers(false);
  };

  // Auto-fetch screener data when category changes
  useEffect(() => {
    // If we already have dynamic tickers but sectors look invalid, force refresh
    const existing = dynamicScreenerTickers[screenerCategory];
    const hasBadSector = Array.isArray(existing) && existing.some(t => {
      const s = String(t.sector || '').trim().toLowerCase();
      return !s || s === 'unknown' || s === 'n/a' || s === '-' || s === 'none';
    });
    fetchDynamicScreenerTickers(screenerCategory, !!hasBadSector);
    fetchScreenerCategoryData(screenerCategory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenerCategory]);

  // Re-fetch live data once dynamic tickers arrive for the active category
  useEffect(() => {
    if (dynamicScreenerTickers[screenerCategory]?.length > 0) {
      fetchScreenerCategoryData(screenerCategory);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicScreenerTickers]);

  // Fetch news for a list of tickers (used by hidden gems & watchlist)
  const fetchNewsForTickers = async (tickers, forceRefresh = false) => {
    if (!tickers || tickers.length === 0) return;

    // Filter out already fetched tickers unless forceRefresh is true
    const tickersToFetch = forceRefresh ? tickers : tickers.filter(t => !tickerNewsMap[t]);
    if (tickersToFetch.length === 0) return;

    try {
      const response = await axios.get(`/api/news`, {
        params: { tickers: tickersToFetch.join(',') }
      });

      const articles = response.data?.news || response.data?.articles || [];

      // Group news by ticker
      const newsByTicker = {};
      tickersToFetch.forEach(t => { newsByTicker[t] = []; });

      articles.forEach(article => {
        const ticker = article.relatedTicker || article.ticker;
        if (ticker && newsByTicker[ticker] !== undefined && newsByTicker[ticker].length < 3) {
          newsByTicker[ticker].push(article);
        }
      });

      setTickerNewsMap(prev => ({ ...prev, ...newsByTicker }));
    } catch (error) {
      console.error('Error fetching ticker news:', error);
    }
  };

  // Auto-fetch news for screener tickers when data loads
  useEffect(() => {
    const tickers = Object.keys(screenerData).slice(0, 20); // limit to top 20
    if (tickers.length > 0) {
      fetchNewsForTickers(tickers);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenerData]);

  // Calculate Top Buy recommendations based on indicators and news
  const calculateTopBuys = () => {
    const selectedTickers = new Set();
    
    // Top buy voor eigen aandeel - from user's investments
    if (investments.length > 0) {
      const investmentsWithIndicators = investments
        .filter(inv => inv.ticker_symbol && screenerData[inv.ticker_symbol])
        .map(inv => {
          const sd = screenerData[inv.ticker_symbol];
          const news = tickerNewsMap[inv.ticker_symbol] || [];
          // Calculate score based on indicators (max 100)
          let score = 0;
          // RSI: low RSI (oversold) is good for buying (0-30 points)
          if (sd.rsi && sd.rsi < 30) score += 30;
          else if (sd.rsi && sd.rsi < 40) score += 20;
          else if (sd.rsi && sd.rsi < 50) score += 10;
          // Trend: price above SMA50 and SMA50 above SMA200 (0-25 points)
          if (sd.currentPrice > sd.sma50 && sd.sma50 > sd.sma200) score += 25;
          // Signal: BUY or STRONG BUY (0-30 points)
          if (sd.signal?.overall === 'STRONG BUY') score += 30;
          else if (sd.signal?.overall === 'BUY') score += 20;
          // News sentiment (0-15 points)
          if (news.length > 0) score += 15;
          return { inv, score, sd };
        })
        .sort((a, b) => b.score - a.score);
      if (investmentsWithIndicators.length > 0) {
        setTopBuyOwnStock(investmentsWithIndicators[0]);
        selectedTickers.add(investmentsWithIndicators[0].inv.ticker_symbol);
      }
    }

    // Top buy hidden gems - from hidden gems data (exclude already selected)
    const hiddenGemsWithScore = Object.entries(screenerData)
      .filter(([ticker, sd]) => !selectedTickers.has(ticker) && sd.qualityScore && sd.qualityScore >= 40)
      .map(([ticker, sd]) => {
        const news = tickerNewsMap[ticker] || [];
        // Normalize quality score to 0-100 range (quality score is already 0-100)
        let score = Math.min(100, sd.qualityScore || 0);
        // Boost score based on technical indicators (max +20)
        if (sd.rsi && sd.rsi < 40) score = Math.min(100, score + 10);
        if (sd.currentPrice > sd.sma50 && sd.sma50 > sd.sma200) score = Math.min(100, score + 10);
        return { ticker, score, sd };
      })
      .sort((a, b) => b.score - a.score);
    if (hiddenGemsWithScore.length > 0) {
      setTopBuyHiddenGem(hiddenGemsWithScore[0]);
      selectedTickers.add(hiddenGemsWithScore[0].ticker);
    }

    // Top performer - based on performance metrics (exclude already selected)
    const performers = Object.entries(screenerData)
      .filter(([ticker, sd]) => !selectedTickers.has(ticker) && (sd.growth1mo !== undefined || sd.growth6mo !== undefined))
      .map(([ticker, sd]) => {
        // Calculate weighted growth score and normalize to 0-100
        let rawScore = 0;
        if (sd.growth1mo) rawScore += sd.growth1mo * 0.3;
        if (sd.growth6mo) rawScore += sd.growth6mo * 0.5;
        if (sd.growth1yr) rawScore += sd.growth1yr * 0.2;
        // Normalize: assume max growth of 200% = score 100
        let score = Math.min(100, Math.max(0, (rawScore / 200) * 100));
        return { ticker, score, sd, rawScore };
      })
      .sort((a, b) => b.rawScore - a.rawScore);
    if (performers.length > 0) {
      setTopPerformer(performers[0]);
      selectedTickers.add(performers[0].ticker);
    }

    // Top buy potentiële groeier - based on growth indicators and news (exclude already selected)
    const growthStocks = Object.entries(screenerData)
      .filter(([ticker, sd]) => !selectedTickers.has(ticker) && sd.growth6mo !== undefined && sd.growth6mo > 0)
      .map(([ticker, sd]) => {
        const news = tickerNewsMap[ticker] || [];
        // Calculate growth score (max 100)
        let score = 0;
        // Growth metrics (0-70 points, normalized)
        let growthScore = 0;
        if (sd.growth1mo && sd.growth1mo > 0) growthScore += sd.growth1mo * 0.3;
        if (sd.growth6mo && sd.growth6mo > 0) growthScore += sd.growth6mo * 0.5;
        if (sd.growth1yr && sd.growth1yr > 0) growthScore += sd.growth1yr * 0.2;
        score += Math.min(70, (growthScore / 150) * 70); // Normalize to 0-70
        // Technical indicators for growth stocks (0-20 points)
        if (sd.currentPrice > sd.sma50) score += 10;
        if (sd.adx && sd.adx > 25) score += 10; // Strong trend
        // News sentiment (0-10 points)
        if (news.length > 0) score += 10;
        return { ticker, score, sd };
      })
      .sort((a, b) => b.score - a.score);
    if (growthStocks.length > 0) {
      setTopBuyGrowth(growthStocks[0]);
      selectedTickers.add(growthStocks[0].ticker);
    }
  };

  // Update Top Buy recommendations when data changes
  useEffect(() => {
    if (investments.length > 0 && Object.keys(screenerData).length > 0) {
      calculateTopBuys();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments, screenerData, tickerNewsMap]);

  // Helper to compute a simple hash over titles to detect changes
  const computeMacroHash = (newsArr) => {
    try {
      return newsArr.slice(0, 15).map(n => n.title).join('|');
    } catch {
      return '';
    }
  };

  // Auto-generate AI macro summary when news changes, with a 20 min cooldown
  useEffect(() => {
    const allNews = [...stockNews, ...dutchMacroNews];
    if (allNews.length === 0) return;
    if (loadingMacroSummary) return;
    const hash = computeMacroHash(allNews);
    const now = Date.now();
    const cooldownMs = 20 * 60 * 1000;
    if (hash && (hash !== macroSummaryMeta.lastHash) && (now - macroSummaryMeta.lastGeneratedAt > cooldownMs)) {
      (async () => {
        setLoadingMacroSummary(true);
        try {
          const newsArticles = allNews.slice(0, 15).map(n => ({ title: n.title, link: n.link }));
          const userKey = typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') : null;
          const response = await axios.post('/api/ai-explain', {
            type: 'macro_news',
            ticker: 'MARKET',
            data: newsArticles
          }, userKey ? { headers: { 'x-openai-key': userKey } } : undefined);
          setMacroNewsSummary(response.data.explanation);
          setMacroSummaryMeta({ lastHash: hash, lastGeneratedAt: now });
        } catch (error) {
          const msg = error.response?.data?.error || error.message || 'Onbekende fout';
          setMacroNewsSummary(`❌ Fout: ${msg}`);
        } finally {
          setLoadingMacroSummary(false);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockNews, dutchMacroNews]);

  // Auto-generate AI portfolio (eigen) news summary: always runs when news is available
  useEffect(() => {
    const allNews = [...stockNews, ...dutchMacroNews];
    if (allNews.length === 0) return;
    if (loadingPortfolioSummary) return;
    const myTickers = (investments || []).map(inv => inv.ticker_symbol).filter(Boolean);
    const myNames = (investments || []).map(inv => inv.name).filter(Boolean);
    if (myTickers.length === 0) return;
    // Use all available news — AI will decide what's relevant per ticker
    const hash = computeMacroHash(allNews) + myTickers.join(',');
    const now = Date.now();
    const cooldownMs = 20 * 60 * 1000;
    if (hash && (hash !== portfolioSummaryMeta.lastHash) && (now - portfolioSummaryMeta.lastGeneratedAt > cooldownMs)) {
      (async () => {
        setLoadingPortfolioSummary(true);
        try {
          const newsArticles = allNews.slice(0, 15).map(n => ({ title: n.title, link: n.link }));
          const userKey = typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') : null;
          const response = await axios.post('/api/ai-explain', {
            type: 'portfolio_news',
            ticker: 'PORTFOLIO',
            data: { news: newsArticles, tickers: myTickers, names: myNames }
          }, userKey ? { headers: { 'x-openai-key': userKey } } : undefined);
          setPortfolioNewsSummary(response.data.explanation);
          setPortfolioSummaryMeta({ lastHash: hash, lastGeneratedAt: now });
        } catch (error) {
          console.error('Portfolio summary error:', error);
        } finally {
          setLoadingPortfolioSummary(false);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockNews, dutchMacroNews, investments]);

  // Fetch screener data for watchlist items (includes analyst data + technical indicators)
  useEffect(() => {
    const fetchWatchlistData = async () => {
      if (myWatchlist.length === 0) return;
      
      const tickers = myWatchlist.map(item => item.ticker);
      console.log('🔍 Fetching watchlist data for:', tickers.join(', '));
      
      // Step 1: Fetch basic price data in parallel (fast, reliable — has ticker variant fallbacks)
      const basicData = {};
      await Promise.allSettled(tickers.map(async (ticker) => {
        try {
          const res = await axios.get(`/api/stock-price`, {
            params: { ticker, range: '6mo', interval: '1d' }
          });
          const d = res.data;
          basicData[ticker] = {
            currentPrice: d.current,
            dailyChange: d.changePercent,
            growth1mo: d.growthData?.growth1mo || 0,
            growth6mo: d.growthData?.growth6mo || 0,
            growth1yr: d.growthData?.growth1yr || 0,
            sparkline: d.sparklineData || [],
            currency: d.currency || 'USD',
            rsi: d.technicals?.rsi || null,
            sma50: d.technicals?.sma50 || null,
            sma200: d.technicals?.sma200 || null,
            currentVolume: d.volume?.current || 0,
            avgVolume20d: d.volume?.average20d || 0,
            sector: d.sector || '',
            description: d.description || '',
          };
        } catch (e) {
          console.warn(`⚠️ Basic price fetch failed for ${ticker}:`, e.message);
        }
      }));
      
      if (Object.keys(basicData).length > 0) {
        setScreenerData(prev => ({ ...prev, ...basicData }));
      }
      
      // Step 2: Enrich with full screener data (advanced technicals, quality score, etc.)
      try {
        const response = await axios.get(`/api/screener`, {
          params: { tickers: tickers.join(','), minScore: 0, maxResults: 50 }
        });
        
        const { results } = response.data;
        if (results && results.length > 0) {
          setScreenerData(prev => {
            const updated = { ...prev };
            results.forEach(stock => {
              updated[stock.ticker] = {
                ...(updated[stock.ticker] || {}),
                currentPrice: stock.currentPrice,
                dailyChange: stock.dailyChange,
                growth6mo: stock.growth6mo,
                growth1mo: stock.growth1mo,
                growth1yr: stock.growth1yr,
                sparkline: stock.sparkline || [],
                currency: stock.currency,
                recommendation: stock.recommendation || null,
                targetPrice: stock.targetPrice || null,
                rsi: stock.rsi,
                macd: stock.macd || null,
                sma50: stock.sma50,
                sma200: stock.sma200,
                ema20: stock.ema20,
                ema50: stock.ema50,
                emaTrendUp: stock.emaTrendUp,
                bb: stock.bb || null,
                adx: stock.adx,
                adxDirection: stock.adxDirection,
                stochRsi: stock.stochRsi,
                atr: stock.atr,
                near52wHigh: stock.near52wHigh,
                near52wLow: stock.near52wLow,
                obvUp: stock.obvUp,
                sma50SlopePositive: stock.sma50SlopePositive,
                mfi: stock.mfi,
                peRatio: stock.peRatio ?? stock.pe ?? stock.priceToEarnings ?? stock.trailingPE ?? null,
                signal: {
                  overall: stock.signal,
                  score: stock.signalScore,
                  reasons: stock.signalReasons
                },
                currentVolume: stock.currentVolume,
                avgVolume20d: stock.avgVolume20d,
                volumeRatio: stock.volumeRatio,
                marketCap: stock.marketCap,
                qualityScore: stock.qualityScore,
                opportunityType: stock.opportunityType,
                maxDrawdown30d: stock.maxDrawdown30d,
                volatility30d: stock.volatility30d,
              };
            });
            return updated;
          });
        }
      } catch (error) {
        console.error('❌ Watchlist screener enrichment error:', error);
      }
      
      // Step 3: Fetch Yahoo analyst data
      if (tickers.length > 0) {
        fetchYahooAnalystData(tickers);
      }
    };
    
    fetchWatchlistData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myWatchlist.length]);

  // Fetch screener data for user's own investments (for analyst bars)
  useEffect(() => {
    const fetchInvestmentScreenerData = async () => {
      if (!Array.isArray(investments)) return;
      const stockInvestments = investments.filter(inv => inv && inv.ticker_symbol && inv.type === 'aandeel');
      if (stockInvestments.length === 0) return;
      
      try {
        const tickers = stockInvestments.map(inv => inv.ticker_symbol).join(',');
        console.log('🔍 Fetching screener data for investments:', tickers);
        
        const response = await axios.get(`/api/screener`, {
          params: {
            tickers: tickers,
            minScore: 0,
            maxResults: 50
          }
        });
        
        const { results } = response.data;
        console.log('📊 Investment screener results:', results.length, 'stocks');
        
        // Map to screenerData format (preserve existing sector/description)
        setScreenerData(prev => {
          const updated = { ...prev };
          results.forEach(stock => {
            console.log(`✅ Investment ${stock.ticker}:`, {
              price: stock.currentPrice,
              recommendation: stock.recommendation,
              hasAnalyst: !!stock.recommendation
            });
            
            updated[stock.ticker] = {
              ...(updated[stock.ticker] || {}),
              currentPrice: stock.currentPrice,
              dailyChange: stock.dailyChange,
              growth6mo: stock.growth6mo,
              growth1mo: stock.growth1mo,
              growth1yr: stock.growth1yr,
              sparkline: stock.sparkline || [],
              currency: stock.currency,
              recommendation: stock.recommendation || null,
              targetPrice: stock.targetPrice || null,
              rsi: stock.rsi,
              sma50: stock.sma50,
              sma200: stock.sma200,
              peRatio: stock.peRatio ?? stock.pe ?? stock.priceToEarnings ?? stock.trailingPE ?? null,
              signal: {
                overall: stock.signal,
                score: stock.signalScore,
                reasons: stock.signalReasons
              },
              volume: stock.currentVolume,
              avgVolume: stock.avgVolume20d
            };
          });
          return updated;
        });
      } catch (error) {
        console.error('❌ Investment screener error:', error);
      }
    };
    
    fetchInvestmentScreenerData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(investments) ? investments.length : 0]);

  const addChartFavorite = () => {
    if (!newChartSymbol.trim()) return;
    setChartFavorites([...chartFavorites, {
      symbol: newChartSymbol.trim(),
      name: newChartName.trim() || newChartSymbol.trim()
    }]);
    setNewChartSymbol('');
    setNewChartName('');
    setShowChartModal(false);
  };

  const removeChartFavorite = (index) => {
    setChartFavorites(chartFavorites.filter((_, i) => i !== index));
  };

  // ===== ALERTS FUNCTIONS =====
  useEffect(() => {
    setAlerts(alertSystem.getAlerts());
  }, []);

  useEffect(() => {
    // Check alerts when screener data updates
    if (Object.keys(screenerData).length > 0) {
      const newNotifications = alertSystem.checkAlerts(screenerData);
      if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
      }
    }
  }, [screenerData]);

  const handleAddAlert = () => {
    if (!newAlert.ticker || !newAlert.name) return;
    alertSystem.addAlert(newAlert);
    setAlerts(alertSystem.getAlerts());
    setShowAlertModal(false);
    setNewAlert({ ticker: '', name: '', type: 'rsi_oversold', value: 30 });
  };

  const handleRemoveAlert = (id) => {
    alertSystem.removeAlert(id);
    setAlerts(alertSystem.getAlerts());
  };

  const handleToggleAlert = (id) => {
    alertSystem.toggleAlert(id);
    setAlerts(alertSystem.getAlerts());
  };

  const dismissNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  // ===== EARNINGS CALENDAR FUNCTIONS =====
  const fetchEarningsData = async (force = false) => {
    setLoadingEarnings(true);
    
    // Combine investment tickers + watchlist tickers
    const investmentTickers = investments
      .filter(inv => inv.ticker_symbol)
      .map(inv => ({ 
        ticker: inv.ticker_symbol, 
        name: inv.name,
        source: 'portfolio'
      }));
    
    const watchlistTickers = (myWatchlist || [])
      .filter(item => item.ticker || item.symbol)
      .map(item => ({ 
        ticker: item.ticker || item.symbol, 
        name: item.name,
        source: 'watchlist'
      }));
    
    // Merge and deduplicate (portfolio takes priority over watchlist for source label)
    const tickerMap = new Map();
    [...investmentTickers, ...watchlistTickers].forEach(t => {
      if (!tickerMap.has(t.ticker)) {
        tickerMap.set(t.ticker, t);
      }
    });
    const allTickers = Array.from(tickerMap.values());
    
    if (allTickers.length === 0) {
      setEarningsData({});
      setLoadingEarnings(false);
      return;
    }
    
    console.log(`Fetching earnings for ${allTickers.length} tickers...`);
    const data = await earningsCalendar.fetchMultipleEarnings(allTickers, { force });
    
    // Attach source info to each result
    Object.keys(data).forEach(ticker => {
      const meta = tickerMap.get(ticker);
      if (meta) {
        data[ticker].source = meta.source;
        data[ticker].displayName = meta.name;
      }
    });
    
    console.log(`Got earnings data for ${Object.keys(data).length} tickers, ${Object.values(data).filter(d => d.nextEarningsDate).length} with upcoming dates`);
    setEarningsData(data);
    setLoadingEarnings(false);
  };

  // ===== AI ANALYSIS FUNCTIONS =====
  const analyzeStockWithAI = async (stockData) => {
    setLoadingAI(true);
    setSelectedStockForAI(stockData);
    setShowAIModal(true);
    // Ensure we have recent news for this ticker
    if (stockData?.ticker && !tickerNewsMap[stockData.ticker]) {
      fetchNewsForTickers([stockData.ticker]);
    }
    
    const result = await aiAnalyzer.analyzeStock(stockData);
    setAiAnalysis(result);
    setLoadingAI(false);
  };

  // Quick AI buy-check for a ticker — opens modal popup with results
  const fetchAIBuyScore = async (ticker) => {
    if (!ticker) return;
    try {
      setLoadingAiBuy(prev => ({ ...prev, [ticker]: true }));
      // Fetch news in parallel, don't block on it
      fetchNewsForTickers([ticker], true).catch(() => {});
      // Merge screenerData + stockPrices technicals so own investments work too
      const sp = stockPrices[ticker] || {};
      const spTech = sp.technicals || {};
      const spGrowth = sp.growthData || {};
      const sd = {
        ...spGrowth,
        currentPrice: sp.current,
        dailyChange: spGrowth.dailyChange ?? sp.changePercent,
        ...spTech,
        ...(screenerData[ticker] || {}),
      };
      // Wait a tick so news fetch can start, then build payload from whatever we have
      await new Promise(r => setTimeout(r, 100));
      const news = (tickerNewsMap[ticker] || []).slice(0, 3).map(a => ({ title: a.title, link: a.link }));
      const payload = {
        type: 'buy_check',
        ticker,
        data: {
          news,
          qualityScore: sd.qualityScore,
          technicals: {
            rsi: sd.rsi,
            macd: sd.macd,
            sma50: sd.sma50,
            sma200: sd.sma200,
            currentPrice: sd.currentPrice,
            emaTrendUp: sd.emaTrendUp,
            adx: sd.adx,
            stochRsi: sd.stochRsi,
            atr: sd.atr,
            near52wHigh: sd.near52wHigh,
            near52wLow: sd.near52wLow,
            obvUp: sd.obvUp,
            mfi: sd.mfi,
            signal: sd.signal?.overall || sd.signal,
          },
          performance: {
            dailyChange: sd.dailyChange,
            growth1mo: sd.growth1mo,
            growth6mo: sd.growth6mo,
            growth1yr: sd.growth1yr,
          },
          analyst: sd.recommendation ? {
            mean: sd.recommendation.mean,
            targetPrice: sd.targetPrice,
          } : null,
          risk: {
            volatility30d: sd.volatility30d,
            maxDrawdown30d: sd.maxDrawdown30d,
          }
        }
      };
      const userKey = typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') : null;
      const response = await axios.post('/api/ai-explain', payload, userKey ? { headers: { 'x-openai-key': userKey } } : undefined);
      let text = response.data?.explanation || '';
      text = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
      if (parsed && typeof parsed.score === 'number') {
        setAiBuyScores(prev => ({ ...prev, [ticker]: { ...parsed, fetchedAt: Date.now(), _error: null } }));
      } else {
        // AI responded but JSON parse failed — store raw text as error
        setAiBuyScores(prev => ({ ...prev, [ticker]: { _error: text || 'Ongeldig antwoord van AI', fetchedAt: Date.now() } }));
      }
    } catch (e) {
      console.warn('AI buy-check failed:', e.message);
      // Store the error so modal can show it instead of a blank state
      const msg = e.response?.data?.error || e.response?.data?.fallback || e.message || 'Onbekende fout';
      setAiBuyScores(prev => ({ ...prev, [ticker]: { _error: msg, fetchedAt: Date.now() } }));
    } finally {
      setLoadingAiBuy(prev => ({ ...prev, [ticker]: false }));
    }
  };

  const runAIBuyCheck = async (ticker, { force = false } = {}) => {
    if (!ticker) return;
    // If we already have a fresh successful score (<= 1h), just open modal without re-fetching
    const existing = aiBuyScores[ticker];
    const isFresh = existing && !existing._error && existing.fetchedAt && (Date.now() - existing.fetchedAt) < 60 * 60 * 1000;
    // Set loading state BEFORE setting modal ticker so modal shows spinner immediately
    if (!isFresh) {
      setLoadingAiBuy(prev => ({ ...prev, [ticker]: true }));
    }
    setAiBuyModalTicker(ticker);
    if (!force && isFresh) {
      if (!tickerNewsMap[ticker]) { fetchNewsForTickers([ticker]).catch(() => {}); }
      return;
    }
    await fetchAIBuyScore(ticker);
  };

  const refreshAllAiScores = async () => {
    try {
      setLoadingAllAi(true);
      const tickers = (investments || [])
        .filter(inv => inv.ticker_symbol)
        .map(inv => inv.ticker_symbol);

      // Deduplicate and skip those already loading
      const unique = Array.from(new Set(tickers)).filter(t => !loadingAiBuy[t]);
      if (unique.length === 0) return;

      const batchSize = 3;
      for (let i = 0; i < unique.length; i += batchSize) {
        const batch = unique.slice(i, i + batchSize);
        await Promise.all(batch.map(t => fetchAIBuyScore(t)));
        if (i + batchSize < unique.length) await new Promise(r => setTimeout(r, 500));
      }
    } finally {
      setLoadingAllAi(false);
    }
  };

  // ===== AUTO-REFRESH STOCK PRICES =====
  useEffect(() => {
    // Initial fetch when investments change
    if (investments.length > 0) {
      fetchStockPrices(myPricesTimeframe);
    }
    
    // Set up auto-refresh every 5 minutes (300000ms)
    const refreshInterval = setInterval(() => {
      if (investments.length > 0) {
        console.log('Auto-refreshing stock prices...');
        fetchStockPrices(myPricesTimeframe);
      }
    }, 300000); // 5 minutes
    
    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, [investments.length, myPricesTimeframe]);

  // Auto-fetch earnings data when investments are available
  useEffect(() => {
    if (investments.length > 0 && Object.keys(earningsData).length === 0 && !loadingEarnings) {
      fetchEarningsData();
    }
  }, [investments.length]);

  // ===== EXPORT FUNCTIONS =====
  const handleExportCSV = () => {
    dataExporter.exportToCSV(investments, stockPrices);
  };

  const handleExportPDF = () => {
    const portfolioStats = {
      totalInvested: totalInvestment,
      totalValue: totalLiveValue,
      totalProfitLoss,
      totalProfitLossPercent,
      bestPerformer: investments
        .filter(inv => inv.ticker_symbol && stockPrices[inv.ticker_symbol])
        .map(inv => ({ name: inv.name, percentage: calculateProfitLoss(inv).percentage }))
        .sort((a, b) => b.percentage - a.percentage)[0],
      worstPerformer: investments
        .filter(inv => inv.ticker_symbol && stockPrices[inv.ticker_symbol])
        .map(inv => ({ name: inv.name, percentage: calculateProfitLoss(inv).percentage }))
        .sort((a, b) => a.percentage - b.percentage)[0],
      winRate: investments.filter(inv => inv.ticker_symbol && stockPrices[inv.ticker_symbol]).length > 0
        ? (investments.filter(inv => calculateProfitLoss(inv).amount > 0).length / 
           investments.filter(inv => inv.ticker_symbol && stockPrices[inv.ticker_symbol]).length) * 100
        : 0
    };
    
    dataExporter.exportToPDF(investments, stockPrices, portfolioStats);
  };

  const handleExportScreener = () => {
    dataExporter.exportScreenerToCSV(screenerData, screenerCategory);
  };

  const filteredInvestments = investments.filter(inv => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.sector && inv.sector.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.ticker_symbol && inv.ticker_symbol.toLowerCase().includes(searchTerm.toLowerCase()));

    // Type filter
    const matchesType = filterType === 'all' || inv.type === filterType;

    // Sector filter
    const matchesSector = filterSector === 'all' || inv.sector === filterSector;

    // Profit/loss filter
    let matchesProfit = filterProfit === 'all';
    if (filterProfit !== 'all') {
      const pl = calculateProfitLoss(inv);
      if (filterProfit === 'profit') {
        matchesProfit = pl.amount > 0;
      } else if (filterProfit === 'loss') {
        matchesProfit = pl.amount < 0;
      }
    }

    return matchesSearch && matchesType && matchesSector && matchesProfit;
  });

  // Aggregate tickers: sum shares and invested amount per symbol
  const userTickers = Object.values(
    investments
      .filter(inv => inv.ticker_symbol)
      .reduce((acc, inv) => {
        if (!acc[inv.ticker_symbol]) {
          acc[inv.ticker_symbol] = {
            symbol: inv.ticker_symbol,
            name: inv.name,
            sector: inv.sector || '',
            totalShares: 0,
            totalInvested: 0,
            purchasePrice: inv.purchase_price || 0
          };
        }
        acc[inv.ticker_symbol].totalShares += (inv.shares || 0);
        const currency = inv.purchase_currency || 'EUR';
        acc[inv.ticker_symbol].totalInvested += convertToEUR(inv.amount || 0, currency);
        return acc;
      }, {})
  );

  const totalInvestment = investments.reduce((sum, inv) => {
    const currency = inv.purchase_currency || 'EUR';
    const amountEUR = convertToEUR(inv.amount || 0, currency);
    return sum + amountEUR;
  }, 0);

  // Live portfolio value based on current stock prices
  const totalLiveValue = investments.reduce((sum, inv) => {
    if (inv.ticker_symbol && inv.shares && stockPrices[inv.ticker_symbol]) {
      const priceData = stockPrices[inv.ticker_symbol];
      const currentPriceEUR = priceData.currency === 'EUR' ? priceData.current : convertToEUR(priceData.current, priceData.currency);
      return sum + (inv.shares * currentPriceEUR);
    }
    const currency = inv.purchase_currency || 'EUR';
    return sum + convertToEUR(inv.amount || 0, currency);
  }, 0);

  const totalProfitLoss = totalLiveValue - totalInvestment;
  const totalProfitLossPercent = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;
  const hasPriceData = Object.keys(stockPrices).length > 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">Beleggen</h1>
          <p className="text-white/60">Track je aandelen en ETF investeringen</p>
        </div>

        {/* AI Settings Panel */}
        {showAISettings && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAISettings(false)}>
            <div className="gradient-card rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span>AI Instellingen</span>
                </h3>
                <button onClick={() => setShowAISettings(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-white/80 text-sm font-medium mb-2 block">OpenAI API Key (GPT-4o-mini)</label>
                  <input
                    type="password"
                    defaultValue={localStorage.getItem('openai_api_key') || ''}
                    placeholder="sk-proj-..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    onChange={(e) => {
                      if (e.target.value.length > 20) {
                        localStorage.setItem('openai_api_key', e.target.value);
                      }
                    }}
                  />
                  <p className="text-white/30 text-[10px] mt-1">Voor AI Koop Analyse bij analyst data (~$0.001 per uitleg)</p>
                  {localStorage.getItem('openai_api_key') && (
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-green-400 text-[10px]">Key opgeslagen</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="sk-proj-..."]');
                      if (input && input.value.length > 20) {
                        localStorage.setItem('openai_api_key', input.value);
                        setShowAISettings(false);
                      }
                    }}
                    className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-sm font-medium px-4 py-2 rounded-lg transition-all"
                  >
                    Opslaan
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem('openai_api_key');
                      setShowAISettings(false);
                    }}
                    className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-sm font-medium px-4 py-2 rounded-lg transition-all"
                  >
                    Verwijder
                  </button>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <p className="text-purple-300 text-[11px] leading-relaxed">
                    <strong>Hoe het werkt:</strong> Voer je OpenAI API key in en klik op "🤖 AI Koop Analyse" bij analyst data om een AI-gegenereerde uitleg te krijgen in het Nederlands.
                  </p>
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 text-[11px] underline mt-1 block">
                    OpenAI API key aanmaken →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Notifications Badge */}
          {notifications.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setNotifications([])}
                className="glass-effect px-3 py-2 rounded-lg text-white hover:bg-white/20 transition-colors relative"
                title="Notificaties"
              >
                <BellRing className="w-5 h-5 text-yellow-400" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              </button>
            </div>
          )}
          
          {/* Alerts */}
          <button
            onClick={() => setShowAlertModal(true)}
            className="glass-effect px-3 py-2 rounded-lg text-white hover:bg-white/20 transition-colors"
            title="Alerts"
          >
            <Bell className="w-5 h-5" />
          </button>
          
          {/* Earnings Calendar */}
          <button
            onClick={() => { setShowEarningsModal(true); if (Object.keys(earningsData).length === 0) fetchEarningsData(); }}
            className="glass-effect px-3 py-2 rounded-lg text-white hover:bg-white/20 transition-colors"
            title="Earnings Calendar"
          >
            <Calendar className="w-5 h-5" />
          </button>
          
          {/* AI Settings */}
          <button
            onClick={() => setShowAISettings(!showAISettings)}
            className="glass-effect px-3 py-2 rounded-lg text-white hover:bg-white/20 transition-colors"
            title="AI Instellingen"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Export Menu */}
          <div className="relative group">
            <button className="glass-effect px-3 py-2 rounded-lg text-white hover:bg-white/20 transition-colors">
              <Download className="w-5 h-5" />
            </button>
            <div className="absolute right-0 mt-2 w-48 glass-effect rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={handleExportCSV} className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-t-lg">
                Export CSV
              </button>
              <button onClick={handleExportPDF} className="w-full px-4 py-2 text-left text-white hover:bg-white/10 rounded-b-lg">
                Export PDF
              </button>
            </div>
          </div>
          
          <a
            href="https://platform.bolero.be/login"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-effect px-3 py-2 rounded-lg flex items-center space-x-2 text-white hover:bg-white/20 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          
          <button
            onClick={() => {
              setEditingInvestment(null);
              setShowAddModal(true);
            }}
            className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuw</span>
          </button>
          
          <button
            onClick={() => fetchStockPrices(myPricesTimeframe)}
            disabled={loadingPrices}
            className="glass-effect px-3 py-2 rounded-lg flex items-center space-x-2 text-white hover:bg-white/20 transition-colors"
            title="Koersen vernieuwen"
          >
            <RefreshCw className={`w-5 h-5 ${loadingPrices ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ===== HOOFDTABS ===== */}
      <div className="flex items-center gap-1 mb-6 border-b border-white/10 overflow-x-auto">
        {[
          { id: 'vandaag', label: 'Vandaag', icon: Sparkles },
          { id: 'portfolio', label: 'Portfolio', icon: BarChart2 },
          { id: 'onderzoek', label: 'Onderzoek', icon: Search },
        ].map(({ id, label, icon: TabIcon }) => (
          <button key={id} onClick={() => setActiveMainTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-all ${activeMainTab === id ? 'border-purple-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'}`}>
            <TabIcon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Portfolio Overview Card */}
      {activeMainTab === 'portfolio' && (
      <div className="gradient-card rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div>
            <p className="text-white/60 text-sm mb-1">Geïnvesteerd</p>
            <h2 className="text-white text-3xl font-bold">€{totalInvestment.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <p className="text-white/40 text-xs mt-1">{investments.length} {investments.length === 1 ? 'investering' : 'investeringen'}</p>
          </div>
          {hasPriceData && (
            <div>
              <p className="text-white/60 text-sm mb-1">Huidige Waarde</p>
              <h2 className="text-white text-3xl font-bold">€{totalLiveValue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
              {loadingPrices && <p className="text-blue-400 text-xs mt-1 flex items-center space-x-1"><Activity className="w-3 h-3 animate-pulse" /><span>Laden...</span></p>}
            </div>
          )}
          {hasPriceData && (
            <div>
              <p className="text-white/60 text-sm mb-1">Totaal Winst/Verlies</p>
              <h2 className={`text-3xl font-bold ${totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalProfitLoss >= 0 ? '+' : ''}€{totalProfitLoss.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p className={`text-xs mt-1 font-medium ${totalProfitLoss >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {typeof totalProfitLossPercent === 'number' ? (totalProfitLoss >= 0 ? '+' : '') + totalProfitLossPercent.toFixed(2) + '%' : '---'}
              </p>
            </div>
          )}
          {/* Portfolio Holdings Breakdown */}
          {investments.length > 0 && (
            <div className="glass-effect rounded-lg p-3">
              <p className="text-white/60 text-xs mb-2">In Bezit</p>
              <div className="space-y-1.5">
                {(() => {
                  const holdings = investments.reduce((acc, inv) => {
                    const value = calculateTotalValue(inv);
                    acc[inv.type] = (acc[inv.type] || 0) + value;
                    return acc;
                  }, {});
                  const total = Object.values(holdings).reduce((sum, val) => sum + val, 0);
                  return Object.entries(holdings)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([type, value]) => {
                      const percentage = total > 0 ? (value / total) * 100 : 0;
                      return (
                        <div key={type} className="flex items-center justify-between text-[10px]">
                          <span className="text-white/50 capitalize">{type}</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-white/40">€{typeof value === 'number' ? (value / 1000).toFixed(1) : '---'}k</span>
                            <span className="text-white font-medium min-w-[35px] text-right">{typeof percentage === 'number' ? percentage.toFixed(0) : '---'}%</span>
                          </div>
                        </div>
                      );
                    });
                })()}

        {/* Combined Evolution Widget: Day (left) + Intraday (right) */}
        {!showLegacyEvolution && investments.length > 0 && hasPriceData && (
          <div className="border-t border-white/10 pt-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-white/60 text-sm">Evolutie</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Day-by-Day */}
              <div className="relative glass-effect rounded-xl p-4 h-[220px] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-fuchsia-500/5 to-pink-500/5 pointer-events-none" />
                <div className="flex items-center justify-between mb-2">
                  <div className="glass-effect rounded-lg p-0.5">
                    <button onClick={() => setDailyView('pnl')} className={`px-2 py-1 text-xs rounded ${dailyView === 'pnl' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>P&L</button>
                    <button onClick={() => setDailyView('value')} className={`px-2 py-1 text-xs rounded ${dailyView === 'value' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>Waarde</button>
                  </div>
                </div>
                {(() => {
                  const data = portfolioDaily.dates.map((ts, i) => ({ t: ts, v: dailyView === 'pnl' ? portfolioDaily.pnl[i] : portfolioDaily.values[i] }));
                  const yMin = data.length ? Math.min(...data.map(d => d.v)) : 0;
                  const yMax = data.length ? Math.max(...data.map(d => d.v)) : 0;
                  const pad = (yMax - yMin) * 0.08 || 1;
                  return data.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 26 }}>
                        <defs>
                          <linearGradient id="evoDaily2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis type="number" dataKey="t" scale="time" domain={["dataMin", "dataMax"]}
                          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                          tickFormatter={(ts) => new Date(ts).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })}
                          stroke="rgba(255,255,255,0.1)" tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} minTickGap={12} />
                        <YAxis domain={[yMin - pad, yMax + pad]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                          tickFormatter={(v) => dailyView === 'pnl' ? `€${Math.round(v).toLocaleString('nl-NL')}` : `€${(v / 1000).toFixed(1)}k`}
                          stroke="rgba(255,255,255,0.05)" tickLine={false} axisLine={false} width={68} />
                        <Tooltip labelFormatter={(ts) => new Date(ts).toLocaleDateString('nl-NL', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                          formatter={(value) => [`€${Number(value).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, dailyView === 'pnl' ? 'Dag P&L' : 'Totale Waarde']}
                          contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '8px 12px' }} />
                        <Area type="monotone" dataKey="v" stroke="#8b5cf6" fill="url(#evoDaily2)" strokeWidth={3}
                          dot={{ r: 2.5, fill: '#fff', strokeWidth: 2, stroke: '#8b5cf6' }} activeDot={{ r: 5, fill: '#8b5cf6', strokeWidth: 3, stroke: '#fff' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">Onvoldoende dagdata</div>
                  );
                })()}
              </div>

              {/* Right: Intraday Portfolio Value */}
              {(() => {
                // Build intraday portfolio value series with real timestamps
                let seriesPerTicker = [];
                let portfolioPrevEUR = 0; let portfolioCurrEUR = 0;
                
                investments.forEach(inv => {
                  const sp = stockPrices[inv.ticker_symbol];
                  const shares = Number(inv.shares) || 0;
                  const sign = inv.is_short ? -1 : 1;
                  if (!sp || shares <= 0) return;
                  
                  const currEUR = convertToEUR(sp.current, sp.currency || 'EUR');
                  const prevClose = sp.previousClose != null ? sp.previousClose : (sp.current != null && sp.change != null ? sp.current - sp.change : null);
                  const prevEUR = prevClose != null ? convertToEUR(prevClose, sp.currency || 'EUR') : currEUR;
                  
                  portfolioPrevEUR += shares * prevEUR; 
                  portfolioCurrEUR += shares * currEUR;
                  
                  // Get sparkline data with timestamps for today only
                  if (Array.isArray(sp.sparklineData) && sp.sparklineData.length > 0) {
                    const rawTs = Array.isArray(sp.timestamps) && sp.timestamps.length > 0
                      ? sp.timestamps.slice(-sp.sparklineData.length)
                      : null;
                    
                    // Filter to today's data only
                    let todayData = [];
                    let todayTs = [];
                    
                    if (rawTs && rawTs.length === sp.sparklineData.length) {
                      const lastDay = (() => {
                        const d = new Date(rawTs[rawTs.length - 1]);
                        d.setHours(0,0,0,0);
                        return d.getTime();
                      })();
                      
                      for (let i = 0; i < rawTs.length; i++) {
                        const d = new Date(rawTs[i]);
                        d.setHours(0,0,0,0);
                        if (d.getTime() === lastDay) {
                          todayData.push(sp.sparklineData[i]);
                          todayTs.push(rawTs[i]);
                        }
                      }
                    } else {
                      // Fallback: use last ~30 points as "today"
                      const take = Math.min(30, sp.sparklineData.length);
                      todayData = sp.sparklineData.slice(-take);
                    }
                    
                    if (todayData.length > 0) {
                      seriesPerTicker.push({ 
                        currency: sp.currency || 'EUR', 
                        shares, 
                        sign,
                        data: todayData,
                        timestamps: todayTs.length > 0 ? todayTs : null
                      });
                    }
                  }
                });
                
                // Aggregate portfolio value across all tickers
                let data = [];
                if (seriesPerTicker.length > 0) {
                  const minLen = Math.min(...seriesPerTicker.map(s => s.data.length));
                  const aligned = seriesPerTicker.map(s => s.data.slice(-minLen));
                  
                  // Use timestamps from first ticker with real timestamps
                  const refTicker = seriesPerTicker.find(s => s.timestamps && s.timestamps.length >= minLen);
                  const timestamps = refTicker ? refTicker.timestamps.slice(-minLen) : null;
                  
                  for (let i = 0; i < minLen; i++) {
                    const portfolioValue = aligned.reduce((sum, arr, k) => {
                      const price = arr[i];
                      const priceEUR = convertToEUR(price, seriesPerTicker[k].currency);
                      return sum + seriesPerTicker[k].shares * priceEUR;
                    }, 0);
                    
                    // Use real timestamp or synthetic
                    const ts = timestamps ? timestamps[i] : Date.now() - (minLen - 1 - i) * 60000;
                    data.push({ t: ts, v: portfolioValue });
                  }
                }
                
                // Fallback if no sparkline data
                if (data.length === 0) {
                  const now = Date.now();
                  data = [
                    { t: now - 6 * 3600 * 1000, v: portfolioPrevEUR },
                    { t: now, v: portfolioCurrEUR }
                  ];
                }
                
                const yMin = Math.min(...data.map(d => d.v));
                const yMax = Math.max(...data.map(d => d.v));
                const pad = (yMax - yMin) * 0.05 || 1;
                const isPositive = data.length > 1 && data[data.length - 1].v >= data[0].v;
                
                return (
                  <div className="relative glass-effect rounded-xl p-4 h-[220px] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-fuchsia-500/5 to-pink-500/5 pointer-events-none" />
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/50 text-xs uppercase tracking-widest">Dag op dag</p>
                      <p className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        €{portfolioCurrEUR.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 26 }}>
                        <defs>
                          <linearGradient id="evoIntra2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isPositive ? '#4ade80' : '#f87171'} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={isPositive ? '#4ade80' : '#f87171'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis type="number" dataKey="t" scale="time" domain={["dataMin", "dataMax"]}
                          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                          tickFormatter={(ts) => new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                          stroke="rgba(255,255,255,0.1)" tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} minTickGap={16} />
                        <YAxis domain={[yMin - pad, yMax + pad]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                          tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`} stroke="rgba(255,255,255,0.05)" tickLine={false} axisLine={false} width={68} />
                        <Tooltip labelFormatter={(ts) => new Date(ts).toLocaleString('nl-NL', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          formatter={(value) => [`€${Number(value).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Portfolio Waarde']}
                          contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '8px 12px' }} />
                        <Area type="monotone" dataKey="v" stroke={isPositive ? '#4ade80' : '#f87171'} fill="url(#evoIntra2)" strokeWidth={3}
                          dot={{ r: 2.5, fill: '#fff', strokeWidth: 2, stroke: isPositive ? '#4ade80' : '#f87171' }} 
                          activeDot={{ r: 5, fill: isPositive ? '#4ade80' : '#f87171', strokeWidth: 3, stroke: '#fff' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

              </div>
            </div>
          )}
        </div>

        {/* ── Portfolio Winst Grafieken ─────────────────────────────────────── */}
        {showLegacyEvolution && investments.length > 0 && hasPriceData && (() => {
          // ── Shared calculations ──────────────────────────────────────────
          // Per-ticker enriched data
          const tickerRows = [];
          investments.forEach(inv => {
            const sp = stockPrices[inv.ticker_symbol];
            const shares = Number(inv.shares) || 0;
            const ppx   = Number(inv.purchase_price) || 0;
            if (!sp || shares <= 0 || ppx <= 0) return;
            const cur        = sp.currency || inferCurrencyFromTicker(inv.ticker_symbol) || 'EUR';
            const purchaseEUR = convertToEUR(ppx, inv.purchase_currency || 'EUR');
            const currEUR    = convertToEUR(sp.current, cur);
            const prevClose  = sp.previousClose != null
              ? sp.previousClose
              : (sp.current != null && sp.change != null ? sp.current - sp.change : sp.current);
            const prevEUR    = convertToEUR(prevClose, cur);
            const sign       = inv.is_short ? -1 : 1;
            // Real timestamps for the sparkline (from closeSeries timestamps, fall back to synthetic)
            const rawTs = Array.isArray(sp.timestamps) && sp.timestamps.length > 0
              ? sp.timestamps.slice(-sp.sparklineData.length)
              : null;
            // Intraday P&L series: restrict strictly to "vandaag" (laatste dag in timestamps)
            let intradayPnlSeries = [];
            if (Array.isArray(sp.sparklineData) && sp.sparklineData.length > 0) {
              if (rawTs && rawTs.length === sp.sparklineData.length) {
                const lastDay = (() => {
                  const d = new Date(rawTs[rawTs.length - 1]);
                  d.setHours(0,0,0,0);
                  return d.getTime();
                })();
                const filtered = [];
                for (let i = 0; i < rawTs.length; i++) {
                  const d = new Date(rawTs[i]);
                  d.setHours(0,0,0,0);
                  if (d.getTime() === lastDay) filtered.push(sp.sparklineData[i]);
                }
                intradayPnlSeries = filtered.map(px => {
                  const pxEUR = convertToEUR(px, cur);
                  return sign * shares * (pxEUR - prevEUR);
                });
              } else {
                // Fallback: assume last ~1 trading day worth of points
                const take = Math.min(30, sp.sparklineData.length);
                const slice = sp.sparklineData.slice(-take);
                intradayPnlSeries = slice.map(px => {
                  const pxEUR = convertToEUR(px, cur);
                  return sign * shares * (pxEUR - prevEUR);
                });
              }
            }
            tickerRows.push({ shares, cur, purchaseEUR, currEUR, prevEUR, sign, intradayPnlSeries, rawTs, sparkLen: intradayPnlSeries.length });
          });

          // ── KPIs ─────────────────────────────────────────────────────────
          let totalCostEUR  = 0;
          let totalPrevExposure = 0; // sum of previous mark-to-market exposure (always positive base)
          tickerRows.forEach(r => {
            totalCostEUR       += r.shares * r.purchaseEUR;
            totalPrevExposure  += r.shares * r.prevEUR;
          });
          const totalUnrealised = tickerRows.reduce((s, r) => s + r.sign * r.shares * (r.currEUR - r.purchaseEUR), 0);
          const dayChange       = tickerRows.reduce((s, r) => s + r.sign * r.shares * (r.currEUR - r.prevEUR), 0);
          const dayChangePct    = totalPrevExposure > 0 ? (dayChange / totalPrevExposure) * 100 : 0;
          const posDay          = dayChange >= 0;
          const posTotal        = totalUnrealised >= 0;

          // ── LEFT chart: Intraday P&L (€ winst vs gisteren sluiting) ─────
          const minLen = tickerRows.length > 0 ? Math.min(...tickerRows.map(r => r.sparkLen).filter(l => l > 0)) : 0;
          let intradayData = [];
          if (minLen > 0) {
            // Aggregate P&L across all tickers per tick
            const pnlSeries = Array.from({ length: minLen }, (_, i) =>
              tickerRows.reduce((sum, r) => sum + (r.intradayPnlSeries[r.sparkLen - minLen + i] || 0), 0)
            );
            // Build timestamps: prefer real API ts, else space from market open (09:00 CET)
            const nowTs = Date.now();
            const refRow = tickerRows.find(r => r.rawTs && r.rawTs.length >= minLen);
            intradayData = pnlSeries.map((pnl, i) => {
              let ts;
              if (refRow) {
                ts = refRow.rawTs[refRow.rawTs.length - minLen + i] * 1000;
              } else {
                const msPerTick = minLen > 1 ? (8 * 3600 * 1000) / (minLen - 1) : 3600 * 1000;
                ts = nowTs - (minLen - 1 - i) * msPerTick;
              }
              return { t: ts, pnl };
            });
          }
          const iYMin = intradayData.length ? Math.min(...intradayData.map(d => d.pnl), 0) : -1;
          const iYMax = intradayData.length ? Math.max(...intradayData.map(d => d.pnl), 0) : 1;
          const iPad  = (iYMax - iYMin) * 0.12 || 50;

          // ── RIGHT chart: Day-by-day portfolio value OR daily P&L ─────────
          const hasDailyData = portfolioDaily.dates.length > 1;
          const dailyChartData = hasDailyData
            ? portfolioDaily.dates.map((ts, i) => ({
                t: ts,
                value: portfolioDaily.values[i],
                pnl: portfolioDaily.pnl[i]
              }))
            : [];
          const dField     = dailyView === 'pnl' ? 'pnl' : 'value';
          const dVals      = dailyChartData.map(d => d[dField]);
          const dYMin      = dVals.length ? Math.min(...dVals) : 0;
          const dYMax      = dVals.length ? Math.max(...dVals) : 0;
          const dPad       = (dYMax - dYMin) * 0.12 || 100;
          const dPositive  = dailyView === 'pnl'
            ? (dVals[dVals.length - 1] || 0) >= 0
            : (dVals[dVals.length - 1] || 0) >= (dVals[0] || 0);

          return (
            <div className="border-t border-white/10 pt-5 mb-4">
              {/* Section header */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/70 text-sm font-medium tracking-wide">Winst &amp; Verlies</p>
                {/* Global KPI pills */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-lg">
                    Kostprijs: <span className="text-white/70">€{totalCostEUR.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</span>
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${posTotal ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                    Totaal W/V: {posTotal ? '+' : ''}€{totalUnrealised.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${posDay ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                    Vandaag: {posDay ? '+' : ''}€{dayChange.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({posDay ? '+' : ''}{dayChangePct.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Side-by-side charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* LEFT — Intraday P&L */}
                <div className="relative glass-effect rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,16,32,0.9) 0%, rgba(24,16,48,0.9) 100%)' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-fuchsia-500/5 pointer-events-none" />
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-widest mb-0.5">Vandaag</p>
                      <p className={`text-lg font-bold ${posDay ? 'text-emerald-400' : 'text-red-400'}`}>
                        {posDay ? '+' : ''}€{dayChange.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-0.5">vs gisteren</p>
                      <p className={`text-sm font-semibold ${posDay ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                        {posDay ? '+' : ''}{dayChangePct.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  {/* Chart */}
                  <div className="h-[175px] px-1 pb-3">
                    {intradayData.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={intradayData} margin={{ top: 8, right: 12, left: 4, bottom: 22 }}>
                          <defs>
                            <linearGradient id="intradayGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"  stopColor={posDay ? '#4ade80' : '#f87171'} stopOpacity={0.35} />
                              <stop offset="90%" stopColor={posDay ? '#4ade80' : '#f87171'} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis type="number" dataKey="t" scale="time" domain={['dataMin','dataMax']}
                            tickFormatter={ts => new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} tickLine={false}
                            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} minTickGap={28} />
                          <YAxis domain={[iYMin - iPad, iYMax + iPad]}
                            tickFormatter={v => `€${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('nl-NL')}`}
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} width={72} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />
                          <Tooltip
                            labelFormatter={ts => new Date(ts).toLocaleString('nl-NL', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            formatter={v => [`${v >= 0 ? '+' : ''}€${Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Winst / Verlies']}
                            contentStyle={{ background: 'rgba(8,8,20,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 11, marginBottom: 3 }}
                            itemStyle={{ color: posDay ? '#4ade80' : '#f87171', fontWeight: 600, fontSize: 12 }}
                          />
                          <Area type="monotone" dataKey="pnl" stroke={posDay ? '#4ade80' : '#f87171'} fill="url(#intradayGrad)" strokeWidth={2.5}
                            dot={false} activeDot={{ r: 5, fill: posDay ? '#4ade80' : '#f87171', strokeWidth: 2.5, stroke: '#fff' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">Geen intradaydata beschikbaar</div>
                    )}
                  </div>
                </div>

                {/* RIGHT — Day-by-day */}
                <div className="relative glass-effect rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,16,32,0.9) 0%, rgba(16,24,40,0.9) 100%)' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-transparent to-cyan-500/5 pointer-events-none" />
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div>
                      <p className="text-white/50 text-xs uppercase tracking-widest mb-0.5">Dag op dag</p>
                      {hasDailyData && (() => {
                        const last    = portfolioDaily.values[portfolioDaily.values.length - 1] || 0;
                        const lastPnl = portfolioDaily.pnl[portfolioDaily.pnl.length - 1] || 0;
                        return (
                          <p className={`text-lg font-bold ${lastPnl >= 0 ? 'text-blue-300' : 'text-orange-400'}`}>
                            €{last.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="glass-effect rounded-xl p-0.5">
                      <button onClick={() => setDailyView('pnl')} className={`px-3 py-1 text-xs rounded-lg transition-all ${dailyView === 'pnl' ? 'bg-white/20 text-white font-semibold' : 'text-white/50 hover:text-white'}`}>P&L</button>
                      <button onClick={() => setDailyView('value')} className={`px-3 py-1 text-xs rounded-lg transition-all ${dailyView === 'value' ? 'bg-white/20 text-white font-semibold' : 'text-white/50 hover:text-white'}`}>Waarde</button>
                    </div>
                  </div>
                  {/* Chart */}
                  <div className="h-[175px] px-1 pb-3">
                    {dailyChartData.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyChartData} margin={{ top: 8, right: 12, left: 4, bottom: 22 }}>
                          <defs>
                            <linearGradient id="dailyGrad2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"  stopColor={dPositive ? '#60a5fa' : '#f97316'} stopOpacity={0.35} />
                              <stop offset="90%" stopColor={dPositive ? '#60a5fa' : '#f97316'} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis type="number" dataKey="t" scale="time" domain={['dataMin','dataMax']}
                            tickFormatter={ts => new Date(ts).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })}
                            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} tickLine={false}
                            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} minTickGap={20} />
                          <YAxis domain={[dYMin - dPad, dYMax + dPad]}
                            tickFormatter={v => dailyView === 'pnl'
                              ? `€${v >= 0 ? '+' : ''}${Math.round(v).toLocaleString('nl-NL')}`
                              : `€${(v / 1000).toFixed(1)}k`}
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
                          {dailyView === 'pnl' && <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />}
                          <Tooltip
                            labelFormatter={ts => new Date(ts).toLocaleDateString('nl-NL', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                            formatter={v => [
                              `${dailyView === 'pnl' && v >= 0 ? '+' : ''}€${Number(v).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                              dailyView === 'pnl' ? 'Dag P&L' : 'Portfoliowaarde'
                            ]}
                            contentStyle={{ background: 'rgba(8,8,20,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 11, marginBottom: 3 }}
                            itemStyle={{ color: dPositive ? '#60a5fa' : '#f97316', fontWeight: 600, fontSize: 12 }}
                          />
                          <Area type="monotone" dataKey={dField} stroke={dPositive ? '#60a5fa' : '#f97316'} fill="url(#dailyGrad2)" strokeWidth={2.5}
                            dot={{ r: 3, fill: '#fff', strokeWidth: 2, stroke: dPositive ? '#60a5fa' : '#f97316' }}
                            activeDot={{ r: 5.5, fill: dPositive ? '#60a5fa' : '#f97316', strokeWidth: 2.5, stroke: '#fff' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">Onvoldoende dagdata (min. 2 dagen)</div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Diversification Section - Visual */}
        {investments.length > 0 && (
          <div className="border-t border-white/10 pt-4 mb-4">
            <p className="text-white/60 text-sm mb-3">Portfolio Verdeling</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* By Type - Progress Bars */}
              <div className="glass-effect rounded-lg p-4">
                <p className="text-white/40 text-xs mb-3 flex items-center justify-between">
                  <span>Per Type</span>
                  <span className="text-white/20 text-[10px]">Visuele verdeling</span>
                </p>
                {(() => {
                  const typeDistribution = investments.reduce((acc, inv) => {
                    const type = inv.type || 'Overig';
                    const value = hasPriceData && inv.ticker_symbol && stockPrices[inv.ticker_symbol]
                      ? (inv.shares || 0) * stockPrices[inv.ticker_symbol].current
                      : convertToEUR(parseFloat(inv.amount) || 0, inv.purchase_currency || 'EUR');
                    acc[type] = (acc[type] || 0) + value;
                    return acc;
                  }, {});
                  const total = Object.values(typeDistribution).reduce((sum, v) => sum + v, 0);
                  const colors = {
                    'aandeel': 'bg-gradient-to-r from-blue-500 to-cyan-500',
                    'etf': 'bg-gradient-to-r from-purple-500 to-pink-500',
                    'crypto': 'bg-gradient-to-r from-orange-500 to-yellow-500',
                    'obligatie': 'bg-gradient-to-r from-green-500 to-emerald-500',
                    'Overig': 'bg-gradient-to-r from-gray-500 to-slate-500'
                  };
                  const dotColors = {
                    'aandeel': 'bg-blue-500',
                    'etf': 'bg-purple-500',
                    'crypto': 'bg-orange-500',
                    'obligatie': 'bg-green-500',
                    'Overig': 'bg-gray-500'
                  };
                  
                  return (
                    <>
                      {/* Stacked Bar */}
                      <div className="flex h-3 rounded-full overflow-hidden mb-3 bg-white/5">
                        {Object.entries(typeDistribution)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, value]) => {
                            const percentage = total > 0 ? (value / total) * 100 : 0;
                            return (
                              <div
                                key={type}
                                className={`${colors[type] || 'bg-gray-500'} transition-all`}
                                style={{ width: `${percentage}%` }}
                                title={`${type}: ${typeof percentage === 'number' ? percentage.toFixed(1) : '---'}%`}
                              />
                            );
                          })}
                      </div>

                      {/* Legend */}
                      <div className="space-y-1.5">
                        {Object.entries(typeDistribution)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, value]) => {
                            const percentage = total > 0 ? (value / total) * 100 : 0;
                            return (
                              <div key={type} className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-2 h-2 rounded-full ${dotColors[type] || 'bg-gray-500'}`} />
                                  <span className="text-white/60 capitalize">{type}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-white/40">€{typeof value === 'number' ? (value / 1000).toFixed(1) : '---'}k</span>
                                  <span className="text-white font-medium min-w-[45px] text-right">{typeof percentage === 'number' ? percentage.toFixed(1) : '---'}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* By Sector - Progress Bars */}
              <div className="glass-effect rounded-lg p-4">
                <p className="text-white/40 text-xs mb-3 flex items-center justify-between">
                  <span>Per Sector</span>
                  <span className="text-white/20 text-[10px]">Top 5 sectoren</span>
                </p>
                {(() => {
                  const sectorDistribution = investments.reduce((acc, inv) => {
                    if (!inv.sector) return acc;
                    const sector = inv.sector;
                    const value = hasPriceData && inv.ticker_symbol && stockPrices[inv.ticker_symbol]
                      ? (inv.shares || 0) * stockPrices[inv.ticker_symbol].current
                      : convertToEUR(parseFloat(inv.amount) || 0, inv.purchase_currency || 'EUR');
                    acc[sector] = (acc[sector] || 0) + value;
                    return acc;
                  }, {});
                  const total = Object.values(sectorDistribution).reduce((sum, v) => sum + v, 0);
                  
                  if (Object.keys(sectorDistribution).length === 0) {
                    return (
                      <div className="text-white/30 text-xs text-center py-4">
                        Geen sector informatie beschikbaar
                      </div>
                    );
                  }
                  
                  const sectorColors = [
                    'bg-gradient-to-r from-cyan-500 to-blue-500',
                    'bg-gradient-to-r from-pink-500 to-rose-500', 
                    'bg-gradient-to-r from-yellow-500 to-orange-500',
                    'bg-gradient-to-r from-indigo-500 to-purple-500',
                    'bg-gradient-to-r from-red-500 to-pink-500',
                    'bg-gradient-to-r from-teal-500 to-cyan-500'
                  ];
                  const sectorDotColors = [
                    'bg-cyan-500',
                    'bg-pink-500', 
                    'bg-yellow-500',
                    'bg-indigo-500',
                    'bg-red-500',
                    'bg-teal-500'
                  ];
                  
                  const topSectors = Object.entries(sectorDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                  
                  return (
                    <>
                      {/* Stacked Bar */}
                      <div className="flex h-3 rounded-full overflow-hidden mb-3 bg-white/5">
                        {topSectors.map(([sector, value], index) => {
                          const percentage = total > 0 ? (value / total) * 100 : 0;
                          return (
                            <div
                              key={sector}
                              className={`${sectorColors[index % sectorColors.length]} transition-all`}
                              style={{ width: `${percentage}%` }}
                              title={`${sector}: ${typeof percentage === 'number' ? percentage.toFixed(1) : '---'}%`}
                            />
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="space-y-1.5">
                        {topSectors.map(([sector, value], index) => {
                          const percentage = total > 0 ? (value / total) * 100 : 0;
                          return (
                            <div key={sector} className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sectorDotColors[index % sectorDotColors.length]}`} />
                                <span className="text-white/60 truncate" title={sector}>{sector}</span>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                <span className="text-white/40">€{typeof value === 'number' ? (value / 1000).toFixed(1) : '---'}k</span>
                                <span className="text-white font-medium min-w-[45px] text-right">{typeof percentage === 'number' ? percentage.toFixed(1) : '---'}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {hasPriceData && investments.length > 0 && totalProfitLoss !== 0 && (
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-sm">Performance Metrics</p>
              <button
                onClick={() => setShowPerformance(!showPerformance)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showPerformance ? 'Verberg' : 'Toon details'}
              </button>
            </div>
            {showPerformance && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Return on Investment */}
                <div className="glass-effect rounded-lg p-3">
                  <p className="text-white/40 text-[10px] uppercase mb-1">ROI</p>
                  <p className={`text-lg font-bold ${typeof totalProfitLossPercent === 'number' && totalProfitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {typeof totalProfitLossPercent === 'number' ? (totalProfitLossPercent >= 0 ? '+' : '') + totalProfitLossPercent.toFixed(2) + '%' : '---'}
                  </p>
                  <p className="text-white/30 text-[9px] mt-0.5">Return on Investment</p>
                </div>

                {/* Best Performer */}
                {(() => {
                  const performers = investments
                    .filter(inv => inv.ticker_symbol && stockPrices[inv.ticker_symbol] && inv.shares && inv.purchase_price)
                    .map(inv => {
                      const pl = calculateProfitLoss(inv);
                      return { name: inv.name, percentage: pl.percentage };
                    })
                    .sort((a, b) => b.percentage - a.percentage);
                  
                  const best = performers[0];
                  return best ? (
                    <div className="glass-effect rounded-lg p-3">
                      <p className="text-white/40 text-[10px] uppercase mb-1">Beste</p>
                      <p className="text-green-400 text-lg font-bold">+{typeof best.percentage === 'number' ? best.percentage.toFixed(1) : '---'}%</p>
                      <p className="text-white/30 text-[9px] mt-0.5 truncate">{best.name}</p>
                    </div>
                  ) : null;
                })()}

                {/* Worst Performer */}
                {(() => {
                  const performers = investments
                    .filter(inv => inv.ticker_symbol && stockPrices[inv.ticker_symbol] && inv.shares && inv.purchase_price)
                    .map(inv => {
                      const pl = calculateProfitLoss(inv);
                      return { name: inv.name, percentage: pl.percentage };
                    })
                    .sort((a, b) => a.percentage - b.percentage);
                  
                  const worst = performers[0];
                  return worst ? (
                    <div className="glass-effect rounded-lg p-3">
                      <p className="text-white/40 text-[10px] uppercase mb-1">Slechtste</p>
                      <p className="text-red-400 text-lg font-bold">{typeof worst.percentage === 'number' ? worst.percentage.toFixed(1) : '---'}%</p>
                      <p className="text-white/30 text-[9px] mt-0.5 truncate">{worst.name}</p>
                    </div>
                  ) : null;
                })()}

                {/* Win Rate */}
                {(() => {
                  const withPL = investments.filter(inv => inv.ticker_symbol && stockPrices[inv.ticker_symbol] && inv.shares && inv.purchase_price);
                  const winners = withPL.filter(inv => calculateProfitLoss(inv).amount > 0).length;
                  const winRate = withPL.length > 0 ? (winners / withPL.length) * 100 : 0;
                  
                  return (
                    <div className="glass-effect rounded-lg p-3">
                      <p className="text-white/40 text-[10px] uppercase mb-1">Win Rate</p>
                      <p className={`text-lg font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {winRate.toFixed(0)}%
                      </p>
                      <p className="text-white/30 text-[9px] mt-0.5">{winners}/{withPL.length} winstgevend</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Apple-style Stock Widgets - Eigen aandelen koersen (moved directly under Performance Metrics) */}
      {activeMainTab === 'portfolio' && userTickers.length > 0 && (
        <div className="gradient-card rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-white text-xl font-semibold">Mijn Koersen</h2>
              <p className="text-white/60 text-sm">Live koersdata van je eigen aandelen</p>
            </div>
            {loadingPrices && <Activity className="w-5 h-5 text-green-400 animate-pulse" />}
          </div>
          <div className="flex items-center space-x-1 mb-4">
            {['1D', '1W', '1M', '6M', '1Y', '5Y'].map(tf => (
              <button
                key={tf}
                onClick={() => setMyPricesTimeframe(tf)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${myPricesTimeframe === tf ? 'bg-blue-500 text-white' : 'glass-effect text-white/50 hover:text-white'}`}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {userTickers.map(({ symbol, name, totalShares, totalInvested, purchasePrice }) => {
              const price = stockPrices[symbol];
              if (!price) return null;
              const isPositive = price.change >= 0;
              const currencySymbol = getCurrencySymbol(price.currency);
              const currentPriceEUR = price.currency === 'EUR' ? price.current : convertToEUR(price.current, price.currency);
              const liveValueEUR = totalShares * currentPriceEUR;
              const profitLossEUR = liveValueEUR - totalInvested;
              const profitLossPercent = totalInvested > 0 ? (profitLossEUR / totalInvested) * 100 : 0;
              const plPositive = profitLossEUR >= 0;
              const marketOpen = isMarketOpen(price.currency);
              return (
                <div key={symbol} className="glass-effect rounded-lg p-2 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                      <span className={`text-xs flex-shrink-0 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '▲' : '▼'}
                      </span>
                      <span className="text-white font-bold text-sm flex-shrink-0">{symbol}</span>
                      <span className="text-white/50 text-xs truncate">{name}</span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {marketOpen !== null && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${marketOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {marketOpen ? 'Open' : 'Gesloten'}
                        </span>
                      )}
                      <Sparkline
                        data={price.sparklineData}
                        color={isPositive ? '#4ade80' : '#f87171'}
                        width={56}
                        height={18}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm">
                        {currencySymbol}{price.current.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[10px] font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {typeof price.changePercent === 'number' ? (isPositive ? '+' : '') + price.changePercent.toFixed(1) + '%' : '---'}
                      </span>
                    </div>
                    {totalInvested > 0 && (
                      <div className="text-right">
                        <span className={`text-xs font-bold ${plPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {plPositive ? '+' : ''}€{Math.abs(profitLossEUR).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[10px] ml-1 ${plPositive ? 'text-green-400/70' : 'text-red-400/70'}`}>
                          ({typeof profitLossPercent === 'number' ? (plPositive ? '+' : '') + profitLossPercent.toFixed(1) + '%' : '---'})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Decisions — unified KOOP/HOUD/VERKOOP signal engine */}
      {activeMainTab === 'vandaag' && (
        <DailyDecisionsPanel
          investments={investments}
          watchlist={myWatchlist}
          stockPrices={stockPrices}
          analystData={analystData}
          earningsData={earningsData}
          screenerData={screenerData}
          aiBuyScores={aiBuyScores}
          onRunBuyCheck={(ticker) => runAIBuyCheck(ticker)}
          onAddToWatchlist={(item) => addToWatchlist(item)}
        />
      )}

      {/* Earnings Calendar Widget */}
      {activeMainTab === 'vandaag' && (() => {
        const now = Date.now();
        const sixWeeks = 42 * 24 * 60 * 60 * 1000;
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        // Build sorted list: only entries with upcoming earnings within 6 weeks
        const earningsFetched = Object.keys(earningsData).length > 0;
        const upcoming = Object.values(earningsData)
          .filter(e => e.nextEarningsDate && e.nextEarningsDate >= now - sevenDays && e.nextEarningsDate <= now + sixWeeks)
          .map(e => ({
            ...e,
            isOwned: investments.some(inv => inv.ticker_symbol === e.ticker),
            isWatchlist: myWatchlist.some(w => w.ticker === e.ticker),
            daysUntil: Math.ceil((e.nextEarningsDate - now) / (24 * 60 * 60 * 1000)),
          }))
          .sort((a, b) => a.nextEarningsDate - b.nextEarningsDate);

        const ninetyDays = 90 * 24 * 60 * 60 * 1000;
        const laterUpcoming = Object.values(earningsData)
          .filter(e => e.nextEarningsDate && e.nextEarningsDate >= now && e.nextEarningsDate <= now + ninetyDays)
          .map(e => ({
            ...e,
            isOwned: investments.some(inv => inv.ticker_symbol === e.ticker),
            isWatchlist: myWatchlist.some(w => w.ticker === e.ticker),
            daysUntil: Math.ceil((e.nextEarningsDate - now) / (24 * 60 * 60 * 1000)),
          }))
          .sort((a, b) => a.nextEarningsDate - b.nextEarningsDate);

        const getBadgeColor = (days) => {
          if (days <= 3) return 'bg-red-500/20 text-red-300 border-red-500/30';
          if (days <= 7) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
          if (days <= 14) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
          return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        };

        const getDayLabel = (days) => {
          if (days === 0) return 'Vandaag';
          if (days === 1) return 'Morgen';
          if (days < 0) return `${Math.abs(days)}d geleden`;
          return `over ${days}d`;
        };

        return (
          <div className="glass-effect rounded-xl p-4 mb-6 border border-white/5 xl:hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm">Aankomende Earnings</h3>
                  <p className="text-white/40 text-[10px]">Eigen aandelen & watchlist • komende 6 weken</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchEarningsData(true)}
                  disabled={loadingEarnings}
                  className="flex items-center space-x-1 text-white/40 hover:text-white/70 transition-colors text-xs"
                  title="Refresh earnings"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingEarnings ? 'animate-spin' : ''}`} />
                  {!earningsFetched && <span>Laden</span>}
                </button>
                <button
                  onClick={() => toggleWidget('earnings')}
                  className="text-white/40 hover:text-white/70 transition-colors"
                  title={widgetCollapsed.earnings ? 'Uitklappen' : 'Inklappen'}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${widgetCollapsed.earnings ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            
            {!widgetCollapsed.earnings && (
            <>

            {!earningsFetched && !loadingEarnings ? (
              <button
                onClick={() => fetchEarningsData(true)}
                className="w-full py-4 text-center text-white/40 hover:text-white/60 text-sm border border-dashed border-white/10 rounded-lg transition-colors"
              >
                <Calendar className="w-5 h-5 mx-auto mb-1 opacity-40" />
                Klik om earnings op te halen voor jouw aandelen & watchlist
              </button>
            ) : loadingEarnings ? (
              <div className="flex items-center justify-center py-6 space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-400" />
                <span className="text-white/50 text-sm">Earnings ophalen...</span>
              </div>
            ) : upcoming.length === 0 ? (
              laterUpcoming.length > 0 ? (
                <div>
                  <p className="text-white/40 text-[10px] text-center mb-2">Geen earnings binnen 6 weken. Hieronder de komende 90 dagen.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {laterUpcoming.map((item) => {
                      const date = new Date(item.nextEarningsDate);
                      const dateStr = date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
                      const badgeCls = getBadgeColor(item.daysUntil);
                      const sp = stockPrices[item.ticker];
                      const changePos = sp?.changePercent >= 0;

                      return (
                        <div
                          key={item.ticker}
                          className="bg-white/5 hover:bg-white/8 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); runAIBuyCheck(item.ticker); }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 mb-0.5">
                                <span className="text-white font-bold text-sm">{item.ticker}</span>
                                {item.isOwned && (
                                  <span className="text-[9px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-semibold">Portfolio</span>
                                )}
                                {item.isWatchlist && !item.isOwned && (
                                  <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded font-semibold">Watchlist</span>
                                )}
                              </div>
                              <p className="text-white/40 text-[10px] truncate">{dateStr}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeCls}`}>
                              {getDayLabel(item.daysUntil)}
                            </span>
                          </div>

                          <div className="relative h-1 bg-white/10 rounded-full mb-2 overflow-hidden">
                            <div
                              className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                                item.daysUntil <= 3 ? 'bg-red-400' :
                                item.daysUntil <= 7 ? 'bg-orange-400' :
                                item.daysUntil <= 14 ? 'bg-yellow-400' : 'bg-blue-400'
                              }`}
                              style={{ width: `${Math.max(5, 100 - (item.daysUntil / 42) * 100)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center space-x-2">
                              {sp?.current ? (
                                <span className="text-white/60">
                                  {sp.currency === 'USD' ? '$' : '€'}{sp.current.toFixed(2)}
                                </span>
                              ) : null}
                              {typeof sp?.changePercent === 'number' && (
                                <span className={changePos ? 'text-green-400' : 'text-red-400'}>
                                  {changePos ? '+' : ''}{sp.changePercent.toFixed(1)}%
                                </span>
                              )}
                            </div>
                            {item.estimatedEPS != null && (
                              <span className="text-white/40">
                                EPS est. <span className="text-white/70 font-semibold">${item.estimatedEPS.toFixed(2)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-white/30 text-sm text-center py-4">Geen earnings gevonden in de komende 6 weken</p>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {upcoming.map((item) => {
                  const date = new Date(item.nextEarningsDate);
                  const dateStr = date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
                  const badgeCls = getBadgeColor(item.daysUntil);
                  const sp = stockPrices[item.ticker];
                  const changePos = sp?.changePercent >= 0;

                  return (
                    <div
                      key={item.ticker}
                      className="bg-white/5 hover:bg-white/8 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); runAIBuyCheck(item.ticker); }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5 mb-0.5">
                            <span className="text-white font-bold text-sm">{item.ticker}</span>
                            {item.isOwned && (
                              <span className="text-[9px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-semibold">Portfolio</span>
                            )}
                            {item.isWatchlist && !item.isOwned && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded font-semibold">Watchlist</span>
                            )}
                          </div>
                          <p className="text-white/40 text-[10px] truncate">{dateStr}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeCls}`}>
                          {getDayLabel(item.daysUntil)}
                        </span>
                      </div>

                      {/* Countdown bar */}
                      <div className="relative h-1 bg-white/10 rounded-full mb-2 overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                            item.daysUntil <= 3 ? 'bg-red-400' :
                            item.daysUntil <= 7 ? 'bg-orange-400' :
                            item.daysUntil <= 14 ? 'bg-yellow-400' : 'bg-blue-400'
                          }`}
                          style={{ width: `${Math.max(5, Math.min(100, 100 - (item.daysUntil / 42) * 100))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center space-x-2">
                          {sp?.current ? (
                            <span className="text-white/60">
                              {sp.currency === 'USD' ? '$' : '€'}{sp.current.toFixed(2)}
                            </span>
                          ) : null}
                          {typeof sp?.changePercent === 'number' && (
                            <span className={changePos ? 'text-green-400' : 'text-red-400'}>
                              {changePos ? '+' : ''}{sp.changePercent.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {item.estimatedEPS != null && (
                          <span className="text-white/40">
                            EPS est. <span className="text-white/70 font-semibold">${item.estimatedEPS.toFixed(2)}</span>
                          </span>
                        )}
                      </div>

                      {/* AI Earnings Prediction */}
                      {(() => {
                        const hist = item.history || [];
                        const avgSurprise = hist.length > 0 ? hist.reduce((sum, h) => sum + (h.surprisePercent || 0), 0) / hist.length : 0;
                        const beatRate = hist.filter(h => (h.surprisePercent || 0) > 0).length / Math.max(hist.length, 1);
                        const sentiment = avgSurprise > 5 && beatRate > 0.6 ? 'positive' : avgSurprise < -5 && beatRate < 0.4 ? 'negative' : 'neutral';
                        const label = sentiment === 'positive' ? 'Positieve verwachting' : sentiment === 'negative' ? 'Negatieve verwachting' : 'Neutraal';
                        const color = sentiment === 'positive' ? 'text-green-400' : sentiment === 'negative' ? 'text-red-400' : 'text-white/40';
                        const icon = sentiment === 'positive' ? '📈' : sentiment === 'negative' ? '📉' : '➖';
                        return hist.length > 0 ? (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <p className={`text-[10px] font-medium ${color} flex items-center space-x-1`}>
                              <span>{icon}</span>
                              <span>{label}</span>
                            </p>
                          </div>
                        ) : null;
                      })()}

                      {/* Last 3 quarters surprise history */}
                      {item.history && item.history.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center space-x-1">
                          <span className="text-white/30 text-[9px] mr-1">Vorige:</span>
                          {item.history.slice(0, 3).map((h, hi) => (
                            <span
                              key={hi}
                              className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                                h.surprisePercent > 0 ? 'bg-green-500/20 text-green-400' :
                                h.surprisePercent < 0 ? 'bg-red-500/20 text-red-400' :
                                'bg-white/10 text-white/40'
                              }`}
                              title={`Q: ${h.date} | Surprise: ${h.surprisePercent != null ? h.surprisePercent.toFixed(1) + '%' : '?'}`}
                            >
                              {h.surprisePercent != null ? (h.surprisePercent > 0 ? '+' : '') + h.surprisePercent.toFixed(0) + '%' : '?'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </>
            )}
          </div>
        );
      })()}

      {/* Buy of Wachten? Quick Check Widget */}
      {activeMainTab === 'onderzoek' && (
      <BuyOrWaitWidget
        screenerData={screenerData}
        stockPrices={stockPrices}
        tickerNewsMap={tickerNewsMap}
        earningsData={earningsData}
        aiBuyScores={aiBuyScores}
        loadingAiBuy={loadingAiBuy}
        onRunBuyCheck={(t) => runAIBuyCheck(t)}
        onFetchNews={(tickers) => fetchNewsForTickers(tickers)}
        userApiKey={typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') || '' : ''}
      />
      )}

      {/* AI Discovery + Portfolio AI */}
      {activeMainTab === 'onderzoek' && (
      <>
      <PortfolioAIPanel
        investments={investments}
        stockPrices={stockPrices}
        onOpenAISettings={() => setShowAISettings(true)}
        onSearchTheme={(theme) => setAiDiscoveryPrefill({ query: `Aandelen of ETF's voor ${theme} exposure`, token: Date.now() })}
      />
      <SemanticSearchPanel
        portfolio={investments}
        watchlist={myWatchlist}
        onAddToWatchlist={(item) => addToWatchlist(item)}
        onOpenAISettings={() => setShowAISettings(true)}
        prefill={aiDiscoveryPrefill}
      />
      </>
      )}

      {/* Market Meters - Trump Risk + Oil Price */}
      {activeMainTab === 'vandaag' && (
      <>
      <MarketMetersWidget />

      {/* Market Intelligence Hub - Reddit + X + News + AI Briefing */}
      <MarketIntelligenceWidget
        investments={investments}
        watchlist={myWatchlist}
      />

      {/* Market Scanner - Volume anomalies, breakouts, RSI extremes */}
      <MarketScannerWidget
        investments={investments}
        watchlist={myWatchlist}
        onAddToWatchlist={(item) => addToWatchlist(item)}
        onRunBuyCheck={(ticker) => runAIBuyCheck(ticker)}
      />
      </>
      )}

      {/* Guin AI Scout - Ticker Chat, Market Research, Morning Brief, Portfolio Coach */}
      {activeMainTab === 'onderzoek' && (
      <StockAIAssistant
        investments={investments}
        stockPrices={stockPrices}
        screenerData={screenerData}
        myWatchlist={myWatchlist}
        analystData={analystData}
        onAddToWatchlist={(item) => addToWatchlist(item)}
        onRunBuyCheck={(ticker) => runAIBuyCheck(ticker)}
        userApiKey={localStorage.getItem('openai_api_key') || ''}
      />
      )}

      {/* Top Buy Section */}
      {activeMainTab === 'vandaag' && (
      <div className="mb-6">
        {/* Shared title row - both titles at same height */}
        <div className="hidden xl:grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2">
            <h2 className="text-white font-bold text-lg flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Top Buy Aanbevelingen</span>
            </h2>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Earnings</h3>
                <p className="text-white/40 text-[10px]">±6 weken (incl. 1w geleden)</p>
              </div>
            </div>
            <button onClick={() => { if (!loadingEarnings) fetchEarningsData(true); }} disabled={loadingEarnings} className={`text-white/40 hover:text-white/70 ${loadingEarnings ? 'opacity-50 pointer-events-none' : ''}`} title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingEarnings ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {/* Mobile title */}
        <h2 className="xl:hidden text-white font-bold text-lg mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>Top Buy Aanbevelingen</span>
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          {/* Left: Top Buy cards */}
          <div className="xl:col-span-2">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
          {/* Top buy voor eigen aandeel */}
          {topBuyOwnStock && (
            <div
              className="glass-effect rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer border border-green-500/20 hover:border-green-500/40 h-[230px] overflow-hidden flex flex-col"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); runAIBuyCheck(topBuyOwnStock.inv.ticker_symbol); }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-white/60 text-xs uppercase tracking-wider font-semibold">Eigen Aandeel</span>
                </div>
              </div>
              <p className="text-white font-bold text-base mb-1">{topBuyOwnStock.inv.name}</p>
              {(() => {
                const sd = topBuyOwnStock.sd || {};
                const sp = stockPrices[topBuyOwnStock.inv.ticker_symbol] || {};
                const sector = getCleanSector(sd.sector, topBuyOwnStock.inv.sector, sp.sector);
                let desc = (sp.description || sd.description || '').trim();
                if (!desc) {
                  if (sd.growth1mo != null) desc = `Momentum: ${sd.growth1mo >= 0 ? '+' : ''}${Number(sd.growth1mo).toFixed(1)}% deze maand`;
                  else if (sd.signal?.overall) desc = `Technisch signaal: ${sd.signal.overall}`;
                }
                if (desc.includes('.')) desc = desc.split('.')[0] + (desc.endsWith('.') ? '' : '.');
                const line = [sector, desc].filter(Boolean).join(' • ');
                return line ? (
                  <p className="text-white/60 text-[10px] leading-snug mb-1">{line}</p>
                ) : null;
              })()}
              <p className="text-white/50 text-xs mb-3">{topBuyOwnStock.inv.ticker_symbol}</p>
              {(() => {
                const realScore = aiBuyScores[topBuyOwnStock.inv.ticker_symbol];
                const displayScore = realScore?.score != null ? Math.round(realScore.score) : Math.round(topBuyOwnStock.score);
                const isReal = realScore?.score != null;
                return (
                  <div className="bg-white/5 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/50 text-xs">{isReal ? 'AI Score' : 'Koopscore'}</span>
                      <span className={`text-2xl font-bold ${displayScore > 70 ? 'text-green-400' : displayScore > 50 ? 'text-yellow-400' : 'text-orange-400'}`}>{displayScore}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${displayScore > 70 ? 'bg-green-400' : displayScore > 50 ? 'bg-yellow-400' : 'bg-orange-400'}`} style={{width: `${displayScore}%`}}></div>
                    </div>
                    {isReal && realScore.verdict && <p className="text-[10px] text-white/40 mt-1 capitalize">{realScore.verdict}</p>}
                  </div>
                );
              })()}
              <div className="space-y-2">
                {topBuyOwnStock.sd.signal?.overall && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Signaal</span>
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded font-semibold">
                      {topBuyOwnStock.sd.signal.overall}
                    </span>
                  </div>
                )}
                {topBuyOwnStock.sd.rsi && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">RSI</span>
                    <span className={`font-semibold ${topBuyOwnStock.sd.rsi < 30 ? 'text-green-400' : topBuyOwnStock.sd.rsi > 70 ? 'text-red-400' : 'text-white/70'}`}>
                      {Math.round(topBuyOwnStock.sd.rsi)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top buy hidden gems */}
          {topBuyHiddenGem && (
            <div
              className="glass-effect rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer border border-purple-500/20 hover:border-purple-500/40 h-[230px] overflow-hidden flex flex-col"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); runAIBuyCheck(topBuyHiddenGem.ticker); }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Gem className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-white/60 text-xs uppercase tracking-wider font-semibold">Hidden Gem</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                {(() => {
                  const init = topBuyHiddenGem.ticker?.charAt(0) || '?';
                  return (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {init}
                    </div>
                  );
                })()}
                <p className="text-white font-bold text-base">{topBuyHiddenGem.ticker}</p>
              </div>
              {(() => {
                const sd = topBuyHiddenGem.sd || {};
                const sp = stockPrices[topBuyHiddenGem.ticker] || {};
                const sector = getCleanSector(sd.sector, sp.sector);
                let desc = (sp.description || sd.description || '').trim();
                if (!desc) {
                  if (sd.qualityScore != null) desc = `Kwaliteitsscore: ${Math.round(sd.qualityScore)}`;
                  else if (sd.signal?.overall) desc = `Technisch signaal: ${sd.signal.overall}`;
                }
                if (desc.includes('.')) desc = desc.split('.')[0] + (desc.endsWith('.') ? '' : '.');
                const line = [sector, desc].filter(Boolean).join(' • ');
                return line ? (
                  <p className="text-white/60 text-[10px] leading-snug mb-1">{line}</p>
                ) : null;
              })()}
              {(() => {
                const realScore = aiBuyScores[topBuyHiddenGem.ticker];
                const displayScore = realScore?.score != null ? Math.round(realScore.score) : Math.round(topBuyHiddenGem.score);
                const isReal = realScore?.score != null;
                return (
                  <div className="bg-white/5 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/50 text-xs">{isReal ? 'AI Score' : 'Koopscore'}</span>
                      <span className={`text-2xl font-bold ${displayScore > 70 ? 'text-green-400' : displayScore > 50 ? 'text-yellow-400' : 'text-orange-400'}`}>{displayScore}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${displayScore > 70 ? 'bg-green-400' : displayScore > 50 ? 'bg-yellow-400' : 'bg-orange-400'}`} style={{width: `${displayScore}%`}}></div>
                    </div>
                    {isReal && realScore.verdict && <p className="text-[10px] text-white/40 mt-1 capitalize">{realScore.verdict}</p>}
                  </div>
                );
              })()}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Kwaliteit</span>
                  <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded font-semibold">
                    {Math.round(topBuyHiddenGem.sd.qualityScore)}
                  </span>
                </div>
                {topBuyHiddenGem.sd.rsi && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">RSI</span>
                    <span className={`font-semibold ${topBuyHiddenGem.sd.rsi < 30 ? 'text-green-400' : topBuyHiddenGem.sd.rsi > 70 ? 'text-red-400' : 'text-white/70'}`}>
                      {Math.round(topBuyHiddenGem.sd.rsi)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top performer */}
          {topPerformer && (
            <div
              className="glass-effect rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer border border-yellow-500/20 hover:border-yellow-500/40 h-[230px] overflow-hidden flex flex-col"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); runAIBuyCheck(topPerformer.ticker); }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-white/60 text-xs uppercase tracking-wider font-semibold">Top Performer</span>
                </div>
              </div>
              <p className="text-white font-bold text-base mb-1">{topPerformer.ticker}</p>
              {(() => {
                const sd = topPerformer.sd || {};
                const sp = stockPrices[topPerformer.ticker] || {};
                const sector = getCleanSector(sd.sector, sp.sector);
                let desc = (sp.description || sd.description || '').trim();
                if (desc && desc.includes('.')) desc = desc.split('.')[0] + (desc.endsWith('.') ? '' : '.');
                const parts = [];
                if (sector) parts.push(sector);
                if (desc) parts.push(desc);
                const line = parts.join(' • ') || topPerformer.name || topPerformer.ticker || 'Aandeel/ETF';
                return (
                  <p className="text-white/60 text-[10px] leading-snug mb-1">{line}</p>
                );
              })()}
              {(() => {
                const realScore = aiBuyScores[topPerformer.ticker];
                const displayScore = realScore?.score != null ? Math.round(realScore.score) : Math.round(topPerformer.score);
                const isReal = realScore?.score != null;
                return (
                  <div className="bg-white/5 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/50 text-xs">{isReal ? 'AI Score' : 'Koopscore'}</span>
                      <span className={`text-2xl font-bold ${displayScore > 70 ? 'text-green-400' : displayScore > 50 ? 'text-yellow-400' : 'text-orange-400'}`}>{displayScore}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${displayScore > 70 ? 'bg-green-400' : displayScore > 50 ? 'bg-yellow-400' : 'bg-orange-400'}`} style={{width: `${displayScore}%`}}></div>
                    </div>
                    {isReal && realScore.verdict && <p className="text-[10px] text-white/40 mt-1 capitalize">{realScore.verdict}</p>}
                  </div>
                );
              })()}
              <div className="space-y-2">
                {topPerformer.sd.growth6mo !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">6 maanden</span>
                    <span className={`px-2 py-1 rounded font-semibold ${topPerformer.sd.growth6mo > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {topPerformer.sd.growth6mo > 0 ? '+' : ''}{Math.round(topPerformer.sd.growth6mo)}%
                    </span>
                  </div>
                )}
                {topPerformer.sd.growth1yr !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">1 jaar</span>
                    <span className={`font-semibold ${topPerformer.sd.growth1yr > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {topPerformer.sd.growth1yr > 0 ? '+' : ''}{Math.round(topPerformer.sd.growth1yr)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top buy potentiële groeier */}
          {topBuyGrowth && (
            <div
              className="glass-effect rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer border border-cyan-500/20 hover:border-cyan-500/40 h-[230px] overflow-hidden flex flex-col"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); runAIBuyCheck(topBuyGrowth.ticker); }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <TrendingUpIcon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-white/60 text-xs uppercase tracking-wider font-semibold">Potentiële Groeier</span>
                </div>
              </div>
              <p className="text-white font-bold text-base mb-1">{topBuyGrowth.ticker}</p>
              {(() => {
                const sd = topBuyGrowth.sd || {};
                const sp = stockPrices[topBuyGrowth.ticker] || {};
                const sector = getCleanSector(sd.sector, sp.sector);
                let desc = (sp.description || sd.description || '').trim();
                if (!desc && sd.growth6mo != null) desc = `6 maanden: ${sd.growth6mo >= 0 ? '+' : ''}${Math.round(sd.growth6mo)}%`;
                if (desc.includes('.')) desc = desc.split('.')[0] + (desc.endsWith('.') ? '' : '.');
                const line = [sector, desc].filter(Boolean).join(' • ');
                return line ? (
                  <p className="text-white/60 text-[10px] leading-snug mb-1">{line}</p>
                ) : null;
              })()}
              {(() => {
                const realScore = aiBuyScores[topBuyGrowth.ticker];
                const displayScore = realScore?.score != null ? Math.round(realScore.score) : Math.round(topBuyGrowth.score);
                const isReal = realScore?.score != null;
                return (
                  <div className="bg-white/5 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/50 text-xs">{isReal ? 'AI Score' : 'Koopscore'}</span>
                      <span className={`text-2xl font-bold ${displayScore > 70 ? 'text-green-400' : displayScore > 50 ? 'text-yellow-400' : 'text-orange-400'}`}>{displayScore}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className={`h-2 rounded-full ${displayScore > 70 ? 'bg-green-400' : displayScore > 50 ? 'bg-yellow-400' : 'bg-orange-400'}`} style={{width: `${displayScore}%`}}></div>
                    </div>
                    {isReal && realScore.verdict && <p className="text-[10px] text-white/40 mt-1 capitalize">{realScore.verdict}</p>}
                  </div>
                );
              })()}
              <div className="space-y-2">
                {topBuyGrowth.sd.growth6mo !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">6 maanden</span>
                    <span className={`px-2 py-1 rounded font-semibold ${topBuyGrowth.sd.growth6mo > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {topBuyGrowth.sd.growth6mo > 0 ? '+' : ''}{Math.round(topBuyGrowth.sd.growth6mo)}%
                    </span>
                  </div>
                )}
                {topBuyGrowth.sd.adx && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Trend (ADX)</span>
                    <span className={`font-semibold ${topBuyGrowth.sd.adx > 25 ? 'text-green-400' : 'text-white/70'}`}>
                      {Math.round(topBuyGrowth.sd.adx)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fallback if no data */}
              {!topBuyOwnStock && !topBuyHiddenGem && !topPerformer && !topBuyGrowth && (
                <div className="col-span-full glass-effect rounded-xl p-6 text-center">
                  <Sparkles className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">Top Buy aanbevelingen laden...</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Compact Earnings list (xl only) */}
          <div className="hidden xl:flex flex-col">
            {(() => {
              const now = Date.now();
              const sixWeeks = 42 * 24 * 60 * 60 * 1000;
              const sevenDays = 7 * 24 * 60 * 60 * 1000;
              const ninetyDays = 90 * 24 * 60 * 60 * 1000;

              const list6w = Object.values(earningsData)
                .filter(e => e.nextEarningsDate && e.nextEarningsDate >= now - sevenDays && e.nextEarningsDate <= now + sixWeeks)
                .map(e => ({
                  ...e,
                  isOwned: investments.some(inv => inv.ticker_symbol === e.ticker),
                  isWatchlist: myWatchlist.some(w => (w.ticker || w.symbol || '').toUpperCase() === String(e.ticker).toUpperCase()),
                  daysUntil: Math.ceil((e.nextEarningsDate - now) / (24 * 60 * 60 * 1000)),
                }))
                .sort((a, b) => a.nextEarningsDate - b.nextEarningsDate);

              const list90 = Object.values(earningsData)
                .filter(e => e.nextEarningsDate && e.nextEarningsDate >= now - sevenDays && e.nextEarningsDate <= now + ninetyDays)
                .map(e => ({
                  ...e,
                  isOwned: investments.some(inv => inv.ticker_symbol === e.ticker),
                  isWatchlist: myWatchlist.some(w => (w.ticker || w.symbol || '').toUpperCase() === String(e.ticker).toUpperCase()),
                  daysUntil: Math.ceil((e.nextEarningsDate - now) / (24 * 60 * 60 * 1000)),
                }))
                .sort((a, b) => a.nextEarningsDate - b.nextEarningsDate);

              const list = list6w.length > 0 ? list6w : list90;

              const getBadgeColor = (days) => {
                if (days < 0) return 'bg-white/5 text-white/30 border-white/10';
                if (days <= 3) return 'bg-red-500/20 text-red-300 border-red-500/30';
                if (days <= 7) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
                if (days <= 14) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
              };
              const getDayLabel = (days) => {
                if (days === 0) return 'Vandaag';
                if (days === 1) return 'Morgen';
                if (days < 0) return `${Math.abs(days)}d geleden`;
                return `over ${days}d`;
              };

              return (
                <>
                  {/* Mobile earnings title only */}
                  <div className="flex items-center justify-between mb-2 xl:hidden">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold text-sm">Earnings</h3>
                        <p className="text-white/40 text-[10px]">±6 weken (incl. 1w geleden)</p>
                      </div>
                    </div>
                    <button onClick={() => { if (!loadingEarnings) fetchEarningsData(true); }} disabled={loadingEarnings} className={`text-white/40 hover:text-white/70 ${loadingEarnings ? 'opacity-50 pointer-events-none' : ''}`} title="Refresh">
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingEarnings ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="glass-effect rounded-xl p-3 border border-white/5 h-[230px] overflow-y-auto">
                    {list.length === 0 ? (
                      <p className="text-white/30 text-xs text-center py-2">Geen earnings</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(() => {
                          const upcomingList = list.filter(e => e.daysUntil >= 0);
                          const recentList = list.filter(e => e.daysUntil < 0).sort((a, b) => b.nextEarningsDate - a.nextEarningsDate);
                          const upcoming = upcomingList;
                          const recent = recentList;

                          const renderRow = (e) => {
                            const date = new Date(e.nextEarningsDate);
                            const dateStr = date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
                            const badgeCls = getBadgeColor(e.daysUntil);
                            const isUpcoming = e.daysUntil >= 0;
                            const eps = e.estimatedEPS;
                            const epsPositive = eps != null && eps > 0;
                            const epsNegative = eps != null && eps < 0;
                            const actualEPS = e.history && e.history.length > 0 ? e.history[0].epsActual : null;
                            const actualPositive = actualEPS != null && actualEPS > 0;
                            const actualNegative = actualEPS != null && actualEPS < 0;
                            return (
                              <div key={e.ticker} className="flex items-center justify-between bg-white/5 rounded-lg px-2 py-1.5 border border-white/5">
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-white font-bold text-sm">{e.ticker}</span>
                                    {e.isOwned && <span className="text-[9px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded font-semibold">Portfolio</span>}
                                    {e.isWatchlist && !e.isOwned && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded font-semibold">Watchlist</span>}
                                  </div>
                                  <p className="text-white/40 text-[10px] truncate">{dateStr}</p>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  {isUpcoming && eps != null && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                      epsPositive ? 'bg-green-500/15 text-green-400 border-green-500/30' : epsNegative ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-white/5 text-white/40 border-white/10'
                                    }`}>
                                      {epsPositive ? '▲' : epsNegative ? '▼' : '–'} EPS {eps > 0 ? '+' : ''}{eps.toFixed(2)}
                                    </span>
                                  )}
                                  {!isUpcoming && actualEPS != null && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                      actualPositive ? 'bg-green-500/15 text-green-400 border-green-500/30' : actualNegative ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-white/5 text-white/40 border-white/10'
                                    }`}>
                                      {actualPositive ? '▲' : actualNegative ? '▼' : '–'} {actualEPS > 0 ? '+' : ''}{actualEPS.toFixed(2)}
                                    </span>
                                  )}
                                  {!isUpcoming && actualEPS == null && eps != null && (
                                    <span className="text-white/30 text-[9px]">EPS {eps > 0 ? '+' : ''}{eps.toFixed(2)}</span>
                                  )}
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeCls}`}>{getDayLabel(e.daysUntil)}</span>
                                </div>
                              </div>
                            );
                          };

                          return (
                            <>
                              {upcoming.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-white/50 text-[10px] tracking-wide uppercase">Aankomend</p>
                                  {upcoming.map(renderRow)}
                                </div>
                              )}
                              {recent.length > 0 && (
                                <div className="space-y-1.5 pt-2 border-t border-white/10 mt-2">
                                  <p className="text-white/50 text-[10px] tracking-wide uppercase">Recent (1w)</p>
                                  {recent.map(renderRow)}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      )}

      {/* Search Bar + Filter Tabs */}
      {activeMainTab === 'portfolio' && (
      <>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek investeringen op naam, ticker, sector..."
              className="w-full pl-12 pr-4 py-3 input-plain rounded-lg"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => { setActiveFilter('all'); setFilterType('all'); setFilterSector('all'); setFilterProfit('all'); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'all' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
            >
              Alles
            </button>
            <button
              onClick={() => setActiveFilter('type')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'type' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
            >
              Type
            </button>
            <button
              onClick={() => setActiveFilter('sector')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'sector' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
            >
              Sector
            </button>
            <button
              onClick={() => setActiveFilter('profit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'profit' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
            >
              Winst/Verlies
            </button>
          </div>
        </div>

        {/* Filter Options */}
        {activeFilter !== 'all' && (
          <div className="mt-3">
            {activeFilter === 'type' && (
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  Alle types
                </button>
                <button
                  onClick={() => setFilterType('aandeel')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'aandeel' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  Aandelen
                </button>
                <button
                  onClick={() => setFilterType('etf')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'etf' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  ETFs
                </button>
                <button
                  onClick={() => setFilterType('crypto')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'crypto' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  Crypto
                </button>
                <button
                  onClick={() => setFilterType('obligatie')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'obligatie' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  Obligaties
                </button>
                <button
                  onClick={() => setFilterType('fonds')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === 'fonds' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  Fondsen
                </button>
              </div>
            )}

            {activeFilter === 'sector' && (
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <button
                  onClick={() => setFilterSector('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterSector === 'all' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  Alle sectoren
                </button>
                {[...new Set(investments.map(inv => inv.sector).filter(Boolean))].map(sector => (
                  <button
                    key={sector}
                    onClick={() => setFilterSector(sector)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterSector === sector ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            )}

            {activeFilter === 'profit' && (
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <button
                  onClick={() => setFilterProfit('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterProfit === 'all' ? 'bg-blue-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  Alles
                </button>
                <button
                  onClick={() => setFilterProfit('profit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterProfit === 'profit' ? 'bg-green-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  📈 Winst
                </button>
                <button
                  onClick={() => setFilterProfit('loss')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterProfit === 'loss' ? 'bg-red-500 text-white' : 'glass-effect text-white/70 hover:text-white'}`}
                >
                  📉 Verlies
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk AI refresh */}
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={refreshAllAiScores}
          disabled={loadingAllAi || (investments || []).filter(inv => inv.ticker_symbol).length === 0}
          className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors ${loadingAllAi ? 'bg-white/10 text-white/50' : 'glass-effect text-purple-300 hover:text-white hover:bg-white/10 border border-white/10'}`}
          title="Herbereken AI Koop Analyse voor al je aandelen"
        >
          {loadingAllAi ? (
            <>
              <Activity className="w-4 h-4 animate-spin" />
              <span>AI scores verversen...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Refresh alle AI scores</span>
            </>
          )}
        </button>
      </div>

      {/* Investments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredInvestments.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <TrendingUp className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/60">
              {searchTerm ? 'Geen investeringen gevonden' : 'Nog geen investeringen. Klik "Nieuwe Investering" om te beginnen.'}
            </p>
          </div>
        ) : (
          filteredInvestments.map((investment) => {
            const profitLoss = calculateProfitLoss(investment);
            const currentValue = calculateTotalValue(investment);
            const stockPrice = investment.ticker_symbol ? stockPrices[investment.ticker_symbol] : null;
            
            return (
              <div
                key={investment.id}
                className="gradient-card rounded-xl p-6 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {investment.thumbnail_url ? (
                      <img
                        src={investment.thumbnail_url}
                        alt={investment.name}
                        className={`object-cover ${investment.circular_thumbnail ? 'w-14 h-14 rounded-full border-2 border-white/20' : 'w-12 h-12'}`}
                      />
                    ) : (
                      <div className={`bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center ${investment.circular_thumbnail ? 'w-14 h-14 rounded-full border-2 border-white/20' : 'w-12 h-12'}`}>
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-semibold">{investment.name}</h3>
                      {(() => {
                        const sd = screenerData[investment.ticker_symbol] || {};
                        const sp = stockPrices[investment.ticker_symbol] || {};
                        const sector = getCleanSector(investment.sector, sd.sector, sp.sector) || '';
                        const sectorText = oneLineDesc({ ticker: investment.ticker_symbol, name: investment.name, sector, type: investment.type, sd, sp });
                        const description = getFullDescription({ ticker: investment.ticker_symbol, name: investment.name, sector, type: investment.type, sd, sp });
                        return (
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-white/50 text-xs italic">{sectorText}</p>
                            <button
                              onClick={() => setCompanyInfoModal({ ticker: investment.ticker_symbol, name: investment.name, sector: sectorText, description })}
                              className="text-blue-400 hover:text-blue-300 text-[10px] underline transition-colors"
                            >
                              Lees meer
                            </button>
                          </div>
                        );
                      })()}
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <p className="text-white/60 text-sm capitalize">{investment.type}</p>
                        {investment.is_short && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-semibold border border-red-500/30">
                            SHORT
                          </span>
                        )}
                        {investment.ticker_symbol && (
                          <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/80">
                            {investment.ticker_symbol}
                          </span>
                        )}
                        {investment.ticker_symbol && stockPrices[investment.ticker_symbol] && (() => {
                          const priceData = stockPrices[investment.ticker_symbol];
                          const marketIsOpen = isMarketOpen(priceData.currency);
                          if (marketIsOpen === null) return null;
                          return (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${marketIsOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {marketIsOpen ? 'Open' : 'Gesloten'}
                            </span>
                          );
                        })()}
                        {aiBuyScores[investment.ticker_symbol]?.score != null && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${
                            aiBuyScores[investment.ticker_symbol].verdict === 'kopen' ? 'bg-green-500/20 text-green-400' :
                            aiBuyScores[investment.ticker_symbol].verdict === 'verkopen' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/10 text-yellow-300'
                          }`}>
                            <Sparkles className="w-3 h-3" /> {Math.round(aiBuyScores[investment.ticker_symbol].score)}
                          </span>
                        )}
                        {(investment.sector || screenerData[investment.ticker_symbol]?.sector) && (
                          <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded text-blue-300">
                            {investment.sector || screenerData[investment.ticker_symbol]?.sector}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {investment.ticker_symbol && (
                      <a
                        href={(() => {
                          // Use custom link if provided
                          if (investment.yahoo_finance_link) {
                            return investment.yahoo_finance_link;
                          }

                          // Auto-convert ticker to Yahoo Finance format
                          let ticker = investment.ticker_symbol;
                          const exchangeMap = {
                            ':XETR': '.DE',
                            ':XAMS': '.AS',
                            ':XPAR': '.PA',
                            ':XLON': '.L',
                            ':XSWX': '.SW',
                            ':XBRU': '.BR',
                            ':XMIL': '.MI',
                            ':XLIS': '.LS',
                            ':XSTO': '.ST',
                            ':XCSE': '.CO',
                            ':XHEL': '.HE',
                            ':XOSL': '.OL',
                          };

                          for (const [exchange, suffix] of Object.entries(exchangeMap)) {
                            if (ticker.includes(exchange)) {
                              ticker = ticker.replace(exchange, suffix);
                              break;
                            }
                          }

                          return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300"
                        title={`Bekijk ${investment.ticker_symbol} op Yahoo Finance`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {investment.description && (
                      <button
                        onClick={() => setShowDescPopup(showDescPopup === investment.id ? null : investment.id)}
                        className="text-purple-400 hover:text-purple-300"
                        title="Beschrijving"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    )}
                    {investment.ticker_symbol && (
                      <button
                        onClick={() => {
                          setShowNewsPopup(showNewsPopup === investment.id ? null : investment.id);
                          if (!investmentNews[investment.id]) fetchInvestmentNews(investment);
                        }}
                        className="text-cyan-400 hover:text-cyan-300"
                        title="Nieuws"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(investment)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteInvestment(investment.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Live Stock Price */}
                {stockPrice && (
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60 text-sm">Live Koers {stockPrice.resolvedTicker !== investment.ticker_symbol ? `(${stockPrice.resolvedTicker})` : ''}</span>
                      {loadingPrices && <Activity className="w-4 h-4 text-blue-400 animate-pulse" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-2xl font-bold">
                        {getCurrencySymbol(stockPrice.currency)}{typeof stockPrice.current === 'number' ? stockPrice.current.toFixed(2) : '---'}
                      </span>
                      <div className={`flex items-center space-x-1 ${typeof stockPrice.change === 'number' && stockPrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {typeof stockPrice.change === 'number' && stockPrice.change >= 0 ? <TrendingUp className="w-4 h-4" /> : typeof stockPrice.change === 'number' && stockPrice.change < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                        <span className="text-sm font-semibold">
                          {typeof stockPrice.change === 'number' && typeof stockPrice.changePercent === 'number' ? (stockPrice.change >= 0 ? '+' : '') + stockPrice.change.toFixed(2) + ' (' + stockPrice.changePercent.toFixed(2) + '%)' : '---'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Technical Indicators (RSI, MA, Vol) */}
                {(() => {
                  const sd = screenerData[investment.ticker_symbol];
                  if (!sd || !sd.rsi) return null;
                  return (
                    <div className="mb-3 pb-3 border-b border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <button
                          onClick={() => setShowTechLegend(true)}
                          className="text-white/40 text-[10px] hover:text-white/70 transition-colors flex items-center space-x-1"
                        >
                          <span>Technische Indicatoren</span>
                          <span className="text-[8px]">ℹ️</span>
                        </button>
                        {sd.signal && sd.signal.overall && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            sd.signal.overall === 'STRONG BUY' ? 'bg-green-500/20 text-green-400' :
                            sd.signal.overall === 'BUY' ? 'bg-green-500/10 text-green-300' :
                            sd.signal.overall === 'STRONG SELL' ? 'bg-red-500/20 text-red-400' :
                            sd.signal.overall === 'SELL' ? 'bg-red-500/10 text-red-300' :
                            'bg-yellow-500/10 text-yellow-300'
                          }`}>
                            {sd.signal.overall}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <div className={`text-[10px] px-2 py-0.5 rounded ${
                          typeof sd.rsi === 'number' && sd.rsi < 30 ? 'bg-green-500/20 text-green-400' :
                          typeof sd.rsi === 'number' && sd.rsi > 70 ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/10 text-blue-300'
                        }`}>
                          RSI: {typeof sd.rsi === 'number' ? sd.rsi.toFixed(0) : '---'}
                        </div>
                        {sd.macd && sd.macd.trend && (
                          <div className={`text-[10px] px-2 py-0.5 rounded ${sd.macd.trend === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            MACD: {sd.macd.trend === 'bullish' ? '↑' : '↓'}
                          </div>
                        )}
                        {sd.sma50 && sd.sma200 && (
                          <div className={`text-[10px] px-2 py-0.5 rounded ${
                            sd.currentPrice > sd.sma50 && sd.sma50 > sd.sma200 ? 'bg-green-500/20 text-green-400' :
                            sd.currentPrice < sd.sma50 && sd.sma50 < sd.sma200 ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/10 text-yellow-300'
                          }`}>
                            MA: {sd.currentPrice > sd.sma50 ? 'Boven 50d' : 'Onder 50d'}
                          </div>
                        )}
                        {sd.volume && sd.avgVolume && (
                          <div className={`text-[10px] px-2 py-0.5 rounded ${
                            sd.volume > sd.avgVolume * 1.5 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/40'
                          }`}>
                            Vol: {sd.volume > sd.avgVolume * 1.5 ? 'Hoog' : 'Normaal'}
                          </div>
                        )}
                        {typeof sd.peRatio === 'number' && (
                          <div className={`text-[10px] px-2 py-0.5 rounded ${
                            sd.peRatio < 15 ? 'bg-green-500/20 text-green-400' :
                            sd.peRatio > 30 ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/10 text-yellow-300'
                          }`}>
                            P/E: {sd.peRatio.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const ed = earningsData[investment.ticker_symbol];
                  const label = ed && ed.nextEarningsDate ? earningsCalendar.formatEarningsDate(ed.nextEarningsDate) : (loadingEarnings ? 'Laden...' : 'Onbekend');
                  return (
                    <div className="mb-3 pb-3 border-b border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-[10px]">Earnings</span>
                        <span className="text-[10px] text-white font-semibold">{label}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Analyst Meter (Analyst + Momentum) - or ETF Holdings */}
                <AnalystMeter
                  recommendation={investment.ticker_symbol ? (screenerData[investment.ticker_symbol]?.recommendation || analystData[investment.ticker_symbol]) : null}
                  growthData={stockPrice?.growthData || screenerData[investment.ticker_symbol] || null}
                  targetPrice={screenerData[investment.ticker_symbol]?.targetPrice || analystData[investment.ticker_symbol]?.targetPrice}
                  currentPrice={stockPrice?.current || screenerData[investment.ticker_symbol]?.currentPrice}
                  ticker={investment.ticker_symbol}
                  isETF={investment.type === 'etf'}
                  hideAIButton={true}
                />

                

                {/* Investment Details */}
                <div className="space-y-2 mb-4">
                  {investment.investment_batches && investment.investment_batches.length >= 1 ? (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white/40 text-[10px]">Aankopen ({investment.investment_batches.length})</span>
                        <span className="text-white/40 text-[10px]">{typeof investment.shares === 'number' ? investment.shares.toFixed(4) : '---'} aandelen totaal</span>
                      </div>
                      {investment.investment_batches
                        .slice()
                        .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date))
                        .map((batch, bi) => (
                          <div
                            key={batch.id || bi}
                            className="flex justify-between items-center text-[11px] py-1 border-b border-white/5 last:border-0"
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center space-x-2">
                                <span className="text-white/30 w-4">{bi + 1}</span>
                                <span className="text-white/50">
                                  {batch.purchase_date
                                    ? new Date(batch.purchase_date).toLocaleDateString('nl-NL', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: '2-digit'
                                      })
                                    : '---'}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end text-right">
                              <div className="flex items-center space-x-1">
                                <span className="text-white/70">
                                  {(() => {
                                    const s = parseFloat(batch.shares);
                                    return !isNaN(s)
                                      ? s.toLocaleString('nl-NL', { maximumFractionDigits: 4 })
                                      : batch.shares;
                                  })()}{' '}
                                  aandelen
                                </span>
                                <span className="text-white/40">×</span>
                                {(() => {
                                  const cur = batch.purchase_currency || investment.purchase_currency || inferCurrencyFromTicker(investment.ticker_symbol) || 'EUR';
                                  const sym = getCurrencySymbol(cur);
                                  const unitInCur = parseFloat(batch.purchase_price) || 0;
                                  const unitEUR = convertToEUR(unitInCur, cur) || 0;
                                  return (
                                    <span className="text-white/80">
                                      {sym}{unitInCur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      {' '}
                                      <span className="text-white/40 text-[10px]">(€{unitEUR.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                    </span>
                                  );
                                })()}
                                <span className="text-white/40">=</span>
                                <span className="text-green-400 font-semibold">
                                  €
                                  {(() => {
                                    const batchCurrency = batch.purchase_currency || investment.purchase_currency || 
                                                         stockPrices[investment.ticker_symbol]?.currency || 
                                                         inferCurrencyFromTicker(investment.ticker_symbol) || 
                                                         'EUR';
                                    const amount =
                                      typeof batch.amount === 'number'
                                        ? batch.amount
                                        : (parseFloat(batch.shares || 0) || 0) *
                                          (parseFloat(batch.purchase_price || 0) || 0);
                                    const amountInEUR = convertToEUR(amount, batchCurrency);
                                    return amountInEUR.toLocaleString('nl-NL', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    });
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      <div className="flex justify-between text-xs pt-1.5 mt-0.5">
                        <span className="text-white/50 font-medium">Gem. aankoopprijs</span>
                        <span className="text-white font-bold">
                          {(() => {
                            const cur = investment.purchase_currency || 'EUR';
                            const sym = getCurrencySymbol(cur);
                            const totalShares = (investment.investment_batches || []).reduce((s, b) => s + (parseFloat(b.shares) || 0), 0);
                            const totalAmtEUR = (investment.investment_batches || []).reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
                            const avgEUR = totalShares > 0 ? totalAmtEUR / totalShares : 0;
                            const avgInCur = convertFromEUR(avgEUR, cur) || 0;
                            return sym + (avgInCur % 1 === 0 ? avgInCur : avgInCur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                          })()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {investment.shares && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Aandelen</span>
                          <span className="text-white">{typeof investment.shares === 'number' && investment.shares % 1 === 0 ? investment.shares : typeof investment.shares === 'number' ? investment.shares.toFixed(4) : '---'}</span>
                        </div>
                      )}
                      {investment.purchase_price && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Aankoopprijs</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white">{(() => {
                              const cur = investment.purchase_currency || 'EUR';
                              const sym = getCurrencySymbol(cur);
                              const pp = parseFloat(investment.purchase_price);
                              if (isNaN(pp)) return '---';
                              const shown = pp % 1 === 0 ? pp : parseFloat(pp.toFixed(2));
                              return sym + (shown % 1 === 0 ? shown : shown.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            })()}</span>
                            {!investment.purchase_currency && (
                              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded" title="Valuta niet ingesteld - we nemen EUR aan">
                                EUR?
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {investment.shares && investment.purchase_price && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Bedrag (berekend)</span>
                          <span className="text-white">{(() => {
                            const cur = investment.purchase_currency || 'EUR';
                            const sym = getCurrencySymbol(cur);
                            const shares = parseFloat(investment.shares) || 0;
                            const price  = parseFloat(investment.purchase_price) || 0;
                            const amount = shares * price;
                            return sym + (amount % 1 === 0 ? amount : amount.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                          })()}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className={`flex justify-between text-sm p-2 rounded-lg ${stockPrice && investment.shares && investment.purchase_price ? (profitLoss.amount >= 0 ? 'bg-green-500/10' : 'bg-red-500/10') : 'bg-white/5'}`}>
                    <span className="text-white/60 font-medium">Huidige Waarde</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-bold">
                        {(() => {
                          const cur = investment.purchase_currency || 'EUR';
                          const sym = getCurrencySymbol(cur);
                          const valInCur = convertFromEUR(currentValue || 0, cur) || 0;
                          return sym + (valInCur % 1 === 0 ? valInCur : valInCur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                        })()}
                      </span>
                      {stockPrice && investment.shares && investment.purchase_price && (
                        <span className={`text-xs font-semibold ${profitLoss.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {typeof profitLoss.percentage === 'number' ? (profitLoss.amount >= 0 ? '+' : '') + profitLoss.percentage.toFixed(2) + '%' : '---'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Currency Warning */}
                {!investment.purchase_currency && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-orange-300 text-xs font-semibold mb-1">Valuta niet ingesteld</p>
                        <p className="text-orange-200/70 text-[10px] leading-relaxed">
                          De aankoopvaluta ontbreekt. We rekenen momenteel in <strong>EUR</strong> om misrekeningen te voorkomen. 
                          Bewerk deze investering en stel de juiste valuta in voor nauwkeurige winst/verlies berekeningen.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profit/Loss */}
                {stockPrice && investment.shares && investment.purchase_price && (
                  profitLoss.error ? (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 text-sm">Winst/Verlies (live)</span>
                        <span className="text-yellow-400 text-xs">Geen koersdata beschikbaar</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-lg ${typeof profitLoss.amount === 'number' && profitLoss.amount >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-white/60 text-sm">Winst/Verlies (live)</span>
                        <div className={`flex items-center space-x-1 ${typeof profitLoss.amount === 'number' && profitLoss.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {typeof profitLoss.amount === 'number' && profitLoss.amount >= 0 ? <TrendingUp className="w-4 h-4" /> : typeof profitLoss.amount === 'number' && profitLoss.amount < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                          <span className="font-semibold">
                            {typeof profitLoss.amount === 'number' && typeof profitLoss.percentage === 'number' ? (profitLoss.amount >= 0 ? '+' : '') + '€' + Math.abs(profitLoss.amount).toFixed(2) + ' (' + profitLoss.percentage.toFixed(2) + '%)' : '---'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* Links */}
                {investment.links && investment.links.length > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-white/60 text-xs mb-2">Links</p>
                    <div className="space-y-1">
                      {investment.links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate">{link.label}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {/* AI Koop Analyse Button */}
                {investment.ticker_symbol && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); runAIBuyCheck(investment.ticker_symbol); }}
                    disabled={loadingAiBuy[investment.ticker_symbol]}
                    className={`w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 text-purple-300 text-xs font-medium px-3 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all mt-4 ${
                      aiBuyScores[investment.ticker_symbol]?.verdict === 'kopen' ? 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400' :
                      aiBuyScores[investment.ticker_symbol]?.verdict === 'verkopen' ? 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400' : ''
                    }`}
                    title="AI Koop Analyse"
                  >
                    {loadingAiBuy[investment.ticker_symbol] ? (
                      <>
                        <Activity className="w-4 h-4 animate-pulse" />
                        <span>Laden...</span>
                      </>
                    ) : aiBuyScores[investment.ticker_symbol]?.score != null ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI Koop Analyse: {Math.round(aiBuyScores[investment.ticker_symbol].score)}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI Koop Analyse</span>
                      </>
                    )}
                  </button>
                )}
                
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {/* Description Popup Modal */}
      {showDescPopup && (() => {
        const inv = investments.find(i => i.id === showDescPopup);
        if (!inv || !inv.description) return null;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowDescPopup(null)}>
            <div className="gradient-card rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Info className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-semibold">{inv.name}</h3>
                </div>
                <button onClick={() => setShowDescPopup(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{inv.description}</p>
            </div>
          </div>
        );
      })()}

      {/* News Popup Modal */}
      {showNewsPopup && (() => {
        const inv = investments.find(i => i.id === showNewsPopup);
        if (!inv) return null;
        const news = investmentNews[inv.id] || [];
        const loading = loadingInvNews[inv.id];
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNewsPopup(null)}>
            <div className="gradient-card rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-white font-semibold">Nieuws — {inv.name}</h3>
                </div>
                <button onClick={() => setShowNewsPopup(null)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              {loading && (
                <div className="flex items-center space-x-2 py-4 justify-center">
                  <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="text-white/50 text-sm">Nieuws laden...</span>
                </div>
              )}
              {news.length > 0 && (
                <>
                  {/* AI News Summary - Auto-generated */}
                  {loadingNewsSummary[inv.id] ? (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
                        <span className="text-purple-300 text-xs">AI analyseert nieuws...</span>
                      </div>
                    </div>
                  ) : null}

                  {newsSummary[inv.id] && (() => {
                    let parsed = null;
                    try {
                      const raw = newsSummary[inv.id].trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
                      parsed = JSON.parse(raw);
                    } catch (e) { /* not JSON, render plain */ }

                    const sentimentConfig = {
                      bullish:  { label: 'Bullish',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400', accent: 'border-l-emerald-400' },
                      bearish:  { label: 'Bearish',  color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20',     dot: 'bg-red-400',     accent: 'border-l-red-400' },
                      neutraal: { label: 'Neutraal', color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   dot: 'bg-amber-400',   accent: 'border-l-amber-400' },
                    };

                    if (parsed && parsed.items) {
                      const overall = sentimentConfig[parsed.sentiment] || sentimentConfig.neutraal;
                      return (
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-3 space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">🤖</span>
                              <span className="text-white font-semibold text-sm">AI Nieuws Analyse</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <div className={`w-2 h-2 rounded-full ${overall.dot}`} />
                              <span className={`text-[10px] font-medium ${overall.color}`}>{overall.label}</span>
                            </div>
                          </div>
                          {parsed.intro && <p className="text-white/70 text-xs leading-relaxed">{parsed.intro}</p>}

                          {/* Items */}
                          <div className="space-y-2">
                            {parsed.items.map((item, idx) => {
                              const s = sentimentConfig[item.sentiment] || sentimentConfig.neutraal;
                              return (
                                <div key={idx}>
                                  <div className="border-l-2 pl-2 border-l-white/10 hover:border-l-white/20 transition-colors">
                                    <div className="flex items-start justify-between gap-2 mb-0.5">
                                      <div className="flex items-center space-x-1.5">
                                        <span className={`text-[10px] font-bold ${s.color} opacity-60`}>{idx + 1}.</span>
                                        <span className="text-white font-medium text-xs">{item.title}</span>
                                      </div>
                                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                                    </div>
                                    <p className="text-white/60 text-[11px] leading-relaxed ml-3">{item.body}</p>
                                    {item.link && (
                                      <a
                                        href={item.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-1 ml-3 mt-1 text-[9px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
                                      >
                                        <ExternalLink className="w-2 h-2" />
                                        <span>Bekijk origineel</span>
                                      </a>
                                    )}
                                  </div>
                                  {idx < parsed.items.length - 1 && <hr className="border-white/5 my-2" />}
                                </div>
                              );
                            })}
                          </div>

                          {/* Conclusie */}
                          {parsed.conclusie && (
                            <p className="text-white/50 text-[11px] leading-relaxed border-t border-white/10 pt-2">
                              <span className="text-white/30 font-semibold uppercase text-[9px] mr-1">Conclusie</span>
                              {parsed.conclusie}
                            </p>
                          )}
                        </div>
                      );
                    }

                    // Fallback: plain text render
                    return (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-3">
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">🤖</span>
                          <div className="text-xs text-white/80 leading-relaxed space-y-1 flex-1">
                            {newsSummary[inv.id].split('\n').map((line, idx) => {
                              const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
                              if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                                return <div key={idx} className="flex items-start space-x-1" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                              }
                              if (line.trim().startsWith('Conclusie:')) {
                                return <div key={idx} className="font-semibold text-white mt-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                              }
                              return line.trim() ? <div key={idx} dangerouslySetInnerHTML={{ __html: formattedLine }} /> : <div key={idx} className="h-0.5" />;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-3">
                    {news.map((n, i) => {
                      const isYahoo = n.publisher?.toLowerCase().includes('yahoo') || n.link?.includes('yahoo');
                      const isBeursduivel = n.publisher?.toLowerCase().includes('beursduivel') || n.link?.includes('beursduivel');
                      return (
                        <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="block hover:bg-white/5 rounded-lg p-3 -mx-1 transition-colors border border-white/5">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-white text-sm font-medium hover:text-cyan-300 leading-snug flex-1">{n.title}</p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {inv.ticker_symbol && <span className="text-[10px] bg-cyan-400/10 text-cyan-400 px-1.5 py-0.5 rounded font-mono">{inv.ticker_symbol}</span>}
                              {isYahoo && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-medium">Yahoo</span>}
                              {isBeursduivel && <span className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-medium">Beursduivel</span>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 mt-1.5">
                            <span className="text-white/40 text-xs">{n.publisher}</span>
                            {n.source && <span className="text-[10px] text-cyan-400/60 bg-cyan-400/10 px-1.5 py-0.5 rounded">{n.source}</span>}
                            {n.publishedAt && <span className="text-white/30 text-xs">{n.publishedAt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>}
                            <ExternalLink className="w-3 h-3 text-white/20" />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </>
              )}
              {!loading && news.length === 0 && (
                <p className="text-white/40 text-sm text-center py-4">Geen nieuws gevonden voor {inv.name}</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Apple-style Stock Widgets - Eigen aandelen koersen */}

      {/* News Widget - Moved to Vandaag tab */}
      {activeMainTab === 'vandaag' && userTickers.length > 0 && (
        <div className="gradient-card rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white text-xl font-semibold flex items-center space-x-2">
                <Newspaper className="w-5 h-5" />
                <span>Nieuws</span>
                {stockNews.length > 0 && <span className="text-xs bg-blue-500/10 text-blue-400/70 px-2 py-0.5 rounded-full font-normal">{stockNews.length}</span>}
              </h2>
              <p className="text-white/60 text-sm">Laatste nieuws over jouw portfolio en macro-economie</p>
            </div>
            <button
              onClick={fetchStockNews}
              disabled={loadingNews}
              className="glass-effect px-3 py-1.5 rounded-lg text-xs text-white flex items-center space-x-1 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loadingNews ? 'animate-spin' : ''}`} />
              <span>{loadingNews ? 'Laden...' : 'Vernieuwen'}</span>
            </button>
          </div>

          {loadingNews && stockNews.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-6 h-6 text-blue-400 animate-pulse mx-auto mb-2" />
              <p className="text-white/50 text-sm">Nieuws ophalen...</p>
            </div>
          )}

          {stockNews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stockNews.map((article, idx) => (
                <a
                  key={idx}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-effect rounded-lg p-3 hover:bg-white/10 transition-all group block"
                >
                  <div className="flex items-start space-x-3">
                    {article.thumbnail && (
                      <img src={article.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-300 transition-colors">{article.title}</h4>
                      <div className="flex items-center space-x-2 mt-1.5">
                        {article.relatedTicker && (
                          <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">{article.relatedTicker}</span>
                        )}
                        <span className="text-white/40 text-xs">{article.publisher}</span>
                      </div>
                      {article.publishedAt && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Clock className="w-3 h-3 text-white/30" />
                          <span className="text-white/30 text-xs">{timeAgo(article.publishedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Dutch Financial News from Beursduivel.be */}
          {dutchMacroNews.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="w-4 h-4 text-orange-400" />
                <h3 className="text-white font-semibold text-sm">Beursduivel</h3>
                <span className="text-[10px] bg-orange-400/10 text-orange-400/70 px-1.5 py-0.5 rounded-full">{dutchMacroNews.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {dutchMacroNews.slice(0, 9).map((article, idx) => {
                  const title = article.title || '';
                  const link = article.link || '';
                  const explicit = extractTicker(title, link);
                  const titleLower = title.toLowerCase();
                  const fromInvestments = (investments || [])
                    .filter(inv => inv && (titleLower.includes(String(inv.name || '').toLowerCase()) || title.includes(inv.ticker_symbol || '')))
                    .map(inv => inv.ticker_symbol)
                    .filter(Boolean);
                  const tickers = Array.from(new Set([explicit, ...fromInvestments].filter(Boolean))).slice(0,3);
                  return (
                    <div key={idx} className="glass-effect rounded-lg p-2.5 hover:bg-white/10 transition-all group">
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0"
                        >
                          <h4 className="text-white text-xs font-medium line-clamp-2 group-hover:text-orange-300 transition-colors">{article.title}</h4>
                        </a>
                        {tickers.length > 0 && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {tickers.map(t => (
                              <a
                                key={t}
                                href={getYahooUrl(t)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] bg-cyan-400/10 text-cyan-400 px-1.5 py-0.5 rounded font-mono hover:bg-cyan-400/20"
                                title={`Open ${t} op Yahoo Finance`}
                              >
                                {t}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] text-orange-400/60 bg-orange-400/10 px-1.5 py-0.5 rounded">{article.source}</span>
                        {article.publishedAt && (
                          <span className="text-white/30 text-[10px]">{timeAgo(article.publishedAt)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* AI Macro News Summary */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest mb-2">Globaal nieuws</p>
                <button
                  onClick={async () => {
                    if (macroNewsSummary) {
                      setMacroNewsSummary(null);
                      return;
                    }
                    setLoadingMacroSummary(true);
                    try {
                      const allNews = [...stockNews, ...dutchMacroNews];
                      const newsArticles = allNews.slice(0, 15).map(n => ({ title: n.title, link: n.link }));
                      
                      const userKey = typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') : null;
                      const response = await axios.post('/api/ai-explain', {
                        type: 'macro_news',
                        ticker: 'MARKET',
                        data: newsArticles
                      }, userKey ? { headers: { 'x-openai-key': userKey } } : undefined);
                      
                      setMacroNewsSummary(response.data.explanation);
                    } catch (error) {
                      console.error('AI macro summary error:', error);
                      const errorMsg = error.response?.data?.error || error.message || 'Onbekende fout';
                      setMacroNewsSummary(`❌ Fout: ${errorMsg}\n\nControleer je OpenAI API key in instellingen (⚙️ icoon rechtsboven).`);
                    } finally {
                      setLoadingMacroSummary(false);
                    }
                  }}
                  disabled={loadingMacroSummary || (stockNews.length === 0 && dutchMacroNews.length === 0)}
                  className="w-full glass-effect px-4 py-3 rounded-lg text-sm font-medium text-white flex items-center justify-center space-x-2 hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {loadingMacroSummary
                    ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    : <Sparkles className="w-4 h-4" />
                  }
                  <span>{macroNewsSummary ? '✕ Verberg Samenvatting' : (loadingMacroSummary ? 'AI analyseert nieuws...' : 'AI Macro Nieuws Samenvatting')}</span>
                </button>
                
                {loadingMacroSummary && (
                  <div className="mt-3 glass-effect rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-white/10 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  </div>
                )}
                {macroNewsSummary && (() => {
                  // Parse JSON from AI, fallback to plain text render
                  let parsed = null;
                  try {
                    const raw = macroNewsSummary.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
                    parsed = JSON.parse(raw);
                  } catch (e) { /* not JSON, render plain */ }

                  const sentimentConfig = {
                    bullish:  { label: 'Bullish',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400', accent: 'border-l-emerald-400' },
                    bearish:  { label: 'Bearish',  color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20',     dot: 'bg-red-400',     accent: 'border-l-red-400' },
                    neutraal: { label: 'Neutraal', color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   dot: 'bg-amber-400',   accent: 'border-l-amber-400' },
                  };

                  if (parsed && parsed.items) {
                    const overall = sentimentConfig[parsed.sentiment] || sentimentConfig.neutraal;
                    return (
                      <div className="mt-3 space-y-3">
                        {/* Header card */}
                        <div className={`rounded-xl p-4 border ${overall.bg} ${overall.border}`}>
                          <div className="flex items-center justify-between mb-2">
                            <Sparkles className={`w-4 h-4 ${overall.color} flex-shrink-0`} />
                            <div className="flex items-center space-x-1.5">
                              <div className={`w-2 h-2 rounded-full ${overall.dot}`} />
                              <span className={`text-xs font-medium ${overall.color}`}>{overall.label}</span>
                            </div>
                          </div>
                          <p className="text-white/80 text-sm leading-relaxed">{parsed.intro}</p>
                        </div>

                        {/* All bullets in single card */}
                        <div className="glass-effect rounded-xl p-4 border border-white/10 space-y-3">
                          {parsed.items.map((item, idx) => {
                            const s = sentimentConfig[item.sentiment] || sentimentConfig.neutraal;
                            return (
                              <div key={idx}>
                                <div className="border-l-2 pl-3 border-l-white/10 hover:border-l-white/20 transition-colors">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-xs font-bold ${s.color} opacity-60`}>{idx + 1}.</span>
                                      <h5 className="text-white font-semibold text-sm leading-tight">{item.title}</h5>
                                    </div>
                                    <div className="flex items-center flex-wrap gap-1 flex-shrink-0">
                                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                                      {item.tickers && item.tickers.slice(0, 3).map(t => (
                                        <a
                                          key={t}
                                          href={`https://finance.yahoo.com/quote/${t}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] bg-cyan-400/10 text-cyan-400 px-1.5 py-0.5 rounded font-mono hover:bg-cyan-400/20 cursor-pointer"
                                        >
                                          {t}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-white/70 text-xs leading-relaxed ml-4">{item.body}</p>
                                  {item.link && (
                                    <a
                                      href={item.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center space-x-1 ml-4 mt-1.5 text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                      <span>Bekijk origineel artikel</span>
                                    </a>
                                  )}
                                </div>
                                {idx < parsed.items.length - 1 && <hr className="border-white/5 my-3" />}
                              </div>
                            );
                          })}
                        </div>

                        {/* Conclusie */}
                        {parsed.conclusie && (
                          <div className="glass-effect rounded-xl p-3 border border-white/10">
                            <p className="text-white/60 text-xs leading-relaxed">
                              <span className="text-white/40 font-semibold uppercase tracking-wide text-[10px] mr-1.5">Conclusie</span>
                              {parsed.conclusie}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Fallback: plain text render
                  return (
                    <div className="mt-3 glass-effect rounded-lg p-4">
                      <div className="flex items-start space-x-2 mb-3">
                        <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <h4 className="text-white font-semibold text-sm">AI Macro Samenvatting</h4>
                      </div>
                      <div className="text-white/80 text-sm leading-relaxed space-y-2">
                        {macroNewsSummary.split('\n').map((line, idx) => {
                          const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
                          if (/^\d+\./.test(line.trim())) return <div key={idx} className="ml-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                          if (line.trim().startsWith('•') || line.trim().startsWith('-')) return <div key={idx} className="ml-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                          if (line.trim().endsWith(':')) return <div key={idx} className="font-semibold text-white mt-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                          return line.trim() ? <div key={idx} dangerouslySetInnerHTML={{ __html: formattedLine }} /> : <div key={idx} className="h-1" />;
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Portfolio (Mijn Aandelen) nieuws samenvatting */}
                {(loadingPortfolioSummary || portfolioNewsSummary) && (
                  <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest mt-6 mb-2">Mijn portfolio</p>
                )}
                {loadingPortfolioSummary && (
                  <div className="glass-effect rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-white/10 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  </div>
                )}
                {portfolioNewsSummary && (() => {
                  let parsed = null;
                  try {
                    const raw = portfolioNewsSummary.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
                    parsed = JSON.parse(raw);
                  } catch (e) { /* ignore */ }

                  const sentimentConfig = {
                    bullish:  { label: 'Bullish',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400' },
                    bearish:  { label: 'Bearish',  color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20',     dot: 'bg-red-400' },
                    neutraal: { label: 'Neutraal', color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   dot: 'bg-amber-400' },
                  };

                  if (!parsed || !parsed.items) return null;
                  const overall = sentimentConfig[parsed.sentiment] || sentimentConfig.neutraal;
                  return (
                    <div className="space-y-3">
                      <div className={`rounded-xl p-4 border ${overall.bg} ${overall.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <Sparkles className={`w-4 h-4 ${overall.color} flex-shrink-0`} />
                          <div className="flex items-center space-x-1.5">
                            <div className={`w-2 h-2 rounded-full ${overall.dot}`} />
                            <span className={`text-xs font-medium ${overall.color}`}>{overall.label}</span>
                          </div>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">{parsed.intro}</p>
                      </div>
                      <div className="glass-effect rounded-xl p-4 border border-white/10">
                        {parsed.items.slice(0, 5).map((item, idx) => {
                          const s = sentimentConfig[item.sentiment] || sentimentConfig.neutraal;
                          return (
                            <div key={idx}>
                              <div className="border-l-2 pl-3 border-l-white/10 hover:border-l-white/20 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-xs font-bold ${s.color} opacity-60`}>{idx + 1}.</span>
                                    <h5 className="text-white font-semibold text-sm leading-tight">{item.title}</h5>
                                  </div>
                                  <div className="flex items-center flex-wrap gap-1 flex-shrink-0">
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                                    {item.tickers && item.tickers.slice(0, 3).map(t => (
                                      <a key={t} href={`https://finance.yahoo.com/quote/${t}`} target="_blank" rel="noopener noreferrer"
                                        className="text-[10px] bg-cyan-400/10 text-cyan-400 px-1.5 py-0.5 rounded font-mono hover:bg-cyan-400/20">{t}</a>
                                    ))}
                                  </div>
                                </div>
                                <p className="text-white/70 text-xs leading-relaxed ml-4">{item.body}</p>
                                {item.link && (
                                  <a href={item.link} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center space-x-1 ml-4 mt-1.5 text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors">
                                    <ExternalLink className="w-2.5 h-2.5" /><span>Bekijk origineel artikel</span>
                                  </a>
                                )}
                              </div>
                              {idx < parsed.items.length - 1 && <hr className="border-white/5 my-3" />}
                            </div>
                          );
                        })}
                      </div>
                      {parsed.conclusie && (
                        <div className="glass-effect rounded-xl p-3 border border-white/10">
                          <p className="text-white/50 text-[11px] leading-relaxed">
                            <span className="text-white/30 font-semibold uppercase tracking-wide text-[9px] mr-1.5">Conclusie</span>
                            {parsed.conclusie}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {!loadingNews && stockNews.length === 0 && (
            <div className="text-center py-6">
              <Newspaper className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">Geen nieuws gevonden</p>
              <button onClick={fetchStockNews} className="text-blue-400 text-xs mt-1 hover:text-blue-300">Probeer opnieuw</button>
            </div>
          )}
        </div>
      )}

      {/* Hidden Gems + Watchlist Combined Widget */}
      {activeMainTab === 'onderzoek' && (
      <>
      <div className="gradient-card rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white text-xl font-semibold flex items-center space-x-2">
              <span>{gemsWatchlistTab === 'gems' ? '💎' : '👁️'}</span>
              <span>{gemsWatchlistTab === 'gems' ? 'Hidden Gems Screener' : 'Mijn Watchlist'}</span>
            </h2>
            <p className="text-white/60 text-sm">{gemsWatchlistTab === 'gems' ? 'Ontdek groeibedrijven met potentieel' : `${myWatchlist.length} aandelen in de gaten gehouden`}</p>
          </div>
          <button
            onClick={async () => {
              setLoadingAllAi(true);
              const tickers = gemsWatchlistTab === 'gems' 
                ? gemWatchlist.map(g => g.ticker).filter(Boolean)
                : myWatchlist.map(w => w.ticker).filter(Boolean);
              const batchSize = 3;
              for (let i = 0; i < tickers.length; i += batchSize) {
                const batch = tickers.slice(i, i + batchSize);
                await Promise.all(batch.map(t => fetchAIBuyScore(t)));
                if (i + batchSize < tickers.length) await new Promise(r => setTimeout(r, 500));
              }
              setLoadingAllAi(false);
            }}
            disabled={loadingAllAi || (gemsWatchlistTab === 'gems' ? gemWatchlist.length === 0 : myWatchlist.length === 0)}
            className="glass-effect px-4 py-2 rounded-lg text-sm text-white flex items-center space-x-2 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <Bot className={`w-4 h-4 ${loadingAllAi ? 'animate-spin' : ''}`} />
            <span>{loadingAllAi ? 'Bezig...' : 'Refresh alle AI scores'}</span>
          </button>
        </div>

        {/* Gems / Watchlist Tabs */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => setGemsWatchlistTab('gems')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${gemsWatchlistTab === 'gems' ? 'bg-purple-500 text-white' : 'glass-effect text-white/60 hover:text-white'}`}
          >
            💎 Hidden Gems
          </button>
          <button
            onClick={() => setGemsWatchlistTab('watchlist')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${gemsWatchlistTab === 'watchlist' ? 'bg-yellow-500 text-white' : 'glass-effect text-white/60 hover:text-white'}`}
          >
            👁️ Watchlist ({myWatchlist.length})
          </button>
        </div>

        {gemsWatchlistTab === 'gems' && (
        <>
        {/* Gem Section Tabs: Scanner / Top Picks / Knallers */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => setGemScreenerTab('screener')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${gemScreenerTab === 'screener' ? 'bg-blue-500 text-white' : 'glass-effect text-white/60 hover:text-white'}`}
          >
            🔍 Scanner
          </button>
          <button
            onClick={() => setGemScreenerTab('topPicks')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${gemScreenerTab === 'topPicks' ? 'bg-purple-500 text-white' : 'glass-effect text-white/60 hover:text-white'}`}
          >
            💎 Top Picks
          </button>
          <button
            onClick={() => setGemScreenerTab('knallers')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${gemScreenerTab === 'knallers' ? 'bg-orange-500 text-white' : 'glass-effect text-white/60 hover:text-white'}`}
          >
            🚀 Knallers
          </button>
        </div>

        {/* Category Screener */}
        {gemScreenerTab === 'screener' && (
        <div>
            {/* Category tabs */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {Object.entries(SCREENER_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setScreenerCategory(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${screenerCategory === key ? 'bg-blue-500 text-white' : 'glass-effect text-white/60 hover:text-white'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                {compareList.length > 0 && (
                  <button
                    onClick={() => setShowCompareModal(true)}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Vergelijk ({compareList.length})</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setCompareMode(!compareMode);
                    if (compareMode) setCompareList([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    compareMode 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'glass-effect text-white/60 hover:text-white'
                  }`}
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>{compareMode ? 'Stop Compare' : 'Compare Mode'}</span>
                </button>
                {loadingDynamicTickers && <span className="text-[10px] text-white/30 flex items-center gap-1"><Activity className="w-3 h-3 animate-pulse" />Live ophalen...</span>}
                {!loadingDynamicTickers && dynamicScreenerTickers[screenerCategory]?.length > 0 && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Live</span>
                )}
                {loadingScreenerData && <Activity className="w-4 h-4 text-blue-400 animate-pulse" />}
              </div>
            </div>
            <p className="text-white/40 text-xs mb-3">{SCREENER_CATEGORIES[screenerCategory].description} • {dynamicScreenerTickers[screenerCategory]?.length > 0 ? `${dynamicScreenerTickers[screenerCategory].length} live aandelen via Yahoo Finance screener` : 'Breed overzicht van interessante aandelen/ETFs'}</p>
            
            {/* Unified Sort & Filters Widget */}
            <div className="glass-effect rounded-xl p-4 mb-4">
              {/* Strictness Slider - Prominent */}
              <div className="mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-white" />
                    <span className="text-white font-medium text-sm">Kwaliteitsdrempel</span>
                    <div className="group relative">
                      <Info className="w-3.5 h-3.5 text-white/40 hover:text-white/70 cursor-help" />
                      <div className="absolute left-0 top-full mt-1 w-64 bg-gray-900 border border-white/20 rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
                        <div className="text-[10px] text-white/70 space-y-1">
                          <p className="font-bold text-white/90 mb-1">Hoe werkt dit?</p>
                          <p>Elke stock krijgt een score (0-100) op basis van:</p>
                          <ul className="list-disc list-inside space-y-0.5 ml-1">
                            <li>Technische signalen (20%)</li>
                            <li>Kwaliteitsscore (25%)</li>
                            <li>Momentum/groei (25%)</li>
                            <li>Analisten consensus (15%)</li>
                            <li>Positie & RSI (15%)</li>
                          </ul>
                          <p className="mt-1 pt-1 border-t border-white/10">Sleep de slider om de minimale score aan te passen.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      screenerStrictness < 30 ? 'bg-yellow-500/20 text-yellow-300' :
                      screenerStrictness < 60 ? 'bg-blue-500/20 text-blue-300' :
                      'bg-purple-500/20 text-purple-300'
                    }`}>
                      {screenerStrictness < 30 ? 'Breed' : screenerStrictness < 60 ? 'Gebalanceerd' : 'Streng'}
                    </span>
                    <span className="text-white/60 text-xs">Min score: {Math.round(20 + screenerStrictness * 0.5)}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={screenerStrictness}
                  onChange={(e) => setScreenerStrictness(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, #fbbf24 0%, #3b82f6 50%, #a855f7 100%)`
                  }}
                />
                <div className="flex justify-between text-[10px] text-white/40 mt-1">
                  <span>Meer resultaten</span>
                  <span>Hogere kwaliteit</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Sort Options */}
                <div>
                  <label className="flex items-center space-x-2 text-white/60 text-sm font-medium mb-2">
                    <SortAsc className="w-4 h-4" />
                    <span>Sorteer op</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={screenerSort}
                      onChange={(e) => setScreenerSort(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    >
                      <option value="quality">Kwaliteit Score</option>
                      <option value="change">Dag %</option>
                      <option value="growth1mo">1 Maand %</option>
                      <option value="growth6mo">6 Maanden %</option>
                      <option value="growth1yr">1 Jaar %</option>
                    </select>
                    <button
                      onClick={() => setScreenerSortDir(screenerSortDir === 'desc' ? 'asc' : 'desc')}
                      className="bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:border-purple-500/50 transition-all"
                      title={screenerSortDir === 'desc' ? 'Hoog naar laag' : 'Laag naar hoog'}
                    >
                      {screenerSortDir === 'desc' ? '↓' : '↑'}
                    </button>
                  </div>
                </div>
                
                {/* Sector Filter */}
                <div>
                  <label className="flex items-center space-x-2 text-white/60 text-sm font-medium mb-2">
                    <Filter className="w-4 h-4" />
                    <span>Sector</span>
                  </label>
                  <select
                    value={screenerFilterSector}
                    onChange={(e) => setScreenerFilterSector(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  >
                    <option value="all">Alle Sectoren</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Financial">Financial</option>
                    <option value="Consumer">Consumer</option>
                    <option value="Energy">Energy</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Materials">Materials</option>
                  </select>
                </div>
                
                {/* Price Range Filter */}
                <div>
                  <label className="flex items-center space-x-2 text-white/60 text-sm font-medium mb-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Prijs Range</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={screenerFilterPriceMin}
                      onChange={(e) => setScreenerFilterPriceMin(e.target.value)}
                      className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                    <span className="text-white/30">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={screenerFilterPriceMax}
                      onChange={(e) => setScreenerFilterPriceMax(e.target.value)}
                      className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* RSI Filter */}
                <div className="bg-white/5 rounded-lg p-3">
                  <label className="flex items-center space-x-2 text-white/60 text-sm font-medium mb-2">
                    <Activity className="w-4 h-4" />
                    <span>RSI Max (Oversold onder 30)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Max RSI"
                    value={screenerFilterRSIMax}
                    onChange={(e) => setScreenerFilterRSIMax(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                  <p className="text-white/30 text-[10px] mt-1">RSI onder 30 = oversold (koopkans)</p>
                </div>

                {/* Analyst Score Filter */}
                <div className="bg-white/5 rounded-lg p-3">
                  <label className="flex items-center space-x-2 text-white/60 text-sm font-medium mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Min. Analisten (Buy/Strong Buy)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Min. aantal"
                    value={screenerFilterAnalystMin}
                    onChange={(e) => setScreenerFilterAnalystMin(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                  <p className="text-white/30 text-[10px] mt-1">Filter op aantal Buy/Strong Buy aanbevelingen</p>
                </div>
              </div>
              
              {/* Bottom Row: View Options & Reset */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <button
                  onClick={() => setShowTechnicals(!showTechnicals)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${showTechnicals ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/60 border border-white/10 hover:border-purple-500/50'}`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Technische Indicatoren</span>
                </button>
                
                {(screenerFilterSector !== 'all' || screenerFilterPriceMin || screenerFilterPriceMax || screenerFilterRSIMax || screenerFilterAnalystMin) && (
                  <button
                    onClick={() => {
                      setScreenerFilterSector('all');
                      setScreenerFilterPriceMin('');
                      setScreenerFilterPriceMax('');
                      setScreenerFilterRSIMax('');
                      setScreenerFilterAnalystMin('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center space-x-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </div>

            {(() => {
              // === INTELLIGENT SCORING FUNCTION ===
              const calculateScore = (d, ticker) => {
                if (!d) return { total: 0, breakdown: {}, reasons: [] };
                
                const sig = d.signal?.overall;
                const breakdown = {};
                const reasons = [];
                let total = 0;
                
                // TECHNICAL SIGNALS (0-100)
                let techScore = 0;
                if (sig === 'STRONG BUY') { techScore = 100; reasons.push('Strong Buy signaal'); }
                else if (sig === 'BUY') { techScore = 75; reasons.push('Buy signaal'); }
                else if (sig === 'NEUTRAL' || sig === 'HOLD') techScore = 50;
                else if (sig === 'SELL') techScore = 25;
                else if (sig === 'STRONG SELL') { techScore = 0; reasons.push('⚠️ Strong Sell'); }
                breakdown.technical = techScore;
                total += techScore * 0.20; // 20% weight
                
                // QUALITY SCORE (0-100)
                const qualScore = d.qualityScore || 0;
                breakdown.quality = qualScore;
                if (qualScore >= 70) reasons.push(`Hoge kwaliteit (${qualScore})`);
                total += qualScore * 0.25; // 25% weight
                
                // MOMENTUM (0-100) - normalized growth
                let momentumScore = 0;
                const g1m = d.growth1mo || 0;
                const g6m = d.growth6mo || 0;
                const g1y = d.growth1yr || 0;
                
                // Normalize: -50% to +100% → 0 to 100
                const norm1m = Math.max(0, Math.min(100, ((g1m + 50) / 150) * 100));
                const norm6m = Math.max(0, Math.min(100, ((g6m + 50) / 150) * 100));
                const norm1y = Math.max(0, Math.min(100, ((g1y + 50) / 150) * 100));
                
                momentumScore = (norm1m * 0.4 + norm6m * 0.3 + norm1y * 0.3);
                breakdown.momentum = momentumScore;
                if (g1m > 10) reasons.push(`Sterke 1M groei (+${g1m.toFixed(1)}%)`);
                if (g1y > 30) reasons.push(`Excellent 1Y groei (+${g1y.toFixed(1)}%)`);
                total += momentumScore * 0.25; // 25% weight
                
                // ANALYST CONSENSUS (0-100)
                const strongBuys = d.recommendation?.strongBuy || 0;
                const buys = d.recommendation?.buy || 0;
                const holds = d.recommendation?.hold || 0;
                const sells = d.recommendation?.sell || 0;
                const totalRecs = strongBuys + buys + holds + sells + (d.recommendation?.strongSell || 0);
                
                let analystScore = 0;
                if (totalRecs > 0) {
                  const buyRatio = (strongBuys * 2 + buys) / (totalRecs * 2);
                  analystScore = buyRatio * 100;
                  if (strongBuys >= 5) reasons.push(`${strongBuys} Strong Buy analisten`);
                }
                breakdown.analyst = analystScore;
                total += analystScore * 0.15; // 15% weight
                
                // POSITION & RSI (0-100)
                let positionScore = 0;
                const pos52w = d.positionIn52w || 0;
                const rsi = d.rsi || 50;
                
                // Position score
                positionScore += pos52w * 0.6; // 60% from 52w position
                
                // RSI score (sweet spot 40-70)
                let rsiScore = 0;
                if (rsi >= 40 && rsi <= 70) {
                  rsiScore = 100;
                  reasons.push('Gezonde RSI');
                } else if (rsi < 30) {
                  rsiScore = 60; // Oversold can be opportunity
                  reasons.push('Oversold (kans?)');
                } else if (rsi > 75) {
                  rsiScore = 40; // Overbought
                } else {
                  rsiScore = 70;
                }
                positionScore += rsiScore * 0.4; // 40% from RSI
                
                breakdown.position = positionScore;
                if (pos52w > 80) reasons.push('Nabij 52w high');
                total += positionScore * 0.15; // 15% weight
                
                // VALUATION (0-100) - bonus for good value
                let valuationScore = 50; // neutral default
                if (d.trailingPE > 0 && d.pegRatio > 0) {
                  if (d.trailingPE < 15 && d.pegRatio < 1) {
                    valuationScore = 100;
                    reasons.push('Uitstekende waardering');
                  } else if (d.trailingPE < 25 && d.pegRatio < 1.5) {
                    valuationScore = 75;
                    reasons.push('Goede waardering');
                  } else if (d.trailingPE < 40 && d.pegRatio < 2.5) {
                    valuationScore = 50;
                  } else {
                    valuationScore = 25;
                  }
                }
                breakdown.valuation = valuationScore;
                
                // Don't add valuation to total - it's a tiebreaker
                
                return { total: Math.round(total), breakdown, reasons };
              };
              
              // Calculate scores for all stocks
              const activeTickers = (dynamicScreenerTickers[screenerCategory]?.length > 0)
                ? dynamicScreenerTickers[screenerCategory]
                : SCREENER_CATEGORIES[screenerCategory].tickers;
              
              const scoredStocks = activeTickers
                .map((stock) => {
                  const data = screenerData[stock.ticker];
                  const score = calculateScore(data, stock.ticker);
                  return { ...stock, data, score };
                })
                .filter(item => item.data); // Only keep stocks with data
              
              // Apply strictness threshold (0-100 slider → minimum score)
              // Strictness 0 = score >= 20, Strictness 100 = score >= 70
              const minScore = 20 + (screenerStrictness * 0.5);
              
              const allStocks = scoredStocks.filter(item => item.score.total >= minScore);
              
              // Apply filters
              const filteredStocks = allStocks.filter(item => {
                // Sector filter
                if (screenerFilterSector !== 'all' && !item.sector.includes(screenerFilterSector)) return false;
                
                // Price filter
                const price = item.data.currentPrice;
                if (screenerFilterPriceMin && price < parseFloat(screenerFilterPriceMin)) return false;
                if (screenerFilterPriceMax && price > parseFloat(screenerFilterPriceMax)) return false;
                
                // RSI filter (only show stocks with RSI below max value)
                const rsi = item.data.rsi;
                if (screenerFilterRSIMax && rsi && rsi > parseFloat(screenerFilterRSIMax)) return false;
                
                // Analyst Score filter (minimum number of Buy/Strong Buy recommendations)
                if (screenerFilterAnalystMin) {
                  const rec = item.data.recommendation;
                  const buyCount = (rec?.strongBuy || 0) + (rec?.buy || 0);
                  if (buyCount < parseFloat(screenerFilterAnalystMin)) return false;
                }
                
                return true;
              })
                .sort((a, b) => {
                  // Sort by quality score first, then by selected metric
                  if (screenerSort === 'quality') {
                    return screenerSortDir === 'desc' ? b.data.qualityScore - a.data.qualityScore : a.data.qualityScore - b.data.qualityScore;
                  }
                  const aVal = a.data[screenerSort === 'change' ? 'dailyChange' : screenerSort] || 0;
                  const bVal = b.data[screenerSort === 'change' ? 'dailyChange' : screenerSort] || 0;
                  return screenerSortDir === 'desc' ? bVal - aVal : aVal - bVal;
                });
              
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/60 text-sm">
                      <span className="font-bold text-white">{filteredStocks.length}</span> top aandelen gevonden
                    </p>
                    {filteredStocks.length === 0 && (
                      <p className="text-white/40 text-xs">Pas filters aan voor meer resultaten</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredStocks.map((stock) => {
                const sd = stock.data;
                const inWatchlist = myWatchlist.some(w => w.ticker === stock.ticker);
                const currSym = getCurrencySymbol(sd?.currency);
                const sp = stockPrices[stock.ticker] || {};
                const sector = stock.sector || sp.sector || sd?.sector || '';
                const why = stock.why || sp.description || sd?.description || '';

                const isInCompare = compareList.includes(stock.ticker);
                
                return (
                  <div
                    key={stock.ticker}
                    className="relative block glass-effect rounded-xl p-4 hover:bg-white/10 transition-all"
                  >
                    {/* Compare Checkbox */}
                    {compareMode && (
                      <div className="absolute top-3 right-3 z-10">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isInCompare) {
                              setCompareList(prev => prev.filter(t => t !== stock.ticker));
                            } else if (compareList.length < 6) {
                              setCompareList(prev => [...prev, stock.ticker]);
                            }
                          }}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isInCompare 
                              ? 'bg-purple-500 border-purple-400' 
                              : 'bg-white/10 border-white/30 hover:border-purple-400'
                          }`}
                        >
                          {isInCompare && <Check className="w-4 h-4 text-white" />}
                        </button>
                      </div>
                    )}
                    
                    <a
                      href={`https://finance.yahoo.com/quote/${stock.ticker}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block cursor-pointer"
                      onClick={(e) => {
                        if (compareMode) {
                          e.preventDefault();
                        }
                      }}
                    >
                    {/* Quality Score Badge - Top Right */}
                    {!compareMode && stock.score && (
                      <div className="absolute top-3 right-3 group">
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold cursor-help ${
                          stock.score.total >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                          stock.score.total >= 55 ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                          stock.score.total >= 40 ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white' :
                          'bg-white/10 text-white/60'
                        }`}>
                          {stock.score.total}
                        </div>
                        {/* Tooltip with breakdown */}
                        <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-white/20 rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
                          <div className="text-[10px] space-y-1">
                            <div className="text-white/60 font-bold mb-1 border-b border-white/10 pb-1">Score Breakdown</div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Technisch:</span>
                              <span className="text-white font-medium">{Math.round(stock.score.breakdown.technical)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Kwaliteit:</span>
                              <span className="text-white font-medium">{Math.round(stock.score.breakdown.quality)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Momentum:</span>
                              <span className="text-white font-medium">{Math.round(stock.score.breakdown.momentum)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Analisten:</span>
                              <span className="text-white font-medium">{Math.round(stock.score.breakdown.analyst)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/50">Positie:</span>
                              <span className="text-white font-medium">{Math.round(stock.score.breakdown.position)}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                              <span className="text-white/70 font-bold">Totaal:</span>
                              <span className="text-white font-bold">{stock.score.total}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {/* Thumb */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {stock.ticker?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <h4 className="text-white font-semibold text-sm">{stock.name}</h4>
                            <span className="text-white/40 text-xs">{stock.ticker}</span>
                          {sd?.qualityScore >= 70 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold text-xs shadow-lg shadow-green-500/30 border border-green-400/20">
                              <Trophy className="w-3.5 h-3.5" />
                              <span>{sd.qualityScore}</span>
                            </span>
                          )}
                          {sd?.qualityScore >= 55 && sd?.qualityScore < 70 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/30 border border-blue-400/20">
                              <Star className="w-3.5 h-3.5" />
                              <span>{sd.qualityScore}</span>
                            </span>
                          )}
                          {sd?.qualityScore >= 40 && sd?.qualityScore < 55 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-purple-500 via-violet-500 to-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-500/30 border border-purple-400/20">
                              <Gem className="w-3.5 h-3.5" />
                              <span>{sd.qualityScore}</span>
                            </span>
                          )}
                          {aiBuyScores[stock.ticker]?.score != null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${
                              aiBuyScores[stock.ticker].verdict === 'kopen' ? 'bg-green-500/20 text-green-400' :
                              aiBuyScores[stock.ticker].verdict === 'verkopen' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/10 text-yellow-300'
                            }`}>
                              <Sparkles className="w-3 h-3" /> {Math.round(aiBuyScores[stock.ticker].score)}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const sectorText = oneLineDesc({ ticker: stock.ticker, name: stock.name, sector, type: 'stock', sd: { ...sd, description: sd?.description || sp?.description || why }, sp });
                          const description = getFullDescription({ ticker: stock.ticker, name: stock.name, sector, type: 'stock', sd: { ...sd, description: sd?.description || sp?.description || why }, sp });
                          return (
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-white/50 text-xs italic">{sectorText}</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); setCompanyInfoModal({ ticker: stock.ticker, name: stock.name, sector: sectorText, description }); }}
                                className="text-blue-400 hover:text-blue-300 text-[10px] underline transition-colors"
                              >
                                Lees meer
                              </button>
                            </div>
                          );
                        })()}
                        <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap gap-y-1">
                          {sd?.opportunityType === 'proven' && (
                            <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded font-medium" title="Bewezen winnaar - sterke 1Y groei">
                              Bewezen Winnaar
                            </span>
                          )}
                          {sd?.opportunityType === 'momentum' && (
                            <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-medium" title="Sterke recente groei (1M)">
                              Hot Momentum
                            </span>
                          )}
                          {sd?.opportunityType === 'signal' && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium" title="Technisch buy signaal">
                              Buy Signaal
                            </span>
                          )}
                          {sd?.opportunityType === 'recovery' && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-medium" title="Oversold met herstel signalen">
                              Recovery Kans
                            </span>
                          )}
                        </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {sd?.sparkline && (
                          <Sparkline data={sd.sparkline} color={(sd.growth1yr || sd.growth6mo || 0) >= 0 ? '#4ade80' : '#f87171'} width={70} height={28} />
                        )}
                        {!sd && <div className="w-[70px] h-[28px] bg-white/5 rounded animate-pulse" />}
                      </div>
                    </div>

                    {/* Price + metrics */}
                    {sd ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white font-bold text-lg">{currSym}{typeof sd.currentPrice === 'number' ? sd.currentPrice.toFixed(2) : '---'}</p>
                          <div className="flex items-center space-x-2">
                            <div className="text-center min-w-[32px]">
                              <p className="text-white/40 text-[10px]">Dag</p>
                              <p className={`text-xs font-bold ${typeof sd.dailyChange === 'number' && sd.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {typeof sd.dailyChange === 'number' ? (sd.dailyChange >= 0 ? '+' : '') + sd.dailyChange.toFixed(1) + '%' : '---'}
                              </p>
                            </div>
                            <div className="text-center min-w-[32px]">
                              <p className="text-white/40 text-[10px]">1M</p>
                              <p className={`text-xs font-bold ${typeof sd.growth1mo === 'number' && sd.growth1mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {typeof sd.growth1mo === 'number' ? (sd.growth1mo >= 0 ? '+' : '') + sd.growth1mo.toFixed(1) + '%' : '---'}
                              </p>
                            </div>
                            <div className="text-center min-w-[32px]">
                              <p className="text-white/40 text-[10px]">6M</p>
                              <p className={`text-xs font-bold ${typeof sd.growth6mo === 'number' && sd.growth6mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {typeof sd.growth6mo === 'number' ? (sd.growth6mo >= 0 ? '+' : '') + sd.growth6mo.toFixed(1) + '%' : '---'}
                              </p>
                            </div>
                            <div className="text-center min-w-[32px]">
                              <p className="text-white/40 text-[10px]">1J</p>
                              <p className={`text-xs font-bold ${(sd.growth1yr || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(sd.growth1yr || 0) >= 0 ? '+' : ''}{(sd.growth1yr || 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="h-10 bg-white/5 rounded animate-pulse mb-2" />
                    )}

                    {/* Explainability - Why Selected */}
                    {showExplainability && stock.score && stock.score.reasons.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-white/5">
                        <div className="flex items-center space-x-1 mb-1">
                          <Lightbulb className="w-3 h-3 text-yellow-400" />
                          <span className="text-white/60 text-[10px] font-medium">Waarom geselecteerd</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {stock.score.reasons.slice(0, 3).map((reason, idx) => (
                            <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ETF-Specific Metrics */}
                    {screenerCategory === 'etf' && etfMetadata[stock.ticker] && (
                      <div className="mb-2 pb-2 border-b border-white/5">
                        <div className="flex items-center space-x-1 mb-1">
                          <Building className="w-3 h-3 text-blue-400" />
                          <span className="text-white/60 text-[10px] font-medium">ETF Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[9px]">
                          <div className="flex justify-between">
                            <span className="text-white/40">TER:</span>
                            <span className="text-white/70 font-medium">{etfMetadata[stock.ticker].ter}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/40">AUM:</span>
                            <span className="text-white/70 font-medium">€{(etfMetadata[stock.ticker].aum / 1000).toFixed(1)}B</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/40">Spread:</span>
                            <span className="text-white/70 font-medium">{etfMetadata[stock.ticker].avgSpread}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/40">TD 1Y:</span>
                            <span className="text-white/70 font-medium">{etfMetadata[stock.ticker].trackingDiff1Y}%</span>
                          </div>
                          <div className="col-span-2 flex justify-between">
                            <span className="text-white/40">Type:</span>
                            <span className={`font-medium ${etfMetadata[stock.ticker].distribution === 'Accumulating' ? 'text-green-400' : 'text-blue-400'}`}>
                              {etfMetadata[stock.ticker].distribution}
                            </span>
                          </div>
                          <div className="col-span-2 flex justify-between">
                            <span className="text-white/40">Holdings:</span>
                            <span className="text-white/70 font-medium">{etfMetadata[stock.ticker].holdings.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Technical Indicators */}
                    {showTechnicals && sd && sd.rsi && (
                      <div className="mb-2 pb-2 border-b border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/40 text-[10px]">Technische Indicatoren</span>
                          {sd.signal && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              sd.signal.overall === 'STRONG BUY' ? 'bg-green-500/20 text-green-400' :
                              sd.signal.overall === 'BUY' ? 'bg-green-500/10 text-green-300' :
                              sd.signal.overall === 'STRONG SELL' ? 'bg-red-500/20 text-red-400' :
                              sd.signal.overall === 'SELL' ? 'bg-red-500/10 text-red-300' :
                              'bg-yellow-500/10 text-yellow-300'
                            }`}>
                              {sd.signal.overall}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          {/* RSI Badge */}
                          <div className={`text-[10px] px-2 py-0.5 rounded ${
                            typeof sd.rsi === 'number' && sd.rsi < 30 ? 'bg-green-500/20 text-green-400' :
                            typeof sd.rsi === 'number' && sd.rsi > 70 ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/10 text-blue-300'
                          }`}>
                            RSI: {typeof sd.rsi === 'number' ? sd.rsi.toFixed(0) : '---'}
                          </div>
                          {/* MACD Badge */}
                          {sd.macd && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${
                              sd.macd.trend === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              MACD: {sd.macd.trend === 'bullish' ? '↑' : '↓'}
                            </div>
                          )}
                          {/* Moving Average Badge */}
                          {sd.sma50 && sd.sma200 && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${
                              sd.currentPrice > sd.sma50 && sd.sma50 > sd.sma200 ? 'bg-green-500/20 text-green-400' :
                              sd.currentPrice < sd.sma50 && sd.sma50 < sd.sma200 ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/10 text-yellow-300'
                            }`}>
                              MA: {sd.currentPrice > sd.sma50 ? 'Boven 50d' : 'Onder 50d'}
                            </div>
                          )}
                          {/* EMA Trend */}
                          {typeof sd.emaTrendUp === 'boolean' && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${sd.emaTrendUp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              EMA20/50: {sd.emaTrendUp ? 'Uptrend' : 'Downtrend'}
                            </div>
                          )}
                          {/* Bollinger Bands */}
                          {sd.bb && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${sd.bb.breakoutUp ? 'bg-green-500/20 text-green-400' : sd.bb.squeeze ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
                              BB: {sd.bb.breakoutUp ? 'Breakout ↑' : (sd.bb.squeeze ? 'Squeeze' : 'Normaal')}
                            </div>
                          )}
                          {/* ADX Trend Strength */}
                          {typeof sd.adx === 'number' && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${sd.adx >= 25 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'}`}>
                              ADX: {Math.round(sd.adx)}{sd.adxDirection === 'up' ? ' ↑' : ' ↓'}
                            </div>
                          )}
                          {/* Stochastic RSI */}
                          {typeof sd.stochRsi === 'number' && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${sd.stochRsi <= 0.2 ? 'bg-green-500/20 text-green-400' : sd.stochRsi >= 0.8 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40'}`}>
                              StochRSI: {Math.round(sd.stochRsi * 100)}%
                            </div>
                          )}
                         {/* P/E Ratio */}
                         {typeof sd.peRatio === 'number' && (
                           <div className={`text-[10px] px-2 py-0.5 rounded ${
                             sd.peRatio < 15 ? 'bg-green-500/20 text-green-400' :
                             sd.peRatio > 30 ? 'bg-red-500/20 text-red-400' :
                             'bg-yellow-500/10 text-yellow-300'
                           }`}>
                             P/E: {sd.peRatio.toFixed(1)}
                           </div>
                         )}
                          {/* ATR as % of price (volatility) */}
                          {typeof sd.atr === 'number' && sd.currentPrice && (
                            <div className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40">
                              ATR: {((sd.atr / sd.currentPrice) * 100).toFixed(1)}%
                            </div>
                          )}
                          {/* 52w Proximity */}
                          {typeof sd.near52wHigh === 'number' && sd.near52wHigh <= 2 && (
                            <div className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                              Dicht bij 52w high
                            </div>
                          )}
                          {typeof sd.near52wLow === 'number' && sd.near52wLow <= 2 && (
                            <div className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                              Dicht bij 52w low
                            </div>
                          )}
                          {/* OBV Accumulation */}
                          {sd.obvUp && (
                            <div className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                              OBV: Accumulatie
                            </div>
                          )}
                          {/* SMA50 Slope */}
                          {typeof sd.sma50SlopePositive === 'boolean' && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${sd.sma50SlopePositive ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/10 text-yellow-300'}`}>
                              SMA50 {sd.sma50SlopePositive ? '↑' : '↔︎'}
                            </div>
                          )}
                          {/* MFI (Money Flow Index) */}
                          {typeof sd.mfi === 'number' && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${sd.mfi <= 20 ? 'bg-green-500/20 text-green-400' : sd.mfi >= 80 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40'}`}>
                              MFI: {Math.round(sd.mfi)}
                            </div>
                          )}
                          {/* Volume Badge */}
                          {sd.currentVolume && sd.avgVolume20d && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${
                              sd.currentVolume > sd.avgVolume20d * 1.5 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/40'
                            }`}>
                              Vol: {sd.currentVolume > sd.avgVolume20d * 1.5 ? 'Hoog' : 'Normaal'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Analyst Recommendation Meter or ETF Holdings */}
                    <AnalystMeter 
                      recommendation={sd?.recommendation || analystData[stock.ticker] || null} 
                      growthData={sd || null} 
                      targetPrice={sd?.targetPrice || analystData[stock.ticker]?.targetPrice} 
                      currentPrice={sd?.currentPrice}
                      ticker={stock.ticker}
                      isETF={stock.sector === 'Materials' || ['SPY', 'QQQ', 'VGT', 'ARKK', 'SMH', 'XLE', 'XLV', 'XLF', 'IJH', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'IBIT', 'GLD', 'TLT', 'XLK', 'XLY', 'XLP', 'COPX', 'URA', 'JEDI', 'DFEN', 'VWCE'].includes(stock.ticker)}
                      hideAIButton={true}
                    />

                    {/* Recent News for this ticker */}
                    <TickerNews news={tickerNewsMap[stock.ticker]} />

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => { e.preventDefault();
                          setNewInvestment({ name: stock.name, type: 'aandeel', amount: '', ticker_symbol: stock.ticker, shares: '', purchase_price: sd?.currentPrice?.toString() || '', sector: stock.sector, thumbnail_url: '', circular_thumbnail: false, description: '', links: [], purchase_currency: sd?.currency || inferCurrencyFromTicker(stock.ticker) || 'EUR' });
                          setShowAddModal(true);
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xs font-medium px-2 py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Portfolio</span>
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); runAIBuyCheck(stock.ticker); }}
                        disabled={loadingAiBuy[stock.ticker]}
                        className={`flex-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 text-purple-300 text-xs font-medium px-2 py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                          aiBuyScores[stock.ticker]?.verdict === 'kopen' ? 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400' :
                          aiBuyScores[stock.ticker]?.verdict === 'verkopen' ? 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400' : ''
                        }`}
                        title="AI Koop Analyse"
                      >
                        {loadingAiBuy[stock.ticker] ? (
                          <>
                            <Activity className="w-3 h-3 animate-pulse" />
                            <span>Laden...</span>
                          </>
                        ) : aiBuyScores[stock.ticker]?.score != null ? (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>AI Koop Analyse: {Math.round(aiBuyScores[stock.ticker].score)}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>AI Koop Analyse</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); inWatchlist ? removeFromWatchlist(stock.ticker) : addToWatchlist(stock); }}
                        className={`px-2 py-1.5 rounded-lg text-xs flex items-center space-x-1 transition-all ${inWatchlist ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'glass-effect text-white/50 hover:text-yellow-400'}`}
                        title={inWatchlist ? 'Verwijder uit watchlist' : 'Toevoegen aan watchlist'}
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <a
                        href={`https://finance.yahoo.com/quote/${stock.ticker}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="glass-effect px-2 py-1.5 rounded-lg text-white/50 hover:text-white text-xs flex items-center transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </a>
                  </div>
                );
              })}
                  </div>
                </>
              );
            })()}
        </div>
        )}

        {/* OLD SECTIONS TO REMOVE - Market News */}
        {false && gemScreenerTab === 'news' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/60 text-sm">Marktnieuws met ticker indicatie</p>
                <p className="text-white/30 text-xs">Titels in het Engels • ticker-badge toont relevant aandeel/ETF</p>
              </div>
              <button
                onClick={fetchScreenerNews}
                disabled={loadingScreenerNews}
                className="glass-effect px-3 py-1.5 rounded-lg text-xs text-white flex items-center space-x-1 hover:bg-white/20 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loadingScreenerNews ? 'animate-spin' : ''}`} />
                <span>{loadingScreenerNews ? 'Laden...' : 'Vernieuwen'}</span>
              </button>
            </div>

            {loadingScreenerNews && screenerNews.length === 0 && (
              <div className="text-center py-8">
                <Activity className="w-6 h-6 text-purple-400 animate-pulse mx-auto mb-2" />
                <p className="text-white/50 text-sm">Nieuws ophalen...</p>
              </div>
            )}

            {screenerNews.length > 0 && (
              <div className="space-y-4">
                {/* Dutch summary box */}
                <div className="glass-effect rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <Newspaper className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 text-sm font-semibold">Samenvatting</span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">
                    De belangrijkste onderwerpen vandaag:{' '}
                    {screenerNews.slice(0, 6).map((a, i) => (
                      <span key={i}>
                        {a.ticker && <span className="text-blue-300 font-medium">{a.ticker}</span>}
                        {a.ticker && ' — '}
                        <a href={a.link} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-purple-300 transition-colors">
                          {a.title.length > 60 ? a.title.slice(0, 60) + '...' : a.title}
                        </a>
                        {' '}
                        <span className="text-white/30 text-xs">({a.publisher})</span>
                        {i < Math.min(screenerNews.length, 6) - 1 && <span className="text-white/20"> • </span>}
                      </span>
                    ))}
                  </p>
                </div>

                {/* Articles in 2 columns, max 6 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {screenerNews.slice(0, 6).map((article, idx) => (
                    <a
                      key={idx}
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-effect rounded-lg p-3 hover:bg-white/10 transition-all group flex items-start space-x-3"
                    >
                      {article.thumbnail && (
                        <img src={article.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          {article.ticker && (
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium">{article.ticker}</span>
                          )}
                          {article.publishedAt && (
                            <span className="text-white/30 text-xs">
                              {article.publishedAt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-purple-300 transition-colors leading-snug">{article.title}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-white/40 text-xs">{article.publisher}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-white/20" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {!loadingScreenerNews && screenerNews.length === 0 && (
              <div className="text-center py-6">
                <Newspaper className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">Geen nieuws gevonden</p>
                <button onClick={fetchScreenerNews} className="text-purple-400 text-xs mt-1 hover:text-purple-300">Probeer opnieuw</button>
              </div>
            )}
          </div>
        )}

        {/* Aandelen Knallers - Explosive Stock Scanner */}
        {gemScreenerTab === 'knallers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/60 text-sm">🚀 Explosieve aandelen met hoog groeipotentieel</p>
                <p className="text-white/40 text-xs mt-1">Multi-factor scoring: Earnings beats • Revenue growth • Strong buy signals • Volume breakouts • Momentum</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowKnallersFilters(!showKnallersFilters)}
                  className="glass-effect px-3 py-1.5 rounded-lg text-xs text-white flex items-center space-x-1 hover:bg-white/20 transition-colors"
                >
                  <Filter className="w-3 h-3" />
                  <span>Filters</span>
                </button>
                <button
                  onClick={scanKnallers}
                  disabled={loadingKnallers}
                  className="glass-effect px-3 py-1.5 rounded-lg text-xs text-white flex items-center space-x-1 hover:bg-white/20 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingKnallers ? 'animate-spin' : ''}`} />
                  <span>{loadingKnallers ? 'Scannen...' : 'Scan Knallers'}</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            {showKnallersFilters && (
              <div className="glass-effect rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 flex items-center space-x-1">
                      <Building className="w-3 h-3" />
                      <span>Sector</span>
                    </label>
                    <select
                      value={knallersFilterSector}
                      onChange={(e) => setKnallersFilterSector(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                    >
                      <option value="all">Alle Sectoren</option>
                      {Array.from(new Set(knallers.map(k => k.sector).filter(Boolean))).sort().map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Min Explosief Score</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Bijv. 50"
                      value={knallersFilterMinScore}
                      onChange={(e) => setKnallersFilterMinScore(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>Max Prijs</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Bijv. 100"
                      value={knallersFilterPriceMax}
                      onChange={(e) => setKnallersFilterPriceMax(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                </div>
                {(knallersFilterSector !== 'all' || knallersFilterMinScore || knallersFilterPriceMax) && (
                  <button
                    onClick={() => {
                      setKnallersFilterSector('all');
                      setKnallersFilterMinScore('');
                      setKnallersFilterPriceMax('');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center space-x-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            )}

            {loadingKnallers && (
              <div className="flex items-center justify-center py-12">
                <Activity className="w-8 h-8 text-purple-400 animate-pulse" />
              </div>
            )}

            {!loadingKnallers && knallers.length === 0 && (
              <div className="glass-effect rounded-xl p-8 text-center">
                <p className="text-white/40 text-sm">Klik op "Scan Knallers" om de top 10 explosieve aandelen te vinden</p>
              </div>
            )}

            {!loadingKnallers && knallers.length > 0 && (() => {
              const filtered = knallers.filter(stock => {
                if (knallersFilterSector !== 'all' && stock.sector !== knallersFilterSector) return false;
                if (knallersFilterMinScore && stock.explosiveScore < parseFloat(knallersFilterMinScore)) return false;
                if (knallersFilterPriceMax && stock.currentPrice > parseFloat(knallersFilterPriceMax)) return false;
                return true;
              });
              
              return (
              <>
                {filtered.length === 0 && (
                  <div className="text-center py-8">
                    <Filter className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-sm">Geen resultaten met deze filters</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((stock, idx) => {
                  const currSymbol = getCurrencySymbol(stock.currency);
                  const scoreLabel = stock.explosiveScore >= 70 ? 'Zeer Sterk' : stock.explosiveScore >= 50 ? 'Sterk' : stock.explosiveScore >= 30 ? 'Goed' : 'Matig';
                  
                  return (
                    <div 
                      key={stock.ticker} 
                      className="glass-effect rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer border-l-4 border-orange-500"
                      onClick={() => {
                        setSelectedStock(stock.ticker);
                        setShowStockModal(true);
                      }}
                    >
                      {/* Header with rank, ticker, name, price, sparkline */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            #{idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-white font-bold text-base">{stock.ticker}</h3>
                              <span className="text-white/40 text-xs">{stock.name}</span>
                              {aiBuyScores[stock.ticker] && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                                  aiBuyScores[stock.ticker].score >= 70 ? 'bg-green-500/20 text-green-400' :
                                  aiBuyScores[stock.ticker].score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  <Sparkles className="w-3 h-3" /> {Math.round(aiBuyScores[stock.ticker].score)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                stock.explosiveScore >= 70 ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' :
                                stock.explosiveScore >= 50 ? 'bg-orange-500/20 text-orange-400' : 
                                'bg-white/10 text-white/50'
                              }`}>🔥 {scoreLabel}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Sparkline data={stock.sparkline} color={stock.growth6mo >= 0 ? '#4ade80' : '#f87171'} width={70} height={28} />
                        </div>
                      </div>

                      {/* Why / Description */}
                      {(() => {
                        const sectorText = oneLineDesc({ ticker: stock.ticker, name: stock.name, sector: stock.sector, type: 'stock', sd: { description: stock.why } });
                        const description = getFullDescription({ ticker: stock.ticker, name: stock.name, sector: stock.sector, type: 'stock', sd: { description: stock.why } });
                        return (
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-white/50 text-xs italic">{sectorText}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setCompanyInfoModal({ ticker: stock.ticker, name: stock.name, sector: sectorText, description }); }}
                              className="text-blue-400 hover:text-blue-300 text-[10px] underline transition-colors"
                            >
                              Lees meer
                            </button>
                          </div>
                        );
                      })()}

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-white/40 text-xs">Koers</p>
                          <p className="text-white font-bold text-sm">{currSymbol}{typeof stock.currentPrice === 'number' ? stock.currentPrice.toFixed(2) : '---'}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-white/40 text-xs">Market Cap</p>
                          <p className="text-white font-bold text-sm">{currSymbol}{formatMcap(stock.marketCap)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-white/40 text-xs">Explosief</p>
                          <p className="text-orange-400 font-bold text-sm">{stock.explosiveScore}/100</p>
                        </div>
                      </div>

                      {/* Growth Metrics */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="text-center">
                          <p className="text-white/40 text-xs">Dag</p>
                          <p className={`text-xs font-bold ${typeof stock.dailyChange === 'number' && stock.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {typeof stock.dailyChange === 'number' ? (stock.dailyChange >= 0 ? '+' : '') + stock.dailyChange.toFixed(1) + '%' : '---'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-xs">1M</p>
                          <p className={`text-xs font-bold ${typeof stock.growth1mo === 'number' && stock.growth1mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {typeof stock.growth1mo === 'number' ? (stock.growth1mo >= 0 ? '+' : '') + stock.growth1mo.toFixed(1) + '%' : '---'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-xs">6M</p>
                          <p className={`text-xs font-bold ${typeof stock.growth6mo === 'number' && stock.growth6mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {typeof stock.growth6mo === 'number' ? (stock.growth6mo >= 0 ? '+' : '') + stock.growth6mo.toFixed(1) + '%' : '---'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-xs">52W Pos</p>
                          <p className="text-xs font-bold text-white">{typeof stock.positionIn52w === 'number' ? stock.positionIn52w.toFixed(0) : '---'}%</p>
                        </div>
                      </div>

                      {/* Catalysts */}
                      <div className="mb-3 pb-3 border-b border-white/5">
                        <p className="text-white/60 text-xs mb-2">🎯 Waarom explosief:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {stock.catalysts.map((catalyst, i) => (
                            <span key={i} className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-1 rounded border border-orange-500/30">
                              {catalyst}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Technical Indicators */}
                      {stock.rsi && (
                        <div className="mb-3 pb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white/40 text-[10px]">Technische Indicatoren</span>
                            {stock.signal?.overall && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                stock.signal.overall === 'STRONG BUY' ? 'bg-green-500/20 text-green-400' :
                                stock.signal.overall === 'BUY' ? 'bg-green-500/10 text-green-300' :
                                stock.signal.overall === 'STRONG SELL' ? 'bg-red-500/20 text-red-400' :
                                stock.signal.overall === 'SELL' ? 'bg-red-500/10 text-red-300' :
                                'bg-yellow-500/10 text-yellow-300'
                              }`}>
                                {stock.signal.overall}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <div className={`text-[10px] px-2 py-0.5 rounded ${
                              typeof stock.rsi === 'number' && stock.rsi < 30 ? 'bg-green-500/20 text-green-400' :
                              typeof stock.rsi === 'number' && stock.rsi > 70 ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/10 text-blue-300'
                            }`}>
                              RSI: {typeof stock.rsi === 'number' ? stock.rsi.toFixed(0) : '---'}
                            </div>
                            {stock.macd && (
                              <div className={`text-[10px] px-2 py-0.5 rounded ${
                                stock.macd.trend === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                MACD: {stock.macd.trend === 'bullish' ? '↑' : '↓'}
                              </div>
                            )}
                            {stock.sma50 && stock.sma200 && (
                              <div className={`text-[10px] px-2 py-0.5 rounded ${
                                stock.currentPrice > stock.sma50 && stock.sma50 > stock.sma200 ? 'bg-green-500/20 text-green-400' :
                                stock.currentPrice < stock.sma50 && stock.sma50 < stock.sma200 ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/10 text-yellow-300'
                              }`}>
                                MA: {stock.currentPrice > stock.sma50 ? 'Boven 50d' : 'Onder 50d'}
                              </div>
                            )}
                            {stock.volume && stock.avgVolume && (
                              <div className={`text-[10px] px-2 py-0.5 rounded ${
                                stock.volume > stock.avgVolume * 1.5 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/40'
                              }`}>
                                Vol: {stock.volume > stock.avgVolume * 1.5 ? 'Hoog' : 'Normaal'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fundamentals */}
                      {(stock.trailingPE || stock.forwardPE || stock.pegRatio) && (
                        <div className="flex items-center space-x-3 mb-3 text-xs">
                          {typeof stock.trailingPE === 'number' && <span className="text-white/40">P/E: <span className="text-white/70">{stock.trailingPE.toFixed(1)}</span></span>}
                          {typeof stock.forwardPE === 'number' && <span className="text-white/40">Fwd P/E: <span className="text-white/70">{stock.forwardPE.toFixed(1)}</span></span>}
                          {typeof stock.pegRatio === 'number' && <span className="text-white/40">PEG: <span className={`${stock.pegRatio < 1.5 ? 'text-green-400' : 'text-white/70'}`}>{stock.pegRatio.toFixed(2)}</span></span>}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); addToWatchlist({ ticker: stock.ticker, name: stock.name, sector: stock.sector, type: 'stock' }); }}
                          className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <Star className="w-3 h-3" /> Watchlist
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); runAIBuyCheck(stock.ticker); }}
                          className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3 h-3" /> AI Check
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </>
              );
            })()}
          </div>
        )}

        {/* Top Picks Scanner */}
        {gemScreenerTab === 'topPicks' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/60 text-sm">Curated high-conviction picks met automatische scoring</p>
                <p className="text-white/40 text-xs mt-1">Gescoord op groei, momentum, volatiliteit & waardering • Alleen de beste kandidaten</p>
              </div>
              <button
                onClick={scanHiddenGems}
                disabled={loadingGems}
                className="glass-effect px-3 py-1.5 rounded-lg text-xs text-white flex items-center space-x-1 hover:bg-white/20 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loadingGems ? 'animate-spin' : ''}`} />
                <span>{loadingGems ? 'Scannen...' : 'Herscanen'}</span>
              </button>
            </div>

            {/* Filters */}
            {!loadingGems && gemWatchlist.length > 0 && (
              <div className="glass-effect rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 flex items-center space-x-1">
                      <Filter className="w-3 h-3" />
                      <span>Sector</span>
                    </label>
                    <select
                      value={gemFilterSector}
                      onChange={(e) => setGemFilterSector(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    >
                      <option value="all">Alle Sectoren</option>
                      {Array.from(new Set(gemWatchlist.map(g => g.sector).filter(Boolean))).sort().map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Min Score</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Bijv. 40"
                      value={gemFilterMinScore}
                      onChange={(e) => setGemFilterMinScore(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>Max Prijs</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Bijv. 50"
                      value={gemFilterPriceMax}
                      onChange={(e) => setGemFilterPriceMax(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                </div>
                {(gemFilterSector !== 'all' || gemFilterMinScore || gemFilterPriceMax) && (
                  <button
                    onClick={() => {
                      setGemFilterSector('all');
                      setGemFilterMinScore('');
                      setGemFilterPriceMax('');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center space-x-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            )}

            {loadingGems && (
              <div className="text-center py-12">
                <Activity className="w-8 h-8 text-purple-400 animate-pulse mx-auto mb-3" />
                <p className="text-white/60 text-sm">Aandelen scannen... ({GEM_CANDIDATES.length} kandidaten)</p>
                <p className="text-white/40 text-xs mt-1">Dit kan even duren door API limieten</p>
              </div>
            )}

            {!loadingGems && gemWatchlist.length > 0 && (() => {
              const filtered = gemWatchlist.filter(gem => {
                if (gemFilterSector !== 'all' && gem.sector !== gemFilterSector) return false;
                if (gemFilterMinScore && gem.score < parseFloat(gemFilterMinScore)) return false;
                if (gemFilterPriceMax && gem.currentPrice > parseFloat(gemFilterPriceMax)) return false;
                return true;
              });
              
              return (
              <>
                {filtered.length === 0 && (
                  <div className="text-center py-8">
                    <Filter className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-sm">Geen resultaten met deze filters</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((gem, index) => {
                  const currSymbol = getCurrencySymbol(gem.currency);
                  const scoreColor = gem.score >= 60 ? 'from-green-500 to-emerald-600' :
                                     gem.score >= 40 ? 'from-blue-500 to-cyan-600' :
                                     gem.score >= 30 ? 'from-yellow-500 to-amber-600' :
                                     'from-red-500 to-red-600';
                  const scoreLabel = gem.score >= 60 ? '🏆 Top Pick' :
                                     gem.score >= 40 ? '⭐ Veelbelovend' :
                                     gem.score >= 30 ? '👀 Interessant' :
                                     '❌ Afwachten';
                  const formatMcap = (mc) => {
                    if (!mc) return '?';
                    if (mc >= 1e12) return `${(mc / 1e12).toFixed(1)}T`;
                    if (mc >= 1e9) return `${(mc / 1e9).toFixed(1)}B`;
                    if (mc >= 1e6) return `${(mc / 1e6).toFixed(0)}M`;
                    return mc.toLocaleString();
                  };

                  return (
                    <div key={gem.ticker} className="glass-effect rounded-xl p-4 hover:bg-white/10 transition-all">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {(() => {
                            const tickerInitial = gem.ticker?.charAt(0) || '?';
                            return (
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold`}>
                                {tickerInitial}
                              </div>
                            );
                          })()}
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h4 className="text-white font-semibold text-sm">{gem.name}</h4>
                              <span className="text-white/40 text-xs">{gem.ticker}</span>
                              {aiBuyScores[gem.ticker]?.score != null && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${
                                  aiBuyScores[gem.ticker].verdict === 'kopen' ? 'bg-green-500/20 text-green-400' :
                                  aiBuyScores[gem.ticker].verdict === 'verkopen' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/10 text-yellow-300'
                                }`}>
                                  <Sparkles className="w-3 h-3" /> {Math.round(aiBuyScores[gem.ticker].score)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${gem.score >= 30 ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>{scoreLabel}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Sparkline data={gem.sparkline} color={gem.growth6mo >= 0 ? '#4ade80' : '#f87171'} width={70} height={28} />
                        </div>
                      </div>

                      {/* Why / Description (sector + one-liner) */}
                      {(() => {
                        const sectorText = oneLineDesc({ ticker: gem.ticker, name: gem.name, sector: gem.sector, type: 'stock', sd: { description: gem.why } });
                        const description = getFullDescription({ ticker: gem.ticker, name: gem.name, sector: gem.sector, type: 'stock', sd: { description: gem.why } });
                        return (
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-white/50 text-xs italic">{sectorText}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setCompanyInfoModal({ ticker: gem.ticker, name: gem.name, sector: sectorText, description }); }}
                              className="text-blue-400 hover:text-blue-300 text-[10px] underline transition-colors"
                            >
                              Lees meer
                            </button>
                          </div>
                        );
                      })()}

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-white/40 text-xs">Koers</p>
                          <p className="text-white font-bold text-sm">{currSymbol}{typeof gem.currentPrice === 'number' ? gem.currentPrice.toFixed(2) : '---'}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-white/40 text-xs">Market Cap</p>
                          <p className="text-white font-bold text-sm">{currSymbol}{formatMcap(gem.marketCap)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-white/40 text-xs">Volatiliteit</p>
                          <p className="text-white font-bold text-sm">{typeof gem.volatility === 'number' ? gem.volatility.toFixed(0) : '---'}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="text-center">
                          <p className="text-white/40 text-xs">Dag</p>
                          <p className={`text-xs font-bold ${typeof gem.dailyChange === 'number' && gem.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {typeof gem.dailyChange === 'number' ? (gem.dailyChange >= 0 ? '+' : '') + gem.dailyChange.toFixed(1) + '%' : '---'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-xs">1M</p>
                          <p className={`text-xs font-bold ${typeof gem.growth1mo === 'number' && gem.growth1mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {typeof gem.growth1mo === 'number' ? (gem.growth1mo >= 0 ? '+' : '') + gem.growth1mo.toFixed(1) + '%' : '---'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-xs">6M</p>
                          <p className={`text-xs font-bold ${typeof gem.growth6mo === 'number' && gem.growth6mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {typeof gem.growth6mo === 'number' ? (gem.growth6mo >= 0 ? '+' : '') + gem.growth6mo.toFixed(1) + '%' : '---'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-xs">52W Pos</p>
                          <p className="text-xs font-bold text-white">{typeof gem.positionIn52w === 'number' ? gem.positionIn52w.toFixed(0) : '---'}%</p>
                        </div>
                      </div>

                      {/* Growth Metrics Row (Dag/1M/6M/1J) */}
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-3 pb-3 border-b border-white/5">
                        <span className="text-white font-bold text-sm">{currSymbol}{typeof gem.currentPrice === 'number' ? gem.currentPrice.toFixed(2) : '---'}</span>
                        <span className={`text-xs font-medium ${typeof gem.dailyChange === 'number' && gem.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {typeof gem.dailyChange === 'number' ? (gem.dailyChange >= 0 ? '+' : '') + gem.dailyChange.toFixed(1) + '%' : '---'}
                        </span>
                        {typeof gem.growth1mo === 'number' && (
                          <span className={`text-xs ${gem.growth1mo >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                            1M: {gem.growth1mo >= 0 ? '+' : ''}{gem.growth1mo.toFixed(1)}%
                          </span>
                        )}
                      </div>

                      {/* Technical Indicators */}
                      {gem.rsi && (
                        <div className="mb-3 pb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white/40 text-[10px]">Technische Indicatoren</span>
                            {gem.signal && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                gem.signal.overall === 'STRONG BUY' ? 'bg-green-500/20 text-green-400' :
                                gem.signal.overall === 'BUY' ? 'bg-green-500/10 text-green-300' :
                                gem.signal.overall === 'STRONG SELL' ? 'bg-red-500/20 text-red-400' :
                                gem.signal.overall === 'SELL' ? 'bg-red-500/10 text-red-300' :
                                'bg-yellow-500/10 text-yellow-300'
                              }`}>
                                {gem.signal.overall}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <div className={`text-[10px] px-2 py-0.5 rounded ${
                              typeof gem.rsi === 'number' && gem.rsi < 30 ? 'bg-green-500/20 text-green-400' :
                              typeof gem.rsi === 'number' && gem.rsi > 70 ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/10 text-blue-300'
                            }`}>
                              RSI: {typeof gem.rsi === 'number' ? gem.rsi.toFixed(0) : '---'}
                            </div>
                            {gem.macd && (
                              <div className={`text-[10px] px-2 py-0.5 rounded ${
                                gem.macd.trend === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                MACD: {gem.macd.trend === 'bullish' ? '↑' : '↓'}
                              </div>
                            )}
                            {gem.sma50 && gem.sma200 && (
                              <div className={`text-[10px] px-2 py-0.5 rounded ${
                                gem.currentPrice > gem.sma50 && gem.sma50 > gem.sma200 ? 'bg-green-500/20 text-green-400' :
                                gem.currentPrice < gem.sma50 && gem.sma50 < gem.sma200 ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/10 text-yellow-300'
                              }`}>
                                MA: {gem.currentPrice > gem.sma50 ? 'Boven 50d' : 'Onder 50d'}
                              </div>
                            )}
                            {gem.volume && gem.avgVolume && (
                              <div className={`text-[10px] px-2 py-0.5 rounded ${
                                gem.volume > gem.avgVolume * 1.5 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/40'
                              }`}>
                                Vol: {gem.volume > gem.avgVolume * 1.5 ? 'Hoog' : 'Normaal'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fundamentals row */}
                      {(gem.trailingPE || gem.forwardPE || gem.pegRatio) && (
                        <div className="flex items-center space-x-3 mb-3 text-xs">
                          {typeof gem.trailingPE === 'number' && <span className="text-white/40">P/E: <span className="text-white/70">{gem.trailingPE.toFixed(1)}</span></span>}
                          {typeof gem.forwardPE === 'number' && <span className="text-white/40">Fwd P/E: <span className="text-white/70">{gem.forwardPE.toFixed(1)}</span></span>}
                          {typeof gem.pegRatio === 'number' && <span className="text-white/40">PEG: <span className={`${gem.pegRatio < 1.5 ? 'text-green-400' : 'text-white/70'}`}>{gem.pegRatio.toFixed(2)}</span></span>}
                          {gem.analystRating && <span className="text-white/40">Analyst: <span className="text-white/70">{gem.analystRating}</span></span>}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setNewInvestment({
                              name: gem.name,
                              type: 'aandeel',
                              amount: '',
                              ticker_symbol: gem.ticker,
                              shares: '',
                              purchase_price: gem.currentPrice.toString(),
                              sector: gem.sector,
                              thumbnail_url: '',
                              circular_thumbnail: false,
                              links: [],
                              purchase_currency: gem.currency || inferCurrencyFromTicker(gem.ticker) || 'EUR'
                            });
                            setShowAddModal(true);
                          }}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center justify-center space-x-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Portfolio</span>
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); runAIBuyCheck(gem.ticker); }}
                          disabled={loadingAiBuy[gem.ticker]}
                          className={`flex-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 text-purple-300 text-xs font-medium px-2 py-2 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                            aiBuyScores[gem.ticker]?.verdict === 'kopen' ? 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400' :
                            aiBuyScores[gem.ticker]?.verdict === 'verkopen' ? 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400' : ''
                          }`}
                          title="AI Koop Analyse"
                        >
                          {loadingAiBuy[gem.ticker] ? (
                            <>
                              <Activity className="w-3 h-3 animate-pulse" />
                              <span>Laden...</span>
                            </>
                          ) : aiBuyScores[gem.ticker]?.score != null ? (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>AI Koop Analyse: {Math.round(aiBuyScores[gem.ticker].score)}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>AI Koop Analyse</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const inWl = myWatchlist.some(w => w.ticker === gem.ticker);
                            inWl ? removeFromWatchlist(gem.ticker) : addToWatchlist({ ticker: gem.ticker, name: gem.name, sector: gem.sector });
                          }}
                          className={`px-2 py-2 rounded-lg text-xs flex items-center transition-all ${myWatchlist.some(w => w.ticker === gem.ticker) ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'glass-effect text-white/50 hover:text-yellow-400'}`}
                          title={myWatchlist.some(w => w.ticker === gem.ticker) ? 'Verwijder uit watchlist' : 'Watchlist'}
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <a
                          href={`https://finance.yahoo.com/quote/${gem.ticker}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-effect px-2 py-2 rounded-lg text-white/60 hover:text-white text-xs flex items-center transition-colors"
                          title="Bekijk op Yahoo Finance"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
              );
            })()}

            {!loadingGems && gemWatchlist.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-yellow-400/80 text-xs">
                  <strong>Disclaimer:</strong> Dit is geen beleggingsadvies. Score is gebaseerd op historische koersdata, groei, 
                  volatiliteit en waardering. Doe altijd eigen onderzoek (DYOR). Kleine bedrijven zijn inherent riskanter.
                </p>
              </div>
            )}
          </div>
        )}

        {/* OLD External Screener Links - MOVED TO BOTTOM */}
        {false && gemScreenerTab === 'links' && (
          <div className="space-y-4">
            <p className="text-white/50 text-xs mb-2">Professionele screeners met vooraf ingestelde "Hidden Gems" filters</p>

            <a
              href="https://finviz.com/screener.ashx?v=111&f=cap_smallover,fa_epsqoq_pos,fa_epsyoy_pos,fa_salesqoq_pos,fa_peg_low,sh_avgvol_o200&ft=4&o=-perf4w"
              target="_blank"
              rel="noopener noreferrer"
              className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-lg font-bold">F</div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Finviz Screener</h3>
                    <p className="text-white/50 text-sm">Small cap+ | EPS groei | Lage PEG | Omzetgroei</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
              </div>
              <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Small Cap+</span>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">EPS QoQ+</span>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">EPS YoY+</span>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">PEG &lt; 1</span>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Sales QoQ+</span>
              </div>
            </a>

            <a
              href="https://finviz.com/screener.ashx?v=111&f=cap_midover,fa_epsqoq_pos,fa_epsyoy1_o25,fa_salesqoq_pos,fa_salesyoy1_o25,sh_insidertrans_pos&ft=4&o=-perf4w"
              target="_blank"
              rel="noopener noreferrer"
              className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">F+</div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Finviz Insider Buying</h3>
                    <p className="text-white/50 text-sm">Mid cap+ | Hoge groei | Insider buying | Top momentum</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
              </div>
              <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Mid Cap+</span>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">EPS YoY &gt;25%</span>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Sales YoY &gt;25%</span>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Insider Buy</span>
              </div>
            </a>

            <a
              href="https://www.tradingview.com/screener/?aff_id=0"
              target="_blank"
              rel="noopener noreferrer"
              className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold">TV</div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">TradingView Screener</h3>
                    <p className="text-white/50 text-sm">Geavanceerde technische + fundamentele filters</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
              </div>
              <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Technisch</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Fundamenteel</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Wereldwijd</span>
              </div>
            </a>

            <a
              href="https://simplywall.st/discover/investing-ideas/hidden-gems/us"
              target="_blank"
              rel="noopener noreferrer"
              className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-lg font-bold">SW</div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Simply Wall St</h3>
                    <p className="text-white/50 text-sm">Visuele fundamentele analyse & Hidden Gems lijst</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
              </div>
              <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Hidden Gems</span>
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Snowflake Score</span>
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Visueel</span>
              </div>
            </a>

            <a
              href="https://finance.yahoo.com/screener/predefined/undervalued_growth_stocks"
              target="_blank"
              rel="noopener noreferrer"
              className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold">Y!</div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Yahoo Finance</h3>
                    <p className="text-white/50 text-sm">Ondergewaardeerde groeiaandelen</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
              </div>
              <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Ondergewaardeerd</span>
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Groei</span>
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Gratis</span>
              </div>
            </a>
          </div>
        )}
      </>
      )}

      {gemsWatchlistTab === 'watchlist' && (
      <>
        {/* Watchlist Search */}
        <div className="relative mb-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={watchlistSearch}
                onChange={(e) => {
                  setWatchlistSearch(e.target.value);
                  searchWatchlistStocks(e.target.value);
                }}
                placeholder="Zoek aandeel, ETF of crypto..."
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50"
              />
              {watchlistSearch && (
                <button onClick={() => { setWatchlistSearch(''); setWatchlistResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Search results dropdown */}
          {watchlistResults.length > 0 && (
            <div className="absolute z-30 w-full mt-1 glass-effect rounded-lg border border-white/10 max-h-60 overflow-y-auto">
              {watchlistResults.map((r, i) => {
                const alreadyAdded = myWatchlist.some(w => w.ticker === r.ticker);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (!alreadyAdded) {
                        addToWatchlist({ ticker: r.ticker, name: r.name, sector: r.sector });
                      }
                      setWatchlistSearch('');
                      setWatchlistResults([]);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-white/10 transition-colors flex items-center justify-between ${alreadyAdded ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-white font-bold text-sm">{r.ticker}</span>
                      <span className="text-white/50 text-xs truncate">{r.name}</span>
                      <span className="text-white/30 text-[10px]">{r.exchange}</span>
                    </div>
                    {alreadyAdded ? (
                      <span className="text-yellow-400 text-xs">✓ Watchlist</span>
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {loadingWlSearch && (
            <div className="absolute z-30 w-full mt-1 glass-effect rounded-lg border border-white/10 p-3 text-center">
              <Activity className="w-4 h-4 text-purple-400 animate-pulse mx-auto" />
            </div>
          )}
        </div>

        {myWatchlist.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myWatchlist.map((item) => {
              const sd = screenerData[item.ticker];
              const sp = stockPrices[item.ticker];
              const hasData = (sd && sd.currentPrice) || sp;
              const price = sd?.currentPrice || sp?.current || 0;
              const daily = sd?.dailyChange || sp?.changePercent || 0;
              const sparkData = sd?.sparkline || sp?.sparklineData;
              const currSym = getCurrencySymbol(sd?.currency || sp?.currency);
              const isUp = daily >= 0;
              const tickerInitial = item.ticker?.charAt(0) || '?';
              const sector = getCleanSector(sd?.sector, sp?.sector, item.sector) || 'Aandeel';
              const description = sd?.description || sp?.description || item.description || item.name || item.ticker;

              return (
                <div key={item.ticker} className="glass-effect rounded-xl p-4 hover:bg-white/10 transition-all">
                  {/* Header - same as Hidden Gems */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {tickerInitial}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-white font-semibold text-sm">{item.name || item.ticker}</h4>
                          <span className="text-white/40 text-xs">{item.ticker}</span>
                          {aiBuyScores[item.ticker]?.score != null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${
                              aiBuyScores[item.ticker].verdict === 'kopen' ? 'bg-green-500/20 text-green-400' :
                              aiBuyScores[item.ticker].verdict === 'verkopen' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/10 text-yellow-300'
                            }`}>
                              <Sparkles className="w-3 h-3" /> {Math.round(aiBuyScores[item.ticker].score)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {sparkData && <Sparkline data={sparkData} color={isUp ? '#4ade80' : '#f87171'} width={70} height={28} />}
                    </div>
                  </div>

                  {/* Description */}
                  {(() => {
                    const sectorText = oneLineDesc({ ticker: item.ticker, name: item.name, sector, type: sd?.type || (item.type || 'stock'), sd, sp });
                    const description = getFullDescription({ ticker: item.ticker, name: item.name, sector, type: sd?.type || (item.type || 'stock'), sd, sp });
                    return (
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-white/50 text-xs italic">{sectorText}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setCompanyInfoModal({ ticker: item.ticker, name: item.name, sector: sectorText, description }); }}
                          className="text-blue-400 hover:text-blue-300 text-[10px] underline transition-colors"
                        >
                          Lees meer
                        </button>
                      </div>
                    );
                  })()}

                  {/* Growth Metrics Row (Dag/1M/6M/1J) */}
                  {hasData && (
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-3 pb-3 border-b border-white/5">
                      <span className="text-white font-bold text-sm">{currSym}{typeof price === 'number' ? price.toFixed(2) : '---'}</span>
                      <span className={`text-xs font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {typeof daily === 'number' ? (isUp ? '+' : '') + daily.toFixed(1) + '%' : '---'}
                      </span>
                      {typeof sd?.growth1mo === 'number' && (
                        <span className={`text-xs ${sd.growth1mo >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                          1M: {sd.growth1mo >= 0 ? '+' : ''}{sd.growth1mo.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}

                  {/* Technical Indicators */}
                  {hasData && sd && (sd.rsi || sd.signal) && (
                    <div className="mb-2 pb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/40 text-[10px]">Technische Indicatoren</span>
                        {sd.signal?.overall && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            sd.signal.overall === 'STRONG BUY' ? 'bg-green-500/20 text-green-400' :
                            sd.signal.overall === 'BUY' ? 'bg-green-500/10 text-green-300' :
                            sd.signal.overall === 'STRONG SELL' ? 'bg-red-500/20 text-red-400' :
                            sd.signal.overall === 'SELL' ? 'bg-red-500/10 text-red-300' :
                            'bg-yellow-500/10 text-yellow-300'
                          }`}>
                            {sd.signal.overall}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        {sd.rsi && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${
                            sd.rsi < 30 ? 'bg-green-500/20 text-green-400' :
                            sd.rsi > 70 ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/10 text-blue-300'
                          }`}>
                            RSI: {typeof sd.rsi === 'number' ? sd.rsi.toFixed(0) : sd.rsi}
                          </div>
                        )}
                        {sd.macd && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${
                            sd.macd.trend === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            MACD: {sd.macd.trend === 'bullish' ? '↑' : '↓'}
                          </div>
                        )}
                        {sd.sma50 && sd.sma200 && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${
                            sd.currentPrice > sd.sma50 && sd.sma50 > sd.sma200 ? 'bg-green-500/20 text-green-400' :
                            sd.currentPrice < sd.sma50 && sd.sma50 < sd.sma200 ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/10 text-yellow-300'
                          }`}>
                            MA: {sd.currentPrice > sd.sma50 ? '↑50d' : '↓50d'}
                          </div>
                        )}
                        {typeof sd.emaTrendUp === 'boolean' && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${sd.emaTrendUp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            EMA: {sd.emaTrendUp ? 'Up' : 'Down'}
                          </div>
                        )}
                        {sd.bb && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${sd.bb.breakoutUp ? 'bg-green-500/20 text-green-400' : sd.bb.squeeze ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
                            BB: {sd.bb.breakoutUp ? '↑' : (sd.bb.squeeze ? 'Squeeze' : '—')}
                          </div>
                        )}
                        {typeof sd.adx === 'number' && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${sd.adx >= 25 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/40'}`}>
                            ADX: {Math.round(sd.adx)}{sd.adxDirection === 'up' ? '↑' : '↓'}
                          </div>
                        )}
                        {typeof sd.stochRsi === 'number' && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${sd.stochRsi <= 0.2 ? 'bg-green-500/20 text-green-400' : sd.stochRsi >= 0.8 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40'}`}>
                            StochRSI: {Math.round(sd.stochRsi * 100)}%
                          </div>
                        )}
                        {typeof sd.atr === 'number' && sd.currentPrice && (
                          <div className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            ATR: {((sd.atr / sd.currentPrice) * 100).toFixed(1)}%
                          </div>
                        )}
                        {typeof sd.near52wHigh === 'number' && sd.near52wHigh <= 2 && (
                          <div className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">52w High</div>
                        )}
                        {typeof sd.near52wLow === 'number' && sd.near52wLow <= 2 && (
                          <div className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">52w Low</div>
                        )}
                        {sd.obvUp && (
                          <div className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">OBV↑</div>
                        )}
                        {typeof sd.sma50SlopePositive === 'boolean' && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${sd.sma50SlopePositive ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/10 text-yellow-300'}`}>
                            SMA50 {sd.sma50SlopePositive ? '↑' : '↔'}
                          </div>
                        )}
                        {typeof sd.mfi === 'number' && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${sd.mfi <= 20 ? 'bg-green-500/20 text-green-400' : sd.mfi >= 80 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40'}`}>
                            MFI: {Math.round(sd.mfi)}
                          </div>
                        )}
                        {sd.currentVolume && sd.avgVolume20d && (
                          <div className={`text-[9px] px-1.5 py-0.5 rounded ${
                            sd.currentVolume > sd.avgVolume20d * 1.5 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/40'
                          }`}>
                            Vol: {sd.currentVolume > sd.avgVolume20d * 1.5 ? 'Hoog' : 'Normaal'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Analyst Recommendation Meter or ETF Holdings */}
                  <AnalystMeter 
                    recommendation={sd?.recommendation || analystData[item.ticker] || null} 
                    growthData={sd || null} 
                    targetPrice={sd?.targetPrice || analystData[item.ticker]?.targetPrice} 
                    currentPrice={sd?.currentPrice}
                    ticker={item.ticker}
                    isETF={item.sector === 'ETF' || item.type === 'etf'}
                    hideAIButton={true}
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-white/5">
                    <button
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        setNewInvestment({ name: item.name, type: 'aandeel', amount: '', ticker_symbol: item.ticker, shares: '', purchase_price: price > 0 ? price.toString() : '', sector: item.sector || '', thumbnail_url: '', circular_thumbnail: false, description: '', links: [], purchase_currency: sd?.currency || inferCurrencyFromTicker(item.ticker) || 'EUR' });
                        setShowAddModal(true);
                      }}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center justify-center space-x-1 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Portfolio</span>
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); runAIBuyCheck(item.ticker); }}
                      disabled={loadingAiBuy[item.ticker]}
                      className={`flex-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 text-purple-300 text-xs font-medium px-2 py-2 rounded-lg flex items-center justify-center space-x-1 transition-all ${
                        aiBuyScores[item.ticker]?.verdict === 'kopen' ? 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400' :
                        aiBuyScores[item.ticker]?.verdict === 'verkopen' ? 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400' : ''
                      }`}
                      title="AI Koop Analyse"
                    >
                      {loadingAiBuy[item.ticker] ? (
                        <>
                          <Activity className="w-3 h-3 animate-pulse" />
                          <span>Laden...</span>
                        </>
                      ) : aiBuyScores[item.ticker]?.score != null ? (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>AI: {Math.round(aiBuyScores[item.ticker].score)}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>AI Analyse</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromWatchlist(item.ticker); }}
                      className="px-2 py-2 rounded-lg text-xs flex items-center transition-all bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      title="Verwijder uit watchlist"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Recent News for this ticker */}
                  <TickerNews news={tickerNewsMap[item.ticker]} />
                </div>
              );
            })}
          </div>
        )}

        {myWatchlist.length === 0 && !watchlistSearch && (
          <p className="text-white/30 text-sm text-center py-4">Gebruik de zoekbalk om aandelen toe te voegen aan je watchlist</p>
        )}
      </>
      )}
      </div>
      </>
      )}

      {/* Add/Edit Investment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-xl font-semibold mb-4">
              {editingInvestment ? 'Investering Bewerken' : 'Nieuwe Investering'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Naam *</label>
                <input
                  value={editingInvestment ? editingInvestment.name : newInvestment.name}
                  onChange={(e) => editingInvestment 
                    ? setEditingInvestment({...editingInvestment, name: e.target.value})
                    : setNewInvestment({...newInvestment, name: e.target.value})
                  }
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. Apple Inc."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Type</label>
                <select
                  value={editingInvestment ? editingInvestment.type : newInvestment.type}
                  onChange={(e) => editingInvestment 
                    ? setEditingInvestment({...editingInvestment, type: e.target.value})
                    : setNewInvestment({...newInvestment, type: e.target.value})
                  }
                  className="w-full input-plain rounded-lg px-3 py-2"
                >
                  <option value="aandeel">Aandeel</option>
                  <option value="etf">ETF</option>
                  <option value="crypto">Crypto</option>
                  <option value="obligatie">Obligatie</option>
                  <option value="fonds">Fonds</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              {/* Cash specific fields */}
              {(editingInvestment ? editingInvestment.type === 'cash' : newInvestment.type === 'cash') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Bedrag (cash)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingInvestment ? editingInvestment.amount || '' : newInvestment.amount}
                      onChange={(e) => editingInvestment
                        ? setEditingInvestment({...editingInvestment, amount: e.target.value})
                        : setNewInvestment({...newInvestment, amount: e.target.value})
                      }
                      className="w-full input-plain rounded-lg px-3 py-2"
                      placeholder="1000.00"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Valuta</label>
                    <select
                      value={editingInvestment ? editingInvestment.purchase_currency || 'EUR' : newInvestment.purchase_currency || 'EUR'}
                      onChange={(e) => editingInvestment
                        ? setEditingInvestment({...editingInvestment, purchase_currency: e.target.value})
                        : setNewInvestment({...newInvestment, purchase_currency: e.target.value})
                      }
                      className="w-full input-plain rounded-lg px-3 py-2"
                    >
                      <option value="EUR">€ EUR</option>
                      <option value="USD">$ USD</option>
                      <option value="GBP">£ GBP</option>
                      <option value="CHF">CHF</option>
                      <option value="SEK">kr SEK</option>
                      <option value="NOK">kr NOK</option>
                      <option value="DKK">kr DKK</option>
                      <option value="JPY">¥ JPY</option>
                      <option value="CAD">C$ CAD</option>
                      <option value="AUD">A$ AUD</option>
                      <option value="HKD">HK$ HKD</option>
                    </select>
                  </div>
                </div>
              )}
              {/* Sector */}
              <div>
                <label className="block text-white/70 text-sm mb-1">Sector</label>
                <input
                  list="sector-suggestions"
                  value={editingInvestment ? editingInvestment.sector || '' : newInvestment.sector}
                  onChange={(e) => editingInvestment 
                    ? setEditingInvestment({...editingInvestment, sector: e.target.value})
                    : setNewInvestment({...newInvestment, sector: e.target.value})
                  }
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Typ of kies een sector..."
                />
                <datalist id="sector-suggestions">
                  {SECTOR_OPTIONS.map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              {/* Description */}
              <div>
                <label className="block text-white/70 text-sm mb-1">Beschrijving (optioneel)</label>
                <textarea
                  value={editingInvestment ? editingInvestment.description || '' : newInvestment.description}
                  onChange={(e) => editingInvestment 
                    ? setEditingInvestment({...editingInvestment, description: e.target.value})
                    : setNewInvestment({...newInvestment, description: e.target.value})
                  }
                  className="w-full input-plain rounded-lg px-3 py-2 min-h-[60px] resize-y"
                  placeholder="Waarom investeer je hierin? Notities..."
                  rows={2}
                />
                <p className="text-white/30 text-xs mt-1">Zichtbaar via het info-icoontje op je kaart</p>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-white/70 text-sm mb-1">Thumbnail</label>
                <div className="flex items-center space-x-3">
                  {(editingInvestment ? editingInvestment.thumbnail_url : newInvestment.thumbnail_url) ? (
                    <img
                      src={editingInvestment ? editingInvestment.thumbnail_url : newInvestment.thumbnail_url}
                      alt="Thumb"
                      className={`object-cover ${(editingInvestment ? editingInvestment.circular_thumbnail : newInvestment.circular_thumbnail) ? 'w-16 h-16 rounded-full border-2 border-white/20' : 'w-12 h-12'}`}
                    />
                  ) : (
                    <div className={`bg-white/10 flex items-center justify-center ${(editingInvestment ? editingInvestment.circular_thumbnail : newInvestment.circular_thumbnail) ? 'w-16 h-16 rounded-full border-2 border-white/20' : 'w-12 h-12'}`}>
                      <Image className="w-6 h-6 text-white/40" />
                    </div>
                  )}
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="glass-effect px-3 py-2 rounded-lg text-white text-sm flex items-center space-x-2 hover:bg-white/20 transition-colors"
                      disabled={uploadingThumb}
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadingThumb ? 'Uploaden...' : 'Afbeelding kiezen'}</span>
                    </button>
                    <label className="flex items-center space-x-2 text-white/60 text-sm cursor-pointer hover:text-white/80">
                      <input
                        type="checkbox"
                        checked={editingInvestment ? editingInvestment.circular_thumbnail : newInvestment.circular_thumbnail}
                        onChange={(e) => editingInvestment 
                          ? setEditingInvestment({...editingInvestment, circular_thumbnail: e.target.checked})
                          : setNewInvestment({...newInvestment, circular_thumbnail: e.target.checked})
                        }
                        className="rounded"
                      />
                      <span>Logo in cirkel</span>
                    </label>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Live Stock Tracking (hide for cash) */}
              {(editingInvestment ? editingInvestment.type !== 'cash' : newInvestment.type !== 'cash') && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-white/70 text-sm mb-3 font-semibold">Live Koersen Tracking (optioneel)</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Ticker Symbol</label>
                    <input
                      type="text"
                      value={editingInvestment ? editingInvestment.ticker_symbol || '' : newInvestment.ticker_symbol}
                      onChange={(e) => {
                        const ticker = e.target.value.toUpperCase();
                        const currency = stockPrices[ticker]?.currency || screenerData[ticker]?.currency || 'EUR';
                        const sd = screenerData[ticker];
                        if (editingInvestment) {
                          setEditingInvestment({
                            ...editingInvestment,
                            ticker_symbol: ticker,
                            purchase_currency: currency || inferCurrencyFromTicker(ticker),
                            sector: editingInvestment.sector || sd?.sector || '',
                            description: editingInvestment.description || sd?.description || ''
                          });
                        } else {
                          setNewInvestment({
                            ...newInvestment,
                            ticker_symbol: ticker,
                            purchase_currency: currency || inferCurrencyFromTicker(ticker),
                            sector: newInvestment.sector || sd?.sector || '',
                            description: newInvestment.description || sd?.description || ''
                          });
                        }
                      }}
                      className="w-full input-plain rounded-lg px-3 py-2 uppercase"
                      placeholder="Bijv. AAPL, JEDI:XETR, IREN:XNAS, VWCE"
                    />
                    <p className="text-white/40 text-xs mt-1">TradingView format (SYMBOL:EXCHANGE) of simpel ticker. XETR=Xetra, XNAS=NASDAQ, XAMS=Amsterdam</p>
                  </div>

                  {/* Short Position Toggle */}
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div>
                      <label className="block text-white/70 text-sm font-medium">Short Position</label>
                      <p className="text-white/40 text-xs mt-0.5">Winst als prijs daalt (short selling)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingInvestment ? editingInvestment.is_short || false : newInvestment.is_short}
                        onChange={(e) => editingInvestment
                          ? setEditingInvestment({...editingInvestment, is_short: e.target.checked})
                          : setNewInvestment({...newInvestment, is_short: e.target.checked})
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm mb-1">Custom Yahoo Finance Link (optioneel)</label>
                    <input
                      type="text"
                      value={editingInvestment ? editingInvestment.yahoo_finance_link || '' : newInvestment.yahoo_finance_link || ''}
                      onChange={(e) => editingInvestment 
                        ? setEditingInvestment({...editingInvestment, yahoo_finance_link: e.target.value})
                        : setNewInvestment({...newInvestment, yahoo_finance_link: e.target.value})
                      }
                      className="w-full input-plain rounded-lg px-3 py-2 text-sm"
                      placeholder="https://finance.yahoo.com/quote/JEDI.DE"
                    />
                    <p className="text-white/40 text-xs mt-1">Laat leeg voor automatische link. Handmatig invullen als automatische link niet werkt.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/70 text-sm mb-1">Aantal Aandelen</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editingInvestment ? editingInvestment.shares || '' : newInvestment.shares}
                        onChange={(e) => {
                          const shares = e.target.value;
                          if (editingInvestment) {
                            const pp = editingInvestment.purchase_price || '';
                            const currency = editingInvestment.purchase_currency || 'EUR';
                            setEditingInvestment({
                              ...editingInvestment, 
                              shares,
                              amount: autoCalculateAmount(shares, pp, currency)
                            });
                          } else {
                            const pp = newInvestment.purchase_price || '';
                            const currency = newInvestment.purchase_currency || 'EUR';
                            setNewInvestment({
                              ...newInvestment, 
                              shares,
                              amount: autoCalculateAmount(shares, pp, currency)
                            });
                          }
                        }}
                        className="w-full input-plain rounded-lg px-3 py-2"
                        placeholder="10.5"
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Aankoopprijs</label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editingInvestment ? editingInvestment.purchase_price || '' : newInvestment.purchase_price}
                          onChange={(e) => {
                            const pp = e.target.value;
                            if (editingInvestment) {
                              const shares = editingInvestment.shares || '';
                              const currency = editingInvestment.purchase_currency || 'EUR';
                              setEditingInvestment({
                                ...editingInvestment,
                                purchase_price: pp,
                                amount: autoCalculateAmount(shares, pp, currency)
                              });
                            } else {
                              const shares = newInvestment.shares || '';
                              const currency = newInvestment.purchase_currency || 'EUR';
                              setNewInvestment({
                                ...newInvestment,
                                purchase_price: pp,
                                amount: autoCalculateAmount(shares, pp, currency)
                              });
                            }
                          }}
                          className="flex-1 min-w-0 input-plain rounded-lg px-3 py-2"
                          placeholder="150.00"
                        />
                        <select
                          value={editingInvestment ? editingInvestment.purchase_currency || 'EUR' : newInvestment.purchase_currency || 'EUR'}
                          onChange={(e) => editingInvestment
                            ? setEditingInvestment({...editingInvestment, purchase_currency: e.target.value})
                            : setNewInvestment({...newInvestment, purchase_currency: e.target.value})
                          }
                          className="w-24 shrink-0 input-plain rounded-lg px-2 py-2 text-sm"
                        >
                          <option value="EUR">€ EUR</option>
                          <option value="USD">$ USD</option>
                          <option value="SEK">kr SEK</option>
                          <option value="GBP">£ GBP</option>
                          <option value="NOK">kr NOK</option>
                          <option value="DKK">kr DKK</option>
                          <option value="CHF">CHF</option>
                          <option value="JPY">¥ JPY</option>
                          <option value="CAD">C$ CAD</option>
                          <option value="AUD">A$ AUD</option>
                          <option value="HKD">HK$ HKD</option>
                        </select>
                      </div>
                      <p className="text-white/40 text-xs mt-1">Prijs wordt omgerekend naar EUR voor winst/verlies berekening</p>
                    </div>
                  </div>

                  {/* Auto-calculated amount */}
                  {(() => {
                    const s = editingInvestment ? editingInvestment.shares : newInvestment.shares;
                    const p = editingInvestment ? editingInvestment.purchase_price : newInvestment.purchase_price;
                    const currency = editingInvestment ? editingInvestment.purchase_currency || 'EUR' : newInvestment.purchase_currency || 'EUR';
                    const calc = autoCalculateAmount(s, p, currency);
                    const calcEUR = calc ? parseFloat(calc) : 0;
                    return calc ? (
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-sm">
                            {editingInvestment && editingInvestment.investment_batches?.length > 0
                              ? 'Totaal bedrag (alle aankopen)'
                              : 'Berekend bedrag (in EUR)'}
                          </span>
                          <span className="text-green-400 font-bold">€{calcEUR.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {currency !== 'EUR' && (
                          <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/10">
                            <span className="text-white/40 text-xs">Oorspronkelijk ({currency})</span>
                            <span className="text-white/60 text-xs">{getCurrencySymbol(currency)}{parseFloat(calc).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {editingInvestment && editingInvestment.investment_batches?.length > 0 && (
                          <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/10">
                            <span className="text-white/40 text-xs">Gemiddelde aankoopprijs</span>
                            <span className="text-white/80 text-xs font-semibold">{getCurrencySymbol(currency)}{parseFloat(p).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
              )}

              {/* Funding source (only when adding non-cash and cash tiles exist) */}
              {!editingInvestment && (newInvestment.type !== 'cash') && investments.some(inv => inv.type === 'cash') && (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-white/70 text-sm mb-2 font-semibold">Financiering</p>
                  <div className="flex items-center gap-3 mb-2">
                    <label className="flex items-center gap-2 text-white/70 text-sm">
                      <input type="radio" name="funding" checked={fundingSource === 'new'} onChange={() => setFundingSource('new')} />
                      Nieuw geld
                    </label>
                    <label className="flex items-center gap-2 text-white/70 text-sm">
                      <input type="radio" name="funding" checked={fundingSource === 'cash'} onChange={() => setFundingSource('cash')} />
                      Van Cash tegel
                    </label>
                  </div>
                  {fundingSource === 'cash' && (
                    <select
                      value={fundingCashId}
                      onChange={(e) => setFundingCashId(e.target.value)}
                      className="w-full input-plain rounded-lg px-3 py-2"
                    >
                      <option value="">Kies Cash tegel…</option>
                      {investments.filter(inv => inv.type === 'cash').map(c => {
                        const amtEUR = convertToEUR(parseFloat(c.amount) || 0, c.purchase_currency || 'EUR') || 0;
                        return (
                          <option key={c.id} value={c.id}>{c.name || 'Cash'} — €{amtEUR.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}

              {/* Investment Batches Section - Only show in edit mode */}
              {editingInvestment && (
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-white/70 text-sm font-semibold">Aankopen ({editingInvestment.investment_batches?.length || 0})</label>
                      <p className="text-white/40 text-xs mt-0.5">Voeg meerdere aankopen toe voor dezelfde tegel</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {(!editingInvestment.investment_batches || editingInvestment.investment_batches.length === 0) && editingInvestment.shares && (
                        <button
                          type="button"
                          onClick={convertToBatchSystem}
                          className="text-xs px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                          title="Converteer huidige aankoop naar batch systeem"
                        >
                          Converteer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAddBatchModal(true)}
                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Aankoop toevoegen</span>
                      </button>
                    </div>
                  </div>

                  {/* List of existing batches */}
                  {editingInvestment.investment_batches && editingInvestment.investment_batches.length > 0 ? (
                    <div className="space-y-2">
                      {editingInvestment.investment_batches
                        .slice()
                        .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
                        .map((batch) => (
                          <div key={batch.id} className="glass-effect rounded-lg px-3 py-2.5 group hover:bg-white/5 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-white text-sm font-medium">
                                    {parseFloat(batch.shares).toLocaleString('nl-NL', { maximumFractionDigits: 4 })} aandelen
                                  </span>
                                  <span className="text-white/40 text-xs">×</span>
                                  {(() => {
                                    const cur = batch.purchase_currency || editingInvestment.purchase_currency || 'EUR';
                                    const unitInCur = parseFloat(batch.purchase_price) || 0; // stored in original currency
                                    const unitEUR = convertToEUR(unitInCur, cur) || 0;
                                    const symbol = getCurrencySymbol(cur);
                                    return (
                                      <span className="text-white/80 text-sm">
                                        {symbol}{unitInCur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        {' '}
                                        <span className="text-white/40 text-xs">(€{unitEUR.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                      </span>
                                    );
                                  })()}
                                  <span className="text-white/40 text-xs">=</span>
                                  {(() => {
                                    const cur = batch.purchase_currency || editingInvestment.purchase_currency || 'EUR';
                                    const amtEUR = parseFloat(batch.amount) || 0; // stored in EUR
                                    const amtInCur = convertFromEUR(amtEUR, cur);
                                    const symbol = getCurrencySymbol(cur);
                                    return (
                                      <span className="text-green-400 text-sm font-semibold">
                                        {symbol}{amtInCur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        {' '}
                                        <span className="text-white/60 text-xs">(€{amtEUR.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-white/50">
                                  <span>{new Date(batch.purchase_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  {batch.notes && (
                                    <>
                                      <span>•</span>
                                      <span className="italic truncate">{batch.notes}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteBatch(batch.id)}
                                className="text-red-400 hover:text-red-300 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Verwijder aankoop"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      
                      {/* Summary row */}
                      <div className="bg-blue-500/10 rounded-lg px-3 py-2.5 mt-2 border border-blue-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-300 text-xs font-semibold">TOTAAL</span>
                          <div className="flex items-center space-x-3 text-sm">
                            <span className="text-white">
                              {editingInvestment.investment_batches.reduce((s, b) => s + parseFloat(b.shares || 0), 0).toLocaleString('nl-NL', { maximumFractionDigits: 4 })} aandelen
                            </span>
                            <span className="text-white/40">@</span>
                            {(() => {
                              const cur = editingInvestment.purchase_currency || 'EUR';
                              const totalShares = Math.max(0.0001, editingInvestment.investment_batches.reduce((s, b) => s + parseFloat(b.shares || 0), 0));
                              const totalAmtEUR = editingInvestment.investment_batches.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
                              const avgEUR = totalAmtEUR / totalShares;
                              const avgInCur = convertFromEUR(avgEUR, cur);
                              const totalInCur = convertFromEUR(totalAmtEUR, cur);
                              const sym = getCurrencySymbol(cur);
                              return (
                                <>
                                  <span className="text-white/80">
                                    {sym}{avgInCur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} avg
                                    {' '}
                                    <span className="text-white/40 text-xs">(€{avgEUR.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                  </span>
                                  <span className="text-green-400 font-bold">
                                    {sym}{totalInCur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    {' '}
                                    <span className="text-white/60 text-xs">(€{totalAmtEUR.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-white/40 text-sm bg-white/5 rounded-lg">
                      Nog geen aankopen toegevoegd. Klik op "Aankoop toevoegen" om er één toe te voegen.
                    </div>
                  )}
                </div>
              )}

              {/* Links Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white/70 text-sm">Links</label>
                  <button
                    onClick={() => setShowAddLinkModal(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Link toevoegen</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {(editingInvestment ? editingInvestment.links : newInvestment.links)?.map((link) => (
                    <div key={link.id} className="flex items-center justify-between glass-effect rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <LinkIcon className="w-4 h-4 text-white/60 flex-shrink-0" />
                        <span className="text-white text-sm truncate">{link.label}</span>
                      </div>
                      <button
                        onClick={() => removeLinkFromInvestment(link.id)}
                        className="text-red-400 hover:text-red-300 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingInvestment(null);
                  resetForm();
                }}
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button 
                onClick={editingInvestment ? updateInvestment : addInvestment} 
                className="btn-primary px-4 py-2 rounded-lg"
              >
                {editingInvestment ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Chart Modal */}
      {showChartModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">Nieuwe Grafiek Toevoegen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">TradingView Symbol *</label>
                <input
                  value={newChartSymbol}
                  onChange={(e) => setNewChartSymbol(e.target.value)}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. NASDAQ:AAPL, SP:SPX"
                  autoFocus
                />
                <p className="text-white/40 text-xs mt-1">
                  Voorbeelden: NASDAQ:AAPL, NYSE:MSFT, XETR:VWCE, SP:SPX, BINANCE:BTCUSDT, EURONEXT:BEL20
                </p>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Naam (optioneel)</label>
                <input
                  value={newChartName}
                  onChange={(e) => setNewChartName(e.target.value)}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. Apple, S&P 500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowChartModal(false);
                  setNewChartSymbol('');
                  setNewChartName('');
                }}
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button onClick={addChartFavorite} className="btn-primary px-4 py-2 rounded-lg">
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showAddLinkModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">Link Toevoegen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Label</label>
                <input
                  value={newLink.label}
                  onChange={(e) => setNewLink({...newLink, label: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. Broker Dashboard"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">URL</label>
                <input
                  value={newLink.url}
                  onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowAddLinkModal(false);
                  setNewLink({ label: '', url: '' });
                }}
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button onClick={addLinkToInvestment} className="btn-primary px-4 py-2 rounded-lg">
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Batch (Aankoop) Modal */}
      {showAddBatchModal && editingInvestment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-1">Aankoop Toevoegen</h2>
            <p className="text-white/60 text-sm mb-4">{editingInvestment.name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Aankoopdatum</label>
                <input
                  type="date"
                  value={newBatch.purchase_date}
                  onChange={(e) => setNewBatch({...newBatch, purchase_date: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 text-sm mb-1">Aantal Aandelen</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newBatch.shares}
                    onChange={(e) => setNewBatch({...newBatch, shares: e.target.value})}
                    className="w-full input-plain rounded-lg px-3 py-2"
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-1">Aankoopprijs</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newBatch.purchase_price}
                      onChange={(e) => setNewBatch({...newBatch, purchase_price: e.target.value})}
                      className="flex-1 min-w-0 input-plain rounded-lg px-3 py-2"
                      placeholder="150.00"
                    />
                    <select
                      value={newBatch.purchase_currency}
                      onChange={(e) => setNewBatch({...newBatch, purchase_currency: e.target.value})}
                      className="w-24 shrink-0 input-plain rounded-lg px-2 py-2 text-sm"
                    >
                      <option value="EUR">€ EUR</option>
                      <option value="USD">$ USD</option>
                      <option value="GBP">£ GBP</option>
                      <option value="CHF">CHF</option>
                      <option value="SEK">kr SEK</option>
                      <option value="NOK">kr NOK</option>
                      <option value="DKK">kr DKK</option>
                      <option value="JPY">¥ JPY</option>
                      <option value="CAD">C$ CAD</option>
                      <option value="AUD">A$ AUD</option>
                      <option value="HKD">HK$ HKD</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Live calculation */}
              {newBatch.shares && newBatch.purchase_price && (
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Totaal bedrag (EUR)</span>
                    <span className="text-green-400 font-bold">
                      {(() => {
                        const amt = parseFloat(newBatch.shares) * parseFloat(newBatch.purchase_price);
                        const eur = convertToEUR(amt, newBatch.purchase_currency || 'EUR');
                        return `€${eur.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-white/70 text-sm mb-1">Notitie (optioneel)</label>
                <input
                  type="text"
                  value={newBatch.notes}
                  onChange={(e) => setNewBatch({...newBatch, notes: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. Maandelijkse inleg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowAddBatchModal(false);
                  setNewBatch({
                    purchase_date: new Date().toISOString().split('T')[0],
                    shares: '',
                    purchase_price: '',
                    notes: ''
                  });
                }}
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button onClick={addBatchToInvestment} className="btn-primary px-4 py-2 rounded-lg">
                Aankoop Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Toast */}
      <NotificationsToast 
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      {/* Alert Modal */}
      <AlertModal
        show={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        alerts={alerts}
        newAlert={newAlert}
        setNewAlert={setNewAlert}
        onAddAlert={handleAddAlert}
        onRemoveAlert={handleRemoveAlert}
        onToggleAlert={handleToggleAlert}
        screenerData={screenerData}
      />

      {/* Earnings Calendar Modal */}
      <EarningsModal
        show={showEarningsModal}
        onClose={() => setShowEarningsModal(false)}
        earningsData={earningsData}
        loadingEarnings={loadingEarnings}
        earningsCalendar={earningsCalendar}
        onRefresh={() => {
          earningsCalendar.clearCache();
          fetchEarningsData();
        }}
      />

      {/* AI Analysis Modal */}
      <AIModal
        show={showAIModal}
        onClose={() => {
          setShowAIModal(false);
          setAiAnalysis(null);
          setSelectedStockForAI(null);
        }}
        aiAnalysis={aiAnalysis}
        loadingAI={loadingAI}
        selectedStock={selectedStockForAI}
        tickerNews={selectedStockForAI?.ticker ? tickerNewsMap[selectedStockForAI.ticker] || [] : []}
      />

      {/* AI Buy-Check Popup Modal */}
      {aiBuyModalTicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAiBuyModalTicker(null)}>
          <div className="gradient-card rounded-xl p-4 max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold text-lg flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span>AI Koop Analyse</span>
                </h3>
                <p className="text-white/50 text-xs mt-0.5">{aiBuyModalTicker}</p>
              </div>
              <button onClick={() => setAiBuyModalTicker(null)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {loadingAiBuy[aiBuyModalTicker] ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400 mx-auto mb-3"></div>
                <p className="text-white/70 text-sm font-medium">AI analyseert {aiBuyModalTicker}...</p>
                <p className="text-white/40 text-xs mt-1">Dit kan 10-20 seconden duren</p>
              </div>
            ) : aiBuyScores[aiBuyModalTicker]?._error ? (
              <div className="glass-effect rounded-lg p-4 border border-red-500/20">
                <div className="flex flex-col items-center text-center py-4">
                  <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                  <p className="text-red-400 font-semibold text-sm mb-1">AI analyse mislukt</p>
                  <p className="text-white/50 text-xs mb-4 max-w-xs">{aiBuyScores[aiBuyModalTicker]._error}</p>
                  <button
                    onClick={() => runAIBuyCheck(aiBuyModalTicker, { force: true })}
                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm font-medium transition-colors border border-purple-500/30"
                  >
                    Opnieuw proberen
                  </button>
                </div>
              </div>
            ) : aiBuyScores[aiBuyModalTicker] ? (
              <>
                {/* Compact Score Header */}
                <div className={`glass-effect rounded-lg p-4 mb-3 border-2 ${
                  aiBuyScores[aiBuyModalTicker].verdict === 'kopen' ? 'border-green-500/30' :
                  aiBuyScores[aiBuyModalTicker].verdict === 'verkopen' ? 'border-red-500/30' :
                  'border-yellow-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white/50 text-xs uppercase tracking-wider">Score</span>
                      <div className={`text-3xl font-bold mt-0.5 ${
                        aiBuyScores[aiBuyModalTicker].verdict === 'kopen' ? 'text-green-400' :
                        aiBuyScores[aiBuyModalTicker].verdict === 'verkopen' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {Math.round(aiBuyScores[aiBuyModalTicker].score)}
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                      aiBuyScores[aiBuyModalTicker].verdict === 'kopen' ? 'bg-green-500/20 text-green-400' :
                      aiBuyScores[aiBuyModalTicker].verdict === 'verkopen' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {aiBuyScores[aiBuyModalTicker].verdict?.toUpperCase() || '---'}
                    </div>
                  </div>
                  {aiBuyScores[aiBuyModalTicker].one_liner && (
                    <div className={`p-3 rounded-lg border mt-3 ${
                      aiBuyScores[aiBuyModalTicker].verdict === 'kopen' ? 'bg-green-500/10 border-green-500/20' :
                      aiBuyScores[aiBuyModalTicker].verdict === 'verkopen' ? 'bg-red-500/10 border-red-500/20' :
                      'bg-yellow-500/10 border-yellow-500/20'
                    }`}>
                      <p className="text-white/90 text-sm leading-snug">"{aiBuyScores[aiBuyModalTicker].one_liner}"</p>
                    </div>
                  )}
                </div>


                {/* Compact Details & Technical Indicators Combined */}
                {screenerData[aiBuyModalTicker] && (
                  <div className="glass-effect rounded-lg p-3 mb-3">
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="text-white/50">Conf: <span className="text-white font-semibold">{Math.round(aiBuyScores[aiBuyModalTicker].confidence || 0)}%</span></span>
                      {aiBuyScores[aiBuyModalTicker].timeframe && <span className="text-white/50">•</span>}
                      {aiBuyScores[aiBuyModalTicker].timeframe && <span className="text-white/50">Tijd: <span className="text-white font-semibold">{aiBuyScores[aiBuyModalTicker].timeframe}</span></span>}
                      {screenerData[aiBuyModalTicker].rsi && <span className="text-white/50">•</span>}
                      {screenerData[aiBuyModalTicker].rsi && <span className={`font-semibold ${screenerData[aiBuyModalTicker].rsi < 30 ? 'text-green-400' : screenerData[aiBuyModalTicker].rsi > 70 ? 'text-red-400' : 'text-white'}`}>RSI {Math.round(screenerData[aiBuyModalTicker].rsi)}</span>}
                      {screenerData[aiBuyModalTicker].signal?.overall && <span className="text-white/50">•</span>}
                      {screenerData[aiBuyModalTicker].signal?.overall && <span className={`font-semibold ${screenerData[aiBuyModalTicker].signal.overall.includes('BUY') ? 'text-green-400' : screenerData[aiBuyModalTicker].signal.overall.includes('SELL') ? 'text-red-400' : 'text-yellow-400'}`}>{screenerData[aiBuyModalTicker].signal.overall}</span>}
                      {screenerData[aiBuyModalTicker].growth6mo !== undefined && <span className="text-white/50">•</span>}
                      {screenerData[aiBuyModalTicker].growth6mo !== undefined && <span className={`font-semibold ${screenerData[aiBuyModalTicker].growth6mo > 0 ? 'text-green-400' : 'text-red-400'}`}>6M: {screenerData[aiBuyModalTicker].growth6mo > 0 ? '+' : ''}{Math.round(screenerData[aiBuyModalTicker].growth6mo)}%</span>}
                      {screenerData[aiBuyModalTicker].growth1yr !== undefined && <span className="text-white/50">•</span>}
                      {screenerData[aiBuyModalTicker].growth1yr !== undefined && <span className={`font-semibold ${screenerData[aiBuyModalTicker].growth1yr > 0 ? 'text-green-400' : 'text-red-400'}`}>1J: {screenerData[aiBuyModalTicker].growth1yr > 0 ? '+' : ''}{Math.round(screenerData[aiBuyModalTicker].growth1yr)}%</span>}
                    </div>
                  </div>
                )}

                {/* Reasons */}
                {aiBuyScores[aiBuyModalTicker].reasons && aiBuyScores[aiBuyModalTicker].reasons.length > 0 && (
                  <div className="glass-effect rounded-lg p-3 mb-3">
                    <h4 className="text-white font-semibold text-sm mb-2">Redenen</h4>
                    <ul className="space-y-1.5">
                      {aiBuyScores[aiBuyModalTicker].reasons.map((reason, idx) => (
                        <li key={idx} className="text-white/80 text-xs flex items-start space-x-2 bg-white/5 rounded px-2 py-1.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                            aiBuyScores[aiBuyModalTicker].verdict === 'kopen' ? 'bg-green-500/20 text-green-400' :
                            aiBuyScores[aiBuyModalTicker].verdict === 'verkopen' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="leading-snug">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* News Section */}
                <div className="glass-effect rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                      <Newspaper className="w-4 h-4 text-purple-400" />
                      <span>Laatste Nieuws</span>
                    </h4>
                    {tickerNewsMap[aiBuyModalTicker] && tickerNewsMap[aiBuyModalTicker].length > 0 && (
                      <span className="text-white/40 text-[10px]">{tickerNewsMap[aiBuyModalTicker].length} art.</span>
                    )}
                  </div>
                  {tickerNewsMap[aiBuyModalTicker] && tickerNewsMap[aiBuyModalTicker].length > 0 ? (
                    <div className="space-y-2">
                      {tickerNewsMap[aiBuyModalTicker].slice(0, 3).map((news, idx) => (
                        <a
                          key={idx}
                          href={news.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-white/5 rounded px-2 py-2 hover:bg-white/10 transition-all group border border-white/5 hover:border-purple-500/30"
                        >
                          <div className="flex items-start space-x-2">
                            <div className="flex-1">
                              <p className="text-white/90 text-xs font-medium leading-snug mb-1 group-hover:text-purple-300 transition-colors">
                                {news.title}
                              </p>
                              <div className="flex items-center space-x-2 text-[10px] text-white/40">
                                <span>{news.publisher || 'Unknown'}</span>
                                <span>•</span>
                                <span>{news.providerPublishTime ? new Date(news.providerPublishTime).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-0.5" />
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-white/40 bg-white/5 rounded border border-white/5">
                      <Newspaper className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Geen nieuws</p>
                    </div>
                  )}
                </div>

                <p className="text-white/30 text-[10px] mt-3 text-center">
                  Gegenereerd op: {new Date().toLocaleString('nl-NL')}
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Handige Links Widget */}
      {activeMainTab === 'onderzoek' && (
      <div className="gradient-card rounded-xl p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <LinkIcon className="w-5 h-5 text-purple-400" />
          <h2 className="text-white text-xl font-semibold">Handige Links</h2>
        </div>
        <p className="text-white/50 text-xs mb-4">Professionele screeners met vooraf ingestelde "Hidden Gems" filters</p>

        <div className="space-y-4">
          <a
            href="https://finviz.com/screener.ashx?v=111&f=cap_smallover,fa_epsqoq_pos,fa_epsyoy_pos,fa_salesqoq_pos,fa_peg_low,sh_avgvol_o200&ft=4&o=-perf4w"
            target="_blank"
            rel="noopener noreferrer"
            className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-lg font-bold">F</div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Finviz Screener</h3>
                  <p className="text-white/50 text-sm">Small cap+ | EPS groei | Lage PEG | Omzetgroei</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
            </div>
            <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Small Cap+</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">EPS QoQ+</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">EPS YoY+</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">PEG &lt; 1</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Sales QoQ+</span>
            </div>
          </a>

          <a
            href="https://finviz.com/screener.ashx?v=111&f=cap_midover,fa_epsqoq_pos,fa_epsyoy1_o25,fa_salesqoq_pos,fa_salesyoy1_o25,sh_insidertrans_pos&ft=4&o=-perf4w"
            target="_blank"
            rel="noopener noreferrer"
            className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">F+</div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Finviz Insider Buying</h3>
                  <p className="text-white/50 text-sm">Mid cap+ | Hoge groei | Insider buying | Top momentum</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
            </div>
            <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Mid Cap+</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">EPS YoY &gt;25%</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Sales YoY &gt;25%</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Insider Buy</span>
            </div>
          </a>

          <a
            href="https://www.tradingview.com/screener/?aff_id=0"
            target="_blank"
            rel="noopener noreferrer"
            className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold">TV</div>
                <div>
                  <h3 className="text-white font-semibold text-lg">TradingView Screener</h3>
                  <p className="text-white/50 text-sm">Geavanceerde technische + fundamentele filters</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
            </div>
            <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Technisch</span>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Fundamenteel</span>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Wereldwijd</span>
            </div>
          </a>

          <a
            href="https://simplywall.st/discover/investing-ideas/hidden-gems/us"
            target="_blank"
            rel="noopener noreferrer"
            className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-lg font-bold">SW</div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Simply Wall St</h3>
                  <p className="text-white/50 text-sm">Visuele fundamentele analyse & Hidden Gems lijst</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
            </div>
            <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Hidden Gems</span>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Snowflake Score</span>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Visueel</span>
            </div>
          </a>

          <a
            href="https://finance.yahoo.com/screener/predefined/undervalued_growth_stocks"
            target="_blank"
            rel="noopener noreferrer"
            className="block glass-effect rounded-xl p-5 hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold">Y!</div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Yahoo Finance</h3>
                  <p className="text-white/50 text-sm">Ondergewaardeerde groeiaandelen</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
            </div>
            <div className="flex items-center space-x-2 mt-3 flex-wrap gap-1">
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Ondergewaardeerd</span>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Groei</span>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Gratis</span>
            </div>
          </a>
        </div>
      </div>
      )}

      {/* Technical Indicators Legend Popup */}
      {showTechLegend && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowTechLegend(false)}>
          <div className="gradient-card rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-xl">📊 Technische Indicatoren Uitleg</h3>
              <button onClick={() => setShowTechLegend(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* RSI */}
              <div className="glass-effect rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center space-x-2">
                  <span className="text-blue-400">RSI</span>
                  <span className="text-white/60 text-sm font-normal">(Relative Strength Index)</span>
                </h4>
                <p className="text-white/70 text-sm mb-2">Meet de snelheid en verandering van prijsbewegingen (0-100).</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">RSI &lt; 30</span>
                    <span className="text-white/60">= Oversold (mogelijk koopkans)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">RSI &gt; 70</span>
                    <span className="text-white/60">= Overbought (mogelijk verkoopsignaal)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded text-xs">RSI 30-70</span>
                    <span className="text-white/60">= Neutrale zone</span>
                  </div>
                </div>
              </div>

              {/* MACD */}
              <div className="glass-effect rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center space-x-2">
                  <span className="text-purple-400">MACD</span>
                  <span className="text-white/60 text-sm font-normal">(Moving Average Convergence Divergence)</span>
                </h4>
                <p className="text-white/70 text-sm mb-2">Toont momentum en trendrichting door twee voortschrijdende gemiddelden te vergelijken.</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">MACD ↑</span>
                    <span className="text-white/60">= Bullish (opwaartse trend)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">MACD ↓</span>
                    <span className="text-white/60">= Bearish (neerwaartse trend)</span>
                  </div>
                </div>
              </div>

              {/* Moving Averages */}
              <div className="glass-effect rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center space-x-2">
                  <span className="text-yellow-400">MA</span>
                  <span className="text-white/60 text-sm font-normal">(Moving Averages - 50d & 200d)</span>
                </h4>
                <p className="text-white/70 text-sm mb-2">Voortschrijdende gemiddelden geven de gemiddelde prijs over een periode weer.</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">Prijs &gt; 50d &amp; 50d &gt; 200d</span>
                    <span className="text-white/60">= Sterke uptrend (Golden Cross)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">Prijs &lt; 50d &amp; 50d &lt; 200d</span>
                    <span className="text-white/60">= Sterke downtrend (Death Cross)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-yellow-500/10 text-yellow-300 px-2 py-0.5 rounded text-xs">Gemengd</span>
                    <span className="text-white/60">= Onduidelijke trend / consolidatie</span>
                  </div>
                </div>
              </div>

              {/* Volume */}
              <div className="glass-effect rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2 flex items-center space-x-2">
                  <span className="text-cyan-400">Volume</span>
                  <span className="text-white/60 text-sm font-normal">(Handelsvolume)</span>
                </h4>
                <p className="text-white/70 text-sm mb-2">Aantal verhandelde aandelen - bevestigt trends en signalen.</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs">Vol: Hoog</span>
                    <span className="text-white/60">= &gt;1.5x gemiddeld (sterke interesse)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-white/5 text-white/40 px-2 py-0.5 rounded text-xs">Vol: Normaal</span>
                    <span className="text-white/60">= Binnen normaal bereik</span>
                  </div>
                </div>
              </div>

              {/* Overall Signal */}
              <div className="glass-effect rounded-lg p-4 border border-blue-500/30">
                <h4 className="text-white font-semibold mb-2">🎯 Overall Signal</h4>
                <p className="text-white/70 text-sm mb-2">Gecombineerd signaal op basis van alle indicatoren:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold">STRONG BUY</span>
                    <span className="text-white/60">Sterk koopsignaal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-500/10 text-green-300 px-2 py-0.5 rounded text-xs">BUY</span>
                    <span className="text-white/60">Koopsignaal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-yellow-500/10 text-yellow-300 px-2 py-0.5 rounded text-xs">HOLD</span>
                    <span className="text-white/60">Vasthouden</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-red-500/10 text-red-300 px-2 py-0.5 rounded text-xs">SELL</span>
                    <span className="text-white/60">Verkoopsignaal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">STRONG SELL</span>
                    <span className="text-white/60">Sterk verkoopsignaal</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-300 text-xs">
                  💡 <strong>Tip:</strong> Gebruik technische indicatoren altijd in combinatie met fundamentele analyse en nieuws. Geen enkele indicator is 100% betrouwbaar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Info Modal */}
      {companyInfoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setCompanyInfoModal(null)}>
          <div className="gradient-card rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-xl font-bold">{companyInfoModal.name}</h3>
                <p className="text-white/40 text-sm">{companyInfoModal.ticker}</p>
              </div>
              <button
                onClick={() => setCompanyInfoModal(null)}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Sector */}
              <div className="glass-effect rounded-lg p-4 border border-white/10">
                <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Sector</h4>
                <p className="text-white text-base font-medium">{companyInfoModal.sector}</p>
              </div>

              {/* Description */}
              <div className="glass-effect rounded-lg p-4 border border-white/10">
                <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2">Bedrijfsomschrijving</h4>
                <p className="text-white/80 text-sm leading-relaxed">{companyInfoModal.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && compareList.length > 0 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCompareModal(false)}>
          <div className="gradient-card rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-900/95 to-blue-900/95 backdrop-blur-lg p-6 border-b border-white/10 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <GitCompare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl">Vergelijk Aandelen</h2>
                    <p className="text-white/60 text-sm">{compareList.length} aandelen geselecteerd</p>
                  </div>
                </div>
                <button onClick={() => setShowCompareModal(false)} className="text-white/60 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {compareList.map(ticker => {
                  const data = screenerData[ticker] || stockPrices[ticker] || {};
                  const currSym = getCurrencySymbol(data.currency);
                  
                  return (
                    <div key={ticker} className="glass-effect rounded-xl p-4 border border-white/10">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                        <div>
                          <h3 className="text-white font-bold text-lg">{ticker}</h3>
                          <p className="text-white/60 text-sm">{data.name || ticker}</p>
                        </div>
                        <button
                          onClick={() => setCompareList(prev => prev.filter(t => t !== ticker))}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-3">
                        {/* Price */}
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-white/40 text-xs mb-1">Huidige Koers</p>
                          <p className="text-white font-bold text-xl">{currSym}{data.currentPrice?.toFixed(2) || '---'}</p>
                          {data.dailyChange != null && (
                            <p className={`text-sm font-medium ${data.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {data.dailyChange >= 0 ? '+' : ''}{data.dailyChange.toFixed(2)}%
                            </p>
                          )}
                        </div>

                        {/* Growth */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white/5 rounded-lg p-2">
                            <p className="text-white/40 text-[10px] mb-1">1M</p>
                            <p className={`text-sm font-bold ${(data.growth1mo || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(data.growth1mo || 0) >= 0 ? '+' : ''}{(data.growth1mo || 0).toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <p className="text-white/40 text-[10px] mb-1">6M</p>
                            <p className={`text-sm font-bold ${(data.growth6mo || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(data.growth6mo || 0) >= 0 ? '+' : ''}{(data.growth6mo || 0).toFixed(1)}%
                            </p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-2">
                            <p className="text-white/40 text-[10px] mb-1">1Y</p>
                            <p className={`text-sm font-bold ${(data.growth1yr || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(data.growth1yr || 0) >= 0 ? '+' : ''}{(data.growth1yr || 0).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {/* Valuation */}
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-white/40 text-xs mb-2">Waardering</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-white/40">P/E</p>
                              <p className="text-white font-bold">{data.trailingPE?.toFixed(1) || '---'}</p>
                            </div>
                            <div>
                              <p className="text-white/40">PEG</p>
                              <p className="text-white font-bold">{data.pegRatio?.toFixed(2) || '---'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Technical */}
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-white/40 text-xs mb-2">Technisch</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-white/40">RSI</p>
                              <p className={`font-bold ${data.rsi < 30 ? 'text-green-400' : data.rsi > 70 ? 'text-red-400' : 'text-white'}`}>
                                {data.rsi?.toFixed(0) || '---'}
                              </p>
                            </div>
                            <div>
                              <p className="text-white/40">Signaal</p>
                              <p className={`font-bold text-xs ${
                                data.signal?.overall === 'STRONG BUY' ? 'text-green-400' :
                                data.signal?.overall === 'BUY' ? 'text-green-300' :
                                data.signal?.overall === 'STRONG SELL' ? 'text-red-400' :
                                data.signal?.overall === 'SELL' ? 'text-red-300' :
                                'text-yellow-300'
                              }`}>
                                {data.signal?.overall || 'NEUTRAL'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Quality Score */}
                        {data.qualityScore != null && (
                          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-3 border border-purple-500/30">
                            <p className="text-white/40 text-xs mb-1">Kwaliteit Score</p>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                                  style={{ width: `${data.qualityScore}%` }}
                                />
                              </div>
                              <span className="text-white font-bold text-sm">{data.qualityScore}</span>
                            </div>
                          </div>
                        )}

                        {/* Analyst Rating */}
                        {data.recommendation && (
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-white/40 text-xs mb-2">Analisten</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-green-400">Strong Buy</span>
                                <span className="text-white font-bold">{data.recommendation.strongBuy || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-300">Buy</span>
                                <span className="text-white font-bold">{data.recommendation.buy || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-yellow-300">Hold</span>
                                <span className="text-white font-bold">{data.recommendation.hold || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                        <a
                          href={`https://finance.yahoo.com/quote/${ticker}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3 h-3" /> Yahoo
                        </a>
                        <button
                          onClick={() => runAIBuyCheck(ticker)}
                          className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3 h-3" /> AI Check
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add More Button */}
              {compareList.length < 6 && (
                <div className="mt-4 text-center">
                  <p className="text-white/40 text-sm">Selecteer meer aandelen om te vergelijken (max 6)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeleggenPage;
