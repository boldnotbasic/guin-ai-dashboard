import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Folder, 
  Palette, 
  Smartphone, 
  Settings, 
  HelpCircle,
  Store,
  Clock,
  Home,
  MoreHorizontal,
  MessageSquare,
  Calculator,
  Users,
  Baby,
  Trash2,
  CheckCircle,
  User,
  Building,
  Briefcase,
  Zap,
  Heart,
  Star,
  Rocket,
  Globe,
  Shield,
  XCircle,
  BarChart3,
  FolderOpen,
  Brush,
  Grid3X3,
  LayoutGrid,
  Mail,
  UserCheck,
  Activity,
  Cog,
  DollarSign,
  Layers,
  PaintBucket,
  Blocks,
  Send,
  UsersRound,
  FileText,
  Wrench,
  ChevronRight,
  ArrowUp,
  FileImage,
  ListTodo,
  BookOpen,
  Lightbulb,
  MapPin,
  Car,
  Beef,
  Target,
  UserCircle,
  Briefcase as BriefcaseIcon,
  Sparkles,
  Music,
  ChefHat,
  Package,
  Gift
} from 'lucide-react';
import { db } from '../utils/supabaseClient';

// Direct icon mapping - no state, always fresh
const getMainIcon = (id) => {
  const iconMap = {
    home: Home,
    sales: DollarSign,
    prospects: MapPin,
    seo: Zap,
    stoktelling: Package,     // 📦 Stoktelling
    habit: CheckCircle,
    aquarium: Activity,
    auto: Car,
    jerky: Beef,
    crabcave: Shield,
    cavedarts: Target,
    '2do': ListTodo,
    beleggen: TrendingUp,
    waardebonnen: Gift,       // 🎁 Waardebonnen
    learning: Activity,
    branding: Brush,
    projecten: Folder,        // 📁 Folder icoon
    ideacenter: Lightbulb,    // 💡 Lightbulb icoon
    'inspiration-center': Sparkles, // ✨ Inspiration Center
    reizen: Globe,            // 🌐 Reizen
    wandelingen: MapPin,      // 📍 Wandelingen
    'google-home': Smartphone,// 📱 Google Home
    festivals: Music,         // 🎵 Festivals
    koken: ChefHat,           // 👨‍🍳 Koken
    kosten: BarChart3,        // 💸 Kosten
    themes: Palette,          // 🎨 Palette icoon (niet emmertje)
    apps: LayoutGrid,         // ⚏ Grid icoon (2x2 vierkanten)
    settings: Wrench,
  };
  return iconMap[id] || Home;
};

const otherIconMap = {
  quiz: HelpCircle,
  store: Store,
  github: Folder,
  confluence: Folder,
  jira: Settings,
  'shopify-partner': Store,
  'share-a-thon': TrendingUp,
};

