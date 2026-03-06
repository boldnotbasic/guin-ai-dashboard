import React, { useState, useEffect } from 'react';
import { Link, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const TabQuickLinks = ({ tabName }) => {
  const [quickLinks, setQuickLinks] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadQuickLinks();
  }, [tabName]);

  const loadQuickLinks = async () => {
    try {
      console.log('🔍 Loading quick links for tab:', tabName);
      const links = await db.tabQuickLinks.getByTab(tabName);
      console.log('✅ Loaded links:', links);
      console.log('📊 Links count:', links?.length || 0);
      console.log('📝 Links data:', JSON.stringify(links, null, 2));
      
      if (links && Array.isArray(links)) {
        console.log('✅ Setting quickLinks state with', links.length, 'items');
        setQuickLinks(links);
      } else {
        console.log('⚠️ No links or invalid data, setting empty array');
        setQuickLinks([]);
      }
      setLoading(false);
      console.log('✅ Loading complete, loading state set to false');
    } catch (err) {
      console.error('❌ Error loading tab quick links:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error stack:', err.stack);
      setQuickLinks([]);
      setLoading(false);
    }
  };

  const addQuickLink = async () => {
    if (!newLink.label.trim() || !newLink.url.trim()) return;

    try {
      console.log('Adding quick link:', { tab_name: tabName, label: newLink.label, url: newLink.url });
      const result = await db.tabQuickLinks.create({
        tab_name: tabName,
        label: newLink.label,
        url: newLink.url
      });
      console.log('Quick link created:', result);
      await loadQuickLinks();
      setNewLink({ label: '', url: '' });
      setShowAddModal(false);
    } catch (err) {
      console.error('Error adding quick link:', err);
      console.error('Error details:', err.message);
      alert('Fout bij toevoegen link: ' + err.message);
    }
  };

  const deleteQuickLink = async (id) => {
    try {
      await db.tabQuickLinks.delete(id);
      await loadQuickLinks();
    } catch (err) {
      console.error('Error deleting quick link:', err);
    }
  };

  if (loading) return null;

  return (
    <div className="gradient-card rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-semibold flex items-center space-x-2">
          <Link className="w-6 h-6 text-blue-300" />
          <span>Quick Links</span>
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Toevoegen</span>
        </button>
      </div>

      {quickLinks.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          <Link className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-lg mb-1">Nog geen quick links voor deze pagina</p>
          <p className="text-sm">Voeg handige links toe specifiek voor {tabName}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <div key={link.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors group relative">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-blue-purple flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">{link.label}</h3>
                    <p className="text-white/60 text-xs truncate">{link.url}</p>
                  </div>
                </div>
              </a>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  deleteQuickLink(link.id);
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Quick Link Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white text-xl font-semibold mb-4">Quick Link Toevoegen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Label</label>
                <input
                  type="text"
                  value={newLink.label}
                  onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                  placeholder="Bijv. Google Analytics"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">URL</label>
                <input
                  type="url"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewLink({ label: '', url: '' });
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={addQuickLink}
                disabled={!newLink.label.trim() || !newLink.url.trim()}
                className="flex-1 btn-primary px-4 py-2 rounded-lg text-white disabled:opacity-50"
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabQuickLinks;
