import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  MapPin,
  Clock,
  Car,
  Star,
  CheckCircle,
  Circle,
  Filter,
  TrendingUp,
  Mountain,
  Footprints,
  Target,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  GripVertical
} from 'lucide-react';
import { db, supabase } from '../utils/supabaseClient';
import PersonalAgenda from './PersonalAgenda';

const WandelingenPage = () => {
  const [hikes, setHikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHike, setEditingHike] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created');

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    distance_km: 0,
    estimated_time_hours: 0,
    drive_time_minutes: 0,
    status: 'todo',
    rating: 0,
    notes: '',
    image_url: '',
    photos: [],
    is_favorite: false
  });

  const [imageFile, setImageFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    loadHikes();
  }, []);

  const loadHikes = async () => {
    try {
      setLoading(true);
      const data = await db.hikes.getAll();
      setHikes(data);
    } catch (error) {
      console.error('Error loading hikes:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('wandelingen')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('wandelingen')
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

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.location.trim()) {
      alert('Vul minimaal naam en locatie in');
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

      const hikeData = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        distance_km: formData.distance_km,
        estimated_time_hours: formData.estimated_time_hours,
        drive_time_minutes: formData.drive_time_minutes,
        status: formData.status,
        rating: formData.rating,
        notes: formData.notes.trim(),
        image_url: imageUrl,
        photos: photoUrls,
        is_favorite: formData.is_favorite
      };

      if (editingHike) {
        await db.hikes.update(editingHike.id, hikeData);
        setHikes(hikes.map(h => h.id === editingHike.id ? { ...h, ...hikeData } : h));
      } else {
        const newHike = await db.hikes.create(hikeData);
        setHikes([newHike, ...hikes]);
      }

      resetForm();
      loadHikes();
    } catch (error) {
      console.error('Error saving hike:', error);
      if (error.message.includes('Bucket')) {
        alert('Storage bucket "wandelingen" bestaat nog niet. Maak deze aan in Supabase Storage.');
      } else {
        alert('Fout bij opslaan: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (hike) => {
    setEditingHike(hike);
    setFormData({
      name: hike.name,
      location: hike.location,
      distance_km: hike.distance_km || 0,
      estimated_time_hours: hike.estimated_time_hours || 0,
      drive_time_minutes: hike.drive_time_minutes || 0,
      status: hike.status || 'todo',
      rating: hike.rating || 0,
      notes: hike.notes || '',
      image_url: hike.image_url || '',
      photos: hike.photos || [],
      is_favorite: hike.is_favorite || false
    });
    setImageFile(null);
    setPhotoFiles([]);
    setShowAddModal(true);
  };

  const deleteHike = async (id) => {
    if (!window.confirm('Weet je zeker dat je deze wandeling wilt verwijderen?')) return;

    try {
      await db.hikes.delete(id);
      setHikes(hikes.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting hike:', error);
    }
  };

  const toggleStatus = async (hike) => {
    const newStatus = hike.status === 'done' ? 'todo' : 'done';
    try {
      await db.hikes.update(hike.id, { status: newStatus });
      setHikes(hikes.map(h => h.id === hike.id ? { ...h, status: newStatus } : h));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const toggleFavorite = async (hike) => {
    try {
      await db.hikes.update(hike.id, { is_favorite: !hike.is_favorite });
      setHikes(hikes.map(h => h.id === hike.id ? { ...h, is_favorite: !h.is_favorite } : h));
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const openLightbox = (hike) => {
    const allPhotos = [];
    if (hike.image_url) allPhotos.push(hike.image_url);
    if (hike.photos && hike.photos.length > 0) allPhotos.push(...hike.photos);
    
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
      location: '',
      distance_km: 0,
      estimated_time_hours: 0,
      drive_time_minutes: 0,
      status: 'todo',
      rating: 0,
      notes: '',
      image_url: '',
      photos: [],
      is_favorite: false
    });
    setImageFile(null);
    setPhotoFiles([]);
    setEditingHike(null);
    setShowAddModal(false);
  };

  const getHikeLabel = (hike) => {
    if (hike.estimated_time_hours <= 2) return 'Korte wandeling';
    if (hike.estimated_time_hours <= 5) return 'Middellange wandeling';
    return 'Dagtocht';
  };

  const getHikeLabelColor = (hike) => {
    if (hike.estimated_time_hours <= 2) return 'from-green-500 to-emerald-600';
    if (hike.estimated_time_hours <= 5) return 'from-blue-500 to-cyan-600';
    return 'from-purple-500 to-pink-600';
  };

  const getSuggestedHike = () => {
    const todoHikes = hikes.filter(h => h.status === 'todo');
    if (todoHikes.length === 0) return null;

    return todoHikes.reduce((best, hike) => {
      if (!best) return hike;
      if (hike.drive_time_minutes < best.drive_time_minutes) return hike;
      return best;
    }, null);
  };

  const getStats = () => {
    const doneHikes = hikes.filter(h => h.status === 'done');
    const totalKm = doneHikes.reduce((sum, h) => sum + (h.distance_km || 0), 0);
    const avgRating = doneHikes.length > 0
      ? doneHikes.reduce((sum, h) => sum + (h.rating || 0), 0) / doneHikes.length
      : 0;
    const completionRate = hikes.length > 0 ? (doneHikes.length / hikes.length) * 100 : 0;

    return {
      total: hikes.length,
      done: doneHikes.length,
      todo: hikes.filter(h => h.status === 'todo').length,
      totalKm: totalKm.toFixed(1),
      avgRating: avgRating.toFixed(1),
      completionRate: completionRate.toFixed(0)
    };
  };

  const getFilteredAndSortedHikes = () => {
    let filtered = [...hikes];

    if (filterStatus === 'todo') {
      filtered = filtered.filter(h => h.status === 'todo');
    } else if (filterStatus === 'done') {
      filtered = filtered.filter(h => h.status === 'done');
    } else if (filterStatus === 'favorites') {
      filtered = filtered.filter(h => h.is_favorite);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'drive_time':
          return (a.drive_time_minutes || 0) - (b.drive_time_minutes || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'distance':
          return (b.distance_km || 0) - (a.distance_km || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return filtered;
  };

  const stats = getStats();
  const suggestedHike = getSuggestedHike();
  const filteredHikes = getFilteredAndSortedHikes();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Footprints className="w-8 h-8 mr-3" />
          Wandelingen 
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nieuwe Wandeling</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Mountain className="w-8 h-8 text-blue-400" />
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-white/60">Totaal</div>
            </div>
          </div>
        </div>

        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{stats.completionRate}%</div>
              <div className="text-sm text-white/60">Voltooid</div>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mt-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Footprints className="w-8 h-8 text-purple-400" />
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{stats.totalKm}</div>
              <div className="text-sm text-white/60">Km gewandeld</div>
            </div>
          </div>
        </div>

        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-8 h-8 text-yellow-400" />
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{stats.avgRating}</div>
              <div className="text-sm text-white/60">Gem. score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Hike */}
      {suggestedHike && (
        <div className="gradient-card rounded-xl p-6 bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Ideaal voor vandaag</h3>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold text-white">{suggestedHike.name}</div>
                <div className="flex items-center space-x-4 text-sm text-white/60">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{suggestedHike.location}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Car className="w-4 h-4" />
                    <span>{suggestedHike.drive_time_minutes} min</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Footprints className="w-4 h-4" />
                    <span>{suggestedHike.distance_km} km</span>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleStatus(suggestedHike)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Markeer als gedaan</span>
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="gradient-card rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingHike ? 'Wandeling Bewerken' : 'Nieuwe Wandeling'}
              </h2>
              <button
                onClick={resetForm}
                className="text-white/60 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Basis Informatie</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Naam Wandeling *</label>
                    <input
                      type="text"
                      placeholder="bijv. Hoge Venen Route"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Locatie *</label>
                    <input
                      type="text"
                      placeholder="bijv. Hoge Venen, België"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Afstand (km)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.distance_km}
                      onChange={(e) => setFormData({ ...formData, distance_km: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Wandeltijd (uren)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.estimated_time_hours}
                      onChange={(e) => setFormData({ ...formData, estimated_time_hours: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Rijtijd vanaf thuis (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.drive_time_minutes}
                      onChange={(e) => setFormData({ ...formData, drive_time_minutes: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Score (1-5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.5"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Main Image */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Hoofdafbeelding</h3>
                <div className="space-y-4">
                  {formData.image_url ? (
                    <div className="relative">
                      <img
                        src={formData.image_url}
                        alt="Hoofdafbeelding"
                        className="w-full h-64 object-contain bg-white/5 rounded-lg"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40 transition-colors">
                      <Upload className="w-12 h-12 text-white/40 mb-2" />
                      <span className="text-white/60">Klik om hoofdafbeelding te uploaden</span>
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

              {/* Additional Photos */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Extra Foto's</h3>
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40 transition-colors">
                    <ImageIcon className="w-8 h-8 text-white/40 mb-2" />
                    <span className="text-white/60 text-sm">Klik om foto's toe te voegen</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.photos.map((photo, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handlePhotoDragStart(e, index)}
                          onDragOver={handlePhotoDragOver}
                          onDrop={(e) => handlePhotoDrop(e, index)}
                          className="relative group cursor-move"
                        >
                          <img
                            src={photo}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-32 object-contain bg-white/5 rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <GripVertical className="w-6 h-6 text-white" />
                          </div>
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-white/80 text-sm mb-2">Notities</label>
                <textarea
                  placeholder="Beschrijving, tips, moeilijkheidsgraad..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40"
                  rows="4"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  onClick={resetForm}
                  className="px-6 py-2 text-white/60 hover:text-white transition-colors"
                  disabled={uploading}
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Opslaan...</span>
                    </>
                  ) : (
                    <span>{editingHike ? 'Bijwerken' : 'Toevoegen'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="gradient-card rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <h2 className="text-xl font-bold text-white">Alle Wandelingen</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-white/60" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="all">Alle</option>
                <option value="todo">Nog te doen</option>
                <option value="done">Gedaan</option>
                <option value="favorites">Favorieten</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-white/60" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="created">Nieuwste eerst</option>
                <option value="name">Naam</option>
                <option value="drive_time">Rijtijd</option>
                <option value="rating">Score</option>
                <option value="distance">Afstand</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Hikes Grid */}
      {loading ? (
        <div className="text-center py-12 text-white/50">Laden...</div>
      ) : filteredHikes.length === 0 ? (
        <div className="text-center py-12">
          <Mountain className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-lg">Geen wandelingen gevonden</p>
          <p className="text-white/30 text-sm mt-2">
            {filterStatus !== 'all' 
              ? 'Probeer een ander filter' 
              : 'Voeg je eerste wandeling toe om te beginnen'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHikes.map((hike) => {
            const label = getHikeLabel(hike);
            const labelColor = getHikeLabelColor(hike);
            
            return (
              <div
                key={hike.id}
                className={`gradient-card rounded-xl overflow-hidden hover:scale-105 transition-transform ${
                  hike.status === 'done' ? 'opacity-75' : ''
                }`}
              >
                {/* Image */}
                <div 
                  className="h-48 bg-gradient-to-br from-green-500/20 to-emerald-600/20 relative overflow-hidden cursor-pointer"
                  onClick={() => {
                    if (hike.image_url || (hike.photos && hike.photos.length > 0)) {
                      openLightbox(hike);
                    }
                  }}
                >
                  {hike.image_url ? (
                    <img
                      src={hike.image_url}
                      alt={hike.name}
                      className="w-full h-full object-contain bg-white/5"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Mountain className="w-16 h-16 text-white/20" />
                    </div>
                  )}
                  {hike.photos && hike.photos.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>{hike.photos.length}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(hike);
                    }}
                    className={`absolute top-2 left-2 transition-colors ${
                      hike.status === 'done' 
                        ? 'text-green-400' 
                        : 'text-white/40 hover:text-green-400'
                    }`}
                  >
                    {hike.status === 'done' ? (
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    ) : (
                      <Circle className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${labelColor} mb-3`}>
                    {label}
                  </div>

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
                        {hike.is_favorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                        <span>{hike.name}</span>
                      </h3>
                      <p className="text-white/60 text-sm flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{hike.location}</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEdit(hike)}
                        className="text-white/60 hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteHike(hike.id)}
                        className="text-white/60 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60 flex items-center space-x-1">
                        <Footprints className="w-4 h-4" />
                        <span>Afstand</span>
                      </span>
                      <span className="text-white font-medium">{hike.distance_km} km</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60 flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Wandeltijd</span>
                      </span>
                      <span className="text-white font-medium">{hike.estimated_time_hours}u</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60 flex items-center space-x-1">
                        <Car className="w-4 h-4" />
                        <span>Rijtijd</span>
                      </span>
                      <span className="text-white font-medium">{hike.drive_time_minutes} min</span>
                    </div>
                    {hike.rating > 0 && (
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                        <span className="text-white/60 flex items-center space-x-1">
                          <Star className="w-4 h-4" />
                          <span>Score</span>
                        </span>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < hike.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-white/20'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-white/10 mt-3">
                    <button
                      onClick={() => toggleFavorite(hike)}
                      className="text-white/60 hover:text-yellow-400 transition-colors"
                    >
                      <Star className={`w-5 h-5 ${hike.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PersonalAgenda />

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={closeLightbox}>
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-8 h-8" />
          </button>

          {lightboxPhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                className="absolute left-4 text-white/80 hover:text-white"
              >
                <ChevronLeft className="w-12 h-12" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                className="absolute right-4 text-white/80 hover:text-white"
              >
                <ChevronRight className="w-12 h-12" />
              </button>
            </>
          )}

          <img
            src={lightboxPhotos[currentPhotoIndex]}
            alt="Lightbox"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {lightboxPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/80">
              {currentPhotoIndex + 1} / {lightboxPhotos.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WandelingenPage;
