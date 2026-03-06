import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Menu, X } from 'lucide-react';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import HomePage from './components/HomePage';
import SalesPage from './components/SalesPage';
import SalesOverviewPage from './components/SalesOverviewPage';
import RoyalTalensSalesPage from './components/RoyalTalensSalesPage';
import DremababySalesPage from './components/DremababySalesPage';
import CustomSalesPage from './components/CustomSalesPage';
import ProjectsPage from './components/ProjectsPage';
import ProjectDetailPage from './components/ProjectDetailPage';
import ProspectsPage from './components/ProspectsPage';
import SettingsPage from './components/SettingsPage';
import QuizPage from './components/QuizPage';
import BrandingPage from './components/BrandingPage';
import BrandingResourcesPage from './components/BrandingResourcesPage';
import TwoDoPage from './components/TwoDoPage';
import BeleggenPage from './components/BeleggenPage';
import WaardebonnenPage from './components/WaardebonnenPage';
import CaveDartsPage from './components/CaveDartsPage';
import AutoPage from './components/AutoPage';
import JerkyPage from './components/JerkyPage';
import IdeaCenterPage from './components/IdeaCenterPage';
import InspirationCenterPage from './components/InspirationCenterPage';
import CostsPage from './components/CostsPage';
import FestivalsPage from './components/FestivalsPage';
import KokenPage from './components/KokenPage';
import PriveHomePage from './components/PriveHomePage';
import ReizenPage from './components/ReizenPage';
import WandelingenPage from './components/WandelingenPage';
import AICenterPage from './components/AICenterPage';
import AIChatbot from './components/AIChatbot';
import StorageDebugger from './components/StorageDebugger';
import TabQuickLinks from './components/TabQuickLinks';
import GoogleHomePage from './components/GoogleHomePage';
import StoktelllingPage from './components/StoktelllingPage';
import './components/ClearMenuCache'; // Auto-cleanup oude menu cache
import { Pencil, Trash2, Plus, Upload } from 'lucide-react';
import { db, supabase } from './utils/supabaseClient';
import './index.css';
import './mobile.css';


