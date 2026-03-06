import React, { useState, useEffect } from 'react';
import { X, Home, DollarSign, Folder, Palette, LayoutGrid, Send, UsersRound, Clock, Wrench, HelpCircle, Store, Zap, Activity, Brush } from 'lucide-react';

const DevModeToggle = () => {
  const [isDevMode, setIsDevMode] = useState(() => {
    return localStorage.getItem('dev-mode') === 'true';
  });
  
  const [showPopup, setShowPopup] = useState(false);
  const [selectedItems, setSelectedItems] = useState(() => {
    const saved = localStorage.getItem('dev-mode-selected-items');
    return saved ? JSON.parse(saved) : [];
  });

  // All sidebar menu items with their icons
  const allMenuItems = [
    // Hoofdmenu items
    { id: 'home', label: 'Home', icon: Home, category: 'Hoofdmenu' },
    { id: 'sales', label: 'Sales', icon: DollarSign, category: 'Hoofdmenu' },
    { id: 'upsells', label: 'Upsells', icon: Zap, category: 'Hoofdmenu' },
    { id: 'learning', label: 'Learning', icon: Activity, category: 'Hoofdmenu' },
    { id: 'branding', label: 'Branding', icon: Brush, category: 'Hoofdmenu' },
    { id: 'projecten', label: 'Projecten', icon: Folder, category: 'Hoofdmenu' },
    { id: 'settings', label: 'Settings', icon: Wrench, category: 'Hoofdmenu' },
    // Alle tabs items
    { id: 'quiz', label: 'Quiz', icon: HelpCircle, category: 'Alle tabs' },
    { id: 'store', label: 'Meteor Merch store', icon: Store, category: 'Alle tabs' },
    { id: 'github', label: 'GitHub', icon: Folder, category: 'Alle tabs' },
    { id: 'confluence', label: 'Confluence', icon: Folder, category: 'Alle tabs' },
    { id: 'jira', label: 'Jira', icon: Wrench, category: 'Alle tabs' },
    { id: 'shopify-partner', label: 'Shopify Partner Portal', icon: Store, category: 'Alle tabs' },
    { id: 'share-a-thon', label: 'Share-a-Thon', icon: DollarSign, category: 'Alle tabs' },
  ];

  useEffect(() => {
    localStorage.setItem('dev-mode', isDevMode.toString());
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('devModeChanged', { 
      detail: { isDevMode } 
    }));
  }, [isDevMode]);

  useEffect(() => {
    localStorage.setItem('dev-mode-selected-items', JSON.stringify(selectedItems));
  }, [selectedItems]);

  const toggleDevMode = () => {
    setIsDevMode(!isDevMode);
  };

  const toggleItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const groupedItems = allMenuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <>
      <div className="fixed bottom-[30px] right-[30px] z-50">
        <div className="flex flex-col items-center gap-2">
          {/* Main toggle */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 border border-white/20 shadow-lg">
            <span className="text-white text-base font-medium">Dev Mode</span>
            <button
              onClick={toggleDevMode}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isDevMode 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                  : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                  isDevMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Disabled areas link */}
          <button
            onClick={() => setShowPopup(true)}
            className="text-white/80 hover:text-white text-sm underline underline-offset-2 transition-colors duration-200"
          >
            Disabled areas
          </button>
        </div>
      </div>

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-effect rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Dev Mode Settings</h2>
              <button
                onClick={() => setShowPopup(false)}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <p className="text-white/80 text-sm mb-6">
                Selecteer welke sidebar menu items je wilt monitoren in dev mode:
              </p>
              
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-white/60 text-sm font-medium mb-4 px-4">{category}</h3>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedItems.includes(item.id);
                      
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 rounded-lg nav-item hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-white/60" />
                            <span className="text-white/80 font-medium">{item.label}</span>
                          </div>
                          
                          {/* Toggle Slider */}
                          <button
                            onClick={() => toggleItem(item.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              isSelected 
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                                : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                                isSelected ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={() => setSelectedItems([])}
                className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm"
              >
                Clear All
              </button>
              <button
                onClick={() => setSelectedItems(allMenuItems.map(item => item.id))}
                className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm"
              >
                Select All
              </button>
              <button
                onClick={() => setShowPopup(false)}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DevModeToggle;
