import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, Edit, Trash2, Search, ExternalLink, Link as LinkIcon, X, TrendingDown, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { db } from '../utils/supabaseClient';

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

const BeleggenPage = () => {
  const [investments, setInvestments] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    type: 'aandeel',
    amount: '',
    ticker_symbol: '',
    shares: '',
    purchase_price: '',
    links: []
  });
  const [stockPrices, setStockPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState({});
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [loadingMarketData, setLoadingMarketData] = useState(false);

  useEffect(() => {
    loadInvestments();
  }, []);

  useEffect(() => {
    if (investments.length > 0) {
      fetchStockPrices();
      // Refresh prices every 60 seconds
      const interval = setInterval(fetchStockPrices, 60000);
      return () => clearInterval(interval);
    }
  }, [investments]);

  useEffect(() => {
    fetchMarketData();
  }, [selectedTimeframe]);

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

  const fetchStockPrices = async () => {
    setLoadingPrices(true);
    const prices = {};
    
    for (const inv of investments) {
      if (inv.ticker_symbol) {
        try {
          // Using Yahoo Finance API via RapidAPI (free tier)
          // You can also use Alpha Vantage, Finnhub, or IEX Cloud
          const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${inv.ticker_symbol}`, {
            params: {
              interval: '1d',
              range: '1d'
            }
          });
          
          const result = response.data.chart.result[0];
          const currentPrice = result.meta.regularMarketPrice;
          const previousClose = result.meta.previousClose;
          const change = currentPrice - previousClose;
          const changePercent = (change / previousClose) * 100;
          
          prices[inv.ticker_symbol] = {
            current: currentPrice,
            change: change,
            changePercent: changePercent,
            previousClose: previousClose
          };
        } catch (error) {
          console.error(`Error fetching price for ${inv.ticker_symbol}:`, error);
          // Fallback: use mock data for demo
          prices[inv.ticker_symbol] = {
            current: inv.purchase_price || 100,
            change: 0,
            changePercent: 0,
            previousClose: inv.purchase_price || 100
          };
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

  const addInvestment = async () => {
    if (!newInvestment.name.trim() || !newInvestment.amount) return;
    
    try {
      const investment = {
        name: newInvestment.name.trim(),
        type: newInvestment.type,
        amount: parseFloat(newInvestment.amount),
        ticker_symbol: newInvestment.ticker_symbol?.trim().toUpperCase() || null,
        shares: newInvestment.shares ? parseFloat(newInvestment.shares) : null,
        purchase_price: newInvestment.purchase_price ? parseFloat(newInvestment.purchase_price) : null
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
    if (!editingInvestment || !editingInvestment.name.trim() || !editingInvestment.amount) return;
    
    try {
      const updates = {
        name: editingInvestment.name.trim(),
        type: editingInvestment.type,
        amount: parseFloat(editingInvestment.amount),
        ticker_symbol: editingInvestment.ticker_symbol?.trim().toUpperCase() || null,
        shares: editingInvestment.shares ? parseFloat(editingInvestment.shares) : null,
        purchase_price: editingInvestment.purchase_price ? parseFloat(editingInvestment.purchase_price) : null
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
      links: []
    });
    setShowAddModal(false);
  };

  const calculateTotalValue = (investment) => {
    if (!investment.ticker_symbol || !investment.shares || !stockPrices[investment.ticker_symbol]) {
      return investment.amount;
    }
    return investment.shares * stockPrices[investment.ticker_symbol].current;
  };

  const calculateProfitLoss = (investment) => {
    if (!investment.ticker_symbol || !investment.shares || !investment.purchase_price || !stockPrices[investment.ticker_symbol]) {
      return { amount: 0, percentage: 0 };
    }
    const currentValue = investment.shares * stockPrices[investment.ticker_symbol].current;
    const purchaseValue = investment.shares * investment.purchase_price;
    const profitLoss = currentValue - purchaseValue;
    const profitLossPercent = (profitLoss / purchaseValue) * 100;
    return { amount: profitLoss, percentage: profitLossPercent };
  };

  const openEditModal = (investment) => {
    setEditingInvestment({ ...investment });
    setShowAddModal(true);
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

  const filteredInvestments = investments.filter(inv =>
    inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInvestment = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">Beleggen</h1>
          <p className="text-white/60">Track je aandelen en ETF investeringen</p>
        </div>
        <div className="flex items-center space-x-3">
          <a
            href="https://platform.bolero.be/login"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-effect px-4 py-2 rounded-lg flex items-center space-x-2 text-white hover:bg-white/20 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            <span>Bolero</span>
          </a>
          <a
            href="https://finance.yahoo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-effect px-4 py-2 rounded-lg flex items-center space-x-2 text-white hover:bg-white/20 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            <span>Yahoo Finance</span>
          </a>
          <button
            onClick={() => {
              setEditingInvestment(null);
              setShowAddModal(true);
            }}
            className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuwe Investering</span>
          </button>
        </div>
      </div>

      {/* Live Market Widget - TradingView Mini Charts */}
      <div className="gradient-card rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-xl font-semibold">Live Marktoverzicht</h2>
            <p className="text-white/60 text-sm">Real-time data van TradingView - Professionele marktdata</p>
          </div>
          <Activity className="w-5 h-5 text-green-400 animate-pulse" />
        </div>

        {/* Stock Grid - 3 Columns with TradingView Mini Chart Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Apple */}
          <div className="glass-effect rounded-lg overflow-hidden" style={{height: '400px'}}>
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=NASDAQ%3AAAPL&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=nl&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=NASDAQ%3AAAPL"
              className="w-full h-full"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              allowFullScreen
              title="Apple Stock Chart"
            />
          </div>

          {/* Microsoft */}
          <div className="glass-effect rounded-lg overflow-hidden" style={{height: '400px'}}>
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_2&symbol=NASDAQ%3AMSFT&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=nl&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=NASDAQ%3AMSFT"
              className="w-full h-full"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              allowFullScreen
              title="Microsoft Stock Chart"
            />
          </div>

          {/* Google */}
          <div className="glass-effect rounded-lg overflow-hidden" style={{height: '400px'}}>
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_3&symbol=NASDAQ%3AGOOGL&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=nl&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=NASDAQ%3AGOOGL"
              className="w-full h-full"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              allowFullScreen
              title="Google Stock Chart"
            />
          </div>

          {/* Tesla */}
          <div className="glass-effect rounded-lg overflow-hidden" style={{height: '400px'}}>
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_4&symbol=NASDAQ%3ATSLA&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=nl&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=NASDAQ%3ATSLA"
              className="w-full h-full"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              allowFullScreen
              title="Tesla Stock Chart"
            />
          </div>

          {/* NVIDIA */}
          <div className="glass-effect rounded-lg overflow-hidden" style={{height: '400px'}}>
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_5&symbol=NASDAQ%3ANVDA&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=nl&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=NASDAQ%3ANVDA"
              className="w-full h-full"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              allowFullScreen
              title="NVIDIA Stock Chart"
            />
          </div>

          {/* S&P 500 */}
          <div className="glass-effect rounded-lg overflow-hidden" style={{height: '400px'}}>
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_6&symbol=SP%3ASPX&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=nl&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=SP%3ASPX"
              className="w-full h-full"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              allowFullScreen
              title="S&P 500 Chart"
            />
          </div>

          {/* NASDAQ */}
          <div className="glass-effect rounded-lg overflow-hidden" style={{height: '400px'}}>
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_7&symbol=NASDAQ%3ANDX&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=nl&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=NASDAQ%3ANDX"
              className="w-full h-full"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              allowFullScreen
              title="NASDAQ Chart"
            />
          </div>

          {/* Dow Jones */}
          <div className="glass-effect rounded-lg overflow-hidden" style={{height: '400px'}}>
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_8&symbol=DJ%3ADJI&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=nl&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=DJ%3ADJI"
              className="w-full h-full"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              allowFullScreen
              title="Dow Jones Chart"
            />
          </div>

          {/* Bitcoin */}
          <div className="glass-effect rounded-lg overflow-hidden" style={{height: '400px'}}>
            <iframe
              src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_9&symbol=BINANCE%3ABTCUSDT&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=nl&utm_source=&utm_medium=widget_new&utm_campaign=chart&utm_term=BINANCE%3ABTCUSDT"
              className="w-full h-full"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              allowFullScreen
              title="Bitcoin Chart"
            />
          </div>
        </div>

        <div className="mt-4 p-4 glass-effect rounded-lg">
          <p className="text-white/60 text-sm text-center">
            📊 <strong className="text-white">TradingView Charts:</strong> Volledige interactieve grafieken met alle tools. 
            Klik op een grafiek voor fullscreen weergave en geavanceerde analyse.
          </p>
        </div>
      </div>

      {/* Total Investment Card */}
      <div className="gradient-card rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm mb-1">Totaal Geïnvesteerd</p>
            <h2 className="text-white text-4xl font-bold">€{totalInvestment.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </div>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-white/60 text-sm">{investments.length} {investments.length === 1 ? 'investering' : 'investeringen'}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Zoek investeringen..."
            className="w-full pl-12 pr-4 py-3 input-plain rounded-lg"
          />
        </div>
      </div>

      {/* Investments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{investment.name}</h3>
                      <div className="flex items-center space-x-2">
                        <p className="text-white/60 text-sm capitalize">{investment.type}</p>
                        {investment.ticker_symbol && (
                          <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/80">
                            {investment.ticker_symbol}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <span className="text-white/60 text-sm">Live Koers</span>
                      {loadingPrices && <Activity className="w-4 h-4 text-blue-400 animate-pulse" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-2xl font-bold">
                        ${stockPrice.current.toFixed(2)}
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

                {/* Investment Details */}
                <div className="space-y-2 mb-4">
                  {investment.shares && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Aandelen</span>
                      <span className="text-white">{investment.shares.toFixed(4)}</span>
                    </div>
                  )}
                  {investment.purchase_price && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Aankoopprijs</span>
                      <span className="text-white">${investment.purchase_price.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Huidige Waarde</span>
                    <span className="text-white font-semibold">
                      €{currentValue.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Profit/Loss */}
                {profitLoss.amount !== 0 && (
                  <div className={`p-3 rounded-lg ${profitLoss.amount >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Winst/Verlies</span>
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
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Bedrag (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingInvestment ? editingInvestment.amount : newInvestment.amount}
                  onChange={(e) => editingInvestment 
                    ? setEditingInvestment({...editingInvestment, amount: e.target.value})
                    : setNewInvestment({...newInvestment, amount: e.target.value})
                  }
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. 1000.00"
                />
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
                      placeholder="Bijv. AAPL, MSFT, TSLA"
                    />
                    <p className="text-white/40 text-xs mt-1">Voor live aandelenkoersen</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/70 text-sm mb-1">Aantal Aandelen</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editingInvestment ? editingInvestment.shares || '' : newInvestment.shares}
                        onChange={(e) => editingInvestment 
                          ? setEditingInvestment({...editingInvestment, shares: e.target.value})
                          : setNewInvestment({...newInvestment, shares: e.target.value})
                        }
                        className="w-full input-plain rounded-lg px-3 py-2"
                        placeholder="10.5"
                      />
                    </div>

                    <div>
                      <label className="block text-white/70 text-sm mb-1">Aankoopprijs ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingInvestment ? editingInvestment.purchase_price || '' : newInvestment.purchase_price}
                        onChange={(e) => editingInvestment 
                          ? setEditingInvestment({...editingInvestment, purchase_price: e.target.value})
                          : setNewInvestment({...newInvestment, purchase_price: e.target.value})
                        }
                        className="w-full input-plain rounded-lg px-3 py-2"
                        placeholder="150.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

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
    </div>
  );
};

export default BeleggenPage;