const Sidebar = ({ activeTab, setActiveTab, sidebarOpen = false, setSidebarOpen }) => {
  // Icon mapping for custom clients
  const iconComponents = {
    'User': User,
    'Building': Building,
    'Store': Store,
    'Briefcase': Briefcase,
    'Zap': Zap,
    'Heart': Heart,
    'Star': Star,
    'Rocket': Rocket,
    'Globe': Globe,
    'Shield': Shield
  };

  // Platform state
  const [selectedPlatform, setSelectedPlatform] = useState(() => {
    return localStorage.getItem('selected-platform') || 'Privé';
  });
  
  // Cache buster - v3.0 with Waardebonnen
  console.log('🚀 Sidebar loaded - v3.0 - Waardebonnen added - Timestamp:', Date.now());

  // Habit completion percentage
  const [habitPercentage, setHabitPercentage] = useState(0);

  // Custom Quick Links state
  const [customQuickLinks, setCustomQuickLinks] = useState([]);
  const [showAddQuickLinkModal, setShowAddQuickLinkModal] = useState(false);
  const [newQuickLink, setNewQuickLink] = useState({
    label: '',
    url: '',
    icon: 'Globe'
  });


  // Read approval status from localStorage
  const [salesStatus, setSalesStatus] = useState(() => {
    const saved = localStorage.getItem('shopify-dashboard-sales-approval-status');
    return saved || 'default';
  });
  
  const [royalTalensStatus, setRoyalTalensStatus] = useState(() => {
    const saved = localStorage.getItem('royal-talens-sales-approval-status');
    return saved || 'default';
  });
  
  const [dreambabyStatus, setDreambabyStatus] = useState(() => {
    const saved = localStorage.getItem('dremababy-sales-approval-status');
    return saved || 'approved';
  });

  // Load custom sales clients
  const [customClients, setCustomClients] = useState(() => {
    const saved = localStorage.getItem('custom-sales-clients');
    return saved ? JSON.parse(saved) : [];
  });

  // Load projects from localStorage
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('shopify-dashboard-projects');
    return saved ? JSON.parse(saved) : [];
  });

  // Update approval status when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const salesSaved = localStorage.getItem('shopify-dashboard-sales-approval-status');
      setSalesStatus(salesSaved || 'default');
      
      const royalTalensSaved = localStorage.getItem('royal-talens-sales-approval-status');
      setRoyalTalensStatus(royalTalensSaved || 'default');
      
      const dreambabyStatusSaved = localStorage.getItem('dremababy-sales-approval-status');
      setDreambabyStatus(dreambabyStatusSaved || 'approved');
      
      // Update custom clients
      const customClientsSaved = localStorage.getItem('custom-sales-clients');
      setCustomClients(customClientsSaved ? JSON.parse(customClientsSaved) : []);
      
      // Update projects
      const projectsSaved = localStorage.getItem('shopify-dashboard-projects');
      setProjects(projectsSaved ? JSON.parse(projectsSaved) : []);
      
      // Don't update menuItems from localStorage to preserve icons
    };

    // Check on mount
    handleStorageChange();
    
    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events for same-window updates
    window.addEventListener('localStorageUpdate', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleStorageChange);
    };
  }, []);

  // Menu items WITHOUT icons - icons are fetched dynamically
  // Different menu items based on selected platform
  const getMenuItems = () => {
    console.log('🔍 getMenuItems called - Platform:', selectedPlatform);
    if (selectedPlatform === 'Privé') {
      const items = [
        { id: 'home', label: 'Home' },
        { id: 'habit', label: 'Habit' },
        { id: 'aquarium', label: 'Aquarium' },
        { id: 'auto', label: 'Auto' },
        { id: 'jerky', label: 'Jerky' },
        { id: 'crabcave', label: 'Cave Drinks' },
        { id: 'cavedarts', label: 'Cave Darts' },
        { id: '2do', label: '2DO' },
        { id: 'beleggen', label: 'Beleggen' },
        { id: 'waardebonnen', label: 'Waardebonnen' },
        { id: 'reizen', label: 'Reizen' },
        { id: 'wandelingen', label: 'Wandelingen' },
        { id: 'festivals', label: 'Festivals' },
        { id: 'koken', label: 'Koken' },
        { id: 'google-home', label: 'Google home' },
      ];
      console.log('✅ Privé menu items:', items.map(i => i.label));
      return items;
    } else {
      // Bijberoep menu items
      return [
        { id: 'home', label: 'Home' },
        { id: 'sales', label: 'Sales' },
        { id: 'prospects', label: 'Prospects' },
        { id: 'seo', label: 'Guin.AI' },
        { id: 'branding', label: 'Branding' },
        { id: 'kosten', label: 'Kosten' },
        { id: 'projecten', label: 'Projecten' },
        { id: 'ideacenter', label: 'Idea Center' },
        { id: 'inspiration-center', label: 'Inspiration Center' },
        { id: 'settings', label: 'Settings' },
      ];
    }
  };

  const [menuItems, setMenuItems] = useState(() => getMenuItems());

  // Update menu items when platform changes
  useEffect(() => {
    const newItems = selectedPlatform === 'Privé' ? [
      { id: 'home', label: 'Home' },
      { id: 'habit', label: 'Habit' },
      { id: 'aquarium', label: 'Aquarium' },
      { id: 'auto', label: 'Auto' },
      { id: 'jerky', label: 'Jerky' },
      { id: 'crabcave', label: 'Cave Drinks' },
      { id: 'cavedarts', label: 'Cave Darts' },
      { id: '2do', label: '2DO' },
      { id: 'beleggen', label: 'Beleggen' },
      { id: 'waardebonnen', label: 'Waardebonnen' },
      { id: 'reizen', label: 'Reizen' },
      { id: 'wandelingen', label: 'Wandelingen' },
      { id: 'festivals', label: 'Festivals' },
      { id: 'koken', label: 'Koken' },
      { id: 'google-home', label: 'Google home' },
    ] : [
      { id: 'home', label: 'Home' },
      { id: 'sales', label: 'Sales' },
      { id: 'prospects', label: 'Prospects' },
      { id: 'seo', label: 'Guin.AI' },
      { id: 'stoktelling', label: 'Stoktelling' },
      { id: 'branding', label: 'Branding' },
      { id: 'kosten', label: 'Kosten' },
      { id: 'projecten', label: 'Projecten' },
      { id: 'ideacenter', label: 'Idea Center' },
      { id: 'inspiration-center', label: 'Inspiration Center' },
      { id: 'settings', label: 'Settings' },
    ];
    
    setMenuItems(newItems);
    localStorage.setItem('selected-platform', selectedPlatform);
    
    // Navigate to home when platform changes
    if (setActiveTab) {
      setActiveTab('home');
    }
    
    // Dispatch event to notify App.js of platform change
    window.dispatchEvent(new CustomEvent('platformChanged', { detail: { platform: selectedPlatform } }));
  }, [selectedPlatform, setActiveTab]);

  // Load habit percentage
  useEffect(() => {
    const loadHabitPercentage = () => {
      try {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        
        // Load from localStorage (same as HabitPage)
        const allHabitsData = localStorage.getItem('habit-tracker-all-habits');
        const dailyHabitsData = localStorage.getItem('habit-tracker-daily-habits');
        const completionData = localStorage.getItem('habit-tracker-completion');
        
        if (!allHabitsData || !dailyHabitsData) {
          setHabitPercentage(0);
          return;
        }
        
        const allHabits = JSON.parse(allHabitsData);
        const dailyHabits = JSON.parse(dailyHabitsData);
        const completedHabits = completionData ? JSON.parse(completionData)[todayKey] || [] : [];
        
        // Get today's assigned habits
        const todayHabitIds = dailyHabits[todayKey] || [];
        const todayHabits = allHabits.filter(h => todayHabitIds.includes(h.id));
        
        if (todayHabits.length === 0) {
          setHabitPercentage(0);
          return;
        }
        
        const percentage = Math.round((completedHabits.length / todayHabits.length) * 100);
        setHabitPercentage(percentage);
      } catch (error) {
        console.error('Error loading habit percentage:', error);
        setHabitPercentage(0);
      }
    };
    
    loadHabitPercentage();
    const interval = setInterval(loadHabitPercentage, 30000);
    
    // Also listen for localStorage changes
    window.addEventListener('storage', loadHabitPercentage);
    
    // Listen for custom habit completion events with slight delay for localStorage to update
    const handleHabitUpdate = () => {
      setTimeout(loadHabitPercentage, 50);
    };
    window.addEventListener('habitUpdated', handleHabitUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', loadHabitPercentage);
      window.removeEventListener('habitUpdated', handleHabitUpdate);
    };
  }, []);

  // Load quick links from Supabase
  useEffect(() => {
    loadQuickLinks(selectedPlatform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform]);

  const loadQuickLinks = async (platform) => {
    try {
      const links = await db.quickLinks.getAll(platform);
      setCustomQuickLinks(links || []);
    } catch (error) {
      console.error('Error loading quick links:', error);
    }
  };

  const addQuickLink = async () => {
    if (!newQuickLink.label || !newQuickLink.url) {
      alert('Vul alle velden in');
      return;
    }
    
    try {
      const link = await db.quickLinks.create({
        ...newQuickLink,
        platform: selectedPlatform
      });
      setCustomQuickLinks([...customQuickLinks, link]);
      setNewQuickLink({ label: '', url: '', icon: 'Globe' });
      setShowAddQuickLinkModal(false);
    } catch (error) {
      console.error('Error adding quick link:', error);
      alert('Fout bij toevoegen quick link');
    }
  };

  const deleteQuickLink = async (id) => {
    try {
      await db.quickLinks.delete(id);
      setCustomQuickLinks(customQuickLinks.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting quick link:', error);
    }
  };

  // Clear localStorage on mount
  useEffect(() => {
    localStorage.removeItem('shopify-dashboard-menu-order');
    localStorage.removeItem('shopify-dashboard-other-menu-order');
  }, []);

  const [otherItems, setOtherItems] = useState(() => {
    const saved = localStorage.getItem('shopify-dashboard-other-menu-order');
    const defaults = [
      { id: 'quiz', label: 'Quiz', icon: 'quiz' },
      { id: 'store', label: 'Meteor Merch store', icon: 'store' },
      { id: 'github', label: 'GitHub', icon: 'github', external: true, url: 'https://github.com' },
      { id: 'confluence', label: 'Confluence', icon: 'confluence', external: true, url: 'https://xploregroup.atlassian.net/wiki/home' },
      { id: 'jira', label: 'Jira', icon: 'jira', external: true, url: 'https://xploregroup.atlassian.net/jira' },
      { id: 'shopify-partner', label: 'Shopify Partner Portal', icon: 'shopify-partner', external: true, url: 'https://partners.shopify.com/1841109/stores' },
      { id: 'share-a-thon', label: 'Share-a-Thon', icon: 'share-a-thon', external: true, url: 'https://xploregroup.atlassian.net/wiki/spaces/SHOPIFY/pages/8531837583/Shopify+Share-a-Thon' },
    ];
    const parsed = saved ? JSON.parse(saved) : defaults;
    return parsed.map((item) => {
      const savedIcon = item.icon;
      const revived = typeof savedIcon === 'string'
        ? (otherIconMap[savedIcon] || otherIconMap[item.id])
        : (typeof savedIcon === 'function' ? savedIcon : otherIconMap[item.id]);
      return { ...item, icon: revived };
    });
  });

  // Don't save menu order to localStorage to prevent corruption
  // Menu order is now static and icons are fetched dynamically

  // Save other items order to localStorage
  useEffect(() => {
    const toSave = otherItems.map((item) => ({ ...item, icon: item.id }));
    localStorage.setItem('shopify-dashboard-other-menu-order', JSON.stringify(toSave));
  }, [otherItems]);

  return (
    <div className={`
      fixed lg:sticky lg:top-0 left-0 h-screen z-40
      w-72 glass-effect
      flex flex-col
      transform transition-transform duration-300 ease-in-out
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {/* Logo Section */}
      <div className="mb-8">
        <button
          onClick={() => setActiveTab('home')}
          className="w-full hover:opacity-80 transition-opacity cursor-pointer"
        >
          <img
            src="/Logo_meteor_def.svg"
            alt="METEOR logo"
            className="w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </button>
      </div>

      {/* Platform Switcher */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => {
              if (selectedPlatform !== 'Privé') {
                localStorage.setItem('selected-platform', 'Privé');
                window.location.reload();
              }
            }}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              selectedPlatform === 'Privé'
                ? 'bg-gradient-blue-purple text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            <span>Privé</span>
          </button>
          <button
            onClick={() => {
              if (selectedPlatform !== 'Bijberoep') {
                localStorage.setItem('selected-platform', 'Bijberoep');
                window.location.reload();
              }
            }}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
              selectedPlatform === 'Bijberoep'
                ? 'bg-gradient-blue-purple text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <BriefcaseIcon className="w-4 h-4" />
            <span>Bijberoep</span>
          </button>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-white/10 mb-6"></div>

      {/* Navigation Section */}
      <nav className="space-y-2">
        <h3 className="text-white/60 text-sm font-medium mb-4 px-4">Hoofdmenu</h3>
        {menuItems.map((item, index) => {
          // Get icon directly from function, not from state
          const Icon = getMainIcon(item.id);
          const isActive = activeTab === item.id || 
            (item.id === 'sales' && (
              activeTab === 'sales-calculator' || 
              activeTab === 'sales-royal-talens' || 
              activeTab === 'sales-dremababy' ||
              activeTab.startsWith('sales-')
            ));
          
          
          const handleDragStart = (e) => {
            e.dataTransfer.setData('text/plain', index);
          };
          
          const handleDragOver = (e) => {
            e.preventDefault();
          };
          
          const handleDrop = (e) => {
            e.preventDefault();
            const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const dropIndex = index;
            
            if (dragIndex !== dropIndex) {
              const newItems = [...menuItems];
              const draggedItem = newItems[dragIndex];
              newItems.splice(dragIndex, 1);
              newItems.splice(dropIndex, 0, draggedItem);
              setMenuItems(newItems);
            }
          };
          
          const handleClick = () => {
            setActiveTab(item.id);
            if (setSidebarOpen) setSidebarOpen(false);
          };
          
          return (
            <div
              key={item.id}
              draggable={true}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="group"
            >
              <button
                onClick={handleClick}
                className={`
                  w-full flex items-center px-4 py-3 rounded-lg text-left nav-item
                  ${isActive 
                    ? 'nav-item-active text-white' 
                    : 'text-white/80 hover:text-white'
                  }
                `}
              >
                <MoreHorizontal className="w-4 h-4 mr-2 text-white/40 group-hover:text-white/60 cursor-grab" />
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{item.label}</span>
                {item.id === 'habit' && (
                  <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${
                    habitPercentage === 100 
                      ? 'bg-green-500/20 text-green-400' 
                      : habitPercentage >= 50 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {habitPercentage}%
                  </span>
                )}
              </button>
              
              {/* Sales Subtabs */}
              {item.id === 'sales' && isActive && (
                <div className="ml-8 mt-2 space-y-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('sales-calculator');
                    }}
                    className={`
                      w-full flex items-center px-3 py-2 rounded-lg text-left text-sm
                      ${activeTab === 'sales-calculator'
                        ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300' 
                        : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      }
                    `}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Sales Template
                    {salesStatus === 'approved' && (
                      <CheckCircle className="w-4 h-4 ml-auto text-green-400" />
                    )}
                    {salesStatus === 'pending' && (
                      <Clock className="w-4 h-4 ml-auto text-yellow-400" />
                    )}
                    {salesStatus === 'denied' && (
                      <XCircle className="w-4 h-4 ml-auto text-red-400" />
                    )}
                  </button>
                  {/* Sub-sub: Upsell invoice for Royal Talens (below project) */}
                  {(() => {
                    try {
                      const hasUpsell = (projects || []).some(p => (p.client === 'Royal Talens') && (p.salesSubItems || []).some(si => si.title === 'Upsell invoice'));
                      if (!hasUpsell) return null;
                    } catch (_) { return null; }
                    return (
                      <div className="ml-6 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTab('sales-royal-talens'); }}
                          className={`w-full flex items-center px-3 py-2 rounded-lg text-left text-xs ${activeTab === 'sales-royal-talens' ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-300' : 'text-white/60 hover:text-white/80 hover:bg-white/5'}`}
                        >
                          <ArrowUp className="w-3 h-3 mr-2" /> Upsell invoice
                        </button>
                      </div>
                    );
                  })()}
                  {/* Sub-sub: Upsell invoice for Dreambaby */}
                  {(() => {
                    try {
                      const hasUpsell = (projects || []).some(p => (p.client === 'Dreambaby') && (p.salesSubItems || []).some(si => si.title === 'Upsell invoice'));
                      if (!hasUpsell) return null;
                    } catch (_) { return null; }
                    return (
                      <div className="ml-6 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTab('sales-dremababy'); }}
                          className={`w-full flex items-center px-3 py-2 rounded-lg text-left text-xs ${activeTab === 'sales-dremababy' ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-300' : 'text-white/60 hover:text-white/80 hover:bg-white/5'}`}
                        >
                          <ArrowUp className="w-3 h-3 mr-2" /> Upsell invoice
                        </button>
                      </div>
                    );
                  })()}
                  
                  {/* Custom Sales Clients */}
                  {customClients.map((client) => {
                    const clientStatus = localStorage.getItem(`${client.tabId}-approval-status`) || 'default';
                    const ClientIcon = iconComponents[client.icon] || User;
                    return (
                      <button
                        key={client.tabId}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab(client.tabId);
                        }}
                        className={`
                          w-full flex items-center px-3 py-2 rounded-lg text-left text-sm
                          ${activeTab === client.tabId
                            ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300' 
                            : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                          }
                        `}
                      >
                        <ClientIcon className="w-4 h-4 mr-2" />
                        {client.name}
                        {clientStatus === 'approved' && (
                          <CheckCircle className="w-4 h-4 ml-auto text-green-400" />
                        )}
                        {clientStatus === 'pending' && (
                          <Clock className="w-4 h-4 ml-auto text-yellow-400" />
                        )}
                        {clientStatus === 'denied' && (
                          <XCircle className="w-4 h-4 ml-auto text-red-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Branding Subtabs */}
              {item.id === 'branding' && isActive && (
                <div className="ml-8 mt-2 space-y-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('branding-meteor');
                    }}
                    className={`
                      w-full flex items-center px-3 py-2 rounded-lg text-left text-sm
                      ${activeTab === 'branding-meteor'
                        ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300' 
                        : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      }
                    `}
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center rounded bg-slate-900/80">
                      <img 
                        src="/branding.png" 
                        alt="Meteor logo"
                        className="w-4 h-4 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextSibling.style.display = 'block';
                        }}
                      />
                      <Brush className="w-4 h-4 hidden" />
                    </div>
                    Meteor Branding
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('branding-templates');
                    }}
                    className={`
                      w-full flex items-center px-3 py-2 rounded-lg text-left text-sm
                      ${activeTab === 'branding-templates'
                        ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300' 
                        : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      }
                    `}
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center rounded bg-slate-900/80">
                      <img 
                        src="/branding.png" 
                        alt="Templates logo"
                        className="w-4 h-4 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextSibling.style.display = 'block';
                        }}
                      />
                      <FileText className="w-4 h-4 hidden" />
                    </div>
                    Templates
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open('https://www.canva.com', '_blank', 'noopener,noreferrer');
                    }}
                    className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white/60 hover:text-white/80 hover:bg-white/5"
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center rounded bg-white">
                      <img 
                        src="/Canva.png" 
                        alt="Canva logo"
                        className="w-4 h-4 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextSibling.style.display = 'block';
                        }}
                      />
                      <FileImage className="w-4 h-4 hidden" />
                    </div>
                    Canva
                    <svg className="w-3 h-3 ml-auto text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open('https://www.figma.com', '_blank', 'noopener,noreferrer');
                    }}
                    className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white/60 hover:text-white/80 hover:bg-white/5"
                  >
                    <div className="w-5 h-5 mr-2 flex items-center justify-center rounded bg-white">
                      <img 
                        src="/Figma.png" 
                        alt="Figma logo"
                        className="w-4 h-4 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextSibling.style.display = 'block';
                        }}
                      />
                      <Layers className="w-4 h-4 hidden" />
                    </div>
                    Figma
                    <svg className="w-3 h-3 ml-auto text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Project Subtabs */}
              {item.id === 'projecten' && isActive && (
                <div className="ml-8 mt-2 space-y-1">
                  {projects.map((project) => {
                    // Get project icon based on project name or icon property
                    const getProjectIcon = () => {
                      // If project has custom icon property, use it
                      if (project.icon) {
                        const key = String(project.icon).toLowerCase();
                        const iconMap = {
                          'palette': Palette,
                          'baby': Baby,
                          'store': Store,
                          'briefcase': Briefcase,
                          'rocket': Rocket,
                          'folder': Folder,
                          'user': User,
                          'building': Building,
                          'star': Star,
                          'heart': Heart,
                          'globe': Globe,
                          'shield': Shield,
                          'zap': Zap,
                        };
                        return iconMap[key] || Folder;
                      }
                      
                      // Default icons based on project name and client
                      const name = (project.name || '').toLowerCase();
                      const client = (project.client || '').toLowerCase();
                      const combined = name + ' ' + client;
                      
                      console.log('Project:', project.name, 'Combined:', combined);
                      
                      // More specific matching
                      if (combined.includes('royal talens') || combined.includes('talens') || name.includes('royal talens b2b')) {
                        console.log('  -> Palette icon');
                        return Palette;
                      }
                      if (combined.includes('dreambaby') || combined.includes('dream baby') || name.includes('dreambaby')) {
                        console.log('  -> Baby icon');
                        return Baby;
                      }
                      if (combined.includes('meteor merch') || combined.includes('merch store') || name.includes('meteor')) {
                        console.log('  -> Store icon');
                        return Store;
                      }
                      console.log('  -> Folder icon (default)');
                      return Folder;
                    };
                    
                    const ProjectIcon = getProjectIcon();
                    
                    return (
                      <button
                        key={project.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab('projecten');
                          // Trigger project selection via custom event
                          window.dispatchEvent(new CustomEvent('selectProject', { 
                            detail: { projectId: project.id } 
                          }));
                        }}
                        className={`
                          w-full flex items-center px-3 py-2 rounded-lg text-left text-sm
                          text-white/60 hover:text-white/80 hover:bg-white/5
                        `}
                      >
                        <ProjectIcon className="w-4 h-4 mr-2" />
                        <span className="flex-1 font-medium">{project.name}</span>
                        {project.status === 'active' && (
                          <CheckCircle className="w-4 h-4 ml-auto text-green-400" />
                        )}
                        {project.status === 'pending' && (
                          <Clock className="w-4 h-4 ml-auto text-yellow-400" />
                        )}
                        {project.status === 'completed' && (
                          <XCircle className="w-4 h-4 ml-auto text-purple-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Other Section removed at user's request */}
      {/* Single separator before Quick Links */}
      <div className="border-t border-white/10 my-6"></div>

      {/* Quick Links Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-4">
          <h3 className="text-white/60 text-sm font-medium">Quick Links</h3>
          <button
            onClick={() => setShowAddQuickLinkModal(true)}
            className="text-white/60 hover:text-white text-xs"
          >
            + Toevoegen
          </button>
        </div>
        <div className="space-y-2">
          {customQuickLinks.length === 0 ? (
            <div className="text-white/50 text-center py-8 px-4 text-sm">
              Geen quick links. Klik "+ Toevoegen" om te beginnen.
            </div>
          ) : (
            customQuickLinks.map((link) => {
            const Icon = iconComponents[link.icon] || Globe;
            
            return (
              <div key={link.id} className="group relative">
                <button
                  onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                  className="w-full flex items-center px-4 py-3 rounded-lg text-left nav-item text-white/80 hover:text-white"
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{link.label}</span>
                  <svg className="w-3 h-3 ml-auto text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteQuickLink(link.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* Add Quick Link Modal */}
      {showAddQuickLinkModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white text-xl font-semibold mb-4">Quick Link Toevoegen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Label</label>
                <input
                  type="text"
                  value={newQuickLink.label}
                  onChange={(e) => setNewQuickLink({...newQuickLink, label: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. GitHub"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">URL</label>
                <input
                  type="url"
                  value={newQuickLink.url}
                  onChange={(e) => setNewQuickLink({...newQuickLink, url: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Icoon</label>
                <select
                  value={newQuickLink.icon}
                  onChange={(e) => setNewQuickLink({...newQuickLink, icon: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                >
                  <option value="Globe">Globe</option>
                  <option value="User">User</option>
                  <option value="Building">Building</option>
                  <option value="Store">Store</option>
                  <option value="Briefcase">Briefcase</option>
                  <option value="Zap">Zap</option>
                  <option value="Heart">Heart</option>
                  <option value="Star">Star</option>
                  <option value="Rocket">Rocket</option>
                  <option value="Shield">Shield</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => { 
                  setShowAddQuickLinkModal(false); 
                  setNewQuickLink({ label: '', url: '', icon: 'Globe' }); 
                }} 
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button onClick={addQuickLink} className="btn-primary px-4 py-2 rounded-lg text-white">
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Sidebar;
