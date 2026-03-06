import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Clock, Euro, Users, BarChart3, Plus, CheckCircle, X, User, Building, Store, Briefcase, Zap, Heart, Star, Rocket, Globe, Shield, XCircle } from 'lucide-react';

const SalesOverviewPage = ({ setActiveTab }) => {
  // Available icons for client selection
  const availableIcons = {
    'User': { component: User, color: 'from-blue-500 to-purple-600' },
    'Building': { component: Building, color: 'from-gray-500 to-slate-600' },
    'Store': { component: Store, color: 'from-green-500 to-emerald-600' },
    'Briefcase': { component: Briefcase, color: 'from-orange-500 to-red-600' },
    'Zap': { component: Zap, color: 'from-yellow-500 to-orange-600' },
    'Heart': { component: Heart, color: 'from-pink-500 to-rose-600' },
    'Star': { component: Star, color: 'from-purple-500 to-indigo-600' },
    'Rocket': { component: Rocket, color: 'from-cyan-500 to-blue-600' },
    'Globe': { component: Globe, color: 'from-teal-500 to-cyan-600' },
    'Shield': { component: Shield, color: 'from-indigo-500 to-purple-600' }
  };

  // State for new quote modal
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('User');

  // Read approved states from localStorage
  const [salesApproved, setSalesApproved] = useState(() => {
    const saved = localStorage.getItem('shopify-dashboard-sales-approved');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [royalTalensApproved, setRoyalTalensApproved] = useState(() => {
    const saved = localStorage.getItem('royal-talens-sales-approved');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [dreambabyApproved, setDreambabyApproved] = useState(() => {
    const saved = localStorage.getItem('dremababy-sales-approved');
    return saved ? JSON.parse(saved) : false;
  });

  // Load custom clients for tiles
  const [customClients, setCustomClients] = useState(() => {
    const saved = localStorage.getItem('custom-sales-clients');
    return saved ? JSON.parse(saved) : [];
  });

  // Update approved states when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const salesSaved = localStorage.getItem('shopify-dashboard-sales-approved');
      setSalesApproved(salesSaved ? JSON.parse(salesSaved) : false);
      
      const royalTalensSaved = localStorage.getItem('royal-talens-sales-approved');
      setRoyalTalensApproved(royalTalensSaved ? JSON.parse(royalTalensSaved) : false);
      
      const dreambabyApprovedSaved = localStorage.getItem('dremababy-sales-approved');
      setDreambabyApproved(dreambabyApprovedSaved ? JSON.parse(dreambabyApprovedSaved) : false);
      
      // Update custom clients
      const customClientsSaved = localStorage.getItem('custom-sales-clients');
      setCustomClients(customClientsSaved ? JSON.parse(customClientsSaved) : []);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check on component mount
    handleStorageChange();
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const salesProjects = [
    {
      id: 'sales-calculator',
      title: 'Sales Calculator',
      description: 'Algemene offerte calculator voor diverse projecten',
      icon: Calculator,
      color: 'from-blue-500 to-purple-600',
      stats: {
        rate: '€125/uur',
        avgHours: '40h',
        projects: '12+'
      },
      features: ['Flexibele taken', 'Custom tarieven', 'CSV export', 'Jira integratie'],
      status: 'active'
    }
  ];

  const visibleSalesProjects = salesProjects;

  const totalStats = {
    totalProjects: visibleSalesProjects.reduce((sum, project) => sum + parseInt(project.stats.projects), 0),
    avgRate: '€125',
    totalHours: visibleSalesProjects.reduce((sum, project) => sum + parseInt(project.stats.avgHours), 0),
    revenue: '€' + (visibleSalesProjects.reduce((sum, project) => sum + (parseInt(project.stats.avgHours) * 125), 0)).toLocaleString()
  };

  const handleProjectClick = (projectId) => {
    if (setActiveTab) {
      setActiveTab(projectId);
    }
  };

  const handleNewQuote = () => {
    setShowNewQuoteModal(true);
  };

  const createNewQuote = () => {
    if (!newClientName.trim()) return;
    
    // Create unique tab ID based on client name
    const tabId = `sales-${newClientName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Duplicate sales calculator data for new client, but only include checked extra items
    const salesData = localStorage.getItem('shopify-dashboard-sales');
    if (salesData) {
      const parsedData = JSON.parse(salesData);
      // Filter to only include default items and checked extra items
      const filteredData = parsedData.filter(item => 
        item.isDefault || (item.included && item.included === true)
      );
      localStorage.setItem(`${tabId}-sales`, JSON.stringify(filteredData));
    }
    
    // Set default rate for new client
    const defaultRate = localStorage.getItem('shopify-dashboard-default-rate') || '125';
    localStorage.setItem(`${tabId}-default-rate`, defaultRate);
    
    // Set initial approval status to default
    localStorage.setItem(`${tabId}-approval-status`, 'default');
    localStorage.setItem(`${tabId}-approved`, 'false');
    
    // Store client info
    const clientInfo = {
      name: newClientName,
      tabId: tabId,
      icon: selectedIcon,
      color: availableIcons[selectedIcon].color,
      created: new Date().toISOString()
    };
    
    // Add to list of custom clients
    const existingClients = JSON.parse(localStorage.getItem('custom-sales-clients') || '[]');
    existingClients.push(clientInfo);
    localStorage.setItem('custom-sales-clients', JSON.stringify(existingClients));
    
    // Navigate to new tab
    if (setActiveTab) {
      setActiveTab(tabId);
    }
    
    // Close modal and reset
    setShowNewQuoteModal(false);
    setNewClientName('');
    setSelectedIcon('User');
  };

  const cancelNewQuote = () => {
    setShowNewQuoteModal(false);
    setNewClientName('');
    setSelectedIcon('User');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales Overview</h1>
          <p className="text-white/70">Overzicht van alle sales calculators en offertes</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleNewQuote}
            className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuwe Offerte</span>
          </button>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-8 h-8 text-green-400" />
            <span className="text-green-400 font-semibold">Actief</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="gradient-card px-6 py-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Totaal Projecten</p>
              <p className="text-white font-bold text-2xl">{totalStats.totalProjects}</p>
            </div>
          </div>
        </div>
        <div className="gradient-card px-6 py-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Euro className="w-6 h-6 text-green-300" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Standaard Tarief</p>
              <p className="text-white font-bold text-2xl">{totalStats.avgRate}</p>
            </div>
          </div>
        </div>
        <div className="gradient-card px-6 py-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Totaal Uren</p>
              <p className="text-white font-bold text-2xl">{totalStats.totalHours}h</p>
            </div>
          </div>
        </div>
        <div className="gradient-card px-6 py-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Potentiële Omzet</p>
              <p className="text-white font-bold text-2xl">{totalStats.revenue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleSalesProjects.map((project) => {
          const Icon = project.icon;
          return (
            <div 
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              className="group cursor-pointer transform hover:scale-105 transition-all duration-300"
            >
              <div className="gradient-card rounded-xl p-6 h-full relative overflow-hidden">
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                
                {/* Approved Indicator */}
                <div className="absolute top-4 right-4">
                  {(() => {
                    // Get approval status from localStorage
                    const getApprovalStatus = (projectId) => {
                      const statusKey = projectId === 'sales-calculator' ? 'shopify-dashboard-sales-approval-status' :
                                       projectId === 'sales-royal-talens' ? 'royal-talens-sales-approval-status' :
                                       projectId === 'sales-dremababy' ? 'dremababy-sales-approval-status' : null;
                      return statusKey ? localStorage.getItem(statusKey) || 'default' : 'default';
                    };
                    
                    const status = getApprovalStatus(project.id);
                    
                    return status === 'approved' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : status === 'pending' ? (
                      <Clock className="w-5 h-5 text-yellow-400" />
                    ) : status === 'denied' ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    );
                  })()}
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${project.color} shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xl group-hover:text-blue-300 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-white/60 text-sm">{project.description}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-white/60 text-xs">Tarief</p>
                      <p className="text-white font-semibold text-sm">{project.stats.rate}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-xs">Gem. Uren</p>
                      <p className="text-white font-semibold text-sm">{project.stats.avgHours}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-xs">Projecten</p>
                      <p className="text-white font-semibold text-sm">{project.stats.projects}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <p className="text-white/70 text-sm font-medium">Key Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {project.features.slice(0, 3).map((feature, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                      {project.features.length > 3 && (
                        <span className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded-full">
                          +{project.features.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Hint */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Klik om offerte te maken</span>
                      <div className="flex items-center space-x-1 text-blue-300 group-hover:text-blue-200 transition-colors">
                        <span className="text-sm font-medium">Open</span>
                        <div className="w-2 h-2 bg-blue-300 rounded-full group-hover:bg-blue-200 transition-colors"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Custom Client Tiles */}
        {customClients.map((client) => {
          const ClientIcon = availableIcons[client.icon]?.component || User;
          const clientStatus = localStorage.getItem(`${client.tabId}-approval-status`) || 'default';
          
          return (
            <div 
              key={client.tabId}
              onClick={() => handleProjectClick(client.tabId)}
              className="group cursor-pointer transform hover:scale-105 transition-all duration-300"
            >
              <div className="gradient-card rounded-xl p-6 h-full relative overflow-hidden">
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${client.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                
                {/* Approved Indicator */}
                <div className="absolute top-4 right-4">
                  {clientStatus === 'approved' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : clientStatus === 'pending' ? (
                    <Clock className="w-5 h-5 text-yellow-400" />
                  ) : clientStatus === 'denied' ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  )}
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${client.color} shadow-lg`}>
                      <ClientIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xl group-hover:text-blue-300 transition-colors">
                        {client.name}
                      </h3>
                      <p className="text-white/60 text-sm">Custom offerte calculator</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-white/50 text-xs">Tarief</p>
                      <p className="text-white font-semibold">€125/uur</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/50 text-xs">Status</p>
                      <p className="text-white font-semibold">
                        {clientStatus === 'approved' ? 'Approved' : 
                         clientStatus === 'pending' ? 'Pending' : 
                         clientStatus === 'denied' ? 'Denied' : 'Draft'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/50 text-xs">Aangemaakt</p>
                      <p className="text-white font-semibold">
                        {new Date(client.created).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  </div>

                  {/* Action Hint */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Klik om calculator te openen</span>
                      <div className="flex items-center space-x-1 text-blue-300 group-hover:text-blue-200 transition-colors">
                        <span className="text-sm font-medium">Open</span>
                        <div className="w-2 h-2 bg-blue-300 rounded-full group-hover:bg-blue-200 transition-colors"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="gradient-card rounded-xl p-6">
        <h2 className="text-white text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => handleProjectClick('sales-calculator')}
            className="flex items-center space-x-3 p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
          >
            <Calculator className="w-6 h-6 text-blue-300 group-hover:text-blue-200" />
            <div className="text-left">
              <p className="text-white font-medium">Nieuwe Algemene Offerte</p>
              <p className="text-white/60 text-sm">Start met basis calculator</p>
            </div>
          </button>
        </div>
      </div>

      {/* New Quote Modal */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="gradient-card rounded-xl p-6 w-[500px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">Nieuwe Offerte Maken</h2>
              <button 
                onClick={cancelNewQuote}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <label htmlFor="clientName" className="block text-white/80 text-sm font-medium mb-2">
                Klantnaam
              </label>
              <input
                type="text"
                id="clientName"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Voer de naam van de klant in..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && createNewQuote()}
              />
              <p className="text-white/50 text-xs mt-2">
                Er wordt een nieuwe offerte calculator aangemaakt gebaseerd op de standaard template.
              </p>
            </div>

            {/* Icon Selection */}
            <div className="mb-6">
              <label className="block text-white/80 text-sm font-medium mb-3">
                Kies een icoon
              </label>
              <div className="grid grid-cols-5 gap-3">
                {Object.entries(availableIcons).map(([iconName, iconData]) => {
                  const IconComponent = iconData.component;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setSelectedIcon(iconName)}
                      className={`
                        p-3 rounded-lg transition-all flex items-center justify-center
                        ${selectedIcon === iconName 
                          ? 'bg-blue-500/30 ring-2 ring-blue-400' 
                          : 'bg-white/10 hover:bg-white/20'
                        }
                      `}
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${iconData.color}`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-white/50 text-xs mt-2">
                Dit icoon wordt gebruikt in de sidebar en op tegels.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={createNewQuote}
                disabled={!newClientName.trim()}
                className={`flex-1 px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all ${
                  newClientName.trim() 
                    ? 'btn-primary text-white' 
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>Offerte Maken</span>
              </button>
              <button 
                onClick={cancelNewQuote}
                className="flex-1 glass-effect px-6 py-3 rounded-lg text-white font-medium transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOverviewPage;
