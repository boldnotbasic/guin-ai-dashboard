import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, X, Shield, Eye, PenTool, Crown, Mail, Calendar, Search, RefreshCw } from 'lucide-react';
import { profiles, auth } from '../utils/supabaseClient';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: 'user',
    avatar_url: ''
  });

  // Load users from Supabase
  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await profiles.getAll();
      setUsers(data);
    } catch (err) {
      setError('Fout bij laden van gebruikers: ' + err.message);
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return Crown;
      case 'editor': return PenTool;
      case 'viewer': return Eye;
      default: return Shield;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'editor': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'viewer': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-500/20 text-green-300 border-green-500/30'
      : 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastLogin = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h geleden`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d geleden`;
    } else {
      return formatDate(dateString);
    }
  };

  const updateUser = async () => {
    if (!newUser.full_name || !editingUser) return;
    
    setLoading(true);
    setError('');
    try {
      await profiles.update(editingUser.id, {
        full_name: newUser.full_name,
        role: newUser.role,
        avatar_url: newUser.avatar_url
      });
      await loadUsers();
      resetForm();
    } catch (err) {
      setError('Fout bij bijwerken: ' + err.message);
      console.error('Error updating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setNewUser({
      full_name: user.full_name || '',
      email: user.email,
      role: user.role || 'user',
      avatar_url: user.avatar_url || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setNewUser({
      full_name: '',
      email: '',
      role: 'user',
      avatar_url: ''
    });
    setShowAddForm(false);
    setEditingUser(null);
    setError('');
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const deleteUser = () => {
    // Note: User deletion should be handled with care via Supabase Auth admin API
    // For now, we'll just show a message
    setError('User deletion moet via Supabase Auth Admin worden gedaan voor veiligheid.');
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user').length,
    viewer: users.filter(u => u.role === 'viewer').length,
    total: users.length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gebruikersbeheer</h1>
          <p className="text-white/70">Beheer gebruikers, rollen en toegangsrechten via Supabase Auth</p>
        </div>
        <button 
          onClick={loadUsers}
          disabled={loading}
          className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Vernieuwen</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="gradient-card px-6 py-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Crown className="w-6 h-6 text-red-300" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Admins</p>
              <p className="text-white font-bold text-2xl">{roleStats.admin}</p>
            </div>
          </div>
        </div>
        <div className="gradient-card px-6 py-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Users</p>
              <p className="text-white font-bold text-2xl">{roleStats.user}</p>
            </div>
          </div>
        </div>
        <div className="gradient-card px-6 py-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Eye className="w-6 h-6 text-green-300" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Viewers</p>
              <p className="text-white font-bold text-2xl">{roleStats.viewer}</p>
            </div>
          </div>
        </div>
        <div className="gradient-card px-6 py-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Users className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Totaal</p>
              <p className="text-white font-bold text-2xl">{roleStats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
          <input
            type="text"
            placeholder="Zoek gebruikers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 w-full"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
        >
          <option value="all" className="bg-gray-800">Alle rollen</option>
          <option value="admin" className="bg-gray-800">Admin</option>
          <option value="user" className="bg-gray-800">User</option>
          <option value="viewer" className="bg-gray-800">Viewer</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && users.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="text-white/70 mt-4">Gebruikers laden...</p>
        </div>
      )}

      {/* Users Grid */}
      {!loading || users.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => {
            const RoleIcon = getRoleIcon(user.role);
            const userName = user.full_name || user.email.split('@')[0];
            return (
              <div key={user.id} className="gradient-card rounded-xl p-6 hover:scale-105 transition-transform relative">
                <div className="absolute top-4 right-4 flex space-x-2 z-10">
                  <button 
                    onClick={() => startEdit(user)}
                    className="bg-black/50 p-2 rounded-full text-white/80 hover:text-white hover:bg-black/70 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-blue-purple flex items-center justify-center">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={userName}
                        className="w-full h-full object-contain bg-white/5"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">{userName}</h3>
                    <p className="text-white/70 text-sm">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Rol:</span>
                    <div className={`px-3 py-1 rounded-full border text-xs font-medium flex items-center space-x-1 ${getRoleColor(user.role)}`}>
                      <RoleIcon className="w-3 h-3" />
                      <span className="capitalize">{user.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Aangemaakt:</span>
                    <span className="text-white text-sm">{formatDate(user.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Add/Edit User Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">
                {editingUser ? 'Gebruiker Bewerken' : 'Nieuwe Gebruiker Toevoegen'}
              </h2>
              <button 
                onClick={resetForm}
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
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Volledige naam"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white/50 cursor-not-allowed"
                  placeholder="email@meteor.com"
                />
                <p className="text-white/50 text-xs mt-1">Email kan niet worden gewijzigd</p>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="viewer" className="bg-gray-800">Viewer</option>
                  <option value="user" className="bg-gray-800">User</option>
                  <option value="admin" className="bg-gray-800">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Avatar URL</label>
                <input
                  type="url"
                  value={newUser.avatar_url}
                  onChange={(e) => setNewUser({...newUser, avatar_url: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mt-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
            
            <div className="flex space-x-4 mt-6">
              <button 
                onClick={updateUser}
                disabled={loading}
                className="btn-primary px-6 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              >
                {loading ? 'Bezig...' : 'Gebruiker Bijwerken'}
              </button>
              <button 
                onClick={resetForm}
                className="glass-effect px-6 py-2 rounded-lg text-white font-medium"
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

export default UsersPage;
