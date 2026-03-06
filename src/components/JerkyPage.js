import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Beef, Upload, X, Star, Scale, TrendingDown, Calendar, Image as ImageIcon, Barcode, ChevronLeft, ChevronRight } from 'lucide-react';
import { db, supabase } from '../utils/supabaseClient';

const JerkyPage = () => {
  const [batches, setBatches] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    batch_number: '',
    name: '',
    weight_before: '',
    weight_after: '',
    score: 3,
    notes: '',
    image_url: '',
    photo_before: '',
    photo_after: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [photoBeforeFile, setPhotoBeforeFile] = useState(null);
  const [photoAfterFile, setPhotoAfterFile] = useState(null);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const data = await db.jerky.getAll();
      setBatches(data);
    } catch (error) {
      console.error('Error loading jerky batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('jerky')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('jerky')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecteer een afbeelding');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'main') {
        setImageFile(file);
        setFormData({ ...formData, image_url: reader.result });
      } else if (type === 'before') {
        setPhotoBeforeFile(file);
        setFormData({ ...formData, photo_before: reader.result });
      } else if (type === 'after') {
        setPhotoAfterFile(file);
        setFormData({ ...formData, photo_after: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (type) => {
    if (type === 'main') {
      setFormData({ ...formData, image_url: '' });
      setImageFile(null);
    } else if (type === 'before') {
      setFormData({ ...formData, photo_before: '' });
      setPhotoBeforeFile(null);
    } else if (type === 'after') {
      setFormData({ ...formData, photo_after: '' });
      setPhotoAfterFile(null);
    }
  };

  const generateBatchNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `JERKY-${year}${month}${day}-${random}`;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Vul een naam in');
      return;
    }

    if (!formData.weight_before || !formData.weight_after) {
      alert('Vul voor en na gewichten in');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = formData.image_url;
      let photoBeforeUrl = formData.photo_before;
      let photoAfterUrl = formData.photo_after;

      if (imageFile) {
        imageUrl = await uploadFile(imageFile, 'main');
      }

      if (photoBeforeFile) {
        photoBeforeUrl = await uploadFile(photoBeforeFile, 'before');
      }

      if (photoAfterFile) {
        photoAfterUrl = await uploadFile(photoAfterFile, 'after');
      }

      const batchData = {
        batch_number: editingBatch ? formData.batch_number : generateBatchNumber(),
        name: formData.name.trim(),
        weight_before: parseFloat(formData.weight_before),
        weight_after: parseFloat(formData.weight_after),
        score: formData.score,
        notes: formData.notes.trim(),
        image_url: imageUrl,
        photo_before: photoBeforeUrl,
        photo_after: photoAfterUrl
      };

      if (editingBatch) {
        await db.jerky.update(editingBatch.id, batchData);
        setBatches(batches.map(b => b.id === editingBatch.id ? { ...b, ...batchData } : b));
      } else {
        const newBatch = await db.jerky.create(batchData);
        setBatches([newBatch, ...batches]);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving jerky batch:', error);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        alert('Database tabel bestaat nog niet. Voer eerst de SQL queries uit in Supabase.');
      } else if (error.message.includes('Bucket')) {
        alert('Storage bucket "jerky" bestaat nog niet. Maak deze aan in Supabase Storage.');
      } else {
        alert('Fout bij opslaan: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (batch) => {
    setEditingBatch(batch);
    setFormData({
      batch_number: batch.batch_number,
      name: batch.name,
      weight_before: batch.weight_before.toString(),
      weight_after: batch.weight_after.toString(),
      score: batch.score,
      notes: batch.notes || '',
      image_url: batch.image_url || '',
      photo_before: batch.photo_before || '',
      photo_after: batch.photo_after || ''
    });
    setImageFile(null);
    setPhotoBeforeFile(null);
    setPhotoAfterFile(null);
    setShowAddModal(true);
  };

  const deleteBatch = async (id) => {
    if (!window.confirm('Weet je zeker dat je deze batch wilt verwijderen?')) return;

    try {
      await db.jerky.delete(id);
      setBatches(batches.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setFormData({
      batch_number: '',
      name: '',
      weight_before: '',
      weight_after: '',
      score: 3,
      notes: '',
      image_url: '',
      photo_before: '',
      photo_after: ''
    });
    setImageFile(null);
    setPhotoBeforeFile(null);
    setPhotoAfterFile(null);
    setEditingBatch(null);
    setShowAddModal(false);
  };

  const calculateWeightLoss = (before, after) => {
    const loss = before - after;
    const percentage = ((loss / before) * 100).toFixed(1);
    return { loss: loss.toFixed(1), percentage };
  };

  const renderStars = (score) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < score ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`}
      />
    ));
  };

  const openLightbox = (photos, startIndex = 0) => {
    setLightboxPhotos(photos);
    setCurrentPhotoIndex(startIndex);
    setLightboxOpen(true);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % lightboxPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
            <Beef className="w-8 h-8 text-orange-400" />
            <span>Jerky Productie</span>
          </h1>
          <p className="text-white/70">Track je jerky batches: gewichten, scores & resultaten</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-6 py-3 rounded-lg text-white font-semibold flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nieuwe Batch</span>
        </button>
      </div>

      {/* Stats Overview */}
      {batches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="gradient-card p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Totaal Batches</p>
                <p className="text-white text-2xl font-bold">{batches.length}</p>
              </div>
              <Beef className="w-8 h-8 text-orange-400/50" />
            </div>
          </div>
          <div className="gradient-card p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Gem. Gewichtsverlies</p>
                <p className="text-white text-2xl font-bold">
                  {(batches.reduce((acc, b) => acc + ((b.weight_before - b.weight_after) / b.weight_before * 100), 0) / batches.length).toFixed(1)}%
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400/50" />
            </div>
          </div>
          <div className="gradient-card p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Gem. Score</p>
                <p className="text-white text-2xl font-bold flex items-center space-x-1">
                  <span>{(batches.reduce((acc, b) => acc + b.score, 0) / batches.length).toFixed(1)}</span>
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-400/50" />
            </div>
          </div>
        </div>
      )}

      {/* Batches List */}
      {loading ? (
        <div className="text-center py-12 text-white/50">Laden...</div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12">
          <Beef className="w-16 h-16 text-orange-400/50 mx-auto mb-4" />
          <p className="text-white/50 text-lg mb-2">Nog geen jerky batches toegevoegd</p>
          <p className="text-white/40 text-sm">Klik "Nieuwe Batch" om je eerste batch toe te voegen</p>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => {
            const { loss, percentage } = calculateWeightLoss(batch.weight_before, batch.weight_after);
            return (
              <div key={batch.id} className="gradient-card rounded-xl p-6 hover:scale-[1.01] transition-transform">
                <div className="flex items-start space-x-6">
                  {/* Main Image */}
                  {batch.image_url ? (
                    <img
                      src={batch.image_url}
                      alt={batch.name}
                      className="w-24 h-24 rounded-lg object-contain bg-white/5 flex-shrink-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center flex-shrink-0">
                      <Beef className="w-12 h-12 text-white/30" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-white font-bold text-xl">{batch.name}</h3>
                          <span className="bg-orange-500/20 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded text-xs font-mono">
                            {batch.batch_number}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          {renderStars(batch.score)}
                        </div>
                        <div className="flex items-center space-x-2 text-white/40 text-xs">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(batch.created_at).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(batch)}
                          className="text-white/60 hover:text-white transition-colors bg-white/5 p-2 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteBatch(batch.id)}
                          className="text-red-400 hover:text-red-300 transition-colors bg-white/5 p-2 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Weight Info */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/50 text-xs mb-1">Voor</p>
                        <p className="text-white font-bold text-lg">{batch.weight_before}g</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/50 text-xs mb-1">Na</p>
                        <p className="text-white font-bold text-lg">{batch.weight_after}g</p>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <p className="text-orange-400 text-xs mb-1">Verlies</p>
                        <p className="text-orange-400 font-bold text-lg">-{percentage}%</p>
                        <p className="text-orange-400/60 text-xs">({loss}g)</p>
                      </div>
                    </div>

                    {/* Photos Before/After */}
                    {(batch.photo_before || batch.photo_after) && (
                      <div className="flex space-x-2 mb-3">
                        {batch.photo_before && (
                          <div 
                            className="relative cursor-pointer hover:opacity-80 transition-opacity group"
                            onClick={() => {
                              const photos = [];
                              if (batch.photo_before) photos.push({ url: batch.photo_before, label: 'Voor' });
                              if (batch.photo_after) photos.push({ url: batch.photo_after, label: 'Na' });
                              openLightbox(photos, 0);
                            }}
                          >
                            <img src={batch.photo_before} alt="Voor" className="w-20 h-20 rounded object-contain bg-white/5" />
                            <span className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-white text-xs">Voor</span>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <ImageIcon className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        )}
                        {batch.photo_after && (
                          <div 
                            className="relative cursor-pointer hover:opacity-80 transition-opacity group"
                            onClick={() => {
                              const photos = [];
                              if (batch.photo_before) photos.push({ url: batch.photo_before, label: 'Voor' });
                              if (batch.photo_after) photos.push({ url: batch.photo_after, label: 'Na' });
                              openLightbox(photos, batch.photo_before ? 1 : 0);
                            }}
                          >
                            <img src={batch.photo_after} alt="Na" className="w-20 h-20 rounded object-contain bg-white/5" />
                            <span className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-white text-xs">Na</span>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <ImageIcon className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {batch.notes && (
                      <p className="text-white/50 text-sm">{batch.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="gradient-card rounded-xl p-6 w-full max-w-2xl my-8">
            <h2 className="text-white text-2xl font-bold mb-6">
              {editingBatch ? 'Batch Bewerken' : 'Nieuwe Batch Toevoegen'}
            </h2>

            <div className="space-y-4">
              {/* Batch Number (generated on save) */}
              {editingBatch && formData.batch_number && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <label className="block text-white/70 text-sm mb-2">Batch Nummer</label>
                  <div className="flex items-center space-x-3">
                    <Barcode className="w-5 h-5 text-orange-400" />
                    <span className="text-white font-mono text-lg">{formData.batch_number}</span>
                  </div>
                  <div className="mt-3 bg-white p-2 rounded">
                    <svg viewBox="0 0 200 50" className="w-full h-12">
                      {/* Simple barcode visualization */}
                      {formData.batch_number.split('').map((char, i) => {
                        const width = char.match(/[0-9]/) ? 3 : 2;
                        return (
                          <rect
                            key={i}
                            x={i * 8}
                            y="5"
                            width={width}
                            height="35"
                            fill="black"
                          />
                        );
                      })}
                      <text x="100" y="48" textAnchor="middle" fontSize="8" fill="black">
                        {formData.batch_number}
                      </text>
                    </svg>
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Naam *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bijv. Aardbeien Jerky"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-400"
                  autoFocus
                />
              </div>

              {/* Weight Before/After */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Gewicht Voor (gram) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight_before}
                    onChange={(e) => setFormData({ ...formData, weight_before: e.target.value })}
                    placeholder="Bijv. 40"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Gewicht Na (gram) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight_after}
                    onChange={(e) => setFormData({ ...formData, weight_after: e.target.value })}
                    placeholder="Bijv. 5"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              {/* Weight Loss Preview */}
              {formData.weight_before && formData.weight_after && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <p className="text-orange-400 text-sm font-medium mb-1">Gewichtsverlies</p>
                  <p className="text-orange-400 text-2xl font-bold">
                    -{calculateWeightLoss(parseFloat(formData.weight_before), parseFloat(formData.weight_after)).percentage}%
                  </p>
                  <p className="text-orange-400/60 text-sm">
                    ({calculateWeightLoss(parseFloat(formData.weight_before), parseFloat(formData.weight_after)).loss}g verloren)
                  </p>
                </div>
              )}

              {/* Score */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Score</label>
                <div className="flex items-center space-x-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFormData({ ...formData, score: i + 1 })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${i < formData.score ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`}
                      />
                    </button>
                  ))}
                  <span className="text-white/60 ml-2">{formData.score}/5</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Notities</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Extra notities over deze batch..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-orange-400 h-20"
                />
              </div>

              {/* Main Image */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Hoofdafbeelding</label>
                <div className="flex items-center space-x-4">
                  {formData.image_url && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-white/10 group">
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain bg-white/5" />
                      <button
                        onClick={() => removeImage('main')}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  )}
                  <label className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors flex items-center justify-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>{formData.image_url ? 'Wijzig' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'main')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Before/After Photos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Foto Voor</label>
                  <div className="space-y-2">
                    {formData.photo_before && (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-white/10 group">
                        <img src={formData.photo_before} alt="Voor" className="w-full h-full object-contain bg-white/5" />
                        <button
                          onClick={() => removeImage('before')}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    )}
                    <label className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors flex items-center justify-center space-x-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>{formData.photo_before ? 'Wijzig' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'before')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Foto Na</label>
                  <div className="space-y-2">
                    {formData.photo_after && (
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-white/10 group">
                        <img src={formData.photo_after} alt="Na" className="w-full h-full object-contain bg-white/5" />
                        <button
                          onClick={() => removeImage('after')}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    )}
                    <label className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors flex items-center justify-center space-x-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>{formData.photo_after ? 'Wijzig' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'after')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={resetForm}
                disabled={uploading}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="btn-primary px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50 flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Uploaden...</span>
                  </>
                ) : (
                  <span>{editingBatch ? 'Bijwerken' : 'Toevoegen'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && lightboxPhotos.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-white/70 z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-lg font-medium z-10">
            {currentPhotoIndex + 1} / {lightboxPhotos.length}
          </div>

          {/* Navigation */}
          {lightboxPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 p-3 rounded-full text-white transition-colors z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 p-3 rounded-full text-white transition-colors z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Main Image */}
          <div className="max-w-5xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxPhotos[currentPhotoIndex].url}
              alt={lightboxPhotos[currentPhotoIndex].label}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
            <div className="mt-4 text-white text-xl font-semibold">
              {lightboxPhotos[currentPhotoIndex].label}
            </div>
          </div>

          {/* Thumbnails */}
          {lightboxPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {lightboxPhotos.map((photo, index) => (
                <div
                  key={index}
                  onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(index); }}
                  className={`cursor-pointer transition-all ${
                    index === currentPhotoIndex
                      ? 'ring-2 ring-orange-400 opacity-100'
                      : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="w-16 h-16 object-contain bg-white/5 rounded"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JerkyPage;
