import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, LayoutGrid, Download, Star, ExternalLink, Plus, X, Edit, Trash2, Upload, Save, Info, Database, RefreshCw } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const AppsPage = () => {
  const defaultApps = [
    // Wishlist Apps
    {
      id: 1,
      name: 'Wishlist Plus',
      description: 'Advanced wishlist functionality',
      category: 'Wishlist',
      contact: 'support@swymcorp.com',
      usedOn: ['Checkpoint'],
      appLink: 'https://apps.shopify.com/wishlist-plus',
      image: ''
    },
    {
      id: 2,
      name: 'SWishlist',
      description: 'Simple wishlist solution',
      category: 'Wishlist',
      contact: 'help@solucommerce.com',
      usedOn: ['Yest'],
      appLink: 'https://apps.shopify.com/swishlist',
      image: ''
    },
    // Store Locator Apps
    {
      id: 3,
      name: 'Closeby',
      description: 'Store locator solution',
      category: 'Store locator',
      contact: 'team@closeby.co',
      usedOn: ['Curtres'],
      appLink: 'https://apps.shopify.com/closeby',
      image: ''
    },
    {
      id: 4,
      name: 'Stockist',
      description: 'Store locator and stockist finder',
      category: 'Store locator',
      contact: 'help@stockist.co',
      usedOn: ['Yest'],
      appLink: 'https://apps.shopify.com/stockist',
      image: ''
    },
    // Shipping Apps
    {
      id: 5,
      name: 'Sendcloud',
      description: 'Shipping and fulfillment solution',
      category: 'Shipping',
      contact: 'support@sendcloud.com',
      usedOn: ['Curtres', 'Bronn'],
      appLink: 'https://apps.shopify.com/sendcloud',
      image: ''
    },
    // Filter/Search Apps
    {
      id: 6,
      name: 'Shopify Search & Discovery',
      description: 'Native Shopify search and filtering',
      category: 'Filter/recommend/search',
      contact: 'Shopify',
      usedOn: ['RT B2B', 'Bronn', 'Novy'],
      appLink: 'https://apps.shopify.com/search-discovery',
      image: ''
    },
    {
      id: 7,
      name: 'Smart Product Filter & Search',
      description: 'Advanced product filtering',
      category: 'Filter/recommend/search',
      contact: 'contact@globosoftware.net',
      usedOn: [],
      appLink: 'https://apps.shopify.com/smart-product-filter',
      image: ''
    },
    // Product Options Apps
    {
      id: 8,
      name: 'Globo Product Options, Variant',
      description: 'Extra product options and variants',
      category: 'Extra product options',
      contact: 'contact@globosoftware.net',
      usedOn: ['Curium'],
      appLink: 'https://apps.shopify.com/globo-product-options',
      image: ''
    },
    // Menu Apps
    {
      id: 9,
      name: 'Globo Mega Menu, Navigation',
      description: 'Advanced mega menu solution',
      category: 'Megamenu',
      contact: 'hi@globosoftware.net',
      usedOn: [],
      appLink: 'https://apps.shopify.com/globo-mega-menu',
      image: ''
    },
    {
      id: 10,
      name: 'Qikify Mega Menu & Navigation',
      description: 'Mega menu and navigation',
      category: 'Megamenu',
      contact: 'hi@globosoftware.net',
      usedOn: ['Valentino', 'Adephar'],
      appLink: 'https://apps.shopify.com/qikify-mega-menu',
      image: ''
    },
    // Customer Account Apps
    {
      id: 11,
      name: 'Customerhub',
      description: 'Customer account management',
      category: 'Customer account',
      contact: 'support@customerhubapp.com',
      usedOn: [],
      appLink: 'https://apps.shopify.com/customerhub',
      image: ''
    },
    // Email Marketing Apps
    {
      id: 12,
      name: 'Klaviyo',
      description: 'Email marketing and automation',
      category: 'Emailmarketing',
      contact: 'support@klaviyo.com',
      usedOn: [],
      appLink: 'https://apps.shopify.com/klaviyo-email-marketing',
      image: ''
    },
    {
      id: 13,
      name: 'Shopify Email',
      description: 'Native Shopify email marketing',
      category: 'Emailmarketing',
      contact: 'Shopify',
      usedOn: ['Curium'],
      appLink: 'https://apps.shopify.com/shopify-email',
      image: ''
    },
    // More Apps from screenshots
    {
      id: 14,
      name: 'Instand brand page',
      description: 'Brand page creation tool',
      category: 'Merkenpagina',
      contact: 'support@lowfruitsolutions.com',
      usedOn: ['Curtres'],
      appLink: 'https://apps.shopify.com/instand-brand-page',
      image: ''
    },
    {
      id: 15,
      name: 'XO Gallery',
      description: 'Shop the look gallery',
      category: 'Shop the look',
      contact: 'hi@xotiny.com',
      usedOn: ['Covarte'],
      appLink: 'https://apps.shopify.com/xo-gallery',
      image: ''
    },
    {
      id: 16,
      name: 'Fast Bundle | Product Bundles',
      description: 'Product bundling solution',
      category: 'Bundles',
      contact: 'support@fastbundle.co',
      usedOn: [],
      appLink: 'https://apps.shopify.com/fast-bundle',
      image: ''
    },
    {
      id: 17,
      name: 'Rebolt Bundle Upsell Discount',
      description: 'Bundle upsell and discount',
      category: 'Bundles',
      contact: 'support@webcontrive.com',
      usedOn: [],
      appLink: 'https://apps.shopify.com/rebolt-bundle',
      image: ''
    },
    {
      id: 18,
      name: 'Delivery date manager',
      description: 'Delivery date management',
      category: 'Datepicker',
      contact: 'support@appjetty.com',
      usedOn: ['Curium'],
      appLink: 'https://apps.shopify.com/delivery-date-manager',
      image: ''
    },
    {
      id: 19,
      name: 'Translate & adapt',
      description: 'Translation and localization',
      category: 'Translations',
      contact: 'Shopify',
      usedOn: ['Novy', 'Adephar', 'Yest'],
      appLink: 'https://apps.shopify.com/translate-and-adapt',
      image: ''
    },
    {
      id: 20,
      name: 'T-lab',
      description: 'All-language translate',
      category: 'Translations',
      contact: 'support@sherpas.design',
      usedOn: ['Bronn'],
      appLink: 'https://apps.shopify.com/t-lab',
      image: ''
    },
    {
      id: 21,
      name: 'Judge.me',
      description: 'Product reviews app',
      category: 'Reviews',
      contact: 'support@judge.me',
      usedOn: ['Bronn'],
      appLink: 'https://apps.shopify.com/judgeme',
      image: ''
    },
    {
      id: 22,
      name: 'Shopify subscriptions',
      description: 'Native subscription management',
      category: 'Subscriptions',
      contact: 'Shopify',
      usedOn: ['Bronn'],
      appLink: 'https://apps.shopify.com/shopify-subscriptions',
      image: ''
    },
    {
      id: 23,
      name: 'Loop Subscriptions App',
      description: 'Advanced subscription management',
      category: 'Subscriptions',
      contact: 'contact@loopwork.co',
      usedOn: ['Bronn'],
      appLink: 'https://apps.shopify.com/loop-subscriptions',
      image: ''
    },
    {
      id: 24,
      name: 'Shopify Flow',
      description: 'Automation workflows',
      category: 'Automations',
      contact: 'Shopify',
      usedOn: ['Curium', 'Bronn'],
      appLink: 'https://apps.shopify.com/shopify-flow',
      image: ''
    },
    {
      id: 25,
      name: 'Shopify Forms',
      description: 'Form builder',
      category: 'Forms',
      contact: 'Shopify',
      usedOn: ['Bronn'],
      appLink: 'https://apps.shopify.com/shopify-forms',
      image: ''
    }
  ];

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [appToDelete, setAppToDelete] = useState(null);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const fileInputRef = useRef(null);
  // Filters
  const [appSearch, setAppSearch] = useState('');
  const [appCategory, setAppCategory] = useState('');
  const [appStore, setAppStore] = useState('');
  const [newApp, setNewApp] = useState({
    name: '',
    description: '',
    category: '',
    rating: 5.0,
    price: '',
    image: '',
    appLink: '',
    status: 'Available',
    contact: '',
    usedOn: ''
  });

  // Helpers to map between UI keys and DB columns
  const toDbApp = (app) => ({
    name: app.name || null,
    description: app.description || null,
    category: app.category || null,
    contact: app.contact || null,
    used_on: Array.isArray(app.usedOn)
      ? app.usedOn
      : (typeof app.usedOn === 'string'
          ? app.usedOn.split(',').map(s => s.trim()).filter(Boolean)
          : (app.used_on || [])),
    app_link: app.appLink ?? app.app_link ?? null,
    image: app.image || null,
    rating: app.rating !== undefined && app.rating !== null ? parseFloat(app.rating) : 5.0,
    price: app.price || null,
    status: app.status || 'Available'
  });

  const fromDbApp = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    contact: row.contact,
    usedOn: row.used_on || [],
    appLink: row.app_link,
    image: row.image,
    rating: row.rating,
    price: row.price,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  });

  // Load apps from Supabase on mount
  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const rows = await db.apps.getAll();
      
      // If no apps in database, seed with defaults
      if (rows.length === 0) {
        console.log('No apps found, seeding with defaults');
        await seedDefaultApps();
      } else {
        setApps(rows.map(fromDbApp));
      }
    } catch (error) {
      console.error('Error loading apps:', error);
      setSyncStatus({ type: 'error', message: 'Fout bij laden van apps' });
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const seedDefaultApps = async () => {
    try {
      const payloads = defaultApps.map(toDbApp);
      const createdRows = await Promise.all(payloads.map(p => db.apps.create(p)));
      setApps(createdRows.map(fromDbApp));
      setSyncStatus({ type: 'success', message: 'Apps geladen' });
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      console.error('Error seeding apps:', error);
      setApps(defaultApps); // Fallback to local defaults
    }
  };


  const addApp = async () => {
    if (newApp.name && newApp.description) {
      try {
        const payload = toDbApp({ ...newApp, rating: parseFloat(newApp.rating) });
        const createdRow = await db.apps.create(payload);
        setApps([...apps, fromDbApp(createdRow)]);
        setSyncStatus({ type: 'success', message: 'App toegevoegd' });
        setTimeout(() => setSyncStatus(null), 3000);
        resetForm();
      } catch (error) {
        console.error('Error adding app:', error);
        setSyncStatus({ type: 'error', message: 'Fout bij toevoegen app' });
        setTimeout(() => setSyncStatus(null), 3000);
      }
    }
  };

  const updateApp = async () => {
    if (newApp.name && newApp.description) {
      try {
        const updates = toDbApp({ ...newApp, rating: parseFloat(newApp.rating) });
        const updatedRow = await db.apps.update(editingApp.id, updates);
        const updated = fromDbApp(updatedRow);
        const updatedApps = apps.map(a => (
          a.id === editingApp.id ? updated : a
        ));
        setApps(updatedApps);
        setSyncStatus({ type: 'success', message: 'App bijgewerkt' });
        setTimeout(() => setSyncStatus(null), 3000);
        resetForm();
      } catch (error) {
        console.error('Error updating app:', error);
        setSyncStatus({ type: 'error', message: 'Fout bij bijwerken app' });
        setTimeout(() => setSyncStatus(null), 3000);
      }
    }
  };

  const startEdit = (app) => {
    setEditingApp(app);
    setNewApp(app);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setNewApp({
      name: '',
      description: '',
      category: '',
      rating: 5.0,
      price: '',
      image: '',
      appLink: '',
      status: 'Available',
      contact: '',
      usedOn: ''
    });
    setShowAddForm(false);
    setEditingApp(null);
  };

  const confirmDelete = (app) => {
    setAppToDelete(app);
    setShowDeleteConfirm(true);
  };

  const deleteApp = async () => {
    if (appToDelete) {
      try {
        await db.apps.delete(appToDelete.id);
        setApps(apps.filter(a => a.id !== appToDelete.id));
        setSyncStatus({ type: 'success', message: 'App verwijderd' });
        setTimeout(() => setSyncStatus(null), 3000);
        setShowDeleteConfirm(false);
        setAppToDelete(null);
      } catch (error) {
        console.error('Error deleting app:', error);
        setSyncStatus({ type: 'error', message: 'Fout bij verwijderen app' });
        setTimeout(() => setSyncStatus(null), 3000);
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setAppToDelete(null);
  };

  // Restore official list (seed)
  const applyOfficialSeed = async () => {
    if (window.confirm('Wil je de officiële lijst van apps herstellen? Dit vervangt je huidige lijst.')) {
      try {
        // Delete all existing apps
        await Promise.all(apps.map(app => db.apps.delete(app.id)));
        // Re-seed with defaults
        await seedDefaultApps();
        setSyncStatus({ type: 'success', message: 'Officiële lijst hersteld' });
        setTimeout(() => setSyncStatus(null), 3000);
      } catch (error) {
        console.error('Error restoring official seed:', error);
        setSyncStatus({ type: 'error', message: 'Fout bij herstellen lijst' });
        setTimeout(() => setSyncStatus(null), 3000);
      }
    }
  };

  // Data management functions
  const handleExport = () => {
    const dataStr = JSON.stringify(apps, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shopify-apps-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSyncStatus({ type: 'success', message: 'Apps geëxporteerd' });
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedApps = JSON.parse(e.target.result);

        // Normalize keys and import to Supabase
        const payloads = importedApps.map(app => {
          const normalized = {
            ...app,
            usedOn: app.usedOn ?? app.used_on ?? [],
            appLink: app.appLink ?? app.app_link ?? ''
          };
          const { id, created_at, updated_at, ...rest } = normalized;
          return toDbApp(rest);
        });

        const createdRows = await Promise.all(payloads.map(p => db.apps.create(p)));
        setApps([...apps, ...createdRows.map(fromDbApp)]);
        setSyncStatus({ type: 'success', message: `${createdRows.length} apps geïmporteerd` });
        setTimeout(() => setSyncStatus(null), 3000);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Import error:', error);
        setSyncStatus({ type: 'error', message: 'Fout bij importeren' });
        setTimeout(() => setSyncStatus(null), 3000);
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const showStorageStats = () => {
    const stats = {
      hasData: apps.length > 0,
      recordCount: apps.length,
      backupCount: 0,
      lastBackup: null,
      storageSize: new Blob([JSON.stringify(apps)]).size
    };
    setStorageStats(stats);
    setShowStorageInfo(true);
  };

  const getStatusColor = (status) => {
    return status === 'Installed' ? 'bg-green-500' : 'bg-blue-500';
  };

  // Filtered list
  const filteredAppsFlat = apps.filter(a => {
    if (appCategory && a.category !== appCategory) return false;
    if (appStore && (!a.usedOn || !a.usedOn.includes(appStore))) return false;
    const q = appSearch.trim().toLowerCase();
    if (q) {
      const hay = `${a.name} ${a.description} ${a.category} ${a.contact}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Unique options
  const appCategories = Array.from(new Set(apps.map(a => a.category).filter(Boolean)));
  const appStores = Array.from(new Set(apps.flatMap(a => Array.isArray(a.usedOn) ? a.usedOn : []).filter(Boolean)));

  // Group apps by category (after filtering)
  const groupedApps = filteredAppsFlat.reduce((groups, app) => {
    const category = app.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(app);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Apps</h1>
          <p className="text-white/60">Beheer en organiseer Shopify apps</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Supabase Status */}
          <div className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4 text-green-400" />
            <span className="text-white/70">
              {loading ? 'Laden...' : `${apps.length} apps in database`}
            </span>
            <button
              onClick={loadApps}
              className="text-blue-400 hover:text-blue-300"
              title="Ververs data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={appSearch}
            onChange={(e)=>setAppSearch(e.target.value)}
            placeholder="Zoeken..."
            className="hidden md:block bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
          <select
            value={appCategory}
            onChange={(e)=>setAppCategory(e.target.value)}
            className="hidden md:block bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="" className="bg-gray-800">Alle categorieën</option>
            {appCategories.map(c => (
              <option key={c} value={c} className="bg-gray-800">{c}</option>
            ))}
          </select>
          <select
            value={appStore}
            onChange={(e)=>setAppStore(e.target.value)}
            className="hidden md:block bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="" className="bg-gray-800">Alle stores</option>
            {appStores.map(s => (
              <option key={s} value={s} className="bg-gray-800">{s}</option>
            ))}
          </select>
          <button 
            onClick={() => window.open('https://apps.shopify.com', '_blank')}
            className="glass-effect px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 hover:bg-white/20 transition-all"
          >
            <span className="hidden">open</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3h7v7m0-7L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 21H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>App Store</span>
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuwe App</span>
          </button>
        </div>
      </div>

      

      {/* Add App Form */}
      {showAddForm && (
        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-semibold">
              {editingApp ? 'App Bewerken' : 'Nieuwe App Toevoegen'}
            </h2>
            <button 
              onClick={resetForm}
              className="text-white/70 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-white/70 text-sm mb-2">Naam</label>
              <input
                type="text"
                value={newApp.name}
                onChange={(e) => setNewApp({...newApp, name: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="App naam"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Categorie</label>
              <input
                type="text"
                value={newApp.category}
                onChange={(e) => setNewApp({...newApp, category: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="Marketing, Analytics, etc."
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Contact</label>
              <input
                type="text"
                value={newApp.contact || ''}
                onChange={(e) => setNewApp({...newApp, contact: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="support@voorbeeld.com"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Gebruikt op (stores, komma-gescheiden)</label>
              <input
                type="text"
                value={Array.isArray(newApp.usedOn) ? newApp.usedOn.join(', ') : (newApp.usedOn || '')}
                onChange={(e) => setNewApp({...newApp, usedOn: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="VoorbeeldStore, AndereStore"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Prijs</label>
              <input
                type="text"
                value={newApp.price}
                onChange={(e) => setNewApp({...newApp, price: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="€29/maand of Gratis"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Rating</label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={newApp.rating}
                onChange={(e) => setNewApp({...newApp, rating: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Status</label>
              <select
                value={newApp.status}
                onChange={(e) => setNewApp({...newApp, status: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              >
                <option value="Available" className="bg-gray-800">Available</option>
                <option value="Installed" className="bg-gray-800">Installed</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Afbeelding URL</label>
              <input
                type="url"
                value={newApp.image}
                onChange={(e) => setNewApp({...newApp, image: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="https://example.com/icon.jpg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/70 text-sm mb-2">Beschrijving</label>
              <textarea
                value={newApp.description}
                onChange={(e) => setNewApp({...newApp, description: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400 h-24"
                placeholder="Beschrijving van de app..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/70 text-sm mb-2">App Link</label>
              <input
                type="url"
                value={newApp.appLink}
                onChange={(e) => setNewApp({...newApp, appLink: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="https://example.com/app"
              />
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button 
              onClick={editingApp ? updateApp : addApp}
              className="btn-primary px-6 py-2 rounded-lg text-white font-medium"
            >
              {editingApp ? 'App Bijwerken' : 'App Toevoegen'}
            </button>
            <button 
              onClick={resetForm}
              className="glass-effect px-6 py-2 rounded-lg text-white font-medium"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="gradient-card rounded-xl p-6 w-[500px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">App Verwijderen</h2>
              <button 
                onClick={cancelDelete}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-white/70 mb-4">
                Ben je zeker dat je de app <span className="text-white font-semibold">"{appToDelete?.name}"</span> wil verwijderen?
              </p>
              <p className="text-red-300 text-sm">
                Deze actie kan niet ongedaan gemaakt worden.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={deleteApp}
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

      {/* Apps by Category */}
      {loading ? (
        <div className="gradient-card rounded-xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="w-12 h-12 text-white/60 animate-spin" />
            <p className="text-white/70">Apps laden vanuit database...</p>
          </div>
        </div>
      ) : Object.keys(groupedApps).length === 0 ? (
        <div className="gradient-card rounded-xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
              <LayoutGrid className="w-12 h-12 text-white/60" />
            </div>
            <div>
              <h3 className="text-white text-xl font-semibold mb-2">Geen Apps Gevonden</h3>
              <p className="text-white/70 mb-6 max-w-md">
                Er zijn nog geen Shopify apps toegevoegd aan je dashboard. Voeg je eerste app toe om te beginnen met het beheren van je app integraties.
              </p>
              <button 
                onClick={() => setShowAddForm(true)}
                className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Eerste App Toevoegen</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        Object.entries(groupedApps).map(([category, categoryApps]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4 border-b border-white/20 pb-2">
            {category}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryApps.map((app) => {
              console.log('Rendering app:', app.name, 'Image:', app.image);
              return (
              <div key={app.id} className="gradient-card rounded-xl p-4 hover:scale-105 transition-transform relative">
                <div className="absolute top-3 right-3 flex space-x-1">
                  <button 
                    onClick={() => startEdit(app)}
                    className="text-white/60 hover:text-white transition-colors p-1"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => confirmDelete(app)}
                    className="text-red-400 hover:text-red-300 transition-colors p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-blue-500 flex items-center justify-center">
                    {app.image && app.image.trim() !== '' ? (
                      <img 
                        src={app.image} 
                        alt={app.name}
                        className="w-full h-full object-contain bg-white/5"
                        onLoad={() => console.log('Image loaded successfully:', app.image)}
                        onError={(e) => {
                          console.log('Image failed to load:', app.image);
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          parent.innerHTML = '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="m9 9 6 6m0-6-6 6"/></svg>';
                        }}
                      />
                    ) : (
                      <LayoutGrid className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">{app.name}</h3>
                    <p className="text-white/60 text-xs">{app.description}</p>
                  </div>
                </div>
                
                {/* Contact */}
                <div className="mb-2">
                  <p className="text-white/50 text-xs mb-1">Contact:</p>
                  <span className="text-blue-400 text-xs">{app.contact}</span>
                </div>
                
                {/* Used on */}
                {app.usedOn && app.usedOn.length > 0 && (
                  <div className="mb-3">
                    <p className="text-white/50 text-xs mb-1">Gebruikt op:</p>
                    <div className="flex flex-wrap gap-1">
                      {app.usedOn.map((site, index) => (
                        <span key={index} className="text-white/60 text-xs bg-blue-500/20 px-2 py-1 rounded">
                          {site}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* App Link */}
                <button 
                  onClick={() => window.open(app.appLink, '_blank')}
                  className="btn-secondary w-full py-2 rounded-lg text-white text-xs font-medium flex items-center justify-center space-x-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>App Link</span>
                </button>
              </div>
              );
            })}
          </div>
        </div>
        ))
      )}

      {/* Storage Info Modal */}
      {showStorageInfo && storageStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="gradient-card rounded-xl p-6 w-[500px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">Storage Informatie</h2>
              <button 
                onClick={() => setShowStorageInfo(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Apps opgeslagen:</span>
                <span className="text-white font-semibold">{storageStats.recordCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Backup bestanden:</span>
                <span className="text-white font-semibold">{storageStats.backupCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Laatste backup:</span>
                <span className="text-white font-semibold">
                  {storageStats.lastBackup 
                    ? new Date(storageStats.lastBackup).toLocaleString('nl-NL')
                    : 'Geen backup'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Storage grootte:</span>
                <span className="text-white font-semibold">
                  {(storageStats.storageSize / 1024).toFixed(1)} KB
                </span>
              </div>
              
              <div className="border-t border-white/20 pt-4 mt-6">
                <p className="text-white/60 text-sm mb-4">
                  Je apps data wordt automatisch gebackupt elke keer als je wijzigingen maakt. 
                  Gebruik de export/import knoppen om handmatige backups te maken.
                </p>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => {
                      setShowStorageInfo(false);
                      handleExport();
                    }}
                    className="btn-primary px-4 py-2 rounded-lg text-white font-medium flex items-center space-x-2 flex-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exporteer Nu</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowStorageInfo(false);
                      fileInputRef.current?.click();
                    }}
                    className="glass-effect px-4 py-2 rounded-lg text-white font-medium flex items-center space-x-2 flex-1"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importeer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Sync Status Toast */}
      {syncStatus && (
        <div className={`fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg ${
          syncStatus.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {syncStatus.message}
        </div>
      )}
    </div>
  );
};

export default AppsPage;
