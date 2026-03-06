import React, { useState, useEffect } from 'react';
import { Gift, Copy, Check, AlertCircle, Trash2, Plus, Info, Edit, RotateCcw } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const WaardebonnenPage = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [newVoucher, setNewVoucher] = useState({
    brand: '',
    code: '',
    description: '',
    expiry_date: ''
  });

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    try {
      const data = await db.vouchers.getAll();
      setVouchers(data || []);
    } catch (error) {
      console.error('Error loading vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAddVoucher = async () => {
    if (!newVoucher.brand || !newVoucher.code) {
      alert('Merk en code zijn verplicht');
      return;
    }

    try {
      await db.vouchers.create(newVoucher);
      await loadVouchers();
      setShowAddModal(false);
      setNewVoucher({ brand: '', code: '', description: '', expiry_date: '' });
    } catch (error) {
      console.error('Error adding voucher:', error);
      alert('Fout bij toevoegen waardebon');
    }
  };

  const handleRedeemVoucher = async (id) => {
    try {
      await db.vouchers.update(id, { redeemed: true, redeemed_at: new Date().toISOString() });
      await loadVouchers();
    } catch (error) {
      console.error('Error redeeming voucher:', error);
      alert('Fout bij inwisselen waardebon');
    }
  };

  const handleUndoRedeem = async (id) => {
    try {
      await db.vouchers.update(id, { redeemed: false, redeemed_at: null });
      await loadVouchers();
    } catch (error) {
      console.error('Error undoing redeem:', error);
      alert('Fout bij terugdraaien');
    }
  };

  const handleEditVoucher = (voucher) => {
    setEditingVoucher({
      id: voucher.id,
      brand: voucher.brand,
      code: voucher.code,
      description: voucher.description || '',
      expiry_date: voucher.expiry_date || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingVoucher.brand || !editingVoucher.code) {
      alert('Merk en code zijn verplicht');
      return;
    }

    try {
      await db.vouchers.update(editingVoucher.id, {
        brand: editingVoucher.brand,
        code: editingVoucher.code,
        description: editingVoucher.description,
        expiry_date: editingVoucher.expiry_date
      });
      await loadVouchers();
      setShowEditModal(false);
      setEditingVoucher(null);
    } catch (error) {
      console.error('Error updating voucher:', error);
      alert('Fout bij updaten waardebon');
    }
  };

  const handleDeleteVoucher = async (id) => {
    if (!window.confirm('Weet je zeker dat je deze waardebon wilt verwijderen?')) return;

    try {
      await db.vouchers.delete(id);
      setVouchers(vouchers.filter(v => v.id !== id));
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alert('Fout bij verwijderen waardebon');
    }
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const activeVouchers = vouchers.filter(v => !v.redeemed && !isExpired(v.expiry_date));
  const redeemedVouchers = vouchers.filter(v => v.redeemed);
  const expiredVouchers = vouchers.filter(v => !v.redeemed && isExpired(v.expiry_date));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-xl">Laden...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2 flex items-center">
            <Gift className="w-8 h-8 mr-3" />
            Jouw waardebonnen
          </h1>
          <p className="text-white/60">Beheer je waardebonnen en cadeaubonnen</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nieuwe waardebon</span>
        </button>
      </div>

      {/* Info Banner */}
      {activeVouchers.length === 0 && redeemedVouchers.length === 0 && (
        <div className="glass-effect rounded-xl p-6 mb-6 border border-blue-400/30 bg-blue-500/10">
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-1">Geen waardebonnen gevonden</h3>
              <p className="text-white/70 text-sm">
                Voeg je eerste waardebon toe door op "Nieuwe waardebon" te klikken. 
                Bewaar al je cadeaubonnen en kortingscodes op één plek!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Vouchers */}
      {activeVouchers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-4 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-green-400" />
            Actieve waardebonnen
          </h2>
          <div className="space-y-4">
            {activeVouchers.map((voucher) => (
              <div key={voucher.id} className="gradient-card rounded-xl p-6 border-l-4 border-green-400">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-800">
                          {voucher.brand.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{voucher.brand}</h3>
                        {voucher.description && (
                          <p className="text-white/60 text-sm">{voucher.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex-1 bg-white/10 rounded-lg px-4 py-3 border-2 border-dashed border-white/30">
                        <p className="text-white/50 text-xs mb-1">Code</p>
                        <p className="text-white font-mono text-lg tracking-wider">{voucher.code}</p>
                      </div>
                      <button
                        onClick={() => handleCopyCode(voucher.code)}
                        className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center space-x-2"
                        title="Kopieer code"
                      >
                        {copiedCode === voucher.code ? (
                          <>
                            <Check className="w-5 h-5" />
                            <span className="text-sm">Gekopieerd!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-5 h-5" />
                            <span className="text-sm">Kopieer</span>
                          </>
                        )}
                      </button>
                    </div>

                    {voucher.expiry_date && (
                      <p className="text-white/50 text-sm">
                        Geldig tot: {new Date(voucher.expiry_date).toLocaleDateString('nl-NL')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleRedeemVoucher(voucher.id)}
                      className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors text-sm whitespace-nowrap"
                    >
                      Waardebon direct inwisselen →
                    </button>
                    <button
                      onClick={() => handleEditVoucher(voucher)}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      title="Bewerken"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm">Bewerken</span>
                    </button>
                    <button
                      onClick={() => handleDeleteVoucher(voucher.id)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Vouchers */}
      {expiredVouchers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white text-xl font-semibold mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-yellow-400" />
            Verlopen waardebonnen
          </h2>
          <div className="space-y-4">
            {expiredVouchers.map((voucher) => (
              <div key={voucher.id} className="gradient-card rounded-xl p-6 border-l-4 border-yellow-400 opacity-60">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-600">
                          {voucher.brand.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{voucher.brand}</h3>
                        <p className="text-red-400 text-sm">Verlopen op {new Date(voucher.expiry_date).toLocaleDateString('nl-NL')}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteVoucher(voucher.id)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redeemed Vouchers */}
      {redeemedVouchers.length > 0 && (
        <div>
          <h2 className="text-white text-xl font-semibold mb-4 flex items-center">
            <Check className="w-5 h-5 mr-2 text-gray-400" />
            Ingewisselde waardebonnen
          </h2>
          <div className="space-y-4">
            {redeemedVouchers.map((voucher) => (
              <div key={voucher.id} className="gradient-card rounded-xl p-6 border-l-4 border-gray-400 opacity-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-500">
                          {voucher.brand.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{voucher.brand}</h3>
                        <p className="text-white/50 text-sm">
                          Ingewisseld op {new Date(voucher.redeemed_at).toLocaleDateString('nl-NL')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleUndoRedeem(voucher.id)}
                      className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center space-x-2"
                      title="Terugdraaien"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="text-sm">Terugdraaien</span>
                    </button>
                    <button
                      onClick={() => handleDeleteVoucher(voucher.id)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Voucher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-effect rounded-xl p-6 max-w-md w-full">
            <h2 className="text-white text-2xl font-bold mb-4 flex items-center">
              <Gift className="w-6 h-6 mr-2" />
              Nieuwe waardebon toevoegen
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-white/80 text-sm mb-2 block">Merk / Winkel *</label>
                <input
                  type="text"
                  value={newVoucher.brand}
                  onChange={(e) => setNewVoucher({ ...newVoucher, brand: e.target.value })}
                  placeholder="bijv. Kiosk, Philips, Bol.com"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Code *</label>
                <input
                  type="text"
                  value={newVoucher.code}
                  onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                  placeholder="bijv. KLIK-NU-OP-WAARDEBON-DIRECT-INWISSELEN"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Beschrijving</label>
                <input
                  type="text"
                  value={newVoucher.description}
                  onChange={(e) => setNewVoucher({ ...newVoucher, description: e.target.value })}
                  placeholder="bijv. €50 cadeaubon"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Vervaldatum</label>
                <input
                  type="date"
                  value={newVoucher.expiry_date}
                  onChange={(e) => setNewVoucher({ ...newVoucher, expiry_date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddVoucher}
                className="flex-1 btn-primary px-4 py-2 rounded-lg"
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Voucher Modal */}
      {showEditModal && editingVoucher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-effect rounded-xl p-6 max-w-md w-full">
            <h2 className="text-white text-2xl font-bold mb-4 flex items-center">
              <Edit className="w-6 h-6 mr-2" />
              Waardebon bewerken
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-white/80 text-sm mb-2 block">Merk / Winkel *</label>
                <input
                  type="text"
                  value={editingVoucher.brand}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, brand: e.target.value })}
                  placeholder="bijv. Kiosk, Philips, Bol.com"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Code *</label>
                <input
                  type="text"
                  value={editingVoucher.code}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, code: e.target.value.toUpperCase() })}
                  placeholder="bijv. KLIK-NU-OP-WAARDEBON-DIRECT-INWISSELEN"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Beschrijving</label>
                <input
                  type="text"
                  value={editingVoucher.description}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, description: e.target.value })}
                  placeholder="bijv. €50 cadeaubon"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Vervaldatum</label>
                <input
                  type="date"
                  value={editingVoucher.expiry_date}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, expiry_date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingVoucher(null);
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 btn-primary px-4 py-2 rounded-lg"
              >
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaardebonnenPage;
