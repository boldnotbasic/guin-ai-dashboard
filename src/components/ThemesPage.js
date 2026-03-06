import React, { useState, useEffect, useRef } from 'react';
import { Eye, Download, Star, Plus, X, Edit, Trash2, ShieldCheck, Palette, Upload, Info, Cloud, CloudOff, Image as ImageIcon } from 'lucide-react';
import dataStorage from '../utils/dataStorage';
import githubSync from '../utils/githubSync';
import GitHubSyncSetup from './GitHubSyncSetup';
import { db, supabase } from '../utils/supabaseClient';

const ThemesPage = () => {
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const uploadFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('themes')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('themes')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecteer een afbeelding');
      return;
    }

    setImageFile(file);
  };

  const removeImage = () => {
    setImageFile(null);
  };

  const defaultThemes = [
    {
      id: 1,
      name: 'Horizon',
      description: 'Shopify theme voor Meteor Merch store',
      category: 'E-commerce',
      rating: 4.8,
      downloads: 1250,
      image: 'https://via.placeholder.com/300x200/667eea/ffffff?text=Horizon',
      price: 'Gratis',
      devLink: 'https://shopify.com/themes/horizon',
      previewLink: 'https://shopify.com/themes/horizon/preview',
      documentationLink: 'https://help.shopify.com/themes',
      appBuilder: 'Shopify',
      verified: false,
      usedOn: ['Meteor Merch store'],
      documentation: 'Shopify themes'
    },
    {
      id: 2,
      name: 'Trade',
      description: 'B2B theme voor Shopify',
      category: 'B2B',
      rating: 4.6,
      downloads: 890,
      image: 'https://via.placeholder.com/300x200/764ba2/ffffff?text=Trade',
      price: 'Gratis',
      devLink: 'https://shopify.com/themes/trade',
      previewLink: 'https://shopify.com/themes/trade/preview',
      documentationLink: 'https://help.shopify.com/themes/trade',
      appBuilder: 'Shopify',
      verified: true,
      usedOn: ['Royal Talens B2B'],
      documentation: 'B2B theme Trade Shopify'
    },
    {
      id: 3,
      name: 'Veena',
      description: 'Webibazaar Templates theme',
      category: 'Templates',
      rating: 4.9,
      downloads: 2100,
      image: 'https://via.placeholder.com/300x200/4facfe/ffffff?text=Veena',
      price: 'Betaald',
      devLink: 'https://webibazaar.com/veena',
      previewLink: 'https://webibazaar.com/veena/preview',
      documentationLink: 'https://webibazaar.com/support/veena',
      appBuilder: 'Webibazaar Templates',
      verified: true,
      usedOn: ['Dreambaby'],
      documentation: 'Webibazaar Support | Veena Documentation'
    },
    {
      id: 4,
      name: 'Enterprise',
      description: 'Clean canvas enterprise theme',
      category: 'Enterprise',
      rating: 4.7,
      downloads: 1500,
      image: 'https://via.placeholder.com/300x200/8b5cf6/ffffff?text=Enterprise',
      price: 'Betaald',
      devLink: 'https://cleancanvas.com/enterprise',
      previewLink: 'https://cleancanvas.com/enterprise/preview',
      documentationLink: 'https://cleancanvas.com/enterprise/docs',
      appBuilder: 'Clean canvas',
      verified: false,
      usedOn: ['Coeck', 'Covarte'],
      documentation: 'Enterprise – User Guides'
    },
    {
      id: 5,
      name: 'Spanner',
      description: 'Webibazaar Templates ecommerce theme',
      category: 'E-commerce',
      rating: 4.5,
      downloads: 800,
      image: 'https://via.placeholder.com/300x200/10b981/ffffff?text=Spanner',
      price: 'Gratis',
      devLink: 'https://webibazaar.com/spanner',
      previewLink: 'https://webibazaar.com/spanner/preview',
      documentationLink: 'https://webibazaar.com/support/spanner',
      appBuilder: 'Webibazaar Templates',
      verified: true,
      usedOn: ['Novy'],
      documentation: 'Webibazaar Support | Koto Documentation'
    },
    {
      id: 6,
      name: 'Wonder',
      description: 'NETHYPE wonder theme',
      category: 'Modern',
      rating: 4.8,
      downloads: 1800,
      image: 'https://via.placeholder.com/300x200/f59e0b/ffffff?text=Wonder',
      price: 'Betaald',
      devLink: 'https://wonder-theme.com',
      previewLink: 'https://wonder-theme.com/preview',
      documentationLink: 'https://wonder-theme.com/support',
      appBuilder: 'NETHYPE',
      verified: true,
      usedOn: ['Bronn'],
      documentation: 'Wonder-theme.com – Support'
    }
  ];

  const defaultDevelopers = [
    {
      id: 1,
      name: 'Shopify',
      specialization: 'Official Shopify Themes',
      experience: '10+ years',
      portfolio: 'https://themes.shopify.com',
      rating: 4.8,
      projects: 100,
      description: 'Officiële Shopify theme ontwikkelaar'
    },
    {
      id: 2,
      name: 'Webibazaar Templates',
      specialization: 'Custom E-commerce Templates',
      experience: '8+ years',
      portfolio: 'https://webibazaar.com',
      rating: 4.6,
      projects: 50,
      description: 'Gespecialiseerd in custom e-commerce templates'
    },
    {
      id: 3,
      name: 'Clean canvas',
      specialization: 'Enterprise Solutions',
      experience: '6+ years',
      portfolio: 'https://cleancanvas.com',
      rating: 4.7,
      projects: 30,
      description: 'Enterprise-level theme ontwikkeling'
    },
    {
      id: 4,
      name: 'NETHYPE',
      specialization: 'Modern Theme Design',
      experience: '5+ years',
      portfolio: 'https://nethype.com',
      rating: 4.9,
      projects: 25,
      description: 'Moderne en innovatieve theme designs'
    }
  ];

  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [syncStatus, setSyncStatus] = useState(null);
  const [showSyncSetup, setShowSyncSetup] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const [developers, setDevelopers] = useState(() => {
    return dataStorage.getItem('shopify-dashboard-developers', defaultDevelopers);
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState(null);
  
  const [showAddDeveloperForm, setShowAddDeveloperForm] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState(null);
  const [showDeleteDeveloperConfirm, setShowDeleteDeveloperConfirm] = useState(false);
  const [developerToDelete, setDeveloperToDelete] = useState(null);
  const applyOfficialSeed = async () => {
    if (window.confirm('Wil je de officiële lijst van themes en developers herstellen? Dit vervangt je huidige lijst.')) {
      try {
        // Delete all existing themes
        await Promise.all((themes || []).map(t => db.themes.delete(t.id)));
        // Seed defaults into DB
        const payloads = defaultThemes.map(toDbTheme);
        const created = await Promise.all(payloads.map(p => db.themes.create(p)));
        setThemes(created.map(fromDbTheme));
        // Keep developers local as voorheen
        setDevelopers(defaultDevelopers);
        dataStorage.setItem('shopify-dashboard-developers', defaultDevelopers);
        alert('Officiële lijst is ingesteld en in database opgeslagen.');
      } catch (e) {
        console.error('Seed themes failed:', e);
        alert('Fout bij herstellen lijst');
      }
    }
  };
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const fileInputRef = useRef(null);
  // Filters
  const [themeSearch, setThemeSearch] = useState('');
  const [themeCategory, setThemeCategory] = useState('');
  const [themeBuilder, setThemeBuilder] = useState('');
  const [themeVerifiedOnly, setThemeVerifiedOnly] = useState(false);
  const [newTheme, setNewTheme] = useState({
    name: '',
    description: '',
    category: '',
    rating: 5.0,
    price: '',
    image: '',
    devLink: '',
    previewLink: '',
    documentationLink: '',
    appBuilder: '',
    verified: false,
    usedOn: [],
    documentation: '',
    validationDocumentation: ''
  });

  const [newDeveloper, setNewDeveloper] = useState({
    name: '',
    specialization: '',
    experience: '',
    portfolio: '',
    rating: 5.0,
    projects: 0,
    description: '',
    avatar: ''
  });

  // Save themes to enhanced storage whenever themes change (optional local backup)
  useEffect(() => {
    dataStorage.setItem('shopify-dashboard-themes', themes);
    if (githubSync.isConfigured()) {
      syncToGitHub();
    }
  }, [themes]);

  // Load from GitHub on component mount
  useEffect(() => {
    if (githubSync.isConfigured()) {
      loadFromGitHub();
    }
  }, []);

  const syncToGitHub = async () => {
    if (!githubSync.isConfigured()) return;
    
    try {
      const apps = dataStorage.getItem('shopify-dashboard-apps', []);
      const result = await githubSync.syncToCloud(themes, apps);
      
      if (result.success) {
        setSyncStatus({ type: 'success', message: 'Gesynchroniseerd met GitHub' });
        setLastSyncTime(new Date().toLocaleString());
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        setSyncStatus({ type: 'error', message: `Sync failed: ${result.error}` });
      }
    } catch (error) {
      setSyncStatus({ type: 'error', message: error.message });
    }
  };

  const loadFromGitHub = async () => {
    if (!githubSync.isConfigured()) return;
    
    try {
      const result = await githubSync.loadFromCloud();
      
      if (result.success && result.themes.length > 0) {
        setThemes(result.themes);
        dataStorage.setItem('shopify-dashboard-themes', result.themes);
        setSyncStatus({ type: 'success', message: 'Geladen van GitHub' });
        setTimeout(() => setSyncStatus(null), 3000);
      }
    } catch (error) {
      setSyncStatus({ type: 'error', message: error.message });
    }
  };

  // Save developers to enhanced storage whenever developers change
  useEffect(() => {
    dataStorage.setItem('shopify-dashboard-developers', developers);
  }, [developers]);

  // Helpers to map UI <-> DB
  const toDbTheme = (t) => ({
    name: t.name || null,
    description: t.description || null,
    category: t.category || null,
    rating: t.rating !== undefined && t.rating !== null ? parseFloat(t.rating) : 5.0,
    downloads: t.downloads !== undefined && t.downloads !== null ? parseInt(t.downloads) : 0,
    image: t.image || null,
    price: t.price || null,
    dev_link: t.devLink ?? t.dev_link ?? null,
    preview_link: t.previewLink ?? t.preview_link ?? null,
    documentation_link: t.documentationLink ?? t.documentation_link ?? null,
    app_builder: t.appBuilder ?? t.app_builder ?? null,
    verified: !!t.verified,
    used_on: Array.isArray(t.usedOn) ? t.usedOn : (t.used_on || []),
    documentation: t.documentation || null,
    validation_documentation: t.validationDocumentation ?? t.validation_documentation ?? null
  });

  const fromDbTheme = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    rating: row.rating,
    downloads: row.downloads,
    image: row.image,
    price: row.price,
    devLink: row.dev_link,
    previewLink: row.preview_link,
    documentationLink: row.documentation_link,
    appBuilder: row.app_builder,
    verified: row.verified,
    usedOn: row.used_on || [],
    documentation: row.documentation,
    validationDocumentation: row.validation_documentation,
    created_at: row.created_at,
    updated_at: row.updated_at
  });

  // Load from DB on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const rows = await db.themes.getAll();
        if (!rows || rows.length === 0) {
          const payloads = defaultThemes.map(toDbTheme);
          const created = await Promise.all(payloads.map(p => db.themes.create(p)));
          setThemes(created.map(fromDbTheme));
        } else {
          setThemes(rows.map(fromDbTheme));
        }
      } catch (e) {
        console.error('Load themes failed:', e);
        setThemes(defaultThemes);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addTheme = async () => {
    if (newTheme.name && newTheme.description && newTheme.price) {
      try {
        setUploading(true);
        let imageUrl = newTheme.image;

        if (imageFile) {
          imageUrl = await uploadFile(imageFile, 'main');
        }

        const payload = toDbTheme({ ...newTheme, rating: parseFloat(newTheme.rating), image: imageUrl });
        const created = await db.themes.create(payload);
        setThemes([...themes, fromDbTheme(created)]);
        resetForm();
      } catch (e) {
        console.error('Add theme failed:', e);
        alert('Fout bij toevoegen theme');
      } finally {
        setUploading(false);
      }
    }
  };

  const updateTheme = async () => {
    if (newTheme.name && newTheme.description && newTheme.price) {
      try {
        setUploading(true);
        let imageUrl = newTheme.image;

        if (imageFile) {
          imageUrl = await uploadFile(imageFile, 'main');
        }

        const updates = toDbTheme({ ...newTheme, rating: parseFloat(newTheme.rating), image: imageUrl });
        const row = await db.themes.update(editingTheme.id, updates);
        const updated = fromDbTheme(row);
        const updatedThemes = themes.map(t => t.id === editingTheme.id ? updated : t);
        setThemes(updatedThemes);
        resetForm();
      } catch (e) {
        console.error('Update theme failed:', e);
        alert('Fout bij bijwerken theme');
      } finally {
        setUploading(false);
      }
    }
  };

  const startEdit = (theme) => {
    setEditingTheme(theme);
    setNewTheme(theme);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setNewTheme({
      name: '',
      description: '',
      category: '',
      rating: 0,
      price: '',
      image: '',
      devLink: '',
      previewLink: '',
      documentationLink: '',
      appBuilder: '',
      verified: false,
      usedOn: [],
      documentation: ''
    });
    setImageFile(null);
    setShowAddForm(false);
    setEditingTheme(null);
  };

  const confirmDelete = (theme) => {
    setThemeToDelete(theme);
    setShowDeleteConfirm(true);
  };

  const deleteTheme = async () => {
    if (themeToDelete) {
      try {
        await db.themes.delete(themeToDelete.id);
        setThemes(themes.filter(t => t.id !== themeToDelete.id));
        setShowDeleteConfirm(false);
        setThemeToDelete(null);
      } catch (e) {
        console.error('Delete theme failed:', e);
        alert('Fout bij verwijderen theme');
      }
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setThemeToDelete(null);
  };

  // Developer management functions
  const addDeveloper = () => {
    if (newDeveloper.name && newDeveloper.specialization && newDeveloper.experience) {
      const developer = {
        ...newDeveloper,
        id: Date.now(),
        rating: parseFloat(newDeveloper.rating),
        projects: parseInt(newDeveloper.projects) || 0
      };
      setDevelopers([...developers, developer]);
      resetDeveloperForm();
    }
  };

  const updateDeveloper = () => {
    if (newDeveloper.name && newDeveloper.specialization && newDeveloper.experience) {
      const updatedDevelopers = developers.map(d => 
        d.id === editingDeveloper.id 
          ? { ...newDeveloper, id: editingDeveloper.id, rating: parseFloat(newDeveloper.rating), projects: parseInt(newDeveloper.projects) || 0 }
          : d
      );
      setDevelopers(updatedDevelopers);
      resetDeveloperForm();
    }
  };

  const startEditDeveloper = (developer) => {
    setEditingDeveloper(developer);
    setNewDeveloper(developer);
    setShowAddDeveloperForm(true);
  };

  const resetDeveloperForm = () => {
    setNewDeveloper({
      name: '',
      specialization: '',
      experience: '',
      portfolio: '',
      rating: 5.0,
      projects: 0,
      description: '',
      avatar: ''
    });
    setShowAddDeveloperForm(false);
    setEditingDeveloper(null);
  };

  const confirmDeleteDeveloper = (developer) => {
    setDeveloperToDelete(developer);
    setShowDeleteDeveloperConfirm(true);
  };

  const deleteDeveloper = () => {
    if (developerToDelete) {
      setDevelopers(developers.filter(d => d.id !== developerToDelete.id));
      setShowDeleteDeveloperConfirm(false);
      setDeveloperToDelete(null);
    }
  };

  const cancelDeleteDeveloper = () => {
    setShowDeleteDeveloperConfirm(false);
    setDeveloperToDelete(null);
  };

  // Data management functions
  const handleExport = () => {
    const dataStr = JSON.stringify(themes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shopify-themes-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        const payloads = imported.map(item => {
          const { id, created_at, updated_at, ...rest } = item;
          return toDbTheme(rest);
        });
        const created = await Promise.all(payloads.map(p => db.themes.create(p)));
        setThemes([...themes, ...created.map(fromDbTheme)]);
        alert(`Import succesvol! ${created.length} themes geïmporteerd.`);
      } catch (err) {
        console.error('Import themes failed:', err);
        alert('Import mislukt.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const showStorageStats = () => {
    const stats = {
      hasData: themes.length > 0,
      recordCount: themes.length,
      backupCount: 0,
      lastBackup: null,
      storageSize: new Blob([JSON.stringify(themes)]).size
    };
    setStorageStats(stats);
    setShowStorageInfo(true);
  };

  // Unique options for filters
  const themeCategories = Array.from(new Set(themes.map(t => t.category).filter(Boolean)));
  const themeBuilders = Array.from(new Set([...(developers?.map(d=>d.name)||[]), ...themes.map(t=>t.appBuilder).filter(Boolean)]));

  // Apply filters
  const filteredThemes = themes.filter(t => {
    if (themeVerifiedOnly && !t.verified) return false;
    if (themeCategory && t.category !== themeCategory) return false;
    if (themeBuilder && t.appBuilder !== themeBuilder) return false;
    const q = themeSearch.trim().toLowerCase();
    if (q) {
      const hay = `${t.name} ${t.description} ${t.category} ${t.appBuilder}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Themes</h1>
          <p className="text-white/60">Beheer en organiseer Shopify themes</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={themeSearch}
            onChange={(e)=>setThemeSearch(e.target.value)}
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
            value={themeCategory}
            onChange={(e)=>setThemeCategory(e.target.value)}
            className="hidden md:block bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="" className="bg-gray-800">Alle categorieën</option>
            {themeCategories.map(c => (
              <option key={c} value={c} className="bg-gray-800">{c}</option>
            ))}
          </select>
          <select
            value={themeBuilder}
            onChange={(e)=>setThemeBuilder(e.target.value)}
            className="hidden md:block bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="" className="bg-gray-800">Alle builders</option>
            {themeBuilders.map(b => (
              <option key={b} value={b} className="bg-gray-800">{b}</option>
            ))}
          </select>
          <label className="hidden md:inline-flex items-center space-x-2 text-white/80 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded bg-white/20 border-white/30 text-blue-500"
              checked={themeVerifiedOnly} onChange={(e)=>setThemeVerifiedOnly(e.target.checked)} />
            <span>Verified</span>
          </label>
          <button 
            onClick={() => window.open('https://themes.shopify.com', '_blank')}
            className="glass-effect px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 hover:bg-white/20 transition-all"
          >
            <span className="hidden">open</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3h7v7m0-7L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 21H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Theme Store</span>
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuw Theme</span>
          </button>
        </div>
      </div>

      

      {/* Add Theme Form */}
      {showAddForm && (
        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-semibold">
              {editingTheme ? 'Theme Bewerken' : 'Nieuw Theme Toevoegen'}
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
                value={newTheme.name}
                onChange={(e) => setNewTheme({...newTheme, name: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="Theme naam"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Categorie</label>
              <input
                type="text"
                value={newTheme.category}
                onChange={(e) => setNewTheme({...newTheme, category: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="E-commerce, Fashion, etc."
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Prijs</label>
              <input
                type="text"
                value={newTheme.price}
                onChange={(e) => setNewTheme({...newTheme, price: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="€199"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Rating</label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={newTheme.rating}
                onChange={(e) => setNewTheme({...newTheme, rating: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/70 text-sm mb-2">Beschrijving</label>
              <textarea
                value={newTheme.description}
                onChange={(e) => setNewTheme({...newTheme, description: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400 h-24"
                placeholder="Beschrijving van het theme..."
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Afbeelding</label>
              <div className="space-y-4">
                {imageFile || newTheme.image ? (
                  <div className="relative">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : newTheme.image}
                      alt="Theme afbeelding"
                      className="w-full h-64 object-contain bg-white/5 rounded-lg"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition-colors"
                      title="Verwijder afbeelding"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40 transition-colors">
                    <Upload className="w-12 h-12 text-white/40 mb-2" />
                    <span className="text-white/60">Klik om afbeelding te uploaden</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Preview Link</label>
              <input
                type="url"
                value={newTheme.previewLink}
                onChange={(e) => setNewTheme({...newTheme, previewLink: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="https://example.com/preview"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Documentatie Link</label>
              <input
                type="url"
                value={newTheme.documentationLink}
                onChange={(e) => setNewTheme({...newTheme, documentationLink: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="https://example.com/docs"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Validation Documentation URL (optioneel)</label>
              <input
                type="url"
                value={newTheme.validationDocumentation}
                onChange={(e) => setNewTheme({...newTheme, validationDocumentation: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="https://example.com/validation"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Dev Link (optioneel)</label>
              <input
                type="url"
                value={newTheme.devLink}
                onChange={(e) => setNewTheme({...newTheme, devLink: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                placeholder="https://example.com/demo"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">App Builder</label>
              <select
                value={newTheme.appBuilder}
                onChange={(e) => setNewTheme({...newTheme, appBuilder: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              >
                <option value="" className="bg-gray-800">Selecteer een developer...</option>
                {developers.map(developer => (
                  <option key={developer.id} value={developer.name} className="bg-gray-800">
                    {developer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="verified"
                checked={newTheme.verified}
                onChange={(e) => setNewTheme({...newTheme, verified: e.target.checked})}
                className="h-4 w-4 rounded bg-white/20 border-white/30 text-blue-500 focus:ring-blue-400"
              />
              <label htmlFor="verified" className="ml-2 text-white/80 text-sm">Geverifieerd</label>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button 
              onClick={editingTheme ? updateTheme : addTheme}
              disabled={uploading}
              className="btn-primary px-6 py-2 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{editingTheme ? 'Bijwerken...' : 'Toevoegen...'}</span>
                </>
              ) : (
                <span>{editingTheme ? 'Theme Bijwerken' : 'Theme Toevoegen'}</span>
              )}
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
              <h2 className="text-white text-xl font-semibold">Theme Verwijderen</h2>
              <button 
                onClick={cancelDelete}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-white/70 mb-4">
                Ben je zeker dat je het theme <span className="text-white font-semibold">"{themeToDelete?.name}"</span> wil verwijderen?
              </p>
              <p className="text-red-300 text-sm">
                Deze actie kan niet ongedaan gemaakt worden.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={deleteTheme}
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

      {/* Developer Add/Edit Form */}
      {showAddDeveloperForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">
                {editingDeveloper ? 'Developer Bewerken' : 'Nieuwe Developer Toevoegen'}
              </h2>
              <button 
                onClick={resetDeveloperForm}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Naam *</label>
                <input
                  type="text"
                  value={newDeveloper.name}
                  onChange={(e) => setNewDeveloper({...newDeveloper, name: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Developer naam"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Specialisatie *</label>
                <input
                  type="text"
                  value={newDeveloper.specialization}
                  onChange={(e) => setNewDeveloper({...newDeveloper, specialization: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Custom E-commerce Templates"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Ervaring *</label>
                <input
                  type="text"
                  value={newDeveloper.experience}
                  onChange={(e) => setNewDeveloper({...newDeveloper, experience: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="5+ years"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Portfolio URL</label>
                <input
                  type="url"
                  value={newDeveloper.portfolio}
                  onChange={(e) => setNewDeveloper({...newDeveloper, portfolio: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://portfolio.com"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Rating</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={newDeveloper.rating}
                  onChange={(e) => setNewDeveloper({...newDeveloper, rating: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Aantal Projecten</label>
                <input
                  type="number"
                  min="0"
                  value={newDeveloper.projects}
                  onChange={(e) => setNewDeveloper({...newDeveloper, projects: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="25"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Profielfoto URL</label>
                <input
                  type="url"
                  value={newDeveloper.avatar || ''}
                  onChange={(e) => setNewDeveloper({...newDeveloper, avatar: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-2">Beschrijving</label>
                <textarea
                  value={newDeveloper.description}
                  onChange={(e) => setNewDeveloper({...newDeveloper, description: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400 h-24"
                  placeholder="Beschrijving van de developer..."
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button 
                onClick={editingDeveloper ? updateDeveloper : addDeveloper}
                className="btn-primary px-6 py-2 rounded-lg text-white font-medium"
              >
                {editingDeveloper ? 'Developer Bijwerken' : 'Developer Toevoegen'}
              </button>
              <button 
                onClick={resetDeveloperForm}
                className="glass-effect px-6 py-2 rounded-lg text-white font-medium"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Developer Delete Confirmation Modal */}
      {showDeleteDeveloperConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="gradient-card rounded-xl p-6 w-[500px] max-w-[90vw]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">Developer Verwijderen</h2>
              <button 
                onClick={cancelDeleteDeveloper}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-white/70 mb-4">
                Ben je zeker dat je developer <span className="text-white font-semibold">"{developerToDelete?.name}"</span> wil verwijderen?
              </p>
              <p className="text-red-300 text-sm">
                Deze actie kan niet ongedaan gemaakt worden.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button 
                onClick={deleteDeveloper}
                className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-lg text-white font-medium flex-1 transition-colors"
              >
                Ja, Verwijderen
              </button>
              <button 
                onClick={cancelDeleteDeveloper}
                className="glass-effect px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredThemes.length === 0 ? (
        <div className="gradient-card rounded-xl p-12 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
              <Palette className="w-12 h-12 text-white/60" />
            </div>
            <div>
              <h3 className="text-white text-xl font-semibold mb-2">Geen Themes Gevonden</h3>
              <p className="text-white/70 mb-6 max-w-md mx-auto">
                Er zijn geen themes die overeenkomen met je filters of er zijn nog geen themes toegevoegd. Voeg je eerste theme toe om te starten.
              </p>
              <button 
                onClick={() => setShowAddForm(true)}
                className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Eerste Theme Toevoegen</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredThemes.map((theme) => (
          <div key={theme.id} className="gradient-card rounded-xl overflow-hidden hover:scale-105 transition-transform relative">
            <div className="absolute top-4 right-4 z-10 flex space-x-2">
              <button 
                onClick={() => startEdit(theme)}
                className="bg-black/50 p-2 rounded-full text-white/80 hover:text-white hover:bg-black/70 transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={() => confirmDelete(theme)}
                className="bg-black/50 p-2 rounded-full text-red-400 hover:text-red-300 hover:bg-black/70 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="h-48 bg-gradient-purple-cyan relative flex items-center justify-center">
              {theme.image ? (
                <img 
                  src={theme.image} 
                  alt={theme.name}
                  className="w-full h-full object-contain bg-white/5"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    // Show placeholder when image fails to load
                    const placeholder = document.createElement('div');
                    placeholder.className = 'absolute inset-0 flex items-center justify-center';
                    placeholder.innerHTML = '<svg class="w-16 h-16 text-white/40"></svg>';
                    e.target.parentElement.appendChild(placeholder);
                  }}
                />
              ) : (
                <Palette className="w-16 h-16 text-white/40" />
              )}
            </div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    <h3 className="text-white font-semibold text-lg">{theme.name}</h3>
                    {theme.verified && (
                      theme.validationDocumentation ? (
                        <button
                          onClick={() => window.open(theme.validationDocumentation, '_blank')}
                          className="flex items-center space-x-1 bg-green-500/20 px-2 py-1 rounded-full hover:bg-green-500/30 transition-colors"
                          title="Open validation documentation"
                        >
                          <ShieldCheck className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-xs font-medium underline">Verified</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1 bg-green-500/20 px-2 py-1 rounded-full">
                          <ShieldCheck className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-xs font-medium">Verified</span>
                        </div>
                      )
                    )}
                  </div>
                  
                  {/* Used on section - only show for projects */}
                  {theme.usedOn && theme.usedOn.length > 0 && (
                    <div className="mb-2">
                      <p className="text-white/50 text-xs mb-1">Gebruikt op:</p>
                      <div className="flex flex-wrap gap-1">
                        {theme.usedOn.map((site, index) => (
                          <span key={index} className="text-white/60 text-xs bg-blue-500/20 px-2 py-1 rounded">
                            {site}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Developer Info with Avatar - Right Side */}
                <div className="flex flex-col items-end ml-4">
                  <span className="text-white font-bold text-lg mb-2">{theme.price}</span>
                  {(() => {
                    const developer = developers.find(dev => dev.name === theme.appBuilder);
                    return developer ? (
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="text-white/80 text-xs font-medium">{developer.name}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-blue-purple flex items-center justify-center">
                          {developer.avatar ? (
                            <img 
                              src={developer.avatar} 
                              alt={developer.name}
                              className="w-full h-full object-contain bg-white/5"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-white font-bold text-xs">
                              {developer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-white/50 text-xs bg-white/10 px-2 py-1 rounded">
                        {theme.appBuilder}
                      </span>
                    );
                  })()}
                </div>
              </div>
              

              <div className="flex space-x-2">
                {theme.previewLink && (
                  <button 
                    onClick={() => window.open(theme.previewLink, '_blank')}
                    className="btn-primary flex-1 py-2 rounded-lg text-white text-sm font-medium flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview</span>
                  </button>
                )}
                {theme.documentationLink && (
                  <button 
                    onClick={() => window.open(theme.documentationLink, '_blank')}
                    className="btn-secondary flex-1 py-2 rounded-lg text-white text-sm font-medium"
                  >
                    Documentatie
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Theme Developers Section */}
      <div className="mt-32 pt-16 border-t-2 border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Theme Developers</h2>
            <p className="text-white/60">Beheer theme ontwikkelaars en hun portfolios</p>
          </div>
          <button 
            onClick={() => setShowAddDeveloperForm(true)}
            className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuwe Developer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {developers.map((developer) => (
            <div key={developer.id} className="gradient-card rounded-xl p-6 hover:scale-105 transition-transform relative">
              <div className="absolute top-4 right-4 z-10 flex space-x-2">
                <button 
                  onClick={() => startEditDeveloper(developer)}
                  className="bg-black/50 p-2 rounded-full text-white/80 hover:text-white hover:bg-black/70 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => confirmDeleteDeveloper(developer)}
                  className="bg-black/50 p-2 rounded-full text-red-400 hover:text-red-300 hover:bg-black/70 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-blue-purple flex items-center justify-center">
                    {developer.avatar ? (
                      <img 
                        src={developer.avatar} 
                        alt={developer.name}
                        className="w-full h-full object-contain bg-white/5"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {developer.name.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{developer.name}</h3>
                    <p className="text-white/70 text-sm">{developer.specialization}</p>
                  </div>
                </div>
                {developer.description && (
                  <p className="text-white/60 text-xs">{developer.description}</p>
                )}
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Ervaring:</span>
                  <span className="text-white text-sm">{developer.experience}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Projecten:</span>
                  <span className="text-white text-sm">{developer.projects}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Rating:</span>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="text-white text-sm">{developer.rating}</span>
                  </div>
                </div>
              </div>

              {developer.portfolio && (
                <button 
                  onClick={() => window.open(developer.portfolio, '_blank')}
                  className="btn-primary w-full py-2 rounded-lg text-white text-sm font-medium"
                >
                  Portfolio Bekijken
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

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
      
      {/* GitHub Sync Setup Modal */}
      {showSyncSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <GitHubSyncSetup 
              onSetupComplete={() => {
                setShowSyncSetup(false);
                loadFromGitHub();
              }}
            />
            <button
              onClick={() => setShowSyncSetup(false)}
              className="mt-4 w-full text-white/60 hover:text-white text-center"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemesPage;
