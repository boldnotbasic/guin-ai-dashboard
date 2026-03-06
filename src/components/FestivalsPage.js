import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Upload, X, MapPin, Calendar, Link as LinkIcon } from 'lucide-react';
import { db, supabase } from '../utils/supabaseClient';
import PersonalAgenda from './PersonalAgenda';

const FestivalsPage = () => {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFestival, setEditingFestival] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    name: '',
    location: '',
    start_date: '',
    end_date: '',
    tickets_url: '',
    notes: '',
    image_url: ''
  });

  useEffect(() => {
    loadFestivals();
  }, []);

  const loadFestivals = async () => {
    try {
      const data = await db.festivals.getAll();
      setFestivals(data);
    } catch (error) {
      console.error('Error loading festivals:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', location: '', start_date: '', end_date: '', tickets_url: '', notes: '', image_url: '' });
    setImageFile(null);
    setEditingFestival(null);
    setShowModal(false);
  };

  const onImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Kies een afbeelding');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => ({ ...f, image_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const uploadImageIfNeeded = async () => {
    if (!imageFile) return form.image_url || null;
    const ext = imageFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).slice(2)}_${Date.now()}.${ext}`;
    const path = `main/${fileName}`;
    const { error } = await supabase.storage.from('festivals').upload(path, imageFile);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('festivals').getPublicUrl(path);
    return publicUrl;
  };

  const saveFestival = async () => {
    if (!form.name.trim()) {
      alert('Vul minstens een naam in');
      return;
    }
    try {
      if (form.start_date) {
        const isOverlap = (aStart, aEnd, bStart, bEnd) => {
          const aS = new Date(aStart);
          const aE = new Date(aEnd || aStart);
          const bS = new Date(bStart);
          const bE = new Date(bEnd || bStart);
          if ([aS, aE, bS, bE].some(d => Number.isNaN(d.getTime()))) return false;
          const s1 = new Date(aS.getFullYear(), aS.getMonth(), aS.getDate()).getTime();
          const e1 = new Date(aE.getFullYear(), aE.getMonth(), aE.getDate()).getTime();
          const s2 = new Date(bS.getFullYear(), bS.getMonth(), bS.getDate()).getTime();
          const e2 = new Date(bE.getFullYear(), bE.getMonth(), bE.getDate()).getTime();
          const start1 = Math.min(s1, e1);
          const end1 = Math.max(s1, e1);
          const start2 = Math.min(s2, e2);
          const end2 = Math.max(s2, e2);
          return start1 <= end2 && start2 <= end1;
        };

        const destinations = await db.destinations.getAll();
        const activeTrips = (destinations || []).filter(d => !d.is_archived);
        const conflict = activeTrips.find(d => d.start_date && isOverlap(form.start_date, form.end_date, d.start_date, d.end_date));

        if (conflict) {
          alert(`Dit festival overlapt met je reis: ${conflict.name}${conflict.country ? ` (${conflict.country})` : ''}. Kies andere data.`);
          return;
        }
      }

      const imageUrl = await uploadImageIfNeeded();
      const payload = {
        name: form.name.trim(),
        location: form.location.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        tickets_url: form.tickets_url.trim() || null,
        notes: form.notes.trim() || null,
        image_url: imageUrl
      };

      if (editingFestival) {
        const updated = await db.festivals.update(editingFestival.id, payload);
        setFestivals(festivals.map((f) => (f.id === editingFestival.id ? updated : f)));
      } else {
        const created = await db.festivals.create(payload);
        setFestivals([created, ...festivals]);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving festival:', error);
      if (String(error?.message || '').includes('relation') || String(error?.message || '').includes('does not exist')) {
        alert('Database tabel bestaat nog niet. Voer eerst de SQL voor festivals uit in Supabase.');
      } else if (String(error?.message || '').includes('Bucket')) {
        alert('Storage bucket "festivals" bestaat nog niet. Maak deze aan via het geleverde SQL script.');
      } else {
        alert('Fout bij opslaan festival');
      }
    }
  };

  const deleteFestival = async (id) => {
    if (!window.confirm('Dit festival verwijderen?')) return;
    try {
      await db.festivals.delete(id);
      setFestivals(festivals.filter((f) => f.id !== id));
    } catch (error) {
      console.error('Error deleting festival:', error);
      alert('Fout bij verwijderen festival');
    }
  };

  const startAdd = () => {
    setEditingFestival(null);
    setForm({ name: '', location: '', start_date: '', end_date: '', tickets_url: '', notes: '', image_url: '' });
    setImageFile(null);
    setShowModal(true);
  };

  const startEdit = (festival) => {
    setEditingFestival(festival);
    setForm({
      name: festival.name || '',
      location: festival.location || '',
      start_date: festival.start_date || '',
      end_date: festival.end_date || '',
      tickets_url: festival.tickets_url || '',
      notes: festival.notes || '',
      image_url: festival.image_url || ''
    });
    setImageFile(null);
    setShowModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">Festivals</h1>
        <button onClick={startAdd} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Nieuw festival</span>
        </button>
      </div>

      {loading ? (
        <div className="text-white/60">Laden…</div>
      ) : festivals.length === 0 ? (
        <div className="glass-effect rounded-xl p-8 text-center text-white/50">
          <p>Nog geen festivals toegevoegd.</p>
          <p className="text-sm mt-1">Klik op "Nieuw festival" om te beginnen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {festivals.map((f) => (
            <div key={f.id} className="glass-effect rounded-xl p-4 border border-white/10">
              <div className="w-full h-40 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center mb-3">
                {f.image_url ? (
                  <img src={f.image_url} alt={f.name} className="w-full h-full object-contain bg-white/5" />
                ) : (
                  <Upload className="w-5 h-5 text-white/40" />
                )}
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold truncate">{f.name}</h3>
                  <div className="text-white/70 text-sm flex items-center gap-2 flex-wrap">
                    {f.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{f.location}</span>
                    )}
                    {(f.start_date || f.end_date) && (
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{f.start_date || '?'}{f.end_date ? ` - ${f.end_date}` : ''}</span>
                    )}
                    {f.tickets_url && (
                      <a href={f.tickets_url} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 underline flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> Tickets
                      </a>
                    )}
                  </div>
                  {f.notes && <div className="mt-2 text-white/60 text-sm line-clamp-3">{f.notes}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(f)} className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white" title="Bewerken">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteFestival(f.id)} className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300" title="Verwijderen">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PersonalAgenda />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">{editingFestival ? 'Festival bewerken' : 'Nieuw festival'}</h2>
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
                  placeholder="Bijv. Tomorrowland"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Locatie</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Plaats, Land"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Startdatum</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Einddatum</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-2">Tickets URL</label>
                <input
                  type="url"
                  value={form.tickets_url}
                  onChange={(e) => setForm({ ...form, tickets_url: e.target.value })}
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
                <label className="block text-white/70 text-sm mb-2">Afbeelding</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-white/5 border border-white/20 overflow-hidden flex items-center justify-center">
                    {form.image_url ? (
                      <img src={form.image_url} alt="festival" className="w-full h-full object-contain bg-white/5" />
                    ) : (
                      <Upload className="w-5 h-5 text-white/40" />
                    )}
                  </div>
                  <label className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={onImageSelect} />
                    Upload afbeelding
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button onClick={saveFestival} className="flex-1 btn-primary px-6 py-2 rounded-lg text-white font-medium">
                {editingFestival ? 'Opslaan' : 'Toevoegen'}
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

export default FestivalsPage;
