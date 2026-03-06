import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Car, Upload, X, GripVertical, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { db, supabase } from '../utils/supabaseClient';

const AutoPage = () => {
  const [autos, setAutos] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAuto, setEditingAuto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    photos: [],
    items: [] // Array of {key: '', value: ''}
  });

  const [newItem, setNewItem] = useState({ key: '', value: '' });

  const [imageFile, setImageFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [draggedAuto, setDraggedAuto] = useState(null);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    loadAutos();
  }, []);

  const loadAutos = async () => {
    try {
      const data = await db.autos.getAll();
      setAutos(data);
    } catch (error) {
      console.error('Error loading autos:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('autos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('autos')
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
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, image_url: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      alert('Selecteer alleen afbeeldingen');
      return;
    }

    setPhotoFiles([...photoFiles, ...imageFiles]);

    const newPhotos = [];
    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPhotos.push(reader.result);
        if (newPhotos.length === imageFiles.length) {
          setFormData({ ...formData, photos: [...formData.photos, ...newPhotos] });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    const newFiles = photoFiles.filter((_, i) => i !== index);
    setFormData({ ...formData, photos: newPhotos });
    setPhotoFiles(newFiles);
  };

  const removeImage = () => {
    setFormData({ ...formData, image_url: '' });
    setImageFile(null);
  };

  const handlePhotoDragStart = (e, index) => {
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePhotoDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePhotoDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedPhotoIndex === null || draggedPhotoIndex === dropIndex) return;

    const newPhotos = [...formData.photos];
    const draggedPhoto = newPhotos[draggedPhotoIndex];
    newPhotos.splice(draggedPhotoIndex, 1);
    newPhotos.splice(dropIndex, 0, draggedPhoto);

    const newFiles = [...photoFiles];
    if (newFiles.length > 0) {
      const draggedFile = newFiles[draggedPhotoIndex];
      newFiles.splice(draggedPhotoIndex, 1);
      newFiles.splice(dropIndex, 0, draggedFile);
      setPhotoFiles(newFiles);
    }

    setFormData({ ...formData, photos: newPhotos });
    setDraggedPhotoIndex(null);
  };

  const handleAutoDragStart = (e, auto) => {
    setDraggedAuto(auto);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAutoDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleAutoDrop = async (e, targetAuto) => {
    e.preventDefault();
    if (!draggedAuto || draggedAuto.id === targetAuto.id) return;

    const draggedIndex = autos.findIndex(a => a.id === draggedAuto.id);
    const targetIndex = autos.findIndex(a => a.id === targetAuto.id);

    const newAutos = [...autos];
    newAutos.splice(draggedIndex, 1);
    newAutos.splice(targetIndex, 0, draggedAuto);

    setAutos(newAutos);
    setDraggedAuto(null);

    try {
      await db.autos.updatePositions(newAutos);
    } catch (error) {
      console.error('Error updating positions:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Vul een naam in');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = formData.image_url;
      let photoUrls = formData.photos;

      if (imageFile) {
        imageUrl = await uploadFile(imageFile, 'main');
      }

      if (photoFiles.length > 0) {
        const uploadedPhotos = await Promise.all(
          photoFiles.map(file => uploadFile(file, 'photos'))
        );
        photoUrls = uploadedPhotos;
      }

      const autoData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        image_url: imageUrl,
        photos: photoUrls,
        items: formData.items
      };

      if (editingAuto) {
        await db.autos.update(editingAuto.id, autoData);
        setAutos(autos.map(a => a.id === editingAuto.id ? { ...a, ...autoData } : a));
      } else {
        const newAuto = await db.autos.create(autoData);
        setAutos([newAuto, ...autos]);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving auto:', error);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        alert('Database tabel bestaat nog niet. Voer eerst de SQL queries uit in Supabase.');
      } else if (error.message.includes('Bucket')) {
        alert('Storage bucket "autos" bestaat nog niet. Maak deze aan in Supabase Storage.');
      } else {
        alert('Fout bij opslaan: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (auto) => {
    setEditingAuto(auto);
    setFormData({
      name: auto.name,
      description: auto.description || '',
      image_url: auto.image_url || '',
      photos: auto.photos || [],
      items: auto.items || []
    });
    setImageFile(null);
    setPhotoFiles([]);
    setNewItem({ key: '', value: '' });
    setShowAddModal(true);
  };

  const deleteAuto = async (id) => {
    if (!window.confirm('Weet je zeker dat je deze auto wilt verwijderen?')) return;

    try {
      await db.autos.delete(id);
      setAutos(autos.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting auto:', error);
      alert('Fout bij verwijderen');
    }
  };

  const addItem = () => {
    if (!newItem.key.trim() || !newItem.value.trim()) return;
    setFormData({ ...formData, items: [...formData.items, newItem] });
    setNewItem({ key: '', value: '' });
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const openLightbox = (auto) => {
    const allPhotos = [];
    if (auto.image_url) allPhotos.push(auto.image_url);
    if (auto.photos && auto.photos.length > 0) allPhotos.push(...auto.photos);
    
    if (allPhotos.length > 0) {
      setLightboxPhotos(allPhotos);
      setCurrentPhotoIndex(0);
      setLightboxOpen(true);
    }
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxPhotos([]);
    setCurrentPhotoIndex(0);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % lightboxPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      photos: [],
      items: []
    });
    setImageFile(null);
    setPhotoFiles([]);
    setNewItem({ key: '', value: '' });
    setEditingAuto(null);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
            <Car className="w-8 h-8 text-blue-400" />
            <span>Auto</span>
          </h1>
          <p className="text-white/70">Beheer je wagens en configuraties</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-6 py-3 rounded-lg text-white font-semibold flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nieuwe Auto</span>
        </button>
      </div>

      {/* Autos Grid */}
      {loading ? (
        <div className="text-center py-12 text-white/50">Laden...</div>
      ) : autos.length === 0 ? (
        <div className="text-center py-12">
          <Car className="w-16 h-16 text-blue-400/50 mx-auto mb-4" />
          <p className="text-white/50 text-lg mb-2">Nog geen auto's toegevoegd</p>
          <p className="text-white/40 text-sm">Klik "Nieuwe Auto" om je eerste auto toe te voegen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {autos.map((auto) => (
            <div 
              key={auto.id} 
              draggable
              onDragStart={(e) => handleAutoDragStart(e, auto)}
              onDragOver={handleAutoDragOver}
              onDrop={(e) => handleAutoDrop(e, auto)}
              className="gradient-card rounded-xl overflow-hidden hover:scale-105 transition-transform relative cursor-move group"
            >
              {/* Main Image */}
              {auto.image_url ? (
                <div 
                  className="relative w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(auto);
                  }}
                >
                  <img
                    src={auto.image_url}
                    alt={auto.name}
                    className="w-full h-full object-contain bg-white/5 opacity-90 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {auto.photos && auto.photos.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-white text-xs flex items-center space-x-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>+{auto.photos.length}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900 group-hover:opacity-80 transition-opacity"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/60 px-4 py-2 rounded-lg text-white text-sm font-medium">
                      Klik voor foto's
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-48 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                  <Car className="w-20 h-20 text-white/30" />
                </div>
              )}

              <div className="p-6">
                {/* Drag Handle */}
                <div className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-5 h-5 text-white/60" />
                </div>
                
                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex space-x-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(auto);
                    }}
                    className="text-white/60 hover:text-white transition-colors bg-black/30 p-2 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAuto(auto.id);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors bg-black/30 p-2 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Auto Info */}
                <div className="mb-4">
                  <h3 className="text-white font-bold text-xl mb-2">{auto.name}</h3>
                  {auto.description && (
                    <p className="text-white/50 text-sm line-clamp-2 mb-3">{auto.description}</p>
                  )}
                  
                  {/* Items Lijst */}
                  {auto.items && auto.items.length > 0 && (
                    <div className="space-y-1 mt-3">
                      {auto.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-white/40">{item.key}:</span>
                          <span className="text-white/70 font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="mt-4 pt-4 border-t border-white/10 text-white/40 text-xs">
                  {new Date(auto.created_at).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="gradient-card rounded-xl p-6 w-full max-w-2xl my-8">
            <h2 className="text-white text-2xl font-bold mb-6">
              {editingAuto ? 'Auto Bewerken' : 'Nieuwe Auto Toevoegen'}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Naam *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bijv. Mijn Audi A4"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Omschrijving</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschrijf je auto..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 h-24"
                />
              </div>

              {/* Main Image Upload */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Hoofdafbeelding</label>
                <div className="flex items-center space-x-4">
                  {formData.image_url && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-white/10 group">
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain bg-white/5" />
                      <button
                        onClick={removeImage}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Verwijder afbeelding"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  )}
                  <label className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors flex items-center justify-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>{formData.image_url ? 'Wijzig Afbeelding' : 'Upload Afbeelding'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Photos Upload */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Extra Foto's</label>
                <label className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors flex items-center justify-center space-x-2">
                  <ImageIcon className="w-4 h-4" />
                  <span>Upload Foto's</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {formData.photos.map((photo, index) => (
                      <div 
                        key={index} 
                        draggable
                        onDragStart={(e) => handlePhotoDragStart(e, index)}
                        onDragOver={handlePhotoDragOver}
                        onDrop={(e) => handlePhotoDrop(e, index)}
                        className="relative group cursor-move"
                      >
                        <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-20 object-contain bg-white/5 rounded-lg" />
                        <div className="absolute top-1 left-1 bg-black/60 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-3 h-3 text-white" />
                        </div>
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items/Specs Table */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Specificaties</label>
                <div className="space-y-2">
                  {/* Existing Items */}
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm">
                        <span className="text-white/60">{item.key}:</span> <span className="font-medium">{item.value}</span>
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {/* Add New Item */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newItem.key}
                      onChange={(e) => setNewItem({ ...newItem, key: e.target.value })}
                      placeholder="Bijv. Prijs"
                      className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <input
                      type="text"
                      value={newItem.value}
                      onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                      placeholder="Bijv. €35.000"
                      className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={addItem}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded text-blue-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
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
                  <span>{editingAuto ? 'Bijwerken' : 'Toevoegen'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div 
          className="absolute inset-0 bg-black/95 flex flex-col z-50"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-50"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Main Image */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={lightboxPhotos[currentPhotoIndex]}
              alt={`Foto ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Navigation Arrows */}
          {lightboxPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full text-white text-sm">
            {currentPhotoIndex + 1} / {lightboxPhotos.length}
          </div>

          {/* Thumbnails */}
          {lightboxPhotos.length > 1 && (
            <div 
              className="bg-black/80 p-4 overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex space-x-2 justify-center min-w-max">
                {lightboxPhotos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex(index);
                    }}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden transition-all ${
                      index === currentPhotoIndex
                        ? 'ring-2 ring-blue-400 opacity-100'
                        : 'opacity-50 hover:opacity-75'
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-contain bg-white/5"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoPage;