const AquariumPage = () => {
  const [cleaningLogs, setCleaningLogs] = useState([]);
  const [notes, setNotes] = useState([]);
  const [fish, setFish] = useState([]);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddFishModal, setShowAddFishModal] = useState(false);
  const [showAddCleaningModal, setShowAddCleaningModal] = useState(false);
  const [editingFish, setEditingFish] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [newFish, setNewFish] = useState({ name: '', species: '', quantity: 1, birth_date: '', notes: '', image_url: '' });
  const [newCleaning, setNewCleaning] = useState({ aquarium_name: 'Juwel 450l', cleaning_type: 'waterverversing', date: new Date().toISOString().split('T')[0] });
  const [editingCleaning, setEditingCleaning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const uploadFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('aquarium')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('aquarium')
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
    setNewFish({ ...newFish, image_url: '' });
    setImageFile(null);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [logsData, notesData, fishData] = await Promise.all([
        db.aquariumLogs.getAll().catch(() => []),
        db.aquariumNotes.getAll().catch(() => []),
        db.aquariumFish.getAll().catch(() => [])
      ]);
      setCleaningLogs(logsData);
      setNotes(notesData);
      setFish(fishData);
    } catch (error) {
      console.error('Error loading aquarium data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCleaningLog = async () => {
    try {
      if (editingCleaning) {
        // Update existing log
        const log = {
          date: new Date(newCleaning.date).toISOString(),
          aquarium_name: newCleaning.aquarium_name,
          cleaning_type: newCleaning.cleaning_type,
          type: 'cleaning'
        };
        const updated = await db.aquariumLogs.update(editingCleaning.id, log);
        setCleaningLogs(cleaningLogs.map(l => l.id === editingCleaning.id ? updated : l));
        setEditingCleaning(null);
      } else {
        // Create new log
        const log = {
          date: new Date(newCleaning.date).toISOString(),
          aquarium_name: newCleaning.aquarium_name,
          cleaning_type: newCleaning.cleaning_type,
          type: 'cleaning'
        };
        const newLog = await db.aquariumLogs.create(log);
        setCleaningLogs([newLog, ...cleaningLogs]);
      }
      setShowAddCleaningModal(false);
      setNewCleaning({ aquarium_name: 'Juwel 450l', cleaning_type: 'waterverversing', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error('Error adding cleaning log:', error);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        alert('Database tabel bestaat nog niet. Voer eerst de SQL queries uit in Supabase.');
      } else {
        alert('Fout bij toevoegen kuisbeurt: ' + error.message);
      }
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      const note = {
        date: new Date().toISOString(),
        content: newNote.trim()
      };
      const newNoteData = await db.aquariumNotes.create(note);
      setNotes([newNoteData, ...notes]);
      setNewNote('');
      setShowAddNoteModal(false);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Fout bij toevoegen notitie');
    }
  };

  const deleteLog = async (id) => {
    try {
      await db.aquariumLogs.delete(id);
      setCleaningLogs(cleaningLogs.filter(log => log.id !== id));
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('Fout bij verwijderen kuisbeurt');
    }
  };

  const deleteNote = async (id) => {
    try {
      await db.aquariumNotes.delete(id);
      setNotes(notes.filter(note => note.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Fout bij verwijderen notitie');
    }
  };

  const addFish = async () => {
    if (!newFish.name.trim() || !newFish.species.trim()) {
      alert('Vul naam en soort in');
      return;
    }
    try {
      setUploading(true);
      let imageUrl = newFish.image_url;

      if (imageFile) {
        imageUrl = await uploadFile(imageFile, 'fish');
      }

      const fishData = {
        name: newFish.name.trim(),
        species: newFish.species.trim(),
        quantity: parseInt(newFish.quantity) || 1,
        birth_date: newFish.birth_date || null,
        notes: newFish.notes.trim(),
        image_url: imageUrl || null,
        added_date: new Date().toISOString()
      };
      
      if (editingFish) {
        // Update existing fish
        const updatedFish = await db.aquariumFish.update(editingFish.id, fishData);
        setFish(fish.map(f => f.id === editingFish.id ? updatedFish : f));
      } else {
        // Create new fish
        const newFishData = await db.aquariumFish.create(fishData);
        setFish([newFishData, ...fish]);
      }
      
      setNewFish({ name: '', species: '', quantity: 1, birth_date: '', notes: '', image_url: '' });
      setImageFile(null);
      setEditingFish(null);
      setShowAddFishModal(false);
    } catch (error) {
      console.error('Error saving fish:', error);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        alert('Database tabel bestaat nog niet. Voer eerst de SQL queries uit in Supabase.');
      } else {
        alert('Fout bij opslaan vis/wezen: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const openEditFish = (creature) => {
    setEditingFish(creature);
    setNewFish({
      name: creature.name,
      species: creature.species,
      quantity: creature.quantity,
      birth_date: creature.birth_date || '',
      notes: creature.notes || '',
      image_url: creature.image_url || ''
    });
    setShowAddFishModal(true);
  };

  const openAddFishModal = () => {
    setEditingFish(null);
    setNewFish({ name: '', species: '', quantity: 1, birth_date: '', notes: '', image_url: '' });
    setShowAddFishModal(true);
  };

  const deleteFish = async (id) => {
    try {
      await db.aquariumFish.delete(id);
      setFish(fish.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting fish:', error);
      alert('Fout bij verwijderen vis/wezen');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const daysSinceLastCleaning = () => {
    if (cleaningLogs.length === 0) return null;
    const lastCleaning = new Date(cleaningLogs[0].date);
    const now = new Date();
    const diffTime = Math.abs(now - lastCleaning);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const days = daysSinceLastCleaning();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">🐠 Aquarium</h1>
          <p className="text-white/70">Onderhoud & Notities</p>
        </div>
        {days !== null && (
          <div className="text-right">
            <div className="text-white/70 text-sm">Laatste kuisbeurt</div>
            <div className={`text-2xl font-bold ${days > 7 ? 'text-red-400' : days > 3 ? 'text-yellow-400' : 'text-green-400'}`}>
              {days} {days === 1 ? 'dag' : 'dagen'} geleden
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setShowAddCleaningModal(true)}
          className="gradient-card rounded-xl p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-3xl">
              🧹
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold text-lg">Kuisbeurt Registreren</h3>
              <p className="text-white/70 text-sm">Klik om een nieuwe kuisbeurt toe te voegen</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowAddNoteModal(true)}
          className="gradient-card rounded-xl p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl">
              📝
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold text-lg">Notitie Toevoegen</h3>
              <p className="text-white/70 text-sm">Voeg een nieuwe notitie toe</p>
            </div>
          </div>
        </button>
      </div>

      {/* Aquarium Inhabitants */}
      <div className="gradient-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-xl flex items-center space-x-2">
            <span>🐠</span>
            <span>Aquarium Bewoners</span>
          </h2>
          <button
            onClick={openAddFishModal}
            className="btn-primary px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Toevoegen</span>
          </button>
        </div>

        {fish.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            <div className="text-6xl mb-4">🐠</div>
            <p className="text-lg mb-1">Nog geen vissen of wezens toegevoegd</p>
            <p className="text-sm">Klik "Toevoegen" om je eerste bewoner toe te voegen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fish.map((creature) => (
              <div key={creature.id} className="bg-white/5 rounded-lg overflow-hidden hover:bg-white/10 transition-colors group relative">
                {creature.image_url && (
                  <div className="w-full h-48 bg-white/5">
                    <img 
                      src={creature.image_url} 
                      alt={creature.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">{creature.name}</h3>
                      <p className="text-white/70 text-sm">{creature.species}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditFish(creature)}
                        className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 transition-opacity"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteFish(creature.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Aantal: {creature.quantity}</span>
                      <span className="text-white/40 text-xs">
                        {new Date(creature.added_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {creature.birth_date && (
                      <div className="text-white/60 text-xs">
                        Geboortedatum: {new Date(creature.birth_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  {creature.notes && (
                    <p className="text-white/50 text-xs mt-2 pt-2 border-t border-white/10">{creature.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cleaning Logs */}
        <div className="gradient-card rounded-xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">🧹 Kuisbeurt Geschiedenis</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cleaningLogs.length === 0 ? (
              <div className="text-white/50 text-center py-8">
                Nog geen kuisbeurten geregistreerd
              </div>
            ) : (
              cleaningLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white/5 rounded-lg p-3 flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🧹</span>
                    <div>
                      <div className="text-white font-medium">{log.aquarium_name || 'Aquarium schoongemaakt'}</div>
                      <div className="text-white/60 text-sm">{log.cleaning_type === 'grondige_schoonmaak' ? 'Grondige schoonmaak' : 'Waterverversing'}</div>
                      <div className="text-white/50 text-xs">{formatDate(log.date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingCleaning(log);
                        setNewCleaning({
                          aquarium_name: log.aquarium_name,
                          cleaning_type: log.cleaning_type,
                          date: new Date(log.date).toISOString().split('T')[0]
                        });
                        setShowAddCleaningModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Bewerken"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="gradient-card rounded-xl p-6">
          <h2 className="text-white font-semibold text-lg mb-4">📝 Notities</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="text-white/50 text-center py-8">
                Nog geen notities toegevoegd
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-white/50 text-xs">{formatDate(note.date)}</div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-white">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">Notitie Toevoegen</h2>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full input-plain rounded-lg px-3 py-2 mb-4 h-32"
              placeholder="Typ je notitie hier..."
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => { setShowAddNoteModal(false); setNewNote(''); }} className="glass-effect px-4 py-2 rounded-lg text-white">Annuleren</button>
              <button onClick={addNote} className="btn-primary px-4 py-2 rounded-lg text-white">Toevoegen</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Cleaning Modal */}
      {showAddCleaningModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">
              {editingCleaning ? 'Kuisbeurt Bewerken' : 'Kuisbeurt Registreren'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Datum</label>
                <input
                  type="date"
                  value={newCleaning.date}
                  onChange={(e) => setNewCleaning({ ...newCleaning, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Aquarium</label>
                <select
                  value={newCleaning.aquarium_name}
                  onChange={(e) => setNewCleaning({ ...newCleaning, aquarium_name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="Juwel 450l">Juwel 450l</option>
                  <option value="Superfish 30l">Superfish 30l</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Type Schoonmaak</label>
                <select
                  value={newCleaning.cleaning_type}
                  onChange={(e) => setNewCleaning({ ...newCleaning, cleaning_type: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="waterverversing">Waterverversing</option>
                  <option value="grondige_schoonmaak">Grondige schoonmaak</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => { 
                  setShowAddCleaningModal(false); 
                  setEditingCleaning(null);
                  setNewCleaning({ aquarium_name: 'Juwel 450l', cleaning_type: 'waterverversing', date: new Date().toISOString().split('T')[0] });
                }} 
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button 
                onClick={addCleaningLog} 
                className="btn-primary px-4 py-2 rounded-lg text-white"
              >
                {editingCleaning ? 'Opslaan' : 'Registreren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Fish Modal */}
      {showAddFishModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">
              {editingFish ? 'Vis/Wezen Bewerken' : 'Vis/Wezen Toevoegen'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Naam *</label>
                <input
                  type="text"
                  value={newFish.name}
                  onChange={(e) => setNewFish({ ...newFish, name: e.target.value })}
                  placeholder="Bijv. Nemo"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Soort *</label>
                <input
                  type="text"
                  value={newFish.species}
                  onChange={(e) => setNewFish({ ...newFish, species: e.target.value })}
                  placeholder="Bijv. Clownvis"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Aantal</label>
                <input
                  type="number"
                  value={newFish.quantity}
                  onChange={(e) => setNewFish({ ...newFish, quantity: e.target.value })}
                  min="1"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Geboortedatum (optioneel)</label>
                <input
                  type="date"
                  value={newFish.birth_date}
                  onChange={(e) => setNewFish({ ...newFish, birth_date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Foto (optioneel)</label>
                <div className="space-y-4">
                  {imageFile || newFish.image_url ? (
                    <div className="relative">
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : newFish.image_url}
                        alt="Vis/wezen foto"
                        className="w-full h-64 object-contain bg-white/5 rounded-lg"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition-colors"
                        title="Verwijder foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40 transition-colors">
                      <Upload className="w-12 h-12 text-white/40 mb-2" />
                      <span className="text-white/60">Klik om foto te uploaden</span>
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
                <label className="block text-white/70 text-sm mb-2">Notities (optioneel)</label>
                <textarea
                  value={newFish.notes}
                  onChange={(e) => setNewFish({ ...newFish, notes: e.target.value })}
                  placeholder="Extra informatie..."
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 h-20"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => { 
                  setShowAddFishModal(false); 
                  setEditingFish(null);
                  setNewFish({ name: '', species: '', quantity: 1, birth_date: '', notes: '', image_url: '' }); 
                }} 
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button 
                onClick={addFish}
                disabled={uploading}
                className="btn-primary px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{editingFish ? 'Opslaan...' : 'Toevoegen...'}</span>
                  </>
                ) : (
                  <span>{editingFish ? 'Opslaan' : 'Toevoegen'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CrabCavePage = () => {
  const [products, setProducts] = useState([]);
  const [people, setPeople] = useState([]);
  const [orders, setOrders] = useState({});
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', emoji: '🍺', image_url: '', price: 0, useEmoji: true });
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, peopleData, ordersData] = await Promise.all([
        db.crabCaveProducts.getAll(),
        db.crabCavePeople.getAll(),
        db.crabCaveOrders.getAll()
      ]);
      
      setProducts(productsData);
      setPeople(peopleData);
      
      // Convert orders array to object grouped by person_id
      const ordersObj = {};
      ordersData.forEach(order => {
        if (!ordersObj[order.person_id]) {
          ordersObj[order.person_id] = [];
        }
        ordersObj[order.person_id].push({
          orderId: order.order_id,
          id: order.product_id,
          name: order.product_name,
          emoji: order.product_emoji,
          image_url: order.product_image_url,
          price: parseFloat(order.price)
        });
      });
      setOrders(ordersObj);
    } catch (error) {
      console.error('Error loading crab cave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPerson = async () => {
    if (!newPersonName.trim()) return;
    try {
      const person = {
        name: newPersonName.trim()
      };
      const newPerson = await db.crabCavePeople.create(person);
      setPeople([...people, newPerson]);
      setOrders({ ...orders, [newPerson.id]: [] });
      setNewPersonName('');
      setShowAddPersonModal(false);
    } catch (error) {
      console.error('Error adding person:', error);
      alert('Fout bij toevoegen persoon');
    }
  };

  const addProduct = async () => {
    if (!newProduct.name.trim() || newProduct.price <= 0) return;
    try {
      const product = {
        name: newProduct.name.trim(),
        emoji: newProduct.useEmoji ? newProduct.emoji : null,
        image_url: !newProduct.useEmoji ? newProduct.image_url : null,
        price: parseFloat(newProduct.price)
      };
      const newProductData = await db.crabCaveProducts.create(product);
      setProducts([...products, newProductData]);
      setNewProduct({ name: '', emoji: '🍺', image_url: '', price: 0, useEmoji: true });
      setShowAddProductModal(false);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Fout bij toevoegen product');
    }
  };

  const updateProduct = async () => {
    if (!editingProduct || !editingProduct.name.trim() || editingProduct.price <= 0) return;
    try {
      const updates = {
        name: editingProduct.name.trim(),
        emoji: editingProduct.useEmoji ? editingProduct.emoji : null,
        image_url: !editingProduct.useEmoji ? editingProduct.image_url : null,
        price: parseFloat(editingProduct.price)
      };
      await db.crabCaveProducts.update(editingProduct.id, updates);
      setProducts(products.map(p => p.id === editingProduct.id ? { ...editingProduct, ...updates } : p));
      setEditingProduct(null);
      setShowAddProductModal(false);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Fout bij updaten product');
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Dit product verwijderen?')) return;
    try {
      await db.crabCaveProducts.delete(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Fout bij verwijderen product');
    }
  };

  const addOrderToPerson = async (personId, product) => {
    try {
      const orderId = Date.now();
      const order = {
        person_id: personId,
        product_id: product.id,
        product_name: product.name,
        product_emoji: product.emoji,
        product_image_url: product.image_url,
        price: product.price,
        order_id: orderId
      };
      await db.crabCaveOrders.create(order);
      setOrders(prev => ({
        ...prev,
        [personId]: [...(prev[personId] || []), { ...product, orderId }]
      }));
    } catch (error) {
      console.error('Error adding order:', error);
      alert('Fout bij toevoegen bestelling');
    }
  };

  const removeOrder = async (personId, orderId) => {
    try {
      // Find the order in Supabase by order_id
      const allOrders = await db.crabCaveOrders.getAll();
      const orderToDelete = allOrders.find(o => o.order_id === orderId && o.person_id === personId);
      if (orderToDelete) {
        await db.crabCaveOrders.delete(orderToDelete.id);
      }
      setOrders(prev => ({
        ...prev,
        [personId]: prev[personId].filter(o => o.orderId !== orderId)
      }));
    } catch (error) {
      console.error('Error removing order:', error);
      alert('Fout bij verwijderen bestelling');
    }
  };

  const getPersonTotal = (personId) => {
    const personOrders = orders[personId] || [];
    return personOrders.reduce((sum, order) => sum + order.price, 0);
  };

  const getGrandTotal = () => {
    return Object.values(orders).flat().reduce((sum, order) => sum + order.price, 0);
  };

  const clearPersonOrders = async (personId, personName) => {
    if (!window.confirm(`Poef vereffenen voor ${personName}?`)) return;
    try {
      // Delete all orders for this person
      const allOrders = await db.crabCaveOrders.getAll();
      const personOrders = allOrders.filter(order => order.person_id === personId);
      await Promise.all(personOrders.map(order => db.crabCaveOrders.delete(order.id)));
      setOrders(prev => ({
        ...prev,
        [personId]: []
      }));
    } catch (error) {
      console.error('Error clearing person orders:', error);
      alert('Fout bij vereffenen poef');
    }
  };

  const clearAllOrders = async () => {
    if (!window.confirm('Alle bestellingen wissen?')) return;
    try {
      // Delete all orders for all people
      const allOrders = await db.crabCaveOrders.getAll();
      await Promise.all(allOrders.map(order => db.crabCaveOrders.delete(order.id)));
      setOrders({});
    } catch (error) {
      console.error('Error clearing orders:', error);
      alert('Fout bij wissen bestellingen');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">🦀 Crab Cave</h1>
          <p className="text-white/70">Prijslijst & Poef Systeem</p>
        </div>
        <div className="text-right">
          <div className="text-white/70 text-sm">Totaal</div>
          <div className="text-3xl font-bold text-green-400">€{getGrandTotal().toFixed(2)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prijslijst */}
        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Prijslijst</h2>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowAddProductModal(true);
              }}
              className="glass-effect px-3 py-2 rounded-lg text-white text-sm hover:bg-white/20"
            >
              + Product
            </button>
          </div>
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white/5 rounded-lg p-3 flex items-center justify-between hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <span className="text-2xl">{product.emoji}</span>
                  )}
                  <span className="text-white font-medium">{product.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-400 font-semibold">€{product.price.toFixed(2)}</span>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingProduct({ ...product, useEmoji: !!product.emoji });
                        setShowAddProductModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 p-1"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Poef Systeem */}
        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Poef Systeem</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAddPersonModal(true)}
                className="glass-effect px-3 py-2 rounded-lg text-white text-sm hover:bg-white/20"
              >
                + Persoon
              </button>
              <button
                onClick={clearAllOrders}
                className="glass-effect px-3 py-2 rounded-lg text-red-400 text-sm hover:bg-red-500/20"
              >
                Wis Alles
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {people.map((person) => {
              const total = getPersonTotal(person.id);
              const personOrders = orders[person.id] || [];
              return (
                <div key={person.id} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{person.name}</span>
                    <span className="text-green-400 font-bold">€{total.toFixed(2)}</span>
                  </div>
                  {personOrders.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {personOrders.map((order) => (
                        <div key={order.orderId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            {order.image_url ? (
                              <img src={order.image_url} alt={order.name} className="w-5 h-5 rounded object-cover" />
                            ) : (
                              <span>{order.emoji}</span>
                            )}
                            <span className="text-white/70">{order.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white/70">€{order.price.toFixed(2)}</span>
                            <button
                              onClick={() => removeOrder(person.id, order.orderId)}
                              className="text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedPerson(person.id)}
                      className="flex-1 glass-effect px-3 py-2 rounded-lg text-white text-sm hover:bg-white/20"
                    >
                      + Bestelling toevoegen
                    </button>
                    {personOrders.length > 0 && (
                      <button
                        onClick={() => clearPersonOrders(person.id, person.name)}
                        className="glass-effect px-3 py-2 rounded-lg text-green-400 text-sm hover:bg-green-500/20 whitespace-nowrap"
                      >
                        ✓ Poef Vereffenen
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {people.length === 0 && (
              <div className="text-white/50 text-center py-8">
                Voeg een persoon toe om te beginnen
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Person Modal */}
      {showAddPersonModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">Persoon Toevoegen</h2>
            <input
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPerson()}
              className="w-full input-plain rounded-lg px-3 py-2 mb-4"
              placeholder="Naam..."
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowAddPersonModal(false)} className="glass-effect px-4 py-2 rounded-lg text-white">Annuleren</button>
              <button onClick={addPerson} className="btn-primary px-4 py-2 rounded-lg text-white">Toevoegen</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">
              {editingProduct ? 'Product Bewerken' : 'Product Toevoegen'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Naam *</label>
                <input
                  value={editingProduct ? editingProduct.name : newProduct.name}
                  onChange={(e) => editingProduct 
                    ? setEditingProduct({...editingProduct, name: e.target.value})
                    : setNewProduct({...newProduct, name: e.target.value})
                  }
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bier, Wijn, Chips, etc."
                  autoFocus
                />
              </div>

              {/* Toggle tussen Emoji en Afbeelding */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Weergave</label>
                <div className="flex space-x-2 mb-3">
                  <button
                    onClick={() => editingProduct 
                      ? setEditingProduct({...editingProduct, useEmoji: true})
                      : setNewProduct({...newProduct, useEmoji: true})
                    }
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      (editingProduct ? editingProduct.useEmoji : newProduct.useEmoji)
                        ? 'bg-purple-500 text-white'
                        : 'glass-effect text-white/70'
                    }`}
                  >
                    😀 Emoji
                  </button>
                  <button
                    onClick={() => editingProduct 
                      ? setEditingProduct({...editingProduct, useEmoji: false})
                      : setNewProduct({...newProduct, useEmoji: false})
                    }
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      !(editingProduct ? editingProduct.useEmoji : newProduct.useEmoji)
                        ? 'bg-purple-500 text-white'
                        : 'glass-effect text-white/70'
                    }`}
                  >
                    🖼️ Afbeelding
                  </button>
                </div>

                {(editingProduct ? editingProduct.useEmoji : newProduct.useEmoji) ? (
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Emoji</label>
                    <input
                      value={editingProduct ? editingProduct.emoji : newProduct.emoji}
                      onChange={(e) => editingProduct 
                        ? setEditingProduct({...editingProduct, emoji: e.target.value})
                        : setNewProduct({...newProduct, emoji: e.target.value})
                      }
                      className="w-full input-plain rounded-lg px-3 py-2 text-2xl"
                      placeholder="🍺"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Afbeelding URL</label>
                    <input
                      value={editingProduct ? editingProduct.image_url || '' : newProduct.image_url}
                      onChange={(e) => editingProduct 
                        ? setEditingProduct({...editingProduct, image_url: e.target.value})
                        : setNewProduct({...newProduct, image_url: e.target.value})
                      }
                      className="w-full input-plain rounded-lg px-3 py-2"
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-white/40 text-xs mt-1">Plak een afbeelding URL of upload later via Supabase Storage</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Prijs (€) *</label>
                <input
                  type="number"
                  step="0.50"
                  value={editingProduct ? editingProduct.price : newProduct.price}
                  onChange={(e) => editingProduct 
                    ? setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})
                    : setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})
                  }
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="2.50"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowAddProductModal(false);
                  setEditingProduct(null);
                }} 
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button 
                onClick={editingProduct ? updateProduct : addProduct} 
                className="btn-primary px-4 py-2 rounded-lg text-white"
              >
                {editingProduct ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Order to Person Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">
              Bestelling voor {people.find(p => p.id === selectedPerson)?.name}
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    addOrderToPerson(selectedPerson, product);
                    setSelectedPerson(null);
                  }}
                  className="w-full bg-white/5 rounded-lg p-3 flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <span className="text-2xl">{product.emoji}</span>
                    )}
                    <span className="text-white font-medium">{product.name}</span>
                  </div>
                  <span className="text-green-400 font-semibold">€{product.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setSelectedPerson(null)} className="glass-effect px-4 py-2 rounded-lg text-white">Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HabitPage = () => {
  // All available habits
  const [allHabits, setAllHabits] = useState(() => {
    const saved = localStorage.getItem('habit-tracker-all-habits');
    const defaultHabits = [
      { id: 1, title: 'Morning Exercise', emoji: '🏃', color: 'from-pink-500 to-purple-500', time: '07:00', recurrence: 'daily' },
      { id: 2, title: 'Read 30 Minutes', emoji: '📚', color: 'from-purple-500 to-pink-500', time: '09:00', recurrence: 'daily' },
      { id: 3, title: 'Meditation', emoji: '🧘', color: 'from-green-500 to-emerald-500', time: '12:00', recurrence: 'daily' },
      { id: 4, title: 'Drink Water', emoji: '💧', color: 'from-blue-500 to-indigo-500', time: '14:00', recurrence: 'daily' },
      { id: 5, title: 'Healthy Meal', emoji: '🥗', color: 'from-orange-500 to-red-500', time: '18:00', recurrence: 'every3days' },
      { id: 6, title: 'Learn Something New', emoji: '🎓', color: 'from-indigo-500 to-purple-500', time: '20:00', recurrence: 'every3days' },
      { id: 7, title: 'Ademtechniek', emoji: '🌬️', color: 'from-cyan-500 to-blue-500', time: '10:00', recurrence: 'daily', isBreathingExercise: true },
    ];
    
    if (saved) {
      const existingHabits = JSON.parse(saved);
      // Check if breathing exercise already exists
      const hasBreathingExercise = existingHabits.some(h => h.isBreathingExercise || h.id === 7);
      
      if (!hasBreathingExercise) {
        // Add breathing exercise to existing habits
        const breathingExercise = { id: 7, title: 'Ademtechniek', emoji: '🌬️', color: 'from-cyan-500 to-blue-500', time: '10:00', recurrence: 'daily', isBreathingExercise: true };
        return [...existingHabits, breathingExercise];
      }
      return existingHabits;
    }
    
    return defaultHabits;
  });

  // Habits assigned per day
  const [dailyHabits, setDailyHabits] = useState(() => {
    const saved = localStorage.getItem('habit-tracker-daily-habits');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [completionData, setCompletionData] = useState(() => {
    const saved = localStorage.getItem('habit-tracker-completion');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSelectHabitsModal, setShowSelectHabitsModal] = useState(false);
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  
  // Breathing exercise timer states
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('inhale'); // 'inhale' or 'exhale'
  const [breathingTimer, setBreathingTimer] = useState(4);
  const [breathingCycle, setBreathingCycle] = useState(1);
  const [newHabit, setNewHabit] = useState({
    title: '',
    emoji: '✨',
    color: 'from-pink-500 to-purple-500',
    time: '09:00',
    recurrence: 'daily'
  });

  const selectedDateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
  const selectedDayHabitIds = dailyHabits[selectedDateKey] || [];
  const habits = allHabits.filter(h => selectedDayHabitIds.includes(h.id));
  const completedHabitIds = completionData[selectedDateKey] || [];
  
  // Filter completed habits to only include those that are actually assigned for today
  const completedHabits = completedHabitIds.filter(id => selectedDayHabitIds.includes(id));

  // Breathing exercise timer effect
  useEffect(() => {
    if (!breathingActive) return;

    const interval = setInterval(() => {
      setBreathingTimer(prev => {
        if (prev > 1) {
          return prev - 1;
        } else {
          // Switch phase
          if (breathingPhase === 'inhale') {
            setBreathingPhase('exhale');
            return 6; // Exhale for 6 seconds
          } else {
            // Completed one cycle
            if (breathingCycle >= 10) {
              // Finished all 10 cycles
              setBreathingActive(false);
              return 0;
            } else {
              setBreathingCycle(prev => prev + 1);
              setBreathingPhase('inhale');
              return 4; // Inhale for 4 seconds
            }
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breathingActive, breathingPhase, breathingCycle]);

  const startBreathingExercise = () => {
    setBreathingActive(true);
    setBreathingPhase('inhale');
    setBreathingTimer(4);
    setBreathingCycle(1);
  };

  const pauseBreathingExercise = () => {
    setBreathingActive(false);
  };

  const resetBreathingExercise = () => {
    setBreathingActive(false);
    setBreathingPhase('inhale');
    setBreathingTimer(4);
    setBreathingCycle(1);
  };

  const selectDay = (day) => {
    if (!day) return;
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  useEffect(() => {
    localStorage.setItem('habit-tracker-all-habits', JSON.stringify(allHabits));
  }, [allHabits]);

  useEffect(() => {
    localStorage.setItem('habit-tracker-daily-habits', JSON.stringify(dailyHabits));
  }, [dailyHabits]);

  useEffect(() => {
    localStorage.setItem('habit-tracker-completion', JSON.stringify(completionData));
    // Notify other components after localStorage is updated
    window.dispatchEvent(new CustomEvent('habitUpdated'));
  }, [completionData]);

  // Auto-assign habits based on recurrence pattern for selected date
  useEffect(() => {
    const assignRecurringHabits = () => {
      const dateKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
      
      // Only auto-assign if this day hasn't been manually configured yet
      if (dailyHabits[dateKey]) {
        return; // Day already has habits assigned, don't override
      }
      
      const habitsForDay = [];
      
      // Reference date for every3days calculation (Jan 1, 2024)
      const referenceDate = new Date(2024, 0, 1);
      const daysSinceReference = Math.floor((selectedDate - referenceDate) / (1000 * 60 * 60 * 24));
      
      allHabits.forEach(habit => {
        if (habit.recurrence === 'daily') {
          habitsForDay.push(habit.id);
        } else if (habit.recurrence === 'every3days') {
          // Check if this day is a day for this habit (every 3 days from reference)
          if (daysSinceReference % 3 === 0) {
            habitsForDay.push(habit.id);
          }
        }
        // Note: 'once' habits are handled separately - they don't auto-assign
      });
      
      // Only set if there are habits to assign
      if (habitsForDay.length > 0) {
        setDailyHabits(prev => ({
          ...prev,
          [dateKey]: habitsForDay
        }));
      }
    };
    
    assignRecurringHabits();
  }, [allHabits, selectedDate, dailyHabits]);

  const toggleHabitForDay = (habitId) => {
    setDailyHabits(prev => {
      const newData = { ...prev };
      const dayHabits = newData[selectedDateKey] || [];
      
      if (dayHabits.includes(habitId)) {
        newData[selectedDateKey] = dayHabits.filter(id => id !== habitId);
      } else {
        newData[selectedDateKey] = [...dayHabits, habitId];
      }
      
      return newData;
    });
  };

  const toggleHabit = (habitId) => {
    // Check if this is a breathing exercise
    const habit = allHabits.find(h => h.id === habitId);
    if (habit && habit.isBreathingExercise) {
      setShowBreathingModal(true);
      return;
    }

    setCompletionData(prev => {
      const newData = { ...prev };
      const dayHabits = newData[selectedDateKey] || [];
      
      if (dayHabits.includes(habitId)) {
        newData[selectedDateKey] = dayHabits.filter(id => id !== habitId);
      } else {
        newData[selectedDateKey] = [...dayHabits, habitId];
      }
      
      return newData;
    });
  };

  const progressPercentage = habits.length > 0 ? (completedHabits.length / habits.length) * 100 : 0;

  const addHabit = () => {
    if (!newHabit.title) return;
    const habit = {
      ...newHabit,
      id: Date.now()
    };
    setAllHabits([...allHabits, habit]);
    setNewHabit({ title: '', emoji: '✨', color: 'from-pink-500 to-purple-500', time: '09:00', recurrence: 'daily' });
    setShowAddModal(false);
  };

  const updateHabit = () => {
    if (!editingHabit) return;
    setAllHabits(allHabits.map(h => h.id === editingHabit.id ? editingHabit : h));
    setEditingHabit(null);
    setShowEditModal(false);
  };

  const deleteHabit = (habitId) => {
    if (!window.confirm('Deze habit verwijderen?')) return;
    setAllHabits(allHabits.filter(h => h.id !== habitId));
    // Also remove from all daily assignments
    const newDailyHabits = { ...dailyHabits };
    Object.keys(newDailyHabits).forEach(key => {
      newDailyHabits[key] = newDailyHabits[key].filter(id => id !== habitId);
    });
    setDailyHabits(newDailyHabits);
  };

  const changeMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getDayColor = (day) => {
    if (!day) return '';
    const dayKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
    const assignedHabits = dailyHabits[dayKey] || [];
    const completedHabits = completionData[dayKey] || [];
    
    // Check if 100% of ASSIGNED habits are completed
    if (assignedHabits.length > 0 && completedHabits.length === assignedHabits.length) {
      return 'bg-green-500/50 border-green-500';
    } else if (completedHabits.length > 0) {
      return 'bg-orange-500/30 border-orange-500/50';
    } else if (day < currentDate.getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()) {
      return 'bg-red-500/30 border-red-500/50';
    }
    return '';
  };

  // Format current date
  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('nl-NL', options);
  };

  // Get days in current month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  const monthDays = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
  const today = currentDate.getDate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Habit Tracker</h1>
        <p className="text-white/70">{formatDate(selectedDate)}</p>
      </div>

      {/* Progress Bar */}
      <div className="gradient-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-lg">Today's Progress</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSelectHabitsModal(true)}
              className="glass-effect px-3 py-1.5 rounded-lg text-white text-sm hover:bg-white/20 transition-colors"
            >
              Select Habits for This Day
            </button>
            <span className="text-white/70 text-sm">{completedHabits.length} / {habits.length} completed</span>
          </div>
        </div>
        <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 rounded-full flex items-center justify-end pr-2"
            style={{ width: `${progressPercentage}%` }}
          >
            {progressPercentage > 10 && (
              <span className="text-white text-xs font-semibold">{Math.round(progressPercentage)}%</span>
            )}
          </div>
        </div>
      </div>

      {/* Month Calendar and Habit Cards - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month Calendar */}
        <div className="gradient-card rounded-xl p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="glass-effect p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              ←
            </button>
            <h2 className="text-white font-semibold text-lg capitalize">{monthName}</h2>
            <button
              onClick={() => changeMonth(1)}
              className="glass-effect p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'].map((day) => (
              <div key={day} className="text-center text-white/50 text-sm font-semibold py-2">
                {day}
              </div>
            ))}
            {/* Calendar days */}
            {monthDays.map((day, index) => {
              const dayColor = getDayColor(day);
              const isToday = day === today && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
              const isSelected = day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth() && currentDate.getFullYear() === selectedDate.getFullYear();
              return (
                <div
                  key={index}
                  onClick={() => selectDay(day)}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-all border cursor-pointer ${
                    day === null
                      ? 'invisible'
                      : isSelected
                      ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold shadow-lg border-pink-400 ring-2 ring-pink-300'
                      : isToday
                      ? 'bg-blue-500/20 text-white font-bold border-blue-400'
                      : dayColor
                      ? `${dayColor} text-white font-semibold border`
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border-white/10'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Habit Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add Habit Card */}
          <div
            onClick={() => setShowAddModal(true)}
            className="gradient-card rounded-xl p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer group relative overflow-hidden border-2 border-dashed border-white/30"
          >
            <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[150px]">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-3xl mb-3">
                +
              </div>
              <h3 className="text-white font-semibold">Add New Habit</h3>
            </div>
          </div>

          {habits.map((habit) => {
            const isCompleted = completedHabits.includes(habit.id);
            return (
              <div
                key={habit.id}
                className={`gradient-card rounded-xl p-6 hover:bg-white/10 transition-all duration-200 group relative overflow-hidden ${
                  isCompleted ? 'ring-2 ring-green-500/50' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${habit.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                
                {/* Edit/Delete buttons */}
                <div className="absolute top-3 right-3 z-20 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingHabit(habit); setShowEditModal(true); }}
                    className="glass-effect p-2 rounded-lg text-white hover:bg-white/30"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                    className="glass-effect p-2 rounded-lg text-red-400 hover:bg-red-500/20"
                  >
                    🗑️
                  </button>
                </div>

                <div className="relative z-10" onClick={() => toggleHabit(habit.id)}>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${habit.color} flex items-center justify-center text-2xl shadow-lg`}>
                      {habit.emoji}
                    </div>
                    <h3 className={`font-semibold text-lg ${isCompleted ? 'text-white/70 line-through' : 'text-white'}`}>
                      {habit.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-white/60 text-sm">Today</span>
                    <button 
                      className={`px-4 py-2 rounded-lg text-white text-sm transition-colors ${
                        isCompleted 
                          ? 'bg-green-500/20 border border-green-500/30' 
                          : 'glass-effect hover:bg-white/20'
                      }`}
                    >
                      {isCompleted ? '✓ Completed' : 'Mark Complete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Default Habits Management Section */}
      <div className="gradient-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold text-lg">Standaard Habits</h2>
            <p className="text-white/60 text-sm">Deze habits verschijnen automatisch elke dag</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2 rounded-lg text-white text-sm flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nieuwe Habit</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {allHabits.map((habit) => {
            const isDefault = habit.recurrence === 'daily';
            return (
              <div
                key={habit.id}
                className={`gradient-card rounded-lg p-4 group relative overflow-hidden ${
                  isDefault ? 'ring-2 ring-blue-500/50' : 'opacity-60'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${habit.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${habit.color} flex items-center justify-center text-lg`}>
                      {habit.emoji}
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingHabit(habit); setShowEditModal(true); }}
                        className="glass-effect p-1.5 rounded text-white hover:bg-white/30"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                        className="glass-effect p-1.5 rounded text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">{habit.title}</h3>
                  <p className="text-white/60 text-xs">
                    {habit.recurrence === 'daily' ? '📅 Elke dag' : 
                     habit.recurrence === 'every3days' ? '🔄 Om de 3 dagen' : 
                     '📅 Enkele dag'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">Add New Habit</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Title</label>
                <input
                  value={newHabit.title}
                  onChange={(e) => setNewHabit({...newHabit, title: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="e.g., Morning Run"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Emoji</label>
                <input
                  value={newHabit.emoji}
                  onChange={(e) => setNewHabit({...newHabit, emoji: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="e.g., 🏃"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Color</label>
                <select
                  value={newHabit.color}
                  onChange={(e) => setNewHabit({...newHabit, color: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                >
                  <option value="from-pink-500 to-purple-500">Pink-Purple</option>
                  <option value="from-purple-500 to-pink-500">Purple-Pink</option>
                  <option value="from-green-500 to-emerald-500">Green</option>
                  <option value="from-orange-500 to-red-500">Orange</option>
                  <option value="from-indigo-500 to-purple-500">Indigo</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Herhaling</label>
                <select
                  value={newHabit.recurrence}
                  onChange={(e) => setNewHabit({...newHabit, recurrence: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                >
                  <option value="daily">Elke dag</option>
                  <option value="every3days">Om de 3 dagen</option>
                  <option value="once">Enkele dag</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setShowAddModal(false)} className="glass-effect px-4 py-2 rounded-lg text-white">Cancel</button>
                <button onClick={addHabit} className="btn-primary px-4 py-2 rounded-lg text-white">Add Habit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Habit Modal */}
      {showEditModal && editingHabit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">Edit Habit</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Title</label>
                <input
                  value={editingHabit.title}
                  onChange={(e) => setEditingHabit({...editingHabit, title: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Emoji</label>
                <input
                  value={editingHabit.emoji}
                  onChange={(e) => setEditingHabit({...editingHabit, emoji: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Color</label>
                <select
                  value={editingHabit.color}
                  onChange={(e) => setEditingHabit({...editingHabit, color: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                >
                  <option value="from-pink-500 to-purple-500">Pink-Purple</option>
                  <option value="from-purple-500 to-pink-500">Purple-Pink</option>
                  <option value="from-green-500 to-emerald-500">Green</option>
                  <option value="from-orange-500 to-red-500">Orange</option>
                  <option value="from-indigo-500 to-purple-500">Indigo</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Herhaling</label>
                <select
                  value={editingHabit.recurrence || 'daily'}
                  onChange={(e) => setEditingHabit({...editingHabit, recurrence: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                >
                  <option value="daily">Elke dag</option>
                  <option value="every3days">Om de 3 dagen</option>
                  <option value="once">Enkele dag</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => { setShowEditModal(false); setEditingHabit(null); }} className="glass-effect px-4 py-2 rounded-lg text-white">Cancel</button>
                <button onClick={updateHabit} className="btn-primary px-4 py-2 rounded-lg text-white">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Select Habits for Day Modal */}
      {showSelectHabitsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-white text-xl font-semibold mb-4">Select Habits for {formatDate(selectedDate)}</h2>
            <p className="text-white/70 text-sm mb-4">Choose which habits you want to track for this day</p>
            
            {/* Quick Add Suggested Habits */}
            <div className="mb-6">
              <h3 className="text-white font-semibold text-sm mb-3">Quick Add Suggested Habits</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const defaultIds = [1, 2, 3, 4, 5, 6];
                    const existingIds = allHabits.filter(h => defaultIds.includes(h.id)).map(h => h.id);
                    setDailyHabits(prev => ({
                      ...prev,
                      [selectedDateKey]: [...new Set([...selectedDayHabitIds, ...existingIds])]
                    }));
                  }}
                  className="glass-effect px-3 py-2 rounded-lg text-white text-sm hover:bg-white/20 transition-colors"
                >
                  ➕ Add All Default Habits
                </button>
                <button
                  onClick={() => {
                    const morningIds = allHabits.filter(h => 
                      h.title.includes('Exercise') || h.title.includes('Meditation')
                    ).map(h => h.id);
                    setDailyHabits(prev => ({
                      ...prev,
                      [selectedDateKey]: [...new Set([...selectedDayHabitIds, ...morningIds])]
                    }));
                  }}
                  className="glass-effect px-3 py-2 rounded-lg text-white text-sm hover:bg-white/20 transition-colors"
                >
                  🌅 Morning Routine
                </button>
                <button
                  onClick={() => {
                    const eveningIds = allHabits.filter(h => 
                      h.title.includes('Read') || h.title.includes('Learn')
                    ).map(h => h.id);
                    setDailyHabits(prev => ({
                      ...prev,
                      [selectedDateKey]: [...new Set([...selectedDayHabitIds, ...eveningIds])]
                    }));
                  }}
                  className="glass-effect px-3 py-2 rounded-lg text-white text-sm hover:bg-white/20 transition-colors"
                >
                  🌙 Evening Routine
                </button>
                <button
                  onClick={() => {
                    setDailyHabits(prev => ({
                      ...prev,
                      [selectedDateKey]: []
                    }));
                  }}
                  className="glass-effect px-3 py-2 rounded-lg text-red-400 text-sm hover:bg-red-500/20 transition-colors"
                >
                  🗑️ Clear All
                </button>
              </div>
            </div>

            {/* All Habits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {allHabits.map((habit) => {
                const isSelected = selectedDayHabitIds.includes(habit.id);
                return (
                  <div
                    key={habit.id}
                    onClick={() => toggleHabitForDay(habit.id)}
                    className={`gradient-card rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-green-500 bg-green-500/20' : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${habit.color} flex items-center justify-center text-xl`}>
                        {habit.emoji}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{habit.title}</h3>
                        <p className="text-white/60 text-xs mt-1">
                          {habit.recurrence === 'daily' ? '📅 Elke dag' : 
                           habit.recurrence === 'every3days' ? '🔄 Om de 3 dagen' : 
                           '📅 Enkele dag'}
                        </p>
                        <span className="text-white/50 text-xs">{habit.time}</span>
                      </div>
                      {isSelected && (
                        <div className="text-green-400 text-xl">✓</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowSelectHabitsModal(false)} className="btn-primary px-4 py-2 rounded-lg text-white">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Breathing Exercise Modal */}
      {showBreathingModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-8 w-full max-w-lg">
            <div className="text-center">
              <div className="text-6xl mb-4">🌬️</div>
              <h2 className="text-white text-2xl font-semibold mb-6">Ademtechniek</h2>
              
              {/* Timer Display */}
              <div className="mb-8">
                <div className={`w-48 h-48 mx-auto rounded-full flex items-center justify-center mb-4 transition-all duration-1000 ${
                  breathingPhase === 'inhale' 
                    ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 scale-110' 
                    : 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 scale-90'
                }`}>
                  <div className="text-center">
                    <div className="text-7xl font-bold text-white mb-2">{breathingTimer}</div>
                    <div className="text-white/80 text-sm">seconden</div>
                  </div>
                </div>
                
                <div className="text-2xl font-semibold text-white mb-2">
                  {breathingPhase === 'inhale' ? '🌬️ Adem IN' : '💨 Adem UIT'}
                </div>
                <div className="text-white/60 text-sm mb-4">
                  {breathingPhase === 'inhale' ? 'Door je neus' : 'Door je mond'}
                </div>
                
                <div className="text-white/80 text-lg">
                  Cyclus {breathingCycle} / 10
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-3 mb-6">
                {!breathingActive ? (
                  <button 
                    onClick={startBreathingExercise}
                    className="btn-primary px-8 py-3 rounded-lg text-white text-lg font-medium"
                  >
                    ▶️ Start
                  </button>
                ) : (
                  <button 
                    onClick={pauseBreathingExercise}
                    className="glass-effect px-8 py-3 rounded-lg text-white text-lg font-medium hover:bg-white/20 transition-colors"
                  >
                    ⏸️ Pauze
                  </button>
                )}
                <button 
                  onClick={resetBreathingExercise}
                  className="glass-effect px-6 py-3 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  🔄 Reset
                </button>
              </div>

              {/* Instructions */}
              <div className="glass-effect rounded-lg p-4 mb-6 text-left">
                <div className="text-white/60 text-sm space-y-1">
                  <p>• Adem 4 seconden in door je neus</p>
                  <p>• Adem 6 seconden uit door je mond</p>
                  <p>• Herhaal 10 keer</p>
                </div>
              </div>

              {/* Close/Complete buttons */}
              <div className="flex justify-center space-x-3">
                <button 
                  onClick={() => {
                    setShowBreathingModal(false);
                    resetBreathingExercise();
                  }} 
                  className="glass-effect px-6 py-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  Sluiten
                </button>
                <button 
                  onClick={() => {
                    setShowBreathingModal(false);
                    resetBreathingExercise();
                    // Mark breathing exercise as complete
                    setCompletionData(prev => {
                      const newData = { ...prev };
                      const dayHabits = newData[selectedDateKey] || [];
                      if (!dayHabits.includes(7)) {
                        newData[selectedDateKey] = [...dayHabits, 7];
                      }
                      return newData;
                    });
                  }} 
                  className="btn-primary px-6 py-2 rounded-lg text-white"
                  disabled={breathingCycle < 10 && breathingActive}
                >
                  ✓ Voltooid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  // Load login state from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('guin_ai_logged_in');
    return saved === 'true';
  });
  
  // Load active tab from localStorage
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('guin_ai_active_tab');
    return saved || 'home';
  });
  
  // Load selected project from localStorage
  const [selectedProject, setSelectedProject] = useState(() => {
    const saved = localStorage.getItem('guin_ai_selected_project');
    return saved ? parseInt(saved) : null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChatbot, setShowChatbot] = useState(true);
  const [chatbotMinimized, setChatbotMinimized] = useState(true);

  // Save login state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('guin_ai_logged_in', isLoggedIn.toString());
  }, [isLoggedIn]);
  
  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('guin_ai_active_tab', activeTab);
  }, [activeTab]);
  
  // Save selected project to localStorage whenever it changes
  useEffect(() => {
    if (selectedProject !== null) {
      localStorage.setItem('guin_ai_selected_project', selectedProject.toString());
    } else {
      localStorage.removeItem('guin_ai_selected_project');
    }
  }, [selectedProject]);

  // Clear old localStorage items on mount
  useEffect(() => {
    localStorage.removeItem('shopify-dashboard-menu-order');
    localStorage.removeItem('shopify-dashboard-other-menu-order');
  }, []);

  // Listen for project selection events from sidebar
  useEffect(() => {
    const handleSelectProject = (event) => {
      setSelectedProject(event.detail.projectId);
    };

    window.addEventListener('selectProject', handleSelectProject);
    
    return () => {
      window.removeEventListener('selectProject', handleSelectProject);
    };
  }, []);

  // Listen for platform change events and navigate to home
  useEffect(() => {
    const handlePlatformChange = (event) => {
      setActiveTab('home');
    };

    window.addEventListener('platformChanged', handlePlatformChange);
    
    return () => {
      window.removeEventListener('platformChanged', handlePlatformChange);
    };
  }, []);

  // Clear selected project when switching tabs (except to projecten tab)
  useEffect(() => {
    if (activeTab !== 'projecten') {
      setSelectedProject(null);
    }
  }, [activeTab]);

  const renderContent = () => {
    // Show project detail if a project is selected
    if (selectedProject) {
      return <ProjectDetailPage 
        projectId={selectedProject} 
        setActiveTab={setActiveTab} 
        setSelectedProject={setSelectedProject} 
      />;
    }

    // Check if it's a custom sales tab
    if (activeTab.startsWith('sales-') && !['sales-calculator', 'sales-royal-talens', 'sales-dremababy'].includes(activeTab)) {
      const customClients = JSON.parse(localStorage.getItem('custom-sales-clients') || '[]');
      const client = customClients.find(c => c.tabId === activeTab);
      if (client) {
        return <CustomSalesPage clientName={client.name} tabId={client.tabId} />;
      }
    }


    switch (activeTab) {
      case 'home':
        // Check platform to show correct home page
        const selectedPlatform = localStorage.getItem('selected-platform') || 'Privé';
        if (selectedPlatform === 'Privé') {
          return <PriveHomePage setActiveTab={setActiveTab} />;
        }
        return <HomePage setActiveTab={setActiveTab} />;
      case 'sales':
        return <SalesOverviewPage setActiveTab={setActiveTab} />;
      case 'sales-calculator':
        return <SalesPage />;
      case 'sales-royal-talens':
        return <RoyalTalensSalesPage />;
      case 'sales-dremababy':
        return <DremababySalesPage />;
      case 'projecten':
        return <ProjectsPage setSelectedProject={setSelectedProject} setActiveTab={setActiveTab} />;
      case 'ideacenter':
        return <IdeaCenterPage />;
      case 'settings':
        return <SettingsPage />;
      case 'quiz':
        return <QuizPage />;
      case 'prospects':
        return <ProspectsPage />;
      case 'stoktelling':
        return <StoktelllingPage />;
      case 'seo':
        return <AICenterPage />;
      case 'habit':
        return <HabitPage />;
      case 'aquarium':
        return <AquariumPage />;
      case 'auto':
        return <AutoPage />;
      case 'jerky':
        return <JerkyPage />;
      case 'crabcave':
        return <CrabCavePage />;
      case 'cavedarts':
        return <CaveDartsPage />;
      case '2do':
        return <TwoDoPage />;
      case 'beleggen':
        return <BeleggenPage />;
      case 'waardebonnen':
        return <WaardebonnenPage />;
      case 'reizen':
        return <ReizenPage />;
      case 'wandelingen':
        return <WandelingenPage />;
      case 'google-home':
        return <GoogleHomePage />;
      case 'festivals':
        return <FestivalsPage />;
      case 'koken':
        return <KokenPage />;
      case 'kosten':
        return <CostsPage />;
      case 'inspiration-center':
        return <InspirationCenterPage />;
      case 'branding':
        return <BrandingPage setActiveTab={setActiveTab} />;
      case 'branding-meteor':
        return <BrandingResourcesPage mode="meteor" />;
      case 'branding-templates':
        return <BrandingResourcesPage mode="templates" />;
      default:
        return <HomePage setActiveTab={setActiveTab} />;
    }
  };

  // Check if user is on password reset page
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const isPasswordReset = hashParams.get('type') === 'recovery';

  if (isPasswordReset) {
    return <ResetPasswordPage />;
  }

  if (!isLoggedIn) {
    return <LoginPage setIsLoggedIn={setIsLoggedIn} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-dark">
      {/* AI Chatbot */}
      {showChatbot && (
        <AIChatbot 
          onClose={() => setShowChatbot(false)}
          isMinimized={chatbotMinimized}
          setIsMinimized={setChatbotMinimized}
        />
      )}
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-colors"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex h-full">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Header setIsLoggedIn={setIsLoggedIn} setActiveTab={setActiveTab} setShowChatbot={setShowChatbot} setChatbotMinimized={setChatbotMinimized} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
