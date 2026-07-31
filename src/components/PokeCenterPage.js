import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, X, TrendingUp, TrendingDown, Scan, Upload, Trash2, Edit, DollarSign, Calendar, Tag } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const PokeCenterPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [scanning, setScanning] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    type: 'card',
    purchase_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    currency: 'EUR',
    condition: 'near_mint',
    set_name: '',
    card_number: '',
    rarity: '',
    language: 'en'
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await db.pokemonCollection.getAll();
      setItems(data);
    } catch (error) {
      console.error('Error loading Pokémon collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Store file for upload
    setNewItem({ ...newItem, imageFile: file });
  };

  const handleSubmit = async () => {
    try {
      setUploadingImage(true);
      
      let imageUrl = editingItem?.image_url || null;
      
      // Upload image if selected
      if (newItem.imageFile) {
        imageUrl = await db.pokemonCollection.uploadImage(
          newItem.imageFile,
          editingItem?.id
        );
      }

      const itemData = {
        title: newItem.title,
        description: newItem.description,
        type: newItem.type,
        purchase_price: parseFloat(newItem.purchase_price) || null,
        purchase_date: newItem.purchase_date || null,
        currency: newItem.currency,
        condition: newItem.condition,
        set_name: newItem.set_name || null,
        card_number: newItem.card_number || null,
        rarity: newItem.rarity || null,
        language: newItem.language,
        image_url: imageUrl
      };

      if (editingItem) {
        await db.pokemonCollection.update(editingItem.id, itemData);
      } else {
        await db.pokemonCollection.create(itemData);
      }

      await loadItems();
      closeModal();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Fout bij opslaan: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet je zeker dat je dit item wilt verwijderen?')) return;
    
    try {
      await db.pokemonCollection.delete(id);
      await loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Fout bij verwijderen: ' + error.message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItem({
      title: item.title || '',
      description: item.description || '',
      type: item.type || 'card',
      purchase_price: item.purchase_price || '',
      purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
      currency: item.currency || 'EUR',
      condition: item.condition || 'near_mint',
      set_name: item.set_name || '',
      card_number: item.card_number || '',
      rarity: item.rarity || '',
      language: item.language || 'en'
    });
    setImagePreview(item.image_url);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setImagePreview(null);
    setNewItem({
      title: '',
      description: '',
      type: 'card',
      purchase_price: '',
      purchase_date: new Date().toISOString().split('T')[0],
      currency: 'EUR',
      condition: 'near_mint',
      set_name: '',
      card_number: '',
      rarity: '',
      language: 'en'
    });
  };

  const scanWithAI = async (item) => {
    setScanning(item.id);
    try {
      // Call AI API to estimate value
      const response = await fetch('/api/pokemon-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          set_name: item.set_name,
          card_number: item.card_number,
          condition: item.condition,
          image_url: item.image_url
        })
      });

      if (!response.ok) throw new Error('AI scan failed');
      
      const result = await response.json();
      
      // Update item with AI results
      await db.pokemonCollection.update(item.id, {
        ai_estimated_value: result.estimated_value,
        ai_confidence_score: result.confidence,
        ai_scan_notes: result.notes,
        current_value: result.estimated_value,
        last_scanned_at: new Date().toISOString()
      });

      await loadItems();
      alert(`AI Scan voltooid!\nGeschatte waarde: €${result.estimated_value}\nBetrouwbaarheid: ${(result.confidence * 100).toFixed(0)}%`);
    } catch (error) {
      console.error('Error scanning with AI:', error);
      alert('AI scan mislukt. Probeer het later opnieuw.');
    } finally {
      setScanning(null);
    }
  };

  // Calculate statistics
  const stats = {
    totalItems: items.length,
    totalInvested: items.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0),
    totalValue: items.reduce((sum, item) => sum + (parseFloat(item.current_value || item.purchase_price) || 0), 0),
  };
  stats.profitLoss = stats.totalValue - stats.totalInvested;
  stats.profitLossPercent = stats.totalInvested > 0 ? (stats.profitLoss / stats.totalInvested) * 100 : 0;

  const typeLabels = {
    card: '🃏 Kaart',
    booster: '📦 Booster',
    sealed: '🎁 Sealed Product',
    other: '⭐ Overig'
  };

  const conditionLabels = {
    mint: 'Mint',
    near_mint: 'Near Mint',
    excellent: 'Excellent',
    good: 'Good',
    played: 'Played',
    poor: 'Poor'
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            Poké Center
          </h1>
          <p className="text-white/60">Jouw Pokémon kaarten collectie met AI waarde scanning</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all"
        >
          <Plus className="w-5 h-5" />
          Item Toevoegen
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Totaal Items</span>
            <Tag className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-white text-2xl font-bold">{stats.totalItems}</div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Geïnvesteerd</span>
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-white text-2xl font-bold">€{stats.totalInvested.toFixed(2)}</div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Huidige Waarde</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-white text-2xl font-bold">€{stats.totalValue.toFixed(2)}</div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Winst/Verlies</span>
            {stats.profitLoss >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className={`text-2xl font-bold ${stats.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            €{stats.profitLoss.toFixed(2)}
            <span className="text-sm ml-2">({stats.profitLossPercent.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="text-white/60 text-center py-12">Laden...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">Nog geen items toegevoegd</p>
          <p className="text-white/40 text-sm mt-2">Klik op "Item Toevoegen" om te beginnen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all group"
            >
              {/* Image */}
              <div className="relative aspect-[3/4] bg-gradient-to-br from-purple-900/20 to-blue-900/20">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="w-16 h-16 text-white/20" />
                  </div>
                )}
                
                {/* Action buttons overlay */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 bg-blue-500/80 backdrop-blur-sm rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-red-500/80 backdrop-blur-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-white text-xs">
                    {typeLabels[item.type] || item.type}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-white font-semibold mb-1 truncate">{item.title}</h3>
                {item.set_name && (
                  <p className="text-white/60 text-sm mb-2">{item.set_name}</p>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white/40 text-xs">Aankoopprijs</div>
                    <div className="text-white font-medium">
                      €{parseFloat(item.purchase_price || 0).toFixed(2)}
                    </div>
                  </div>
                  {item.current_value && (
                    <div className="text-right">
                      <div className="text-white/40 text-xs">Huidige waarde</div>
                      <div className="text-green-400 font-medium">
                        €{parseFloat(item.current_value).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Scan button */}
                <button
                  onClick={() => scanWithAI(item)}
                  disabled={scanning === item.id}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg hover:from-purple-500/30 hover:to-pink-500/30 transition-all disabled:opacity-50"
                >
                  <Scan className={`w-4 h-4 text-purple-400 ${scanning === item.id ? 'animate-spin' : ''}`} />
                  <span className="text-white text-sm">
                    {scanning === item.id ? 'Scannen...' : 'AI Waarde Scan'}
                  </span>
                </button>

                {item.last_scanned_at && (
                  <div className="mt-2 text-white/40 text-xs text-center">
                    Laatst gescand: {new Date(item.last_scanned_at).toLocaleDateString('nl-NL')}
                    {item.ai_confidence_score && (
                      <span className="ml-2">
                        ({(item.ai_confidence_score * 100).toFixed(0)}% betrouwbaar)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-2xl font-bold">
                  {editingItem ? 'Item Bewerken' : 'Nieuw Item Toevoegen'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-white/70 text-sm mb-2">Foto</label>
                  <div className="flex gap-4">
                    {imagePreview && (
                      <div className="w-32 h-32 rounded-lg overflow-hidden border border-white/10">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-lg p-4 cursor-pointer hover:border-white/40 transition-colors">
                      <Upload className="w-8 h-8 text-white/40 mb-2" />
                      <span className="text-white/60 text-sm">Klik om foto te uploaden</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-white/70 text-sm mb-1">Titel *</label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                    placeholder="bijv. Charizard VMAX"
                  />
                </div>

                {/* Type & Condition */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Type</label>
                    <select
                      value={newItem.type}
                      onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="card">Kaart</option>
                      <option value="booster">Booster</option>
                      <option value="sealed">Sealed Product</option>
                      <option value="other">Overig</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Conditie</label>
                    <select
                      value={newItem.condition}
                      onChange={(e) => setNewItem({ ...newItem, condition: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                    >
                      {Object.entries(conditionLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Set & Card Number */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Set</label>
                    <input
                      type="text"
                      value={newItem.set_name}
                      onChange={(e) => setNewItem({ ...newItem, set_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                      placeholder="bijv. Brilliant Stars"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Kaartnummer</label>
                    <input
                      type="text"
                      value={newItem.card_number}
                      onChange={(e) => setNewItem({ ...newItem, card_number: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                      placeholder="bijv. 154/172"
                    />
                  </div>
                </div>

                {/* Rarity & Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Rarity</label>
                    <input
                      type="text"
                      value={newItem.rarity}
                      onChange={(e) => setNewItem({ ...newItem, rarity: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                      placeholder="bijv. Ultra Rare"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Taal</label>
                    <select
                      value={newItem.language}
                      onChange={(e) => setNewItem({ ...newItem, language: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="en">Engels</option>
                      <option value="nl">Nederlands</option>
                      <option value="de">Duits</option>
                      <option value="fr">Frans</option>
                      <option value="ja">Japans</option>
                    </select>
                  </div>
                </div>

                {/* Purchase Price & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Aankoopprijs (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.purchase_price}
                      onChange={(e) => setNewItem({ ...newItem, purchase_price: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-1">Aankoopdatum</label>
                    <input
                      type="date"
                      value={newItem.purchase_date}
                      onChange={(e) => setNewItem({ ...newItem, purchase_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-white/70 text-sm mb-1">Beschrijving</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/50 h-24 resize-none"
                    placeholder="Extra notities..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!newItem.title || uploadingImage}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingImage ? 'Uploaden...' : editingItem ? 'Opslaan' : 'Toevoegen'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokeCenterPage;
