import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Tag, User, FileText, RefreshCw, LogIn, CheckCircle } from 'lucide-react';
import { db } from '../utils/supabaseClient';
import outlookAuthService from '../services/outlookAuthService';
import emailFetchService from '../services/emailFetchService';

const ProjectEmailFilters = ({ projectId }) => {
  const [filters, setFilters] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFilter, setNewFilter] = useState({
    filter_type: 'keyword',
    filter_value: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadFilters();
  }, [projectId]);

  const loadFilters = async () => {
    try {
      setLoading(true);
      const data = await db.emailFilters.getByProject(projectId);
      setFilters(data);
    } catch (error) {
      console.error('Error loading email filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFilter = async () => {
    if (!newFilter.filter_value.trim()) {
      alert('Vul een filter waarde in');
      return;
    }

    try {
      const filterData = {
        project_id: parseInt(projectId),
        filter_type: newFilter.filter_type,
        filter_value: newFilter.filter_value.trim(),
        is_active: true
      };

      await db.emailFilters.create(filterData);
      await loadFilters();
      
      setNewFilter({
        filter_type: 'keyword',
        filter_value: '',
        is_active: true
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding filter:', error);
      alert('Fout bij toevoegen filter');
    }
  };

  const toggleFilter = async (filter) => {
    try {
      await db.emailFilters.update(filter.id, { is_active: !filter.is_active });
      await loadFilters();
    } catch (error) {
      console.error('Error toggling filter:', error);
    }
  };

  const deleteFilter = async (filterId) => {
    if (!window.confirm('Weet je zeker dat je dit filter wilt verwijderen?')) return;
    
    try {
      await db.emailFilters.delete(filterId);
      await loadFilters();
    } catch (error) {
      console.error('Error deleting filter:', error);
    }
  };

  const connectOutlook = async () => {
    try {
      setLoading(true);
      await outlookAuthService.initialize();
      await outlookAuthService.login();
      setIsAuthenticated(true);
      alert('Outlook succesvol gekoppeld! Je kunt nu emails synchroniseren.');
    } catch (error) {
      console.error('Error connecting Outlook:', error);
      alert('Fout bij koppelen Outlook: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const syncEmails = async () => {
    if (!isAuthenticated) {
      alert('Koppel eerst je Outlook account');
      return;
    }

    try {
      setSyncing(true);
      const result = await emailFetchService.syncEmails(projectId);
      alert(`${result.length} nieuwe emails gesynchroniseerd!`);
    } catch (error) {
      console.error('Error syncing emails:', error);
      alert('Fout bij synchroniseren: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const getFilterIcon = (type) => {
    switch (type) {
      case 'keyword': return <Tag className="w-4 h-4" />;
      case 'sender': return <User className="w-4 h-4" />;
      case 'subject': return <FileText className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getFilterLabel = (type) => {
    switch (type) {
      case 'keyword': return 'Keyword';
      case 'sender': return 'Afzender';
      case 'subject': return 'Onderwerp';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>Email Filters</span>
          </h3>
          <p className="text-white/60 text-sm mt-1">
            Automatisch emails koppelen aan dit project
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!isAuthenticated ? (
            <button
              onClick={connectOutlook}
              disabled={loading}
              className="glass-effect px-4 py-2 rounded-lg text-white flex items-center space-x-2 hover:bg-white/10"
            >
              <LogIn className="w-4 h-4" />
              <span>Outlook Koppelen</span>
            </button>
          ) : (
            <button
              onClick={syncEmails}
              disabled={syncing}
              className="glass-effect px-4 py-2 rounded-lg text-green-400 flex items-center space-x-2 hover:bg-green-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{syncing ? 'Synchroniseren...' : 'Emails Ophalen'}</span>
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2 rounded-lg text-white flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Filter Toevoegen</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="gradient-card rounded-xl p-8 text-center">
          <RefreshCw className="w-8 h-8 text-white/50 mx-auto animate-spin" />
          <p className="text-white/60 mt-2">Filters laden...</p>
        </div>
      ) : filters.length === 0 ? (
        <div className="gradient-card rounded-xl p-8 text-center">
          <Mail className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">Nog geen email filters ingesteld</p>
          <p className="text-white/40 text-sm mt-1">
            Voeg filters toe om emails automatisch te koppelen
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className={`gradient-card rounded-lg p-4 flex items-center justify-between ${
                !filter.is_active ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                  filter.filter_type === 'keyword' ? 'from-blue-500 to-cyan-500' :
                  filter.filter_type === 'sender' ? 'from-purple-500 to-pink-500' :
                  'from-green-500 to-emerald-500'
                } flex items-center justify-center text-white`}>
                  {getFilterIcon(filter.filter_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-white/50 text-sm">{getFilterLabel(filter.filter_type)}:</span>
                    <span className="text-white font-medium">{filter.filter_value}</span>
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    {filter.is_active ? '✓ Actief' : '○ Inactief'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleFilter(filter)}
                  className={`glass-effect px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filter.is_active ? 'text-green-400' : 'text-white/50'
                  }`}
                >
                  {filter.is_active ? 'Actief' : 'Inactief'}
                </button>
                <button
                  onClick={() => deleteFilter(filter.id)}
                  className="glass-effect p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Filter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">Email Filter Toevoegen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Filter Type</label>
                <select
                  value={newFilter.filter_type}
                  onChange={(e) => setNewFilter({...newFilter, filter_type: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                >
                  <option value="keyword">Keyword (in onderwerp of inhoud)</option>
                  <option value="sender">Afzender Email</option>
                  <option value="subject">Onderwerp</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">
                  {newFilter.filter_type === 'keyword' ? 'Keyword' :
                   newFilter.filter_type === 'sender' ? 'Email Adres' :
                   'Onderwerp Tekst'}
                </label>
                <input
                  type="text"
                  value={newFilter.filter_value}
                  onChange={(e) => setNewFilter({...newFilter, filter_value: e.target.value})}
                  placeholder={
                    newFilter.filter_type === 'keyword' ? 'bv. Peakpioneers' :
                    newFilter.filter_type === 'sender' ? 'bv. client@company.com' :
                    'bv. Project Update'
                  }
                  className="w-full input-plain rounded-lg px-3 py-2"
                />
                <p className="text-white/40 text-xs mt-1">
                  {newFilter.filter_type === 'keyword' && 'Emails met dit woord in onderwerp of inhoud worden gekoppeld'}
                  {newFilter.filter_type === 'sender' && 'Emails van dit adres worden gekoppeld'}
                  {newFilter.filter_type === 'subject' && 'Emails met deze tekst in onderwerp worden gekoppeld'}
                </p>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="glass-effect px-4 py-2 rounded-lg text-white"
                >
                  Annuleren
                </button>
                <button
                  onClick={addFilter}
                  className="btn-primary px-4 py-2 rounded-lg text-white"
                >
                  Filter Toevoegen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectEmailFilters;
