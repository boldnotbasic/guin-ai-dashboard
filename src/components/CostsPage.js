import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Upload, X, Euro, Tag } from 'lucide-react';
import { db, supabase, storage } from '../utils/supabaseClient';

const CostsPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const [form, setForm] = useState({
    name: '',
    amount: '',
    billing_cycle: 'monthly',
    category: '',
    website: '',
    notes: '',
    logo_url: ''
  });

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('all');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await db.expenses.getAll();
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', amount: '', billing_cycle: 'monthly', category: '', website: '', notes: '', logo_url: '' });
    setLogoFile(null);
    setEditingExpense(null);
    setShowModal(false);
  };

  const categories = Array.from(new Set(expenses.map(e => e.category).filter(Boolean))).sort();

  const filteredExpenses = expenses.filter(e => {
    const matchCycle = cycleFilter === 'all' || e.billing_cycle === cycleFilter;
    const matchCategory = categoryFilter === 'all' || (e.category || '') === categoryFilter;
    return matchCycle && matchCategory;
  });

  const monthlyValue = (e) => {
    const amt = Number(e.amount) || 0;
    if (e.billing_cycle === 'monthly') return amt;
    if (e.billing_cycle === 'annual') return amt / 12;
    return 0;
  };

  const monthlyTotal = filteredExpenses.reduce((sum, e) => sum + monthlyValue(e), 0);

  const onLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Kies een afbeelding');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, logo_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const uploadLogoIfNeeded = async () => {
    if (!logoFile) return form.logo_url || null;
    const ext = logoFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).slice(2)}_${Date.now()}.${ext}`;
    const path = `logos/${fileName}`;
    await storage.upload('expenses', path, logoFile);
    const publicUrl = storage.getPublicUrl('expenses', path);
    return publicUrl;
  };

  const saveExpense = async () => {
    if (!form.name.trim() || !String(form.amount).trim()) {
      alert('Vul minstens naam en bedrag in');
      return;
    }
    try {
      const logoUrl = await uploadLogoIfNeeded();
      const payload = {
        name: form.name.trim(),
        amount: Number(form.amount),
        billing_cycle: form.billing_cycle,
        category: form.category.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        logo_url: logoUrl,
        position: editingExpense ? editingExpense.position : expenses.length
      };

      if (editingExpense) {
        const updated = await db.expenses.update(editingExpense.id, payload);
        setExpenses(expenses.map((e) => (e.id === editingExpense.id ? updated : e)));
      } else {
        const created = await db.expenses.create(payload);
        setExpenses([...expenses, created]);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving expense:', error);
      if (String(error?.message || '').includes('relation') || String(error?.message || '').includes('does not exist')) {
        alert('Database tabel bestaat nog niet. Voer eerst de SQL voor expenses uit in Supabase.');
      } else {
        alert('Fout bij opslaan kost');
      }
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Deze kost verwijderen?')) return;
    try {
      await db.expenses.delete(id);
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Fout bij verwijderen kost');
    }
  };

  const startAdd = () => {
    setEditingExpense(null);
    setForm({ name: '', amount: '', billing_cycle: 'monthly', category: '', website: '', notes: '', logo_url: '' });
    setLogoFile(null);
    setShowModal(true);
  };

  const startEdit = (expense) => {
    setEditingExpense(expense);
    setForm({
      name: expense.name || '',
      amount: expense.amount ?? '',
      billing_cycle: expense.billing_cycle || 'monthly',
      category: expense.category || '',
      website: expense.website || '',
      notes: expense.notes || '',
      logo_url: expense.logo_url || ''
    });
    setLogoFile(null);
    setShowModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">Kosten</h1>
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 rounded-lg glass-effect text-white/90 text-sm">Totaal / maand: € {monthlyTotal.toFixed(2)}</div>
          <button onClick={startAdd} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Nieuwe kost</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">Categorie</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="all">Alle categorieën</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">Periode</span>
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
          >
            <option value="all">Alle</option>
            <option value="monthly">Maandelijks</option>
            <option value="annual">Jaarlijks</option>
            <option value="one_time">Eenmalig</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-white/60">Laden…</div>
      ) : expenses.length === 0 ? (
        <div className="glass-effect rounded-xl p-8 text-center text-white/50">
          <p>Nog geen kosten toegevoegd.</p>
          <p className="text-sm mt-1">Klik op "Nieuwe kost" om te beginnen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExpenses.map((exp) => (
            <div key={exp.id} className="glass-effect rounded-xl p-4 border border-white/10 flex items-start gap-4">
              <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                {exp.logo_url ? (
                  <img src={exp.logo_url} alt={exp.name} className="w-full h-full object-contain" />
                ) : (
                  <Tag className="w-6 h-6 text-white/40" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold truncate">{exp.name}</h3>
                    <div className="text-white/70 text-sm flex items-center gap-1">
                      <Euro className="w-3 h-3" />
                      <span>{Number(exp.amount).toFixed(2)} €</span>
                      <span className="text-white/40">/ {exp.billing_cycle === 'annual' ? 'jaar' : (exp.billing_cycle === 'one_time' ? 'eenmalig' : 'maand')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(exp)} className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white" title="Bewerken">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteExpense(exp.id)} className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300" title="Verwijderen">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-white/60 space-x-3 truncate">
                  {exp.category && <span>#{exp.category}</span>}
                  {exp.website && (
                    <a href={exp.website} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 underline break-all">
                      {exp.website}
                    </a>
                  )}
                </div>
                {exp.notes && <div className="mt-2 text-white/60 text-sm line-clamp-3">{exp.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">{editingExpense ? 'Kost bewerken' : 'Nieuwe kost'}</h2>
              <button onClick={resetForm} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-2">Naam *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Bijv. Internet"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Bedrag (EUR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Periode *</label>
                <select
                  value={form.billing_cycle}
                  onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="monthly">Maandelijks</option>
                  <option value="annual">Jaarlijks</option>
                  <option value="one_time">Eenmalig</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Categorie</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Bijv. Software, Nutsvoorzieningen, ..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-2">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-2">Notities</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Optioneel"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/20 overflow-hidden flex items-center justify-center">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="logo" className="w-full h-full object-contain" />
                    ) : (
                      <Upload className="w-5 h-5 text-white/40" />
                    )}
                  </div>
                  <label className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={onLogoSelect} />
                    Upload logo
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button onClick={saveExpense} className="flex-1 btn-primary px-6 py-2 rounded-lg text-white font-medium">
                {editingExpense ? 'Opslaan' : 'Toevoegen'}
              </button>
              <button onClick={resetForm} className="flex-1 glass-effect px-6 py-2 rounded-lg text-white font-medium">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostsPage;
