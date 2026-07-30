import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Folder, 
  MapPin,
  Lightbulb,
  Activity,
  Star,
  ListTodo,
  ArrowRight
} from 'lucide-react';
import TabQuickLinks from './TabQuickLinks';
import { db } from '../utils/supabaseClient';

const HomePage = ({ setActiveTab }) => {
  const [stats, setStats] = useState({
    totalProspects: 0,
    totalIdeas: 0
  });
  const [todoStats, setTodoStats] = useState({ toStart: 0, doing: 0 });

  // Get platform directly without state to avoid re-render
  const platform = localStorage.getItem('selected-platform') || 'Privé';

  useEffect(() => {
    // Load data from Supabase would go here
    // For now, placeholder values
    setStats({
      totalProspects: 0,
      totalIdeas: 0
    });

    // Load 2DO stats
    loadTodoStats();
  }, []);

  const loadTodoStats = async () => {
    try {
      // Load from project tasks (all tasks across all projects)
      const todos = await db.projectTasks.getAll();
      if (todos && Array.isArray(todos)) {
        const toStartCount = todos.filter(t => t.status === 'to_start').length;
        const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
        setTodoStats({ toStart: toStartCount, doing: inProgressCount });
      }
    } catch (error) {
      console.error('Error loading todo stats:', error);
    }
  };

  const quickActions = [
    { 
      id: 'sales', 
      title: 'Sales Calculator', 
      description: 'Bereken project kosten', 
      icon: TrendingUp, 
      color: 'bg-gradient-blue-purple' 
    },
    { 
      id: 'projecten', 
      title: 'Projecten', 
      description: 'Beheer je projecten', 
      icon: Folder, 
      color: 'bg-gradient-green-blue' 
    },
    { 
      id: 'prospects', 
      title: 'Prospects', 
      description: 'Potentiële klanten', 
      icon: MapPin, 
      color: 'bg-gradient-purple-pink' 
    },
    { 
      id: 'ideacenter', 
      title: 'Idea Center', 
      description: 'Ideeën & inspiratie', 
      icon: Lightbulb, 
      color: 'bg-gradient-orange-pink' 
    },
    {
      id: '2do',
      title: '2DO Board',
      description: 'Taken beheer',
      icon: ListTodo,
      color: 'from-indigo-500 to-purple-600'
    }
  ];

  const recentActivity = [
    { type: 'project', title: 'E-commerce Store Redesign', action: 'Updated', time: '2 uur geleden', status: 'success' },
    { type: 'prospect', title: 'Nieuw prospect toegevoegd', action: 'Added', time: '4 uur geleden', status: 'info' },
    { type: 'idea', title: 'Nieuwe idee opgeslagen', action: 'Created', time: '1 dag geleden', status: 'success' },
    { type: 'sales', title: 'Quote Generated', action: 'Created', time: '2 dagen geleden', status: 'warning' }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'project': return Folder;
      case 'prospect': return MapPin;
      case 'idea': return Lightbulb;
      case 'sales': return TrendingUp;
      default: return Activity;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Welkom terug, Gijs! 👋
        </h1>
        <p className="text-white/70 text-lg">
          Hier is een overzicht van je BnB dashboard
        </p>
      </div>

      {/* Tab Quick Links */}
      <TabQuickLinks tabName={platform === 'Bijberoep' ? 'Bijberoep-Home' : 'Home'} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-white text-2xl font-semibold mb-4">Snelle Acties</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            
            // Special styling for 2DO card to match PriveHomePage
            if (action.id === '2do') {
              return (
                <div
                  key={action.id}
                  onClick={() => setActiveTab(action.id)}
                  className="gradient-card rounded-xl p-6 hover:scale-105 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-1">{action.title}</h3>
                    <p className="text-white/60 text-sm mb-3">{action.description}</p>
                    <div className="mt-2">
                      <div className="text-sm font-medium text-white/80">
                        {todoStats.toStart}/{todoStats.doing}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        To Start / Doing
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            return (
              <button
                key={action.id}
                onClick={() => setActiveTab(action.id)}
                className="gradient-card rounded-xl p-6 hover:scale-105 transition-transform text-left"
              >
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{action.title}</h3>
                <p className="text-white/70 text-sm">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity & Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="gradient-card rounded-xl p-6">
          <h3 className="text-white text-xl font-semibold mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recente Activiteit
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={index} className="flex items-center py-3 border-b border-white/10 last:border-b-0">
                  <Icon className={`w-5 h-5 mr-3 ${getStatusColor(activity.status)}`} />
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.title}</p>
                    <p className="text-white/60 text-sm">{activity.action} • {activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resources */}
        <div className="gradient-card rounded-xl p-6">
          <h3 className="text-white text-xl font-semibold mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2" />
            Handige Resources
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Prospects</p>
                <p className="text-white/60 text-sm">Potentiële klanten beheren</p>
              </div>
              <button 
                onClick={() => setActiveTab('prospects')}
                className="btn-primary px-4 py-2 rounded-lg text-white text-sm"
              >
                Bekijk
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Idea Center</p>
                <p className="text-white/60 text-sm">Ideeën & inspiratie</p>
              </div>
              <button 
                onClick={() => setActiveTab('ideacenter')}
                className="btn-primary px-4 py-2 rounded-lg text-white text-sm"
              >
                Open
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Branding</p>
                <p className="text-white/60 text-sm">Brand resources</p>
              </div>
              <button 
                onClick={() => setActiveTab('branding')}
                className="btn-primary px-4 py-2 rounded-lg text-white text-sm"
              >
                Beheer
              </button>
            </div>
          </div>
        </div>
      </div>
      
      
    </div>
  );
};

export default HomePage;
