import React, { useState, useEffect } from 'react';
import { Calculator, FileText, Download, Trash2, X, Ticket, Lock, Unlock, CheckCircle, Clock, XCircle, Plus, User, Building, Store, Briefcase, Zap, Heart, Star, Rocket, Globe, Shield, Send } from 'lucide-react';
import TabQuickLinks from './TabQuickLinks';

const SalesPage = () => {
  const defaultProjectData = [
    { 
      id: 1, 
      task: 'Thema aanpassing', 
      topic: 'Setup', 
      hours: 8, 
      rate: 75, 
      total: 600,
      included: true,
      description: 'Basis thema aanpassingen en styling',
      isDefault: true
    },
    { 
      id: 2, 
      task: 'Productpagina optimalisatie', 
      topic: 'Development', 
      hours: 4, 
      rate: 75, 
      total: 300,
      included: true,
      description: 'Verbeteren van productpagina layout',
      isDefault: true
    },
    { 
      id: 3, 
      task: 'PLP', 
      topic: 'Development', 
      hours: 6, 
      rate: 75, 
      total: 450,
      included: true,
      description: 'Product listing page ontwikkeling',
      isDefault: true
    },
    { 
      id: 4, 
      task: 'Cart aanpassingen', 
      topic: 'Custom Development', 
      hours: 12, 
      rate: 85, 
      total: 1020,
      included: false,
      description: 'Geavanceerde winkelwagen functionaliteit',
      isDefault: false
    },
    { 
      id: 5, 
      task: 'SEO Optimalisatie', 
      topic: 'Marketing', 
      hours: 8, 
      rate: 80, 
      total: 640,
      included: true,
      description: 'SEO verbetering en metadata',
      isDefault: true
    },
    { 
      id: 6, 
      task: 'Betalingen', 
      topic: 'Payment', 
      hours: 16, 
      rate: 85, 
      total: 1360,
      included: false,
      description: 'Payment gateway integratie',
      isDefault: false
    },
    { 
      id: 7, 
      task: 'Brand Integratie', 
      topic: 'Setup', 
      hours: 10, 
      rate: 80, 
      total: 800,
      included: true,
      description: 'Brand identity implementatie',
      isDefault: true
    },
    { 
      id: 8, 
      task: 'Liquid templating', 
      topic: 'Custom Development', 
      hours: 20, 
      rate: 85, 
      total: 1700,
      included: false,
      description: 'Custom Liquid template ontwikkeling',
      isDefault: false
    },
    { 
      id: 9, 
      task: 'Apps Integratie', 
      topic: 'Integration', 
      hours: 12, 
      rate: 80, 
      total: 960,
      included: true,
      description: 'Third-party app integraties',
      isDefault: false
    },
    { 
      id: 10, 
      task: 'Online (Shopify) cursus', 
      topic: 'Setup', 
      hours: 4, 
      rate: 75, 
      total: 300,
      included: true,
      description: 'Shopify training voor klant',
      isDefault: true
    },
    { 
      id: 11, 
      task: 'Optimalisatie', 
      topic: 'Backend', 
      hours: 8, 
      rate: 80, 
      total: 640,
      included: false,
      description: 'Performance optimalisatie',
      isDefault: false
    },
    { 
      id: 12, 
      task: 'Migratie', 
      topic: 'Backend', 
      hours: 24, 
      rate: 85, 
      total: 2040,
      included: false,
      description: 'Data migratie van ander platform',
      isDefault: false
    }
  ];

  const [projectData, setProjectData] = useState(() => {
    // First try to load saved template, then regular saved data, then default
    const savedTemplate = localStorage.getItem('shopify-dashboard-sales-template');
    const savedProjectData = localStorage.getItem('shopify-dashboard-sales');
    
    if (savedTemplate) {
      return JSON.parse(savedTemplate);
    } else if (savedProjectData) {
      return JSON.parse(savedProjectData);
    } else {
      return defaultProjectData;
    }
  });

  const [defaultRate, setDefaultRate] = useState(() => {
    const savedRate = localStorage.getItem('shopify-dashboard-default-rate');
    return savedRate ? parseInt(savedRate) : 125;
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [jiraItem, setJiraItem] = useState(null);
  
  // New quote modal state
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('User');
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Send to client function
  const sendToClient = () => {
    setSuccessMessage('Offerte is verstuurd naar de klant!');
    setShowSuccessModal(true);
  };

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
  const [approvalStatus, setApprovalStatus] = useState(() => {
    const savedStatus = localStorage.getItem('shopify-dashboard-sales-approval-status');
    return savedStatus ? savedStatus : 'default';
  });

  // Save project data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shopify-dashboard-sales', JSON.stringify(projectData));
  }, [projectData]);

  // Save default rate to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shopify-dashboard-default-rate', defaultRate.toString());
  }, [defaultRate]);

  // Save approval status to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shopify-dashboard-sales-approval-status', approvalStatus);
    // Also save old approved format for backward compatibility
    localStorage.setItem('shopify-dashboard-sales-approved', JSON.stringify(approvalStatus === 'approved'));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('localStorageUpdate'));
  }, [approvalStatus]);

  // Recalculate totals when default rate changes
  useEffect(() => {
    setProjectData(prev => prev.map(item => ({
      ...item,
      rate: defaultRate,
      total: item.hours * defaultRate
    })));
  }, [defaultRate]);

  const topicColors = {
    'Setup': 'bg-blue-500/20 text-blue-300',
    'Integration': 'bg-green-500/20 text-green-300',
    'Development': 'bg-purple-500/20 text-purple-300',
    'Payment': 'bg-yellow-500/20 text-yellow-300',
    'Localization': 'bg-pink-500/20 text-pink-300',
    'Custom Development': 'bg-red-500/20 text-red-300',
    'B2B Features': 'bg-indigo-500/20 text-indigo-300',
    'Marketing': 'bg-orange-500/20 text-orange-300',
    'Backend': 'bg-gray-500/20 text-gray-300',
    'AI/ML': 'bg-cyan-500/20 text-cyan-300',
    'Mobile': 'bg-emerald-500/20 text-emerald-300',
    'APP': 'bg-teal-500/20 text-teal-300',
  };

  const updateTask = (id, field, value) => {
    setProjectData(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Remove isNew flag when task is modified
        if (item.isNew && (field === 'task' || field === 'hours' || field === 'description')) {
          updated.isNew = false;
        }
        
        if (field === 'hours') {
          // Use defaultRate for calculation
          updated.total = updated.hours * defaultRate;
          updated.rate = defaultRate;
        }
        return updated;
      }
      return item;
    }));
  };

  const addExtraRow = () => {
    const newRow = {
      id: Date.now(),
      task: 'Nieuwe taak',
      topic: 'Development',
      hours: 0,
      rate: defaultRate,
      total: 0,
      included: false,
      description: 'Beschrijving van nieuwe taak',
      isDefault: false,
      isNew: true // Flag to indicate this is a new, unmodified task
    };
    setProjectData(prev => [...prev, newRow]);
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const deleteItem = () => {
    if (itemToDelete) {
      setProjectData(prev => prev.filter(item => item.id !== itemToDelete.id));
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const openJiraModal = (item) => {
    setJiraItem(item);
    setShowJiraModal(true);
  };

  const createJiraTicket = () => {
    // In a real implementation, this would make an API call to Jira
    const type = jiraItem.isDefault ? 'default' : 'extra';
    setSuccessMessage(
      `Jira ticket aangemaakt:\n` +
      `Taak: ${jiraItem.task}\n` +
      `Type: ${type}\n` +
      `Uren: ${jiraItem.hours}h`
    );
    setShowSuccessModal(true);
    setShowJiraModal(false);
    setJiraItem(null);
  };

  const cancelJira = () => {
    setShowJiraModal(false);
    setJiraItem(null);
  };

  // New quote functions
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
    const defaultRateValue = localStorage.getItem('shopify-dashboard-default-rate') || '125';
    localStorage.setItem(`${tabId}-default-rate`, defaultRateValue);
    
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
    
    // Show success message
    setSuccessMessage(`Nieuwe offerte aangemaakt voor ${newClientName}!`);
    setShowSuccessModal(true);
    
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

  const totalIncluded = projectData
    .filter(item => item.isDefault || (!item.isDefault && item.included))
    .reduce((sum, item) => sum + item.total, 0);

  const totalHours = projectData
    .filter(item => item.isDefault || (!item.isDefault && item.included))
    .reduce((sum, item) => sum + item.hours, 0);

  const exportToCSV = () => {
    // Filter: All default tasks + checked extra tasks
    const exportData = projectData.filter(item => 
      item.isDefault || (!item.isDefault && item.included)
    );
    
    const headers = ['Taak', 'Topic', 'Uren', 'Tarief', 'Totaal', 'Beschrijving'];
    const csvData = exportData.map(item => [
      item.task,
      item.topic,
      item.hours,
      item.rate || defaultRate,
      item.total,
      item.description
    ]);

    // Add summary rows
    const summaryRows = [
      ['', '', '', '', '', ''], // Empty row
      ['TOTALEN', '', '', '', '', ''],
      ['Totaal Uren', '', totalHours, '', '', ''],
      ['Standaard Tarief', '', '', `€${defaultRate}`, '', ''],
      ['Totaal Bedrag', '', '', '', `€${totalIncluded}`, '']
    ];

    const csvContent = [headers, ...csvData, ...summaryRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shopify-calculator-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Tab Quick Links */}
      <TabQuickLinks tabName="Sales" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales Template</h1>
          <p className="text-white/70">Bereken project kosten en genereer offertes</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              // Save current template to localStorage
              localStorage.setItem('shopify-dashboard-sales-template', JSON.stringify(projectData));
              setSuccessMessage('Template succesvol opgeslagen!');
              setShowSuccessModal(true);
            }}
            className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2"
          >
            <FileText className="w-5 h-5" />
            <span>Save Template</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`gradient-card px-6 py-4 rounded-xl ${
          approvalStatus === 'approved' ? 'ring-2 ring-green-400' : 
          approvalStatus === 'pending' ? 'ring-2 ring-yellow-400' : 
          approvalStatus === 'denied' ? 'ring-2 ring-red-400' : ''
        }`}>
          <div className="flex items-center space-x-3">
            {approvalStatus === 'approved' && <CheckCircle className="w-5 h-5 text-green-400" />}
            {approvalStatus === 'pending' && <Clock className="w-5 h-5 text-yellow-400" />}
            {approvalStatus === 'denied' && <XCircle className="w-5 h-5 text-red-400" />}
            <div className="flex-1">
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
              >
                <option value="default" className="bg-gray-800 text-white">Default</option>
                <option value="pending" className="bg-gray-800 text-white">Pending</option>
                <option value="approved" className="bg-gray-800 text-white">Approved</option>
                <option value="denied" className="bg-gray-800 text-white">Denied</option>
              </select>
            </div>
          </div>
        </div>
        <div className="gradient-card px-6 py-4 rounded-xl">
          <span className="text-white/70 text-base">Totaal uren: </span>
          <span className="text-white font-bold text-2xl">{totalHours}h</span>
        </div>
        <div className="gradient-card px-6 py-4 rounded-xl">
          <span className="text-white/70 text-base">Standaard tarief: €</span>
          <input
            type="number"
            value={defaultRate}
            onChange={(e) => setDefaultRate(parseInt(e.target.value) || 125)}
            disabled={approvalStatus === 'approved'}
            className={`bg-transparent text-white font-bold text-2xl border-none outline-none w-20 ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
        <div className="gradient-card px-6 py-4 rounded-xl">
          <span className="text-white/70 text-base">Totaal: </span>
          <span className="text-white font-bold text-3xl">€{totalIncluded.toLocaleString()}</span>
        </div>
      </div>

      {/* Send to Client Button moved to action row below */}

      {/* Default Table */}
      <div className="gradient-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-white text-xl font-semibold">Default Taken</h2>
            {approvalStatus === 'approved' && <Lock className="w-5 h-5 text-yellow-400" title="Vergrendeld - Approved" />}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/80 font-medium">Taak</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Topic</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Uren</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Totaal</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Beschrijving</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Jira</th>
              </tr>
            </thead>
            <tbody>
              {projectData.filter(item => item.isDefault).map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={item.task}
                      onChange={(e) => updateTask(item.id, 'task', e.target.value)}
                      className={`bg-transparent text-white border-none outline-none w-full ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={item.topic === 'default' || approvalStatus === 'approved'}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${topicColors[item.topic] || topicColors['Development'] || 'bg-white/10 text-white'} ${approvalStatus === 'approved' ? 'opacity-50' : ''}`}>
                      <select
                        value={item.topic}
                        onChange={(e) => updateTask(item.id, 'topic', e.target.value)}
                        disabled={approvalStatus === 'approved'}
                        className={`bg-transparent border-none outline-none text-current w-full ${approvalStatus === 'approved' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {Object.keys(topicColors).map(key => (
                          <option key={key} value={key} className="bg-gray-800 text-white">{key}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={item.hours}
                      onChange={(e) => updateTask(item.id, 'hours', parseInt(e.target.value) || 0)}
                      disabled={approvalStatus === 'approved'}
                      className={`bg-white/10 text-white border border-white/20 rounded px-2 py-1 w-16 text-center ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="py-3 px-4 text-white font-medium">
                    €{item.total.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateTask(item.id, 'description', e.target.value)}
                      disabled={approvalStatus === 'approved'}
                      className={`bg-transparent text-white border-none outline-none w-full text-sm ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openJiraModal(item)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                      title="Maak Jira ticket"
                    >
                      <Ticket className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extra's Table */}
      <div className="gradient-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-white text-xl font-semibold">Extra's</h2>
            {approvalStatus === 'approved' && <Lock className="w-5 h-5 text-yellow-400" title="Vergrendeld - Approved" />}
          </div>
          <button 
            onClick={addExtraRow}
            disabled={approvalStatus === 'approved'}
            className={`btn-primary px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center space-x-2 ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span>+ Nieuwe Rij</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/80 font-medium">Incl.</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Taak</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Topic</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Uren</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Totaal</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Beschrijving</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Jira</th>
                <th className="text-left py-3 px-4 text-white/80 font-medium">Actie</th>
              </tr>
            </thead>
            <tbody>
              {projectData.filter(item => !item.isDefault).map((item) => (
                <tr key={item.id} className={`border-b border-white/5 hover:bg-white/5 ${item.isNew ? 'opacity-60' : ''}`}>
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={(e) => updateTask(item.id, 'included', e.target.checked)}
                      disabled={approvalStatus === 'approved'}
                      className={`w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500 ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={item.task}
                      onChange={(e) => updateTask(item.id, 'task', e.target.value)}
                      disabled={approvalStatus === 'approved'}
                      className={`bg-transparent text-white border-none outline-none w-full ${item.isNew ? 'placeholder-white/40' : ''} ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder={item.isNew ? 'Voer taaknaam in...' : ''}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${topicColors[item.topic] || topicColors['Development'] || 'bg-white/10 text-white'} ${approvalStatus === 'approved' ? 'opacity-50' : ''}`}>
                      <select
                        value={item.topic}
                        onChange={(e) => updateTask(item.id, 'topic', e.target.value)}
                        disabled={approvalStatus === 'approved'}
                        className={`bg-transparent border-none outline-none text-current w-full ${approvalStatus === 'approved' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {Object.keys(topicColors).map(key => (
                          <option key={key} value={key} className="bg-gray-800 text-white">{key}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      value={item.hours}
                      onChange={(e) => updateTask(item.id, 'hours', parseInt(e.target.value) || 0)}
                      disabled={approvalStatus === 'approved'}
                      className={`bg-white/10 text-white border border-white/20 rounded px-2 py-1 w-16 text-center ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </td>
                  <td className="py-3 px-4 text-white font-medium">
                    €{item.total.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateTask(item.id, 'description', e.target.value)}
                      disabled={approvalStatus === 'approved'}
                      className={`bg-transparent text-white border-none outline-none w-full text-sm ${item.isNew ? 'placeholder-white/40' : ''} ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder={item.isNew ? 'Voer beschrijving in...' : ''}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openJiraModal(item)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                      title="Maak Jira ticket"
                    >
                      <Ticket className="w-4 h-4" />
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => confirmDelete(item)}
                      disabled={approvalStatus === 'approved'}
                      className={`text-red-400 hover:text-red-300 p-1 ${approvalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="gradient-card rounded-xl p-6 w-[500px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">Item Verwijderen</h2>
              <button 
                onClick={cancelDelete}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-white/70 mb-4">
                Ben je zeker dat je de taak <span className="text-white font-semibold">"{itemToDelete?.task}"</span> wil verwijderen?
              </p>
              <p className="text-red-300 text-sm">
                Deze actie kan niet ongedaan gemaakt worden.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={deleteItem}
                className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-lg text-white font-medium flex-1 transition-colors"
              >
                Ja, Verwijderen
              </button>
              <button 
                onClick={cancelDelete}
                className="glass-effect px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jira Ticket Modal */}
      {showJiraModal && jiraItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="gradient-card rounded-xl p-6 w-[600px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">Jira Ticket Maken</h2>
              <button 
                onClick={cancelJira}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-white/70 mb-4">
                Wens je een Jira ticket te maken voor: <span className="text-white font-semibold">"{jiraItem.task}"</span>?
              </p>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Beschrijving:</span>
                  <span className="text-white">{jiraItem.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Uren:</span>
                  <span className="text-white">{jiraItem.hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Totaal:</span>
                  <span className="text-white">€{jiraItem.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Topic:</span>
                  <span className="text-white">{jiraItem.topic}</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={createJiraTicket}
                className="btn-primary px-6 py-2 rounded-lg text-white font-medium flex-1 flex items-center justify-center space-x-2"
              >
                <Ticket className="w-4 h-4" />
                <span>Ja, Maak Ticket</span>
              </button>
              <button 
                onClick={cancelJira}
                className="glass-effect px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6">
        <button 
          onClick={handleNewQuote}
          className="glass-effect px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 hover:bg-white/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Nieuwe Offerte</span>
        </button>
        <button 
          onClick={sendToClient}
          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:text-green-300 px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
          title="Verstuur offerte naar klant"
        >
          <Send className="w-5 h-5" />
          <span>Verstuur naar klant</span>
        </button>
        <button 
          onClick={exportToCSV}
          className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2"
        >
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* New Quote Modal */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="gradient-card rounded-xl p-6 w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
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
                Er wordt een nieuwe offerte calculator aangemaakt gebaseerd op de huidige template.
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="gradient-card rounded-xl p-6 w-[400px] max-w-[90vw]">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-2">Gelukt!</h2>
              <p className="text-white/70 mb-6">{successMessage}</p>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="btn-primary px-6 py-3 rounded-lg text-white font-medium w-full"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
