import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Upload, X, Link as LinkIcon, Tag } from 'lucide-react';
import { db, storage } from '../utils/supabaseClient';

const KokenPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    name: '',
    source_url: '',
    ingredients: '',
    shopping_list: '',
    checklist: '',
    notes: '',
    tags: '',
    image_url: ''
  });

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await db.recipes.getAll();
      setRecipes(data);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', source_url: '', ingredients: '', shopping_list: '', checklist: '', notes: '', tags: '', image_url: '' });
    setImageFile(null);
    setEditingRecipe(null);
    setShowModal(false);
  };

  const closeView = () => {
    setViewingRecipe(null);
    setShowViewModal(false);
  };

  const splitLines = (text) => {
    return String(text || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
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
    await storage.upload('recipes', path, imageFile);
    return storage.getPublicUrl('recipes', path);
  };

  const parsedTags = (raw) => {
    const cleaned = String(raw || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : null;
  };

  const saveRecipe = async () => {
    if (!form.name.trim()) {
      alert('Vul minstens een naam in');
      return;
    }

    try {
      const imageUrl = await uploadImageIfNeeded();
      const payload = {
        name: form.name.trim(),
        source_url: form.source_url.trim() || null,
        ingredients: form.ingredients.trim() || null,
        shopping_list: form.shopping_list.trim() || null,
        checklist: form.checklist.trim() || null,
        notes: form.notes.trim() || null,
        tags: parsedTags(form.tags),
        image_url: imageUrl
      };

      if (editingRecipe) {
        const updated = await db.recipes.update(editingRecipe.id, payload);
        setRecipes(recipes.map((r) => (r.id === editingRecipe.id ? updated : r)));
      } else {
        const created = await db.recipes.create(payload);
        setRecipes([created, ...recipes]);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving recipe:', error);
      if (String(error?.message || '').includes('relation') || String(error?.message || '').includes('does not exist')) {
        alert('Database tabel bestaat nog niet. Voer eerst de SQL voor recipes uit in Supabase.');
      } else if (String(error?.message || '').includes('Bucket')) {
        alert('Storage bucket "recipes" bestaat nog niet. Maak deze aan via het geleverde SQL script.');
      } else {
        alert('Fout bij opslaan recept');
      }
    }
  };

  const deleteRecipe = async (id) => {
    if (!window.confirm('Dit recept verwijderen?')) return;
    try {
      await db.recipes.delete(id);
      setRecipes(recipes.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Fout bij verwijderen recept');
    }
  };

  const startAdd = () => {
    setEditingRecipe(null);
    setForm({ name: '', source_url: '', ingredients: '', shopping_list: '', checklist: '', notes: '', tags: '', image_url: '' });
    setImageFile(null);
    setShowModal(true);
  };

  const startEdit = (recipe) => {
    setEditingRecipe(recipe);
    setForm({
      name: recipe.name || '',
      source_url: recipe.source_url || '',
      ingredients: recipe.ingredients || '',
      shopping_list: recipe.shopping_list || '',
      checklist: recipe.checklist || '',
      notes: recipe.notes || '',
      tags: Array.isArray(recipe.tags) ? recipe.tags.join(', ') : (recipe.tags || ''),
      image_url: recipe.image_url || ''
    });
    setImageFile(null);
    setShowModal(true);
  };

  const openView = (recipe) => {
    setViewingRecipe(recipe);
    setShowViewModal(true);
  };

  const visibleRecipes = useMemo(() => recipes || [], [recipes]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">Koken</h1>
        <button onClick={startAdd} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Nieuw recept</span>
        </button>
      </div>

      {loading ? (
        <div className="text-white/60">Laden…</div>
      ) : visibleRecipes.length === 0 ? (
        <div className="glass-effect rounded-xl p-8 text-center text-white/50">
          <p>Nog geen recepten toegevoegd.</p>
          <p className="text-sm mt-1">Klik op "Nieuw recept" om te beginnen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleRecipes.map((r) => (
            <div
              key={r.id}
              className="glass-effect rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => openView(r)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openView(r);
              }}
            >
              <div className="w-full h-40 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center mb-3">
                {r.image_url ? (
                  <img src={r.image_url} alt={r.name} className="w-full h-full object-contain bg-white/5" />
                ) : (
                  <Upload className="w-5 h-5 text-white/40" />
                )}
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold truncate">{r.name}</h3>
                  <div className="text-white/70 text-sm flex items-center gap-2 flex-wrap mt-1">
                    {r.source_url && (
                      <a href={r.source_url} target="_blank" rel="noreferrer" className="text-blue-300 hover:text-blue-200 underline flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> Recept
                      </a>
                    )}
                    {Array.isArray(r.tags) && r.tags.length > 0 && (
                      <span className="flex items-center gap-1 text-white/60">
                        <Tag className="w-3 h-3" /> {r.tags.slice(0, 3).join(', ')}{r.tags.length > 3 ? '…' : ''}
                      </span>
                    )}
                  </div>
                  {r.notes && <div className="mt-2 text-white/60 text-sm line-clamp-3">{r.notes}</div>}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(r);
                    }}
                    className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white"
                    title="Bewerken"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRecipe(r.id);
                    }}
                    className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showViewModal && viewingRecipe && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold truncate">{viewingRecipe.name}</h2>
              <button onClick={closeView} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="w-full h-48 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                  {viewingRecipe.image_url ? (
                    <img src={viewingRecipe.image_url} alt={viewingRecipe.name} className="w-full h-full object-contain bg-white/5" />
                  ) : (
                    <Upload className="w-6 h-6 text-white/40" />
                  )}
                </div>

                {viewingRecipe.source_url && (
                  <a
                    href={viewingRecipe.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 underline"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>Open recept</span>
                  </a>
                )}

                {Array.isArray(viewingRecipe.tags) && viewingRecipe.tags.length > 0 && (
                  <div className="text-white/70 text-sm flex items-center gap-2 flex-wrap">
                    <Tag className="w-4 h-4" />
                    <span>{viewingRecipe.tags.join(', ')}</span>
                  </div>
                )}

                {viewingRecipe.notes && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">Notities</div>
                    <div className="text-white/80 whitespace-pre-wrap bg-white/5 border border-white/10 rounded-lg p-3">
                      {viewingRecipe.notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {viewingRecipe.ingredients && (
                  <div>
                    <div className="text-white/70 text-sm mb-1">Ingrediënten</div>
                    <div className="text-white/80 whitespace-pre-wrap bg-white/5 border border-white/10 rounded-lg p-3">
                      {viewingRecipe.ingredients}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-white/70 text-sm mb-1">Boodschappenlijst</div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      {splitLines(viewingRecipe.shopping_list).length === 0 ? (
                        <div className="text-white/50 text-sm">Geen items</div>
                      ) : (
                        <div className="space-y-2">
                          {splitLines(viewingRecipe.shopping_list).map((item, idx) => (
                            <div key={idx} className="text-white/80 text-sm">{item}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-white/70 text-sm mb-1">Checklist</div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      {splitLines(viewingRecipe.checklist).length === 0 ? (
                        <div className="text-white/50 text-sm">Geen items</div>
                      ) : (
                        <div className="space-y-2">
                          {splitLines(viewingRecipe.checklist).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-white/80 text-sm">
                              <div className="mt-0.5 w-4 h-4 rounded border border-white/20 bg-white/5 flex-shrink-0" />
                              <div className="flex-1">{item}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={closeView} className="glass-effect px-4 py-2 rounded-lg text-white">
                    Sluiten
                  </button>
                  <button
                    onClick={() => {
                      const r = viewingRecipe;
                      closeView();
                      startEdit(r);
                    }}
                    className="btn-primary px-4 py-2 rounded-lg text-white"
                  >
                    Bewerken
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">{editingRecipe ? 'Recept bewerken' : 'Nieuw recept'}</h2>
              <button onClick={resetForm} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-1">Naam</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. Pasta pesto"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-1">Recept link</label>
                <input
                  type="url"
                  value={form.source_url}
                  onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Tags (komma gescheiden)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. snel, vegetarisch"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Foto (optioneel)</label>
                <input type="file" accept="image/*" onChange={onImageSelect} className="w-full text-white/70 text-sm" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-1">Ingrediënten</label>
                <textarea
                  value={form.ingredients}
                  onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                  className="w-full input-plain rounded-lg px-3 py-2 min-h-[110px]"
                  placeholder={`1 ui
2 teentjes look
...`}
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Boodschappenlijst</label>
                <textarea
                  value={form.shopping_list}
                  onChange={(e) => setForm((f) => ({ ...f, shopping_list: e.target.value }))}
                  className="w-full input-plain rounded-lg px-3 py-2 min-h-[110px]"
                  placeholder={`(1 per lijn)
Tomaten
Parmezaan
...`}
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Checklist</label>
                <textarea
                  value={form.checklist}
                  onChange={(e) => setForm((f) => ({ ...f, checklist: e.target.value }))}
                  className="w-full input-plain rounded-lg px-3 py-2 min-h-[110px]"
                  placeholder={`(1 per lijn)
Oven voorverwarmen
Pasta koken
...`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-1">Notities</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full input-plain rounded-lg px-3 py-2 min-h-[110px]"
                  placeholder="Variaties, timing, opmerkingen…"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={resetForm} className="glass-effect px-4 py-2 rounded-lg text-white">
                Annuleren
              </button>
              <button onClick={saveRecipe} className="btn-primary px-4 py-2 rounded-lg text-white">
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KokenPage;
