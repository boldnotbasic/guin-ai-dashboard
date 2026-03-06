import React, { useState, useEffect } from 'react';
import { Bell, Search, LogOut, Database, Sparkles, User, Menu } from 'lucide-react';
import { supabase, db, profiles } from '../utils/supabaseClient';
import TogglButton from './TogglButton';

const Header = ({ setIsLoggedIn, setActiveTab, setShowChatbot, setChatbotMinimized }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('Privé');
  const [dbStatus, setDbStatus] = useState('checking'); // 'checking' | 'ok' | 'error'
  const [userProfile, setUserProfile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Load user profile from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        // First try to load from localStorage for immediate display
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.profilePhoto) {
            setProfilePhoto(settings.profilePhoto);
            console.log('Loaded profile photo from localStorage:', settings.profilePhoto);
          }
          if (settings.name) {
            setUserProfile(prev => ({ ...prev, name: settings.name }));
          }
        }

        // Then load from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('Loading profile for user:', user.id);
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('avatar_url, logo_bijberoep, profile_photo_url, name')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('Profile fetch error:', error);
            return;
          }
          
          console.log('Profile data:', profile);
          if (profile) {
            setUserProfile(profile);
            if (profile.profile_photo_url) {
              setProfilePhoto(profile.profile_photo_url);
              console.log('Profile photo URL from DB:', profile.profile_photo_url);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    
    loadData();
    
    // Listen for profile updates
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);


  // Listen for platform changes from Sidebar
  useEffect(() => {
    const handlePlatformChange = () => {
      const savedPlatform = localStorage.getItem('selected-platform') || 'Privé';
      setSelectedPlatform(savedPlatform);
    };
    
    handlePlatformChange();
    window.addEventListener('storage', handlePlatformChange);
    
    return () => {
      window.removeEventListener('storage', handlePlatformChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('shopify-dashboard-logged-in');
    setIsLoggedIn(false);
  };

  const checkSupabase = async () => {
    try {
      // Quick HEAD-like query to validate connection
      const { error } = await supabase
        .from('apps')
        .select('id', { head: true, count: 'exact' })
        .limit(1);
      if (error) throw error;
      setDbStatus('ok');
    } catch (_) {
      setDbStatus('error');
    }
  };

  useEffect(() => {
    checkSupabase();
    const id = setInterval(checkSupabase, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-panel') && !event.target.closest('.notification-button')) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Load notifications based on platform
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifs = [];
        
        if (selectedPlatform === 'Privé') {
          // Load open 2DO tasks
          const todos = await db.todoTickets.getAll();
          const openTodos = todos.filter(t => t.status !== 'done');
          
          openTodos.forEach(todo => {
            notifs.push({
              id: `todo-${todo.id}`,
              type: '2DO',
              title: todo.title,
              message: `Openstaande taak: ${todo.title}`,
              priority: todo.priority || 'medium',
              tab: '2do'
            });
          });
        } else {
          // Bijberoep - Load upcoming project tasks
          const projects = await db.projects.getAll();
          const tasks = await db.projectTasks.getAll();
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Filter tasks due in next 7 days
          const upcomingTasks = tasks.filter(task => {
            if (task.status === 'done' || !task.due_date) return false;
            
            const dueDate = new Date(task.due_date);
            const diffTime = dueDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays >= 0 && diffDays <= 7;
          });
          
          upcomingTasks.forEach(task => {
            const project = projects.find(p => p.id === task.project_id);
            const dueDate = new Date(task.due_date);
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            notifs.push({
              id: `task-${task.id}`,
              type: 'Project',
              title: task.title,
              message: `${project?.name || 'Project'}: ${task.title} - ${diffDays === 0 ? 'Vandaag' : diffDays === 1 ? 'Morgen' : `${diffDays} dagen`}`,
              priority: diffDays <= 1 ? 'high' : 'medium',
              tab: 'projecten',
              daysUntil: diffDays
            });
          });
        }
        
        setNotifications(notifs);
        setNotificationCount(notifs.length);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };
    
    loadNotifications();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    
    // Listen for platform changes
    const handlePlatformChange = () => loadNotifications();
    window.addEventListener('platformChanged', handlePlatformChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('platformChanged', handlePlatformChange);
    };
  }, [selectedPlatform]);

  return (
    <header className="glass-effect p-4 border-b border-white/10 relative z-[10000]">
      {/* Desktop Layout */}
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
            <input
              type="text"
              placeholder="Zoeken..."
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 w-80"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* AI Chatbot Button */}
          {setShowChatbot && (
            <button
              onClick={() => {
                setShowChatbot(true);
                setChatbotMinimized(false);
              }}
              className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
              title="Open AI Assistent"
            >
              <Sparkles className="w-5 h-5 text-blue-400" />
            </button>
          )}

          {/* Toggl Timer Widget - Only visible for Bijberoep */}
          {selectedPlatform === 'Bijberoep' && <TogglButton />}

          {/* Supabase connection indicator */}
          <button
            onClick={checkSupabase}
            title={dbStatus === 'ok' ? 'Supabase verbonden' : (dbStatus === 'checking' ? 'Verbinding controleren…' : 'Supabase niet bereikbaar')}
            className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Database className={`w-5 h-5 ${dbStatus === 'ok' ? 'text-green-400' : (dbStatus === 'checking' ? 'text-yellow-400 animate-pulse' : 'text-red-400')}`} />
          </button>

          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="notification-button relative p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
            title={`${notificationCount} notificaties`}
          >
            <Bell className="w-5 h-5 text-white" />
            {notificationCount > 0 && (
              <>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{notificationCount > 9 ? '9+' : notificationCount}</span>
                </span>
              </>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="notification-panel absolute top-16 right-4 w-96 max-h-96 overflow-y-auto bg-gray-900/95 backdrop-blur-lg border border-white/20 rounded-xl shadow-2xl z-[9999]">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-white font-semibold text-lg">Notificaties</h3>
                <p className="text-white/60 text-sm">{notificationCount} {selectedPlatform === 'Privé' ? 'openstaande taken' : 'aankomende deadlines'}</p>
              </div>
              
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60">Geen notificaties</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id}
                      onClick={() => {
                        setActiveTab && setActiveTab(notif.tab);
                        setShowNotifications(false);
                      }}
                      className="p-4 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notif.priority === 'high' ? 'bg-red-500' : 
                          notif.priority === 'medium' ? 'bg-yellow-500' : 
                          'bg-blue-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-white/50 uppercase">{notif.type}</span>
                            {notif.daysUntil !== undefined && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                notif.daysUntil === 0 ? 'bg-red-500/20 text-red-400' :
                                notif.daysUntil === 1 ? 'bg-orange-500/20 text-orange-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {notif.daysUntil === 0 ? 'Vandaag' : notif.daysUntil === 1 ? 'Morgen' : `${notif.daysUntil}d`}
                              </span>
                            )}
                          </div>
                          <p className="text-white font-medium text-sm mb-1">{notif.title}</p>
                          <p className="text-white/60 text-xs">{notif.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
            title="Uitloggen"
          >
            <LogOut className="w-5 h-5 text-white" />
          </button>
          
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:bg-white/10 rounded-lg p-2 transition-colors"
            onClick={() => setActiveTab && setActiveTab('settings')}
            title="Open instellingen"
          >
            <div className="text-right">
              <p className="text-white font-medium">Hi {userProfile?.name || 'Gijs'}!</p>
              <p className="text-white/60 text-sm">Admin</p>
            </div>
            <div className="w-10 h-10 bg-gradient-blue-purple rounded-full flex items-center justify-center overflow-hidden relative">
              {profilePhoto ? (
                <img 
                  src={profilePhoto} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.querySelector('.fallback-icon').style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="fallback-icon absolute inset-0 flex items-center justify-center" style={{ display: profilePhoto ? 'none' : 'flex' }}>
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-2">
        {/* Top Row - Search + Hamburger */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu - Left side */}
          <button
            className="p-2.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0 flex items-center justify-center"
            title="Menu"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>

          {/* Search Bar - Takes remaining space */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
            <input
              type="text"
              placeholder="Zoeken..."
              className="pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 w-full"
            />
          </div>
        </div>

        {/* Bottom Row - Utility Icons */}
        <div className="flex items-center justify-between">
          {/* Left side - AI, Toggl, Database */}
          <div className="flex items-center gap-1.5">
            {/* AI Chatbot Button */}
            {setShowChatbot && (
              <button
                onClick={() => {
                  setShowChatbot(true);
                  setChatbotMinimized(false);
                }}
                className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
                title="Open AI Assistent"
              >
                <Sparkles className="w-5 h-5 text-blue-400" />
              </button>
            )}

            {/* Toggl Timer Widget - Only visible for Bijberoep */}
            {selectedPlatform === 'Bijberoep' && <TogglButton />}

            {/* Supabase connection indicator */}
            <button
              onClick={checkSupabase}
              title={dbStatus === 'ok' ? 'Supabase verbonden' : (dbStatus === 'checking' ? 'Verbinding controleren…' : 'Supabase niet bereikbaar')}
              className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Database className={`w-5 h-5 ${dbStatus === 'ok' ? 'text-green-400' : (dbStatus === 'checking' ? 'text-yellow-400 animate-pulse' : 'text-red-400')}`} />
            </button>
          </div>

          {/* Right side - Bell, Logout, Profile */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="notification-button relative p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
              title={`${notificationCount} notificaties`}
            >
              <Bell className="w-5 h-5 text-white" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{notificationCount > 9 ? '9+' : notificationCount}</span>
                </span>
              )}
            </button>

            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
              title="Uitloggen"
            >
              <LogOut className="w-5 h-5 text-white" />
            </button>
            
            <div 
              className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 rounded-lg p-1.5 transition-colors"
              onClick={() => setActiveTab && setActiveTab('settings')}
              title="Open instellingen"
            >
              <div className="text-right hidden sm:block">
                <p className="text-white font-medium text-sm">Hi {userProfile?.name || 'Gijs'}!</p>
                <p className="text-white/60 text-xs">Admin</p>
              </div>
              <div className="w-8 h-8 bg-gradient-blue-purple rounded-full flex items-center justify-center overflow-hidden relative">
                {profilePhoto ? (
                  <img 
                    src={profilePhoto} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.querySelector('.fallback-icon').style.display = 'flex';
                    }}
                  />
                ) : null}
                <User className="w-4 h-4 text-white fallback-icon" style={{ display: profilePhoto ? 'none' : 'flex' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
