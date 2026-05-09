import React, { useState, useEffect, useRef } from 'react';
import { Plus, TrendingUp, DollarSign, Edit, Trash2, Search, ExternalLink, Link as LinkIcon, X, TrendingDown, Activity, Upload, Image, BarChart2, RefreshCw, Newspaper, Clock, Eye, Star, Info, FileText, TrendingUpIcon, Filter, SortAsc, Bell, Calendar, Sparkles, Download, BellRing, Trophy, Gem } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { db, supabase, storage } from '../utils/supabaseClient';
import { stockCache, technicalIndicators, performanceMetrics } from '../utils/stockDataCache';
import { alertSystem, ALERT_TYPES } from '../utils/alertSystem';
import { earningsCalendar } from '../utils/earningsCalendar';
import { aiAnalyzer } from '../utils/aiAnalyzer';
import { dataExporter } from '../utils/exportData';
import { AlertModal, EarningsModal, AIModal, NotificationsToast } from './BeleggenModals';

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

// Analyst recommendation meter (1=Strong Buy ... 5=Strong Sell)
const AnalystMeter = ({ recommendation, growthData }) => {
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

  // Calculate analyst data (with placeholder fallback)
  const hasAnalysts = recommendation && recommendation.mean;
  const analystMean = hasAnalysts ? recommendation.mean : 2.1; // Placeholder: Buy
  const analystCount = hasAnalysts ? recommendation.analysts : 44; // Placeholder
  const analystPct = analystMean ? ((analystMean - 1) / 4) * 100 : null;

  // Calculate momentum data (with placeholder fallback)
  const hasMomentum = growthData && (growthData.dailyChange !== undefined || growthData.growth1mo !== undefined);
  let momentumMean = null;
  let momentumPct = null;
  if (hasMomentum) {
    const { dailyChange = 0, growth1mo = 0, growth6mo = 0, growth1yr = 0 } = growthData;
    const avgGrowth = (dailyChange * 0.1 + growth1mo * 0.3 + growth6mo * 0.3 + growth1yr * 0.3);
    momentumMean = Math.max(1, Math.min(5, 3 - (avgGrowth / 25)));
    momentumPct = ((momentumMean - 1) / 4) * 100;
  } else {
    // Placeholder momentum
    momentumMean = 2.3;
    momentumPct = ((momentumMean - 1) / 4) * 100;
  }

  // Hard color-stops gradient (5 distinct segments) for analyst bar
  const segmentedGradient = 'linear-gradient(to right, #059669 0%, #059669 20%, #34d399 20%, #34d399 40%, #f59e0b 40%, #f59e0b 60%, #f97316 60%, #f97316 80%, #ef4444 80%, #ef4444 100%)';

  return (
    <div className="mt-2 pt-2 border-t border-white/5 mb-3">
      {/* Analyst Consensus - Primary */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-xs font-medium">Aanbevelingen analisten</span>
          <span className="text-xs font-bold" style={{ color: getColor(analystPct) }}>{getLabel(analystPct)}</span>
        </div>
        <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: segmentedGradient }}>
          <div
            className="absolute top-[-1px] w-3.5 h-3.5 rounded-full bg-white border-2 shadow-lg"
            style={{ left: `calc(${Math.max(2, Math.min(98, analystPct))}% - 7px)`, borderColor: getColor(analystPct) }}
          />
        </div>
        {/* Legend with colored dots */}
        <div className="flex items-center justify-between mt-2 flex-wrap gap-x-2 gap-y-1">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#059669' }}></span>
            <span className="text-[9px] text-white/60">Kopen</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#34d399' }}></span>
            <span className="text-[9px] text-white/60">Opbouwen</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#f59e0b' }}></span>
            <span className="text-[9px] text-white/60">Houden</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#f97316' }}></span>
            <span className="text-[9px] text-white/60">Afbouwen</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#ef4444' }}></span>
            <span className="text-[9px] text-white/60">Verkopen</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-white/40">Aantal analisten</span>
          <span className="text-[10px] text-white font-semibold">{analystCount}</span>
        </div>
      </div>

      {/* Momentum Score - Secondary (with extra spacing) */}
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
  const [newBatch, setNewBatch] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    shares: '',
    purchase_price: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [myPricesTimeframe, setMyPricesTimeframe] = useState('5D');
  const [loadingMarketData, setLoadingMarketData] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const fileInputRef = useRef(null);
  const [gemScreenerTab, setGemScreenerTab] = useState('screener'); // 'screener', 'topPicks', 'news', 'links'
  const [gemWatchlist, setGemWatchlist] = useState([]);
  const [loadingGems, setLoadingGems] = useState(false);
  const [screenerFilterSector, setScreenerFilterSector] = useState('all');
  const [screenerFilterPriceMin, setScreenerFilterPriceMin] = useState('');
  const [screenerFilterPriceMax, setScreenerFilterPriceMax] = useState('');
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
  const [showDescPopup, setShowDescPopup] = useState(null); // investment id for description popup
  const [showNewsPopup, setShowNewsPopup] = useState(null); // investment id for news popup
  const [investmentNews, setInvestmentNews] = useState({}); // { investmentId: [news] }
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
  const [showPerformance, setShowPerformance] = useState(false);
  
  // Alerts system
  const [alerts, setAlerts] = useState([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState({ ticker: '', name: '', type: 'rsi_oversold', value: 30 });
  const [notifications, setNotifications] = useState([]);
  
  // Earnings calendar
  const [earningsData, setEarningsData] = useState({});
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  
  // AI Analysis
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedStockForAI, setSelectedStockForAI] = useState(null);

  useEffect(() => {
    loadInvestments();
  }, []);

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
            // New fields from enhanced API
            technicals: data.technicals,
            riskMetrics: data.riskMetrics,
            volume: data.volume
          };
          
        } catch (error) {
          console.error(`Error fetching ${originalTicker}:`, error.message);
        }
      }
    }
    
    setStockPrices(prices);
    setLoadingPrices(false);
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

  const autoCalculateAmount = (shares, purchasePrice) => {
    if (shares && purchasePrice) {
      return (parseFloat(shares) * parseFloat(purchasePrice)).toFixed(2);
    }
    return '';
  };

  const addInvestment = async () => {
    if (!newInvestment.name.trim()) return;
    
    const calculatedAmount = newInvestment.shares && newInvestment.purchase_price
      ? parseFloat(newInvestment.shares) * parseFloat(newInvestment.purchase_price)
      : parseFloat(newInvestment.amount) || 0;
    
    try {
      const investment = {
        name: newInvestment.name.trim(),
        type: newInvestment.type,
        amount: calculatedAmount,
        ticker_symbol: newInvestment.ticker_symbol?.trim().toUpperCase() || null,
        shares: newInvestment.shares ? parseFloat(newInvestment.shares) : null,
        purchase_price: newInvestment.purchase_price ? parseFloat(newInvestment.purchase_price) : null,
        sector: newInvestment.sector || null,
        thumbnail_url: newInvestment.thumbnail_url || null,
        circular_thumbnail: newInvestment.circular_thumbnail || false,
        description: newInvestment.description?.trim() || null,
        yahoo_finance_link: newInvestment.yahoo_finance_link?.trim() || null
      };
      
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
      
      setInvestments([...investments, newInv]);
      resetForm();
    } catch (error) {
      console.error('Error adding investment:', error);
      alert('Fout bij toevoegen investering');
    }
  };

  const updateInvestment = async () => {
    if (!editingInvestment || !editingInvestment.name.trim()) return;
    
    const calculatedAmount = editingInvestment.shares && editingInvestment.purchase_price
      ? parseFloat(editingInvestment.shares) * parseFloat(editingInvestment.purchase_price)
      : parseFloat(editingInvestment.amount) || 0;
    
    try {
      const updates = {
        name: editingInvestment.name.trim(),
        type: editingInvestment.type,
        amount: calculatedAmount,
        ticker_symbol: editingInvestment.ticker_symbol?.trim().toUpperCase() || null,
        shares: editingInvestment.shares ? parseFloat(editingInvestment.shares) : null,
        purchase_price: editingInvestment.purchase_price ? parseFloat(editingInvestment.purchase_price) : null,
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
      sector: '',
      thumbnail_url: '',
      circular_thumbnail: false,
      description: '',
      links: [],
      is_short: false
    });
    setShowAddModal(false);
  };

  const calculateTotalValue = (investment) => {
    if (!investment.ticker_symbol || !investment.shares || !stockPrices[investment.ticker_symbol]) {
      return investment.amount;
    }
    // For short positions, value is based on opening price (what you borrowed)
    // For long positions, value is based on current price
    if (investment.is_short) {
      return investment.shares * investment.purchase_price;
    }
    return investment.shares * stockPrices[investment.ticker_symbol].current;
  };

  const calculateProfitLoss = (investment) => {
    if (!investment.ticker_symbol || !investment.shares || !investment.purchase_price || !stockPrices[investment.ticker_symbol]) {
      return { amount: 0, percentage: 0 };
    }
    const currentPrice = stockPrices[investment.ticker_symbol].current;
    const purchasePrice = investment.purchase_price;
    const shares = investment.shares;

    // For short positions: profit when price goes DOWN (purchase - current)
    // For long positions: profit when price goes UP (current - purchase)
    if (investment.is_short) {
      const currentValue = shares * purchasePrice; // Value at opening the short
      const closeValue = shares * currentPrice; // Value at closing the short
      const profitLoss = currentValue - closeValue; // Profit = opening - closing
      const profitLossPercent = (profitLoss / currentValue) * 100;
      return { amount: profitLoss, percentage: profitLossPercent };
    } else {
      const currentValue = shares * currentPrice;
      const purchaseValue = shares * purchasePrice;
      const profitLoss = currentValue - purchaseValue;
      const profitLossPercent = (profitLoss / purchaseValue) * 100;
      return { amount: profitLoss, percentage: profitLossPercent };
    }
  };

  const openEditModal = (investment) => {
    setEditingInvestment({ ...investment });
    setShowAddModal(true);
  };

  // Add a new purchase batch to existing investment
  const addBatchToInvestment = async () => {
    if (!editingInvestment || !newBatch.shares || !newBatch.purchase_price) {
      alert('Vul aantal aandelen en aankoopprijs in');
      return;
    }
    
    const shares = parseFloat(newBatch.shares);
    const price = parseFloat(newBatch.purchase_price);
    const amount = shares * price;
    
    try {
      const batch = await db.investmentBatches.create({
        investment_id: editingInvestment.id,
        purchase_date: newBatch.purchase_date,
        shares,
        purchase_price: price,
        amount,
        notes: newBatch.notes?.trim() || null
      });
      
      // Update local state
      const updatedBatches = [...(editingInvestment.investment_batches || []), batch];
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
      const batch = await db.investmentBatches.create({
        investment_id: editingInvestment.id,
        purchase_date: editingInvestment.created_at ? editingInvestment.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        shares: parseFloat(editingInvestment.shares),
        purchase_price: parseFloat(editingInvestment.purchase_price),
        amount: parseFloat(editingInvestment.amount) || (parseFloat(editingInvestment.shares) * parseFloat(editingInvestment.purchase_price)),
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
    
    // Filter: Only show gems with score >= 30 (true top picks)
    const topPicks = gems.filter(gem => gem.score >= 30);
    
    setGemWatchlist(topPicks);
    setLoadingGems(false);
  };

  // Apple-style chart: fetch Yahoo Finance data for a symbol
  const fetchChartDataForSymbol = async (symbol, timeframe = '1M') => {
    const rangeMap = { '1D': '1d', '1W': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y', '5Y': '5y' };
    const intervalMap = { '1D': '5m', '1W': '15m', '1M': '1d', '3M': '1d', '6M': '1d', '1Y': '1wk', '5Y': '1mo' };
    const range = rangeMap[timeframe] || '1mo';
    const interval = intervalMap[timeframe] || '1d';
    const yahooSymbol = symbol.includes(':') ? tradingViewToYahoo(symbol) : symbol;

    setLoadingChartData(prev => ({ ...prev, [symbol]: true }));
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;
      const response = await axios.get(`${CORS_PROXY}${encodeURIComponent(url)}`);
      const result = response.data.chart.result[0];
      const timestamps = result.timestamp || [];
      const closes = result.indicators.quote[0].close || [];
      const meta = result.meta;

      const data = timestamps.map((ts, i) => ({
        time: ts * 1000,
        price: closes[i],
        label: timeframe === '1D' || timeframe === '1W'
          ? new Date(ts * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
          : new Date(ts * 1000).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
      })).filter(d => d.price !== null);

      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose || (data.length > 0 ? data[0].price : currentPrice);
      const priceChange = currentPrice - previousClose;
      const changePercent = previousClose ? (priceChange / previousClose) * 100 : 0;

      setChartData(prev => ({
        ...prev,
        [symbol]: { data, currentPrice, previousClose, priceChange, changePercent, currency: meta.currency || 'USD', name: meta.shortName || symbol }
      }));
    } catch (error) {
      console.log(`Chart data error for ${symbol}:`, error);
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
    const allNews = [];
    const tickersToFetch = userTickers.slice(0, 6); // Limit to 6 tickers

    for (const { symbol, name } of tickersToFetch) {
      try {
        const yahooSymbol = symbol.includes(':') ? tradingViewToYahoo(symbol) : symbol;
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${yahooSymbol}&newsCount=3&quotesCount=0`;
        const response = await axios.get(`${CORS_PROXY}${encodeURIComponent(url)}`);
        const news = response.data.news || [];
        news.forEach(n => {
          allNews.push({
            title: n.title,
            link: n.link,
            publisher: n.publisher,
            publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000) : null,
            thumbnail: n.thumbnail?.resolutions?.[0]?.url,
            relatedTicker: symbol,
            relatedName: name,
          });
        });
      } catch (e) {
        continue;
      }
    }

    // Sort by date, newest first, remove duplicates by title
    const seen = new Set();
    const uniqueNews = allNews
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
      .filter(n => {
        if (seen.has(n.title)) return false;
        seen.add(n.title);
        return true;
      })
      .slice(0, 12);

    setStockNews(uniqueNews);
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

      // Strategy 3: Company name + "stock" for relevant results
      if (allNews.length < 3) {
        try {
          const cleanName = investment.name.replace(/\s+(Inc|Corp|Ltd|plc|UCITS|ETF|SA|NV|AG|SE|GmbH)\b/gi, '').trim();
          const url3 = `https://query1.finance.yahoo.com/v1/finance/search?q="${cleanName}" stock&newsCount=5&quotesCount=0`;
          const res3 = await axios.get(`${CORS_PROXY}${encodeURIComponent(url3)}`);
          (res3.data.news || []).forEach(n => allNews.push(n));
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
    } catch (e) {
      setInvestmentNews(prev => ({ ...prev, [id]: [] }));
    }
    setLoadingInvNews(prev => ({ ...prev, [id]: false }));
  };

  // Extract ticker from news title or link
  const extractTicker = (title, link) => {
    // Common stock tickers pattern (all caps, 1-5 chars)
    const tickerRegex = /\b([A-Z]{1,5})\b/g;
    const matches = title?.match(tickerRegex) || link?.match(tickerRegex) || [];
    // Filter out common words that might match
    const commonWords = ['THE', 'AND', 'FOR', 'WITH', 'FROM', 'THAT', 'THIS', 'WHAT', 'WHEN', 'WHY', 'HOW', 'ARE', 'WAS', 'WERE', 'BEEN', 'HAVE', 'HAS', 'HAD', 'WILL', 'CAN', 'COULD', 'SHOULD', 'WOULD', 'MAY', 'MIGHT', 'MUST'];
    const tickers = matches.filter(t => !commonWords.includes(t));
    return tickers.length > 0 ? tickers[0] : null;
  };

  // Get Yahoo Finance URL for a symbol (works with all formats)
  const getYahooUrl = (symbol) => {
    const yahooSymbol = symbol.includes(':') ? tradingViewToYahoo(symbol) : symbol;
    return `https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}`;
  };

  // Fetch screener/market news
  const fetchScreenerNews = async () => {
    setLoadingScreenerNews(true);
    const queries = ['stock market today', 'growth stocks investing', 'NVIDIA AI stocks', 'S&P 500 market', 'tech stocks earnings'];
    const allNews = [];

    for (const query of queries) {
      try {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=4&quotesCount=0`;
        const response = await axios.get(`${CORS_PROXY}${encodeURIComponent(url)}`);
        const news = response.data.news || [];
        news.forEach(n => {
          const ticker = extractTicker(n.title, n.link);
          allNews.push({
            title: n.title,
            link: n.link,
            publisher: n.publisher,
            publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000) : null,
            thumbnail: n.thumbnail?.resolutions?.[0]?.url,
            ticker,
          });
        });
      } catch (e) {
        continue;
      }
    }

    const seen = new Set();
    const uniqueNews = allNews
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
      .filter(n => {
        if (seen.has(n.title)) return false;
        seen.add(n.title);
        return true;
      })
      .slice(0, 15);

    setScreenerNews(uniqueNews);
    setLoadingScreenerNews(false);
  };

  // Load news on mount
  useEffect(() => {
    if (userTickers.length > 0) fetchStockNews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments.length]);

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
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
      const res = await axios.get(`${CORS_PROXY}${encodeURIComponent(url)}`);
      const quotes = (res.data.quotes || []).filter(q => q.symbol && q.shortname).map(q => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        sector: q.typeDisp || q.quoteType || '',
        exchange: q.exchDisp || q.exchange || '',
      }));
      setWatchlistResults(quotes);
    } catch (e) {
      setWatchlistResults([]);
    }
    setLoadingWlSearch(false);
  };

  // Screener categories: curated ticker lists
  const SCREENER_CATEGORIES = {
    large: {
      label: 'Top Performers',
      description: 'Grote bedrijven die het goed doen',
      tickers: [
        { ticker: 'AAPL', name: 'Apple', sector: 'Technology' },
        { ticker: 'MSFT', name: 'Microsoft', sector: 'Technology' },
        { ticker: 'NVDA', name: 'NVIDIA', sector: 'Technology' },
        { ticker: 'GOOGL', name: 'Alphabet', sector: 'Technology' },
        { ticker: 'AMZN', name: 'Amazon', sector: 'Consumer' },
        { ticker: 'META', name: 'Meta', sector: 'Technology' },
        { ticker: 'AVGO', name: 'Broadcom', sector: 'Technology' },
        { ticker: 'LLY', name: 'Eli Lilly', sector: 'Healthcare' },
        { ticker: 'V', name: 'Visa', sector: 'Financial' },
        { ticker: 'JPM', name: 'JPMorgan', sector: 'Financial' },
      ]
    },
    growth: {
      label: 'Potentiële Groeiers',
      description: 'Kleine bedrijven met hoog groeipotentieel',
      tickers: [
        { ticker: 'SOUN', name: 'SoundHound AI', sector: 'Technology' },
        { ticker: 'RKLB', name: 'Rocket Lab', sector: 'Industrial' },
        { ticker: 'IONQ', name: 'IonQ', sector: 'Technology' },
        { ticker: 'ASTS', name: 'AST SpaceMobile', sector: 'Technology' },
        { ticker: 'ACHR', name: 'Archer Aviation', sector: 'Industrial' },
        { ticker: 'LUNR', name: 'Intuitive Machines', sector: 'Industrial' },
        { ticker: 'RGTI', name: 'Rigetti Computing', sector: 'Technology' },
        { ticker: 'SERV', name: 'Serve Robotics', sector: 'Technology' },
        { ticker: 'QS', name: 'QuantumScape', sector: 'Industrial' },
        { ticker: 'RXRX', name: 'Recursion Pharma', sector: 'Healthcare' },
      ]
    },
    midcap: {
      label: 'Mid-cap Groeiers',
      description: 'Middelgrote bedrijven in groeifase',
      tickers: [
        { ticker: 'CRWD', name: 'CrowdStrike', sector: 'Technology' },
        { ticker: 'DDOG', name: 'Datadog', sector: 'Technology' },
        { ticker: 'NET', name: 'Cloudflare', sector: 'Technology' },
        { ticker: 'DUOL', name: 'Duolingo', sector: 'Technology' },
        { ticker: 'GTLB', name: 'GitLab', sector: 'Technology' },
        { ticker: 'CELH', name: 'Celsius', sector: 'Consumer' },
        { ticker: 'AXON', name: 'Axon Enterprise', sector: 'Industrial' },
        { ticker: 'PCVX', name: 'Vaxcyte', sector: 'Healthcare' },
        { ticker: 'TMDX', name: 'TransMedics', sector: 'Healthcare' },
        { ticker: 'S', name: 'SentinelOne', sector: 'Technology' },
      ]
    },
    etf: {
      label: 'ETFs',
      description: 'Gepubliceerde indexfondsen voor spreiding',
      tickers: [
        { ticker: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'Materials' },
        { ticker: 'QQQ', name: 'Invesco QQQ Trust', sector: 'Technology' },
        { ticker: 'VGT', name: 'Vanguard Information Tech', sector: 'Technology' },
        { ticker: 'ARKK', name: 'ARK Innovation ETF', sector: 'Technology' },
        { ticker: 'SMH', name: 'Semiconductor ETF', sector: 'Technology' },
        { ticker: 'XLE', name: 'Energy Select Sector SPDR', sector: 'Energy' },
        { ticker: 'XLV', name: 'Health Care Select Sector', sector: 'Healthcare' },
        { ticker: 'XLF', name: 'Financial Select Sector', sector: 'Financial' },
        { ticker: 'IJH', name: 'iShares Core S&P Mid-Cap', sector: 'Materials' },
        { ticker: 'IWM', name: 'iShares Russell 2000', sector: 'Materials' },
      ]
    }
  };

  // Fetch live data for screener category tickers
  const fetchScreenerCategoryData = async (category) => {
    const tickers = SCREENER_CATEGORIES[category]?.tickers || [];
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
        newScreenerData[stock.ticker] = {
          currentPrice: stock.currentPrice,
          dailyChange: stock.dailyChange,
          growth6mo: stock.growth6mo,
          growth1mo: stock.growth1mo,
          growth1yr: stock.growth1yr,
          sparkline: stock.sparkline || [],
          currency: stock.currency,
          recommendation: null,
          rsi: stock.rsi,
          macd: null,
          sma50: stock.sma50,
          sma200: stock.sma200,
          signal: {
            overall: stock.signal,
            score: stock.signalScore,
            reasons: stock.signalReasons
          },
          volume: stock.currentVolume,
          avgVolume: stock.avgVolume20d,
          volumeRatio: stock.volumeRatio,
          marketCap: stock.marketCap,
          qualityScore: stock.qualityScore,
          opportunityType: stock.opportunityType,
          qualityFactors: stock.qualityFactors,
          maxDrawdown30d: stock.maxDrawdown30d,
          volatility30d: stock.volatility30d
        };
      });
      
      setScreenerData(newScreenerData);
      
    } catch (error) {
      console.error('Screener API error:', error);
    }

    setLoadingScreenerData(false);
  };

  // Auto-fetch screener data when category changes
  useEffect(() => {
    fetchScreenerCategoryData(screenerCategory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenerCategory]);

  // Also fetch data for watchlist items not yet loaded
  useEffect(() => {
    const fetchWatchlistData = async () => {
      for (const item of myWatchlist) {
        if (screenerData[item.ticker] || stockPrices[item.ticker]) continue;
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${item.ticker}?interval=1d&range=1y`;
          const response = await axios.get(`${CORS_PROXY}${encodeURIComponent(url)}`);
          const result = response.data.chart.result[0];
          const meta = result.meta;
          const closes = result.indicators.quote[0].close.filter(p => p !== null);
          if (closes.length < 5) continue;
          const currentPrice = meta.regularMarketPrice;
          const yesterdayClose = closes.length >= 2 ? closes[closes.length - 2] : meta.previousClose;
          const dailyChange = yesterdayClose ? ((currentPrice - yesterdayClose) / yesterdayClose) * 100 : 0;
          const price1yrAgo = closes[0];
          const growth1yr = price1yrAgo ? ((currentPrice - price1yrAgo) / price1yrAgo) * 100 : 0;
          const halfIdx = Math.floor(closes.length / 2);
          const price6moAgo = closes[halfIdx] || closes[0];
          const growth6mo = price6moAgo ? ((currentPrice - price6moAgo) / price6moAgo) * 100 : 0;
          const price1moAgo = closes.length >= 22 ? closes[closes.length - 22] : closes[0];
          const growth1mo = price1moAgo ? ((currentPrice - price1moAgo) / price1moAgo) * 100 : 0;
          const sparkline = closes.slice(-30);
          setScreenerData(prev => ({ ...prev, [item.ticker]: { currentPrice, dailyChange, growth6mo, growth1mo, growth1yr, sparkline, currency: meta.currency || 'USD' } }));
        } catch (e) { continue; }
      }
    };
    if (myWatchlist.length > 0) fetchWatchlistData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myWatchlist.length]);

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
  const fetchEarningsData = async () => {
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
    const data = await earningsCalendar.fetchMultipleEarnings(allTickers);
    
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
    
    const result = await aiAnalyzer.analyzeStock(stockData);
    setAiAnalysis(result);
    setLoadingAI(false);
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
        acc[inv.ticker_symbol].totalInvested += (inv.amount || 0);
        return acc;
      }, {})
  );

  const totalInvestment = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // Live portfolio value based on current stock prices
  const totalLiveValue = investments.reduce((sum, inv) => {
    if (inv.ticker_symbol && inv.shares && stockPrices[inv.ticker_symbol]) {
      return sum + (inv.shares * stockPrices[inv.ticker_symbol].current);
    }
    return sum + (inv.amount || 0);
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

      {/* Portfolio Overview Card */}
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
                {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLossPercent.toFixed(2)}%
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
                            <span className="text-white/40">€{(value / 1000).toFixed(1)}k</span>
                            <span className="text-white font-medium min-w-[35px] text-right">{percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          )}
        </div>

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
                      : parseFloat(inv.amount) || 0;
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
                                title={`${type}: ${percentage.toFixed(1)}%`}
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
                                  <span className="text-white/40">€{(value / 1000).toFixed(1)}k</span>
                                  <span className="text-white font-medium min-w-[45px] text-right">{percentage.toFixed(1)}%</span>
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
                      : parseFloat(inv.amount) || 0;
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
                              title={`${sector}: ${percentage.toFixed(1)}%`}
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
                                <span className="text-white/40">€{(value / 1000).toFixed(1)}k</span>
                                <span className="text-white font-medium min-w-[45px] text-right">{percentage.toFixed(1)}%</span>
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
                  <p className={`text-lg font-bold ${totalProfitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalProfitLossPercent >= 0 ? '+' : ''}{totalProfitLossPercent.toFixed(2)}%
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
                      <p className="text-green-400 text-lg font-bold">+{best.percentage.toFixed(1)}%</p>
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
                      <p className="text-red-400 text-lg font-bold">{worst.percentage.toFixed(1)}%</p>
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

      {/* Search Bar + Filter Tabs */}
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
                        {investment.sector && (
                          <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded text-blue-300">
                            {investment.sector}
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
                        {stockPrice.currency === 'EUR' ? '€' : '$'}{stockPrice.current.toFixed(2)}
                      </span>
                      <div className={`flex items-center space-x-1 ${stockPrice.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stockPrice.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="text-sm font-semibold">
                          {stockPrice.change >= 0 ? '+' : ''}{stockPrice.change.toFixed(2)} ({stockPrice.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analyst Meter (Analyst + Momentum) */}
                <AnalystMeter 
                  recommendation={null} // No analyst data for personal investments yet
                  growthData={stockPrice?.growthData || null}
                />

                {/* Investment Details */}
                <div className="space-y-2 mb-4">
                  {investment.shares && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Aandelen</span>
                      <span className="text-white">{investment.shares % 1 === 0 ? investment.shares : investment.shares.toFixed(4)}</span>
                    </div>
                  )}
                  {investment.purchase_price && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Aankoopprijs</span>
                      <span className="text-white">€{parseFloat(investment.purchase_price) % 1 === 0 ? parseFloat(investment.purchase_price) : parseFloat(investment.purchase_price).toFixed(2)}</span>
                    </div>
                  )}
                  {investment.shares && investment.purchase_price && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Bedrag (berekend)</span>
                      <span className="text-white">€{(investment.shares * investment.purchase_price).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className={`flex justify-between text-sm p-2 rounded-lg ${stockPrice && investment.shares && investment.purchase_price ? (profitLoss.amount >= 0 ? 'bg-green-500/10' : 'bg-red-500/10') : 'bg-white/5'}`}>
                    <span className="text-white/60 font-medium">Huidige Waarde</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-bold">
                        €{currentValue % 1 === 0 ? currentValue : currentValue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {stockPrice && investment.shares && investment.purchase_price && (
                        <span className={`text-xs font-semibold ${profitLoss.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {profitLoss.amount >= 0 ? '+' : ''}{profitLoss.percentage.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profit/Loss */}
                {stockPrice && investment.shares && investment.purchase_price && (
                  <div className={`p-3 rounded-lg ${profitLoss.amount >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Winst/Verlies (live)</span>
                      <div className={`flex items-center space-x-1 ${profitLoss.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profitLoss.amount >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="font-semibold">
                          {profitLoss.amount >= 0 ? '+' : ''}€{Math.abs(profitLoss.amount).toFixed(2)} ({profitLoss.percentage.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
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
              </div>
            );
          })
        )}
      </div>

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
                <div className="space-y-3">
                  {news.map((n, i) => (
                    <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="block hover:bg-white/5 rounded-lg p-3 -mx-1 transition-colors border border-white/5">
                      <p className="text-white text-sm font-medium hover:text-cyan-300 leading-snug">{n.title}</p>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className="text-white/40 text-xs">{n.publisher}</span>
                        {n.publishedAt && <span className="text-white/30 text-xs">{n.publishedAt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>}
                        <ExternalLink className="w-3 h-3 text-white/20" />
                      </div>
                    </a>
                  ))}
                </div>
              )}
              {!loading && news.length === 0 && (
                <p className="text-white/40 text-sm text-center py-4">Geen nieuws gevonden voor {inv.name}</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Apple-style Stock Widgets - Eigen aandelen koersen */}
      {userTickers.length > 0 && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {userTickers.map(({ symbol, name, totalShares, totalInvested, purchasePrice }) => {
              const price = stockPrices[symbol];
              if (!price) return null;
              const isPositive = price.change >= 0;
              const currencySymbol = price.currency === 'EUR' ? '€' : '$';
              const liveValue = totalShares * price.current;
              const profitLoss = liveValue - totalInvested;
              const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
              const plPositive = profitLoss >= 0;
              
              const marketOpen = isMarketOpen(price.currency);
              return (
                <div key={symbol} className="glass-effect rounded-lg p-2.5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
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
                        width={60}
                        height={24}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm">
                        {currencySymbol}{price.current.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[10px] font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{price.changePercent.toFixed(1)}%
                      </span>
                    </div>
                    {totalInvested > 0 && (
                      <div className={`text-right`}>
                        <span className={`text-xs font-bold ${plPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {plPositive ? '+' : ''}€{Math.abs(profitLoss).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[10px] block ${plPositive ? 'text-green-400/70' : 'text-red-400/70'}`}>
                          {plPositive ? '+' : ''}{profitLossPercent.toFixed(1)}%
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

      {/* News Widget - Eigen Aandelen */}
      {userTickers.length > 0 && (
        <div className="gradient-card rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white text-xl font-semibold flex items-center space-x-2">
                <Newspaper className="w-5 h-5" />
                <span>Nieuws over mijn aandelen</span>
              </h2>
              <p className="text-white/60 text-sm">Laatste nieuws over jouw portfolio</p>
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
                          <span className="text-white/30 text-xs">
                            {article.publishedAt.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} {article.publishedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              ))}
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

      {/* Hidden Gems Screener */}
      <div className="gradient-card rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white text-xl font-semibold flex items-center space-x-2">
              <span>💎</span>
              <span>Hidden Gems Screener</span>
            </h2>
            <p className="text-white/60 text-sm">Ontdek groeibedrijven met potentieel</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2 mb-6 flex-wrap gap-y-2">
          <button
            onClick={() => setGemScreenerTab('screener')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${gemScreenerTab === 'screener' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30' : 'glass-effect text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Top Aandelen</span>
          </button>
          <button
            onClick={() => { setGemScreenerTab('news'); if (screenerNews.length === 0) fetchScreenerNews(); }}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${gemScreenerTab === 'news' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30' : 'glass-effect text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <Newspaper className="w-4 h-4" />
            <span>Markt Nieuws</span>
          </button>
          <button
            onClick={() => setGemScreenerTab('links')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${gemScreenerTab === 'links' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30' : 'glass-effect text-white/70 hover:text-white hover:bg-white/10'}`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Handige Links</span>
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
              {loadingScreenerData && <Activity className="w-4 h-4 text-blue-400 animate-pulse" />}
            </div>
            <p className="text-white/40 text-xs mb-3">{SCREENER_CATEGORIES[screenerCategory].description} • Breed overzicht van interessante aandelen/ETFs</p>
            
            {/* Unified Sort & Filters Widget */}
            <div className="glass-effect rounded-xl p-4 mb-4">
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
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                    <span className="text-white/30">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={screenerFilterPriceMax}
                      onChange={(e) => setScreenerFilterPriceMax(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
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
                
                {(screenerFilterSector !== 'all' || screenerFilterPriceMin || screenerFilterPriceMax) && (
                  <button
                    onClick={() => {
                      setScreenerFilterSector('all');
                      setScreenerFilterPriceMin('');
                      setScreenerFilterPriceMax('');
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
              const allStocks = SCREENER_CATEGORIES[screenerCategory].tickers
                .map((stock) => ({ ...stock, data: screenerData[stock.ticker] }))
                .filter(item => {
                  if (!item.data) return false;
                  const d = item.data;
                  const sig = d.signal?.overall;
                  
                  // === HARD EXCLUSIONS - Never show these ===
                  // 1. Strong Sell = professionals say avoid
                  if (sig === 'STRONG SELL') return false;
                  
                  // 2. All-around losers: declining on every timeframe
                  const allDeclining = (d.dailyChange < 0 && d.growth1mo < 0 && d.growth6mo < 0 && d.growth1yr < 0);
                  if (allDeclining) return false;
                  
                  // 3. Sell signal + recent decline = falling knife
                  if (sig === 'SELL' && d.growth1mo < 0) return false;
                  
                  // 4. Overbought + reversing (RSI > 80 + recent decline)
                  if (d.rsi > 80 && d.growth1mo < -3) return false;
                  
                  // === OPPORTUNITY PATHS - At least ONE must apply ===
                  
                  // PATH 1: ESTABLISHED WINNER
                  // Long-term proven performer still going strong
                  const isEstablishedWinner = d.growth1yr > 15 && d.growth1mo > -5;
                  
                  // PATH 2: STRONG MOMENTUM
                  // Big recent gains - hot stock right now
                  const hasStrongMomentum = d.growth1mo > 10 && sig !== 'SELL';
                  
                  // PATH 3: BUY SIGNAL CONFIRMED
                  // Technical buy signal + not falling apart
                  const hasBuySignal = (sig === 'STRONG BUY' || sig === 'BUY') && d.growth1mo > -8;
                  
                  // PATH 4: RECOVERY/TURNAROUND
                  // Strong recent rally suggesting turnaround
                  const isRecovery = d.growth1mo > 20 && d.growth6mo > -30;
                  
                  // PATH 5: STEADY GROWER
                  // Consistent positive performance
                  const isSteadyGrower = d.growth6mo > 5 && d.growth1mo > 0;
                  
                  // PATH 6: OVERSOLD BOUNCE OPPORTUNITY
                  // Beaten down stock with buy signal (deep value)
                  const isOversoldOpportunity = d.rsi < 35 && (sig === 'BUY' || sig === 'STRONG BUY') && d.growth1mo > -10;
                  
                  return isEstablishedWinner || hasStrongMomentum || hasBuySignal || 
                         isRecovery || isSteadyGrower || isOversoldOpportunity;
                });
              
              // Apply filters
              const filteredStocks = allStocks.filter(item => {
                // Sector filter
                if (screenerFilterSector !== 'all' && !item.sector.includes(screenerFilterSector)) return false;
                
                // Price filter
                const price = item.data.currentPrice;
                if (screenerFilterPriceMin && price < parseFloat(screenerFilterPriceMin)) return false;
                if (screenerFilterPriceMax && price > parseFloat(screenerFilterPriceMax)) return false;
                
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredStocks.map((stock) => {
                const sd = stock.data;
                const inWatchlist = myWatchlist.some(w => w.ticker === stock.ticker);
                const currSym = sd?.currency === 'EUR' ? '€' : '$';

                return (
                  <a
                    key={stock.ticker}
                    href={`https://finance.yahoo.com/quote/${stock.ticker}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block glass-effect rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
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
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap gap-y-1">
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">{stock.sector}</span>
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
                          <p className="text-white font-bold text-lg">{currSym}{sd.currentPrice.toFixed(2)}</p>
                          <div className="flex items-center space-x-2">
                            <div className="text-center min-w-[32px]">
                              <p className="text-white/40 text-[10px]">Dag</p>
                              <p className={`text-xs font-bold ${sd.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {sd.dailyChange >= 0 ? '+' : ''}{sd.dailyChange.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-center min-w-[32px]">
                              <p className="text-white/40 text-[10px]">1M</p>
                              <p className={`text-xs font-bold ${sd.growth1mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {sd.growth1mo >= 0 ? '+' : ''}{sd.growth1mo.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-center min-w-[32px]">
                              <p className="text-white/40 text-[10px]">6M</p>
                              <p className={`text-xs font-bold ${sd.growth6mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {sd.growth6mo >= 0 ? '+' : ''}{sd.growth6mo.toFixed(1)}%
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
                            sd.rsi < 30 ? 'bg-green-500/20 text-green-400' :
                            sd.rsi > 70 ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/10 text-blue-300'
                          }`}>
                            RSI: {sd.rsi.toFixed(0)}
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
                          {/* Volume Badge */}
                          {sd.volume && sd.avgVolume && (
                            <div className={`text-[10px] px-2 py-0.5 rounded ${
                              sd.volume > sd.avgVolume * 1.5 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-white/40'
                            }`}>
                              Vol: {sd.volume > sd.avgVolume * 1.5 ? 'Hoog' : 'Normaal'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Analyst Recommendation Meter */}
                    {sd && <AnalystMeter recommendation={sd.recommendation} growthData={sd} />}

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => { e.preventDefault();
                          setNewInvestment({ name: stock.name, type: 'aandeel', amount: '', ticker_symbol: stock.ticker, shares: '', purchase_price: sd?.currentPrice?.toString() || '', sector: stock.sector, thumbnail_url: '', circular_thumbnail: false, description: '', links: [] });
                          setShowAddModal(true);
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xs font-medium px-2 py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Portfolio</span>
                      </button>
                      <button
                        onClick={(e) => { 
                          e.preventDefault(); 
                          analyzeStockWithAI({ ...sd, ticker: stock.ticker, name: stock.name, sector: stock.sector });
                        }}
                        className="px-2 py-1.5 rounded-lg text-xs flex items-center space-x-1 transition-all glass-effect text-purple-400 hover:bg-purple-500/20"
                        title="AI Analyse"
                      >
                        <Sparkles className="w-3 h-3" />
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
                );
              })}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Market News - Dutch summaries */}
        {gemScreenerTab === 'news' && (
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

            {loadingGems && (
              <div className="text-center py-12">
                <Activity className="w-8 h-8 text-purple-400 animate-pulse mx-auto mb-3" />
                <p className="text-white/60 text-sm">Aandelen scannen... ({GEM_CANDIDATES.length} kandidaten)</p>
                <p className="text-white/40 text-xs mt-1">Dit kan even duren door API limieten</p>
              </div>
            )}

            {!loadingGems && gemWatchlist.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gemWatchlist.map((gem, index) => {
                  const currSymbol = gem.currency === 'EUR' ? '€' : '$';
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
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${scoreColor} flex items-center justify-center text-white text-xs font-bold`}>
                            {gem.score}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-white font-semibold text-sm">{gem.name}</h4>
                              <span className="text-white/40 text-xs">{gem.ticker}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">{gem.sector}</span>
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${gem.score >= 30 ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>{scoreLabel}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Sparkline data={gem.sparkline} color={gem.growth6mo >= 0 ? '#4ade80' : '#f87171'} width={70} height={28} />
                        </div>
                      </div>

                      {/* Why */}
                      <p className="text-white/50 text-xs mb-3 italic">{gem.why}</p>

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-white/40 text-xs">Koers</p>
                          <p className="text-white font-bold text-sm">{currSymbol}{gem.currentPrice.toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-white/40 text-xs">Market Cap</p>
                          <p className="text-white font-bold text-sm">{currSymbol}{formatMcap(gem.marketCap)}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-white/40 text-xs">Volatiliteit</p>
                          <p className="text-white font-bold text-sm">{gem.volatility.toFixed(0)}%</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="text-center">
                          <p className="text-white/40 text-xs">Dag</p>
                          <p className={`text-xs font-bold ${gem.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {gem.dailyChange >= 0 ? '+' : ''}{gem.dailyChange.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-xs">1M</p>
                          <p className={`text-xs font-bold ${gem.growth1mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {gem.growth1mo >= 0 ? '+' : ''}{gem.growth1mo.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-xs">6M</p>
                          <p className={`text-xs font-bold ${gem.growth6mo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {gem.growth6mo >= 0 ? '+' : ''}{gem.growth6mo.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-xs">52W Pos</p>
                          <p className="text-xs font-bold text-white">{gem.positionIn52w.toFixed(0)}%</p>
                        </div>
                      </div>

                      {/* Technical Indicators */}
                      {gem.rsi && (
                        <div className="mb-3 pb-3 border-b border-white/5">
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
                              gem.rsi < 30 ? 'bg-green-500/20 text-green-400' :
                              gem.rsi > 70 ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/10 text-blue-300'
                            }`}>
                              RSI: {gem.rsi.toFixed(0)}
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
                          {gem.trailingPE && <span className="text-white/40">P/E: <span className="text-white/70">{gem.trailingPE.toFixed(1)}</span></span>}
                          {gem.forwardPE && <span className="text-white/40">Fwd P/E: <span className="text-white/70">{gem.forwardPE.toFixed(1)}</span></span>}
                          {gem.pegRatio && <span className="text-white/40">PEG: <span className={`${gem.pegRatio < 1.5 ? 'text-green-400' : 'text-white/70'}`}>{gem.pegRatio.toFixed(2)}</span></span>}
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
                              links: []
                            });
                            setShowAddModal(true);
                          }}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center justify-center space-x-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Portfolio</span>
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
            )}

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

        {/* External Screener Links */}
        {gemScreenerTab === 'links' && (
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
      </div>

      {/* Watchlist Widget */}
      <div className="gradient-card rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white text-xl font-semibold flex items-center space-x-2">
              <Eye className="w-5 h-5 text-yellow-400" />
              <span>Mijn Watchlist</span>
            </h2>
            <p className="text-white/60 text-sm">{myWatchlist.length} aandelen in de gaten gehouden</p>
          </div>
        </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myWatchlist.map((item) => {
              const sd = screenerData[item.ticker] || {};
              const sp = stockPrices[item.ticker];
              const hasData = sd.currentPrice || sp;
              const price = sd.currentPrice || sp?.current || 0;
              const daily = sd.dailyChange || sp?.changePercent || 0;
              const sparkData = sd.sparkline || sp?.sparklineData;
              const currSym = (sd.currency === 'EUR' || sp?.currency === 'EUR') ? '€' : '$';
              const isUp = daily >= 0;

              return (
                <a
                  key={item.ticker}
                  href={`https://finance.yahoo.com/quote/${item.ticker}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-effect rounded-lg p-3 hover:bg-white/10 transition-all block"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-white font-bold text-sm">{item.ticker}</span>
                          <span className="text-white/50 text-xs truncate">{item.name}</span>
                        </div>
                        {item.sector && <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">{item.sector}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {sparkData && <Sparkline data={sparkData} color={isUp ? '#4ade80' : '#f87171'} width={50} height={20} />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {hasData ? (
                        <>
                          <span className="text-white font-bold text-sm">{currSym}{price.toFixed(2)}</span>
                          <span className={`text-xs font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {isUp ? '+' : ''}{daily.toFixed(1)}%
                          </span>
                          {sd.growth1mo !== undefined && (
                            <span className={`text-xs ${sd.growth1mo >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                              1M: {sd.growth1mo >= 0 ? '+' : ''}{sd.growth1mo.toFixed(1)}%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-white/30 text-xs">Laden...</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          setNewInvestment({ name: item.name, type: 'aandeel', amount: '', ticker_symbol: item.ticker, shares: '', purchase_price: price > 0 ? price.toString() : '', sector: item.sector || '', thumbnail_url: '', circular_thumbnail: false, description: '', links: [] });
                          setShowAddModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 p-1 transition-colors"
                        title="Toevoegen aan portfolio"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromWatchlist(item.ticker); }}
                        className="text-red-400/50 hover:text-red-400 p-1 transition-colors"
                        title="Verwijder uit watchlist"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Analyst Recommendation Meter */}
                  {sd && <AnalystMeter recommendation={sd.recommendation} growthData={sd} />}
                </a>
              );
            })}
          </div>
        )}

        {myWatchlist.length === 0 && !watchlistSearch && (
          <p className="text-white/30 text-sm text-center py-4">Gebruik de zoekbalk om aandelen toe te voegen aan je watchlist</p>
        )}
      </div>

      {/* Apple-style Charts */}
      <div className="gradient-card rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-xl font-semibold">Grafieken</h2>
            <p className="text-white/60 text-sm">Live koersgrafieken via Yahoo Finance</p>
          </div>
          <button
            onClick={() => setShowChartModal(true)}
            className="glass-effect px-3 py-2 rounded-lg flex items-center space-x-2 text-white hover:bg-white/20 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Grafiek toevoegen</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User's own tickers */}
          {userTickers.map(({ symbol, name }) => {
            const cd = chartData[symbol];
            const tf = selectedChartTimeframe[symbol] || '1M';
            const isUp = cd ? cd.changePercent >= 0 : true;
            const chartColor = isUp ? '#34d399' : '#f87171';
            const gradientId = `grad_${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;
            const currSym = cd?.currency === 'EUR' ? '€' : '$';

            return (
              <div key={`inv_${symbol}`} className="glass-effect rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-blue-500/80 text-white px-1.5 py-0.5 rounded">Mijn aandeel</span>
                      <a
                        href={getYahooUrl(symbol)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-semibold text-base hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        {name}
                      </a>
                    </div>
                    <span className="text-white/40 text-xs">{symbol}</span>
                  </div>
                  {cd && (
                    <div className="text-right">
                      <p className="text-white font-bold text-xl">{currSym}{cd.currentPrice?.toFixed(2)}</p>
                      <p className={`text-sm font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{cd.priceChange?.toFixed(2)} ({cd.changePercent?.toFixed(2)}%)
                      </p>
                    </div>
                  )}
                </div>

                {/* Timeframe selector */}
                <div className="flex items-center space-x-1 mb-2">
                  {['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'].map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedChartTimeframe(prev => ({ ...prev, [symbol]: t }));
                        fetchChartDataForSymbol(symbol, t);
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${tf === t ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Chart */}
                {loadingChartData[symbol] && !cd && (
                  <div className="h-48 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white/30 animate-pulse" />
                  </div>
                )}
                {cd && cd.data.length > 0 && (
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cd.data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          formatter={(val) => [`${currSym}${val?.toFixed(2)}`, 'Koers']}
                          labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                        />
                        <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })}

          {/* Chart favorites */}
          {chartFavorites.map((chart, index) => {
            const symbol = chart.symbol;
            const cd = chartData[symbol];
            const tf = selectedChartTimeframe[symbol] || '1M';
            const isUp = cd ? cd.changePercent >= 0 : true;
            const chartColor = isUp ? '#34d399' : '#f87171';
            const gradientId = `grad_fav_${index}`;
            const currSym = cd?.currency === 'EUR' ? '€' : cd?.currency === 'GBP' ? '£' : '$';

            return (
              <div key={`fav_${index}`} className="glass-effect rounded-xl p-4 relative">
                <button
                  onClick={() => removeChartFavorite(index)}
                  className="absolute top-2 right-2 bg-red-500/60 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>

                <div className="flex items-center justify-between mb-1">
                  <div>
                    <a
                      href={getYahooUrl(symbol)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white font-semibold text-base hover:text-purple-300 transition-colors cursor-pointer"
                    >
                      {cd?.name || chart.name}
                    </a>
                    <span className="text-white/40 text-xs">{symbol}</span>
                  </div>
                  {cd && (
                    <div className="text-right">
                      <p className="text-white font-bold text-xl">{currSym}{cd.currentPrice?.toFixed(2)}</p>
                      <p className={`text-sm font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{cd.priceChange?.toFixed(2)} ({cd.changePercent?.toFixed(2)}%)
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1 mb-2">
                  {['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'].map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedChartTimeframe(prev => ({ ...prev, [symbol]: t }));
                        fetchChartDataForSymbol(symbol, t);
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${tf === t ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {loadingChartData[symbol] && !cd && (
                  <div className="h-48 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white/30 animate-pulse" />
                  </div>
                )}
                {cd && cd.data.length > 0 && (
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cd.data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          formatter={(val) => [`${currSym}${val?.toFixed(2)}`, 'Koers']}
                          labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                        />
                        <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {chartFavorites.length === 0 && userTickers.length === 0 && (
          <div className="text-center py-8">
            <BarChart2 className="w-12 h-12 text-white/30 mx-auto mb-3" />
            <p className="text-white/60">Nog geen grafieken. Klik "Nieuwe Grafiek" om te beginnen.</p>
          </div>
        )}
      </div>

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
                </select>
              </div>
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

              {/* Live Stock Tracking */}
              <div className="border-t border-white/10 pt-4">
                <p className="text-white/70 text-sm mb-3 font-semibold">Live Koersen Tracking (optioneel)</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Ticker Symbol</label>
                    <input
                      type="text"
                      value={editingInvestment ? editingInvestment.ticker_symbol || '' : newInvestment.ticker_symbol}
                      onChange={(e) => editingInvestment
                        ? setEditingInvestment({...editingInvestment, ticker_symbol: e.target.value})
                        : setNewInvestment({...newInvestment, ticker_symbol: e.target.value})
                      }
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
                            setEditingInvestment({
                              ...editingInvestment, 
                              shares,
                              amount: autoCalculateAmount(shares, pp)
                            });
                          } else {
                            const pp = newInvestment.purchase_price || '';
                            setNewInvestment({
                              ...newInvestment, 
                              shares,
                              amount: autoCalculateAmount(shares, pp)
                            });
                          }
                        }}
                        className="w-full input-plain rounded-lg px-3 py-2"
                        placeholder="10.5"
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Aankoopprijs (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingInvestment ? editingInvestment.purchase_price || '' : newInvestment.purchase_price}
                        onChange={(e) => {
                          const pp = e.target.value;
                          if (editingInvestment) {
                            const shares = editingInvestment.shares || '';
                            setEditingInvestment({
                              ...editingInvestment, 
                              purchase_price: pp,
                              amount: autoCalculateAmount(shares, pp)
                            });
                          } else {
                            const shares = newInvestment.shares || '';
                            setNewInvestment({
                              ...newInvestment, 
                              purchase_price: pp,
                              amount: autoCalculateAmount(shares, pp)
                            });
                          }
                        }}
                        className="w-full input-plain rounded-lg px-3 py-2"
                        placeholder="150.00"
                      />
                    </div>
                  </div>

                  {/* Auto-calculated amount */}
                  {(() => {
                    const s = editingInvestment ? editingInvestment.shares : newInvestment.shares;
                    const p = editingInvestment ? editingInvestment.purchase_price : newInvestment.purchase_price;
                    const calc = autoCalculateAmount(s, p);
                    return calc ? (
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-white/60 text-sm">
                            {editingInvestment && editingInvestment.investment_batches?.length > 0 
                              ? 'Totaal bedrag (alle aankopen)' 
                              : 'Berekend bedrag'}
                          </span>
                          <span className="text-green-400 font-bold">€{parseFloat(calc).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {editingInvestment && editingInvestment.investment_batches?.length > 0 && (
                          <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/10">
                            <span className="text-white/40 text-xs">Gemiddelde aankoopprijs</span>
                            <span className="text-white/80 text-xs font-semibold">€{parseFloat(p).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

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
                                  <span className="text-white/80 text-sm">
                                    €{parseFloat(batch.purchase_price).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-white/40 text-xs">=</span>
                                  <span className="text-green-400 text-sm font-semibold">
                                    €{parseFloat(batch.amount).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
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
                            <span className="text-white/80">
                              €{(editingInvestment.investment_batches.reduce((s, b) => s + parseFloat(b.amount || 0), 0) / 
                                 Math.max(0.0001, editingInvestment.investment_batches.reduce((s, b) => s + parseFloat(b.shares || 0), 0))
                                ).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} avg
                            </span>
                            <span className="text-green-400 font-bold">
                              €{editingInvestment.investment_batches.reduce((s, b) => s + parseFloat(b.amount || 0), 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
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
                  <label className="block text-white/70 text-sm mb-1">Aankoopprijs (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBatch.purchase_price}
                    onChange={(e) => setNewBatch({...newBatch, purchase_price: e.target.value})}
                    className="w-full input-plain rounded-lg px-3 py-2"
                    placeholder="150.00"
                  />
                </div>
              </div>

              {/* Live calculation */}
              {newBatch.shares && newBatch.purchase_price && (
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Totaal bedrag</span>
                    <span className="text-green-400 font-bold">
                      €{(parseFloat(newBatch.shares) * parseFloat(newBatch.purchase_price)).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      />
    </div>
  );
};

export default BeleggenPage;
