import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Activity, 
  Car, 
  Beef, 
  Shield, 
  Target, 
  ListTodo, 
  TrendingUp,
  ArrowRight,
  Calendar,
  Plane,
  Footprints,
  Smartphone,
  Music
} from 'lucide-react';
import { db } from '../utils/supabaseClient';

const PriveHomePage = ({ setActiveTab }) => {
  const [habitPercentage, setHabitPercentage] = useState(0);
  const [todoStats, setTodoStats] = useState({ toStart: 0, doing: 0 });
  const [beleggenData, setBeleggenData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Activity-specific data
  const [lastJerkyBatch, setLastJerkyBatch] = useState(null);
  const [lastInvestment, setLastInvestment] = useState(null);
  const [lastDrink, setLastDrink] = useState(null);
  const [lastDartsGame, setLastDartsGame] = useState(null);
  const [nextTrip, setNextTrip] = useState(null);
  const [nextHike, setNextHike] = useState(null);
  const [nextFestival, setNextFestival] = useState(null);
  const [lastAquariumClean, setLastAquariumClean] = useState(null);
  const [lastCarMaintenance, setLastCarMaintenance] = useState(null);
  
  // Cache buster - v2.0
  console.log('🚀 PriveHomePage loaded - v2.0 - Timestamp:', Date.now());

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Page focused, reloading data...');
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Listen for habit updates
  useEffect(() => {
    const handleHabitUpdate = () => {
      console.log('🔄 Habit updated, reloading data...');
      // Small delay to ensure localStorage has been updated
      setTimeout(loadData, 50);
    };
    
    window.addEventListener('habitUpdated', handleHabitUpdate);
    window.addEventListener('storage', handleHabitUpdate);
    
    return () => {
      window.removeEventListener('habitUpdated', handleHabitUpdate);
      window.removeEventListener('storage', handleHabitUpdate);
    };
  }, []);

  const loadData = async () => {
    try {
      console.log('🔄 Starting data load at:', new Date().toISOString());
      
      // Load habit percentage from localStorage (same as Sidebar)
      try {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        
        const allHabitsData = localStorage.getItem('habit-tracker-all-habits');
        const dailyHabitsData = localStorage.getItem('habit-tracker-daily-habits');
        const completionData = localStorage.getItem('habit-tracker-completion');
        
        if (!allHabitsData || !dailyHabitsData) {
          setHabitPercentage(0);
        } else {
          const allHabits = JSON.parse(allHabitsData);
          const dailyHabits = JSON.parse(dailyHabitsData);
          const todayHabitIds = dailyHabits[todayKey] || [];
          
          const completedHabits = completionData ? JSON.parse(completionData)[todayKey] || [] : [];
          const todayHabits = allHabits.filter(h => todayHabitIds.includes(h.id));
          
          if (todayHabits.length === 0) {
            setHabitPercentage(0);
          } else {
            const percentage = Math.round((completedHabits.length / todayHabits.length) * 100);
            console.log('✅ Habit percentage:', percentage, `(${completedHabits.length}/${todayHabits.length})`);
            setHabitPercentage(percentage);
          }
        }
      } catch (error) {
        console.error('Error loading habit percentage:', error);
        setHabitPercentage(0);
      }

      // Load 2DO stats
      console.log('📋 Loading 2DO stats...');
      console.log('📋 db.todoTickets.getAll exists:', typeof db.todoTickets?.getAll);
      
      const todos = await db.todoTickets.getAll();
      console.log('📊 Loaded todos:', todos);
      console.log('📊 Total todos:', todos?.length || 0);
      console.log('📊 Todos type:', typeof todos);
      console.log('📊 Todos isArray:', Array.isArray(todos));
      
      if (todos && Array.isArray(todos)) {
        const toStartCount = todos.filter(t => t.status === 'tostart').length;
        const doingCount = todos.filter(t => t.status === 'doing').length;
        console.log('✅ To Start count:', toStartCount);
        console.log('✅ Doing count:', doingCount);
        console.log('🎯 Setting todoStats to:', { toStart: toStartCount, doing: doingCount });
        setTodoStats({ toStart: toStartCount, doing: doingCount });
      } else {
        console.log('⚠️ No todos found or invalid data');
        console.log('✅ Setting todoStats:', { toStart: 0, doing: 0 });
      }

      // Load activity-specific data from database
      try {
        // Jerky - laatste batch
        try {
          const jerkyBatches = await db.jerky.getAll();
          console.log('🥩 Jerky batches:', jerkyBatches);
          if (jerkyBatches && jerkyBatches.length > 0) {
            const latest = jerkyBatches.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))[0];
            setLastJerkyBatch(latest.name || latest.flavor);
          }
        } catch (err) {
          console.error('Error loading jerky:', err);
        }

        // Aquarium - laatste kuisbeurt
        try {
          const aquariumLogs = await db.aquariumLogs.getAll();
          console.log('🐠 Aquarium logs:', aquariumLogs);
          if (aquariumLogs && aquariumLogs.length > 0) {
            const latest = aquariumLogs[0]; // Already sorted by date descending
            const cleanDate = new Date(latest.date);
            if (!isNaN(cleanDate.getTime())) {
              // Calculate days by comparing date-only (ignore time)
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const cleanDateOnly = new Date(cleanDate);
              cleanDateOnly.setHours(0, 0, 0, 0);
              const daysAgo = Math.floor((today - cleanDateOnly) / (1000 * 60 * 60 * 24));
              setLastAquariumClean(`${daysAgo} dag${daysAgo !== 1 ? 'en' : ''} geleden`);
            }
          }
        } catch (err) {
          console.error('Error loading aquarium:', err);
        }

        // Auto - laatste auto
        try {
          const autos = await db.autos.getAll();
          console.log('🚗 Autos:', autos);
          if (autos && autos.length > 0) {
            const latestAuto = autos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            const brand = latestAuto.brand || '';
            const model = latestAuto.model || '';
            const carName = `${brand} ${model}`.trim() || latestAuto.license_plate || 'Auto';
            setLastCarMaintenance(carName);
          }
        } catch (err) {
          console.error('Error loading autos:', err);
        }

        // Cave Drinks - laatste poef
        try {
          const orders = await db.crabCaveOrders.getAll();
          console.log('🍺 Cave orders:', orders);
          if (orders && orders.length > 0) {
            // Get the most recent order
            const latest = orders[0]; // Already sorted by created_at descending
            // Get person and product info
            const people = await db.crabCavePeople.getAll();
            const products = await db.crabCaveProducts.getAll();
            const person = people.find(p => p.id === latest.person_id);
            const product = products.find(p => p.id === latest.product_id);
            if (person && product) {
              setLastDrink(`${person.name} - ${product.name}`);
            } else if (person) {
              setLastDrink(person.name);
            }
          }
        } catch (err) {
          console.error('Error loading cave drinks:', err);
        }

        // Cave Darts - laatste spel
        try {
          const savedGames = localStorage.getItem('cave-darts-saved-games');
          console.log('🎯 Cave Darts games:', savedGames);
          if (savedGames) {
            const games = JSON.parse(savedGames);
            if (games.length > 0) {
              const latest = games.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
              setLastDartsGame(latest.winner || 'Laatste spel');
            }
          }
        } catch (err) {
          console.error('Error loading darts:', err);
        }

        // Beleggen - laatste toevoeging
        try {
          const investments = await db.investments.getAll();
          console.log('📈 Investments:', investments);
          if (investments && investments.length > 0) {
            const latest = investments.sort((a, b) => new Date(b.purchase_date || b.created_at) - new Date(a.purchase_date || a.created_at))[0];
            setLastInvestment(latest.name || latest.ticker);
          }
        } catch (err) {
          console.error('Error loading investments:', err);
        }

        // Festivals - aankomend event
        try {
          const festivals = await db.festivals.getAll();
          console.log('🎵 Festivals:', festivals);
          if (festivals && festivals.length > 0) {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Reset to start of day for fair comparison
            
            const upcoming = festivals
              .filter(f => {
                const festivalDate = new Date(f.date || f.start_date);
                festivalDate.setHours(0, 0, 0, 0);
                return festivalDate >= now;
              })
              .sort((a, b) => {
                const dateA = new Date(a.date || a.start_date);
                const dateB = new Date(b.date || b.start_date);
                return dateA - dateB;
              })[0];
            
            if (upcoming) {
              console.log('🎵 Next festival:', upcoming);
              setNextFestival(upcoming.name);
            } else {
              console.log('🎵 No upcoming festivals found');
            }
          }
        } catch (err) {
          console.error('Error loading festivals:', err);
        }

        // Reizen - aankomende reis (using destinations table)
        try {
          const destinations = await db.destinations.getAll();
          console.log('✈️ Destinations:', destinations);
          if (destinations && destinations.length > 0) {
            const upcoming = destinations
              .filter(d => {
                const startDate = new Date(d.start_date || d.date_from);
                return startDate > new Date();
              })
              .sort((a, b) => {
                const dateA = new Date(a.start_date || a.date_from);
                const dateB = new Date(b.start_date || b.date_from);
                return dateA - dateB;
              })[0];
            if (upcoming) {
              setNextTrip(upcoming.name || upcoming.destination || upcoming.city);
            }
          }
        } catch (err) {
          console.error('Error loading destinations:', err);
        }

        // Wandelingen - laatste toegevoegde wandeling
        try {
          const hikes = await db.hikes.getAll();
          console.log('🥾 Hikes:', hikes);
          if (hikes && hikes.length > 0) {
            // Get the most recently added hike (sorted by created_at descending)
            const latest = hikes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            setNextHike(latest.name || latest.location);
          }
        } catch (err) {
          console.error('Error loading hikes:', err);
        }
      } catch (error) {
        console.error('Error loading activity data:', error);
      }

    } catch (error) {
      console.error('❌ Error loading data:', error);
      console.error('❌ Error message:', error.message);
      setTodoStats({ toStart: 0, doing: 0 });
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      id: 'habit',
      title: 'Habit Tracker',
      description: 'Vandaag',
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-600',
      value: `${habitPercentage}%`,
      subtitle: 'Voltooid',
      onClick: () => setActiveTab('habit')
    },
    {
      id: 'aquarium',
      title: 'Aquarium',
      description: 'Onderhoud & monitoring',
      icon: Activity,
      color: 'from-blue-500 to-cyan-600',
      value: lastAquariumClean || 'Geen data',
      subtitle: 'Laatste kuisbeurt',
      onClick: () => setActiveTab('aquarium')
    },
    {
      id: 'auto',
      title: 'Auto',
      description: 'Onderhoud & tracking',
      icon: Car,
      color: 'from-purple-500 to-pink-600',
      value: lastCarMaintenance || 'Geen data',
      subtitle: 'Laatste auto',
      onClick: () => setActiveTab('auto')
    },
    {
      id: 'jerky',
      title: 'Jerky',
      description: 'Batches & recepten',
      icon: Beef,
      color: 'from-orange-500 to-red-600',
      value: lastJerkyBatch || 'Geen data',
      subtitle: 'Laatste batch',
      onClick: () => setActiveTab('jerky')
    },
    {
      id: 'crabcave',
      title: 'Cave Drinks',
      description: 'Product beheer',
      icon: Shield,
      color: 'from-teal-500 to-cyan-600',
      value: lastDrink || 'Geen data',
      subtitle: 'Laatste poef',
      onClick: () => setActiveTab('crabcave')
    },
    {
      id: 'cavedarts',
      title: 'Cave Darts',
      description: 'Events & scores',
      icon: Target,
      color: 'from-yellow-500 to-orange-600',
      value: lastDartsGame || 'Geen data',
      subtitle: 'Laatste winnaar',
      onClick: () => setActiveTab('cavedarts')
    },
    {
      id: '2do',
      title: '2DO Board',
      description: 'Taken beheer',
      icon: ListTodo,
      color: 'from-indigo-500 to-purple-600',
      value: `${todoStats.toStart}/${todoStats.doing}`,
      subtitle: 'To Start / Doing',
      onClick: () => setActiveTab('2do')
    },
    {
      id: 'beleggen',
      title: 'Beleggen',
      description: 'Portfolio tracking',
      icon: TrendingUp,
      color: 'from-green-500 to-teal-600',
      value: lastInvestment || 'Geen data',
      subtitle: 'Laatste toevoeging',
      onClick: () => setActiveTab('beleggen')
    },
    {
      id: 'reizen',
      title: 'Reizen',
      description: 'Vakantie planning',
      icon: Plane,
      color: 'from-blue-500 to-sky-600',
      value: nextTrip || 'Geen data',
      subtitle: 'Aankomende reis',
      onClick: () => setActiveTab('reizen')
    },
    {
      id: 'wandelingen',
      title: 'Wandelingen',
      description: 'Hike tracking',
      icon: Footprints,
      color: 'from-emerald-500 to-green-600',
      value: nextHike || 'Geen data',
      subtitle: 'Laatste toegevoegd',
      onClick: () => setActiveTab('wandelingen')
    },
    {
      id: 'festivals',
      title: 'Festivals',
      description: 'Festival planning',
      icon: Music,
      color: 'from-fuchsia-500 to-pink-600',
      value: nextFestival || 'Geen data',
      subtitle: 'Aankomend event',
      onClick: () => setActiveTab('festivals')
    },
    {
      id: 'google-home',
      title: 'Google home',
      description: 'Home automation',
      icon: Smartphone,
      color: 'from-sky-500 to-indigo-600',
      value: null,
      onClick: () => setActiveTab('google-home')
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          Welkom terug! 👋
        </h1>
        <p className="text-white/60 text-lg">
          Hier is een overzicht van je privé activiteiten
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          
          return (
            <div
              key={card.id}
              onClick={card.onClick}
              className="gradient-card rounded-xl p-6 hover:scale-105 transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
              
              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="text-white font-semibold text-lg mb-1">
                  {card.title}
                </h3>
                <p className="text-white/60 text-sm mb-3">
                  {card.description}
                </p>
                
                {card.value && (
                  <div className="mt-2">
                    <div className="text-sm font-medium text-white/80">
                      {card.value}
                    </div>
                    {card.subtitle && (
                      <div className="text-xs text-white/50 mt-0.5">
                        {card.subtitle}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Focus */}
      <div className="gradient-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Vandaag</h2>
          </div>
          <div className="text-white/60 text-sm">
            {new Date().toLocaleDateString('nl-NL', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => setActiveTab('habit')}
            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 font-medium">Habits</span>
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {habitPercentage}%
            </div>
            <div className="text-sm text-white/60">Voltooid vandaag</div>
          </div>

          <div 
            onClick={() => setActiveTab('2do')}
            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 font-medium">Taken</span>
              <ListTodo className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {todoStats.total - todoStats.done}
            </div>
            <div className="text-sm text-white/60">Open taken</div>
          </div>

          <div 
            onClick={() => setActiveTab('beleggen')}
            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 font-medium">Portfolio</span>
              <TrendingUp className="w-5 h-5 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              -
            </div>
            <div className="text-sm text-white/60">Bekijk stats</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Snelle Acties</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('habit')}
            className="glass-effect hover:bg-white/10 rounded-lg p-4 text-left transition-colors"
          >
            <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
            <div className="text-white font-medium">Log Habits</div>
          </button>
          
          <button
            onClick={() => setActiveTab('2do')}
            className="glass-effect hover:bg-white/10 rounded-lg p-4 text-left transition-colors"
          >
            <ListTodo className="w-8 h-8 text-blue-400 mb-2" />
            <div className="text-white font-medium">Nieuwe Taak</div>
          </button>
          
          <button
            onClick={() => setActiveTab('jerky')}
            className="glass-effect hover:bg-white/10 rounded-lg p-4 text-left transition-colors"
          >
            <Beef className="w-8 h-8 text-orange-400 mb-2" />
            <div className="text-white font-medium">Nieuwe Batch</div>
          </button>
          
          <button
            onClick={() => setActiveTab('aquarium')}
            className="glass-effect hover:bg-white/10 rounded-lg p-4 text-left transition-colors"
          >
            <Activity className="w-8 h-8 text-cyan-400 mb-2" />
            <div className="text-white font-medium">Water Log</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriveHomePage;
