import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Lightbulb, Upload, X, Folder, ExternalLink, Image as ImageIcon, GripVertical, FolderPlus, FileImage, StickyNote } from 'lucide-react';
import { db, supabase } from '../utils/supabaseClient';
import ImageLightbox from './ImageLightbox';

const IdeaCenterPage = () => {
  const [ideas, setIdeas] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [folders, setFolders] = useState({});
  const [screenshots, setScreenshots] = useState({});
  const [expandedIdeas, setExpandedIdeas] = useState({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [currentIdeaId, setCurrentIdeaId] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newScreenshot, setNewScreenshot] = useState({ image_url: '', note: '' });
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    logo_url: '',
    logo_bg_color: '#FFFFFF',
    local_folder_path: '',
    photos: [] // Array of photo URLs
  });

  const [logoFile, setLogoFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [draggedIdea, setDraggedIdea] = useState(null);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadFolders = async (ideaId) => {
    try {
      const data = await db.ideaFolders.getByIdea(ideaId);
      setFolders(prev => ({ ...prev, [ideaId]: data }));
      
      // Load screenshots for each folder
      for (const folder of data) {
        await loadScreenshots(folder.id);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const loadScreenshots = async (folderId) => {
    try {
      const data = await db.ideaScreenshots.getByFolder(folderId);
      setScreenshots(prev => ({ ...prev, [folderId]: data }));
    } catch (error) {
      console.error('Error loading screenshots:', error);
    }
  };

  const toggleIdeaExpanded = async (ideaId) => {
    const isExpanded = !expandedIdeas[ideaId];
    setExpandedIdeas(prev => ({ ...prev, [ideaId]: isExpanded }));
    
    if (isExpanded && !folders[ideaId]) {
      await loadFolders(ideaId);
    }
  };

  const openFolderModal = (ideaId) => {
    setCurrentIdeaId(ideaId);
    setNewFolderName('');
    setShowFolderModal(true);
  };

  const openScreenshotModal = (folderId) => {
    setCurrentFolderId(folderId);
    setNewScreenshot({ image_url: '', note: '' });
    setScreenshotFile(null);
    setShowScreenshotModal(true);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Vul een mapnaam in');
      return;
    }

    try {
      const folderData = {
        idea_id: currentIdeaId,
        name: newFolderName.trim(),
        position: (folders[currentIdeaId] || []).length
      };
      
      await db.ideaFolders.create(folderData);
      await loadFolders(currentIdeaId);
      setShowFolderModal(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Fout bij aanmaken map: ' + error.message);
    }
  };

  const deleteFolder = async (folderId, ideaId) => {
    if (!window.confirm('Map verwijderen? Alle screenshots in deze map worden ook verwijderd.')) return;
    
    try {
      await db.ideaFolders.delete(folderId);
      await loadFolders(ideaId);
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecteer een afbeelding');
      return;
    }

    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewScreenshot({ ...newScreenshot, image_url: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const createScreenshot = async () => {
    if (!screenshotFile) {
      alert('Upload een screenshot');
      return;
    }

    try {
      setUploading(true);
      
      // Upload screenshot to Supabase storage
      const imageUrl = await uploadFile(screenshotFile, 'screenshots');
      
      const screenshotData = {
        folder_id: currentFolderId,
        image_url: imageUrl,
        note: newScreenshot.note.trim(),
        position: (screenshots[currentFolderId] || []).length
      };
      
      await db.ideaScreenshots.create(screenshotData);
      await loadScreenshots(currentFolderId);
      setShowScreenshotModal(false);
    } catch (error) {
      console.error('Error creating screenshot:', error);
      alert('Fout bij uploaden screenshot: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteScreenshot = async (screenshotId, folderId) => {
    if (!window.confirm('Screenshot verwijderen?')) return;
    
    try {
      await db.ideaScreenshots.delete(screenshotId);
      await loadScreenshots(folderId);
    } catch (error) {
      console.error('Error deleting screenshot:', error);
    }
  };

  const openLightbox = (folderScreenshots, index) => {
    setLightboxImages(folderScreenshots);
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const loadIdeas = async () => {
    try {
      const data = await db.ideas.getAll();
      setIdeas(data);
    } catch (error) {
      console.error('Error loading ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ideas')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('ideas')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecteer een afbeelding');
      return;
    }

    setLogoFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, logo_url: reader.result });
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

    // Create previews
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

  const removeLogo = () => {
    setFormData({ ...formData, logo_url: '' });
    setLogoFile(null);
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

  const handleIdeaDragStart = (e, idea) => {
    setDraggedIdea(idea);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleIdeaDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleIdeaDrop = async (e, targetIdea) => {
    e.preventDefault();
    if (!draggedIdea || draggedIdea.id === targetIdea.id) return;

    const draggedIndex = ideas.findIndex(i => i.id === draggedIdea.id);
    const targetIndex = ideas.findIndex(i => i.id === targetIdea.id);

    const newIdeas = [...ideas];
    newIdeas.splice(draggedIndex, 1);
    newIdeas.splice(targetIndex, 0, draggedIdea);

    setIdeas(newIdeas);
    setDraggedIdea(null);

    // Save new positions to database
    try {
      await db.ideas.updatePositions(newIdeas);
    } catch (error) {
      console.error('Error updating positions:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Vul een titel in');
      return;
    }

    setUploading(true);
    try {
      let logoUrl = formData.logo_url;
      let photoUrls = formData.photos;

      // Upload logo if new file
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, 'logos');
      }

      // Upload photos if new files
      if (photoFiles.length > 0) {
        const uploadedPhotos = await Promise.all(
          photoFiles.map(file => uploadFile(file, 'photos'))
        );
        photoUrls = uploadedPhotos;
      }

      const ideaData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        logo_url: logoUrl,
        local_folder_path: formData.local_folder_path.trim(),
        photos: photoUrls
      };

      if (editingIdea) {
        await db.ideas.update(editingIdea.id, ideaData);
        setIdeas(ideas.map(i => i.id === editingIdea.id ? { ...i, ...ideaData } : i));
      } else {
        const newIdea = await db.ideas.create(ideaData);
        setIdeas([newIdea, ...ideas]);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving idea:', error);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        alert('Database tabel bestaat nog niet. Voer eerst de SQL queries uit in Supabase.');
      } else {
        alert('Fout bij opslaan: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (idea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      description: idea.description || '',
      logo_url: idea.logo_url || '',
      logo_bg_color: idea.logo_bg_color || '#FFFFFF',
      local_folder_path: idea.local_folder_path || '',
      photos: idea.photos || []
    });
    setLogoFile(null);
    setPhotoFiles([]);
    setShowAddModal(true);
  };

  const deleteIdea = async (id) => {
    if (!window.confirm('Weet je zeker dat je dit idee wilt verwijderen?')) return;

    try {
      await db.ideas.delete(id);
      setIdeas(ideas.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting idea:', error);
      alert('Fout bij verwijderen');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      logo_url: '',
      logo_bg_color: '#FFFFFF',
      local_folder_path: '',
      photos: []
    });
    setLogoFile(null);
    setPhotoFiles([]);
    setEditingIdea(null);
    setShowAddModal(false);
  };

  const openLocalFolder = (path) => {
    if (!path) return;
    // Note: Opening local folders from web browser has security restrictions
    // This will work better in Electron or similar desktop app
    window.open(`file://${path}`, '_blank');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
            <Lightbulb className="w-8 h-8 text-yellow-400" />
            <span>Idea Center</span>
          </h1>
          <p className="text-white/70">Verzamel en organiseer je ideeën met foto's en documenten</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-6 py-3 rounded-lg text-white font-semibold flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nieuw Idee</span>
        </button>
      </div>

      {/* Ideas Grid */}
      {loading ? (
        <div className="text-center py-12 text-white/50">Laden...</div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="w-16 h-16 text-yellow-400/50 mx-auto mb-4" />
          <p className="text-white/50 text-lg mb-2">Nog geen ideeën toegevoegd</p>
          <p className="text-white/40 text-sm">Klik "Nieuw Idee" om je eerste idee toe te voegen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => (
            <div 
              key={idea.id} 
              draggable
              onDragStart={(e) => handleIdeaDragStart(e, idea)}
              onDragOver={handleIdeaDragOver}
              onDrop={(e) => handleIdeaDrop(e, idea)}
              className="gradient-card rounded-xl overflow-hidden hover:scale-105 transition-transform relative cursor-move group"
            >
              {/* Photos Preview */}
              {idea.photos && idea.photos.length > 0 && (
                <div className="relative w-full h-40 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
                  <img
                    src={idea.photos[0]}
                    alt={idea.title}
                    className="w-full h-full object-cover object-center opacity-70 group-hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {idea.photos.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
                      +{idea.photos.length - 1} foto's
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900"></div>
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
                      startEdit(idea);
                    }}
                    className="text-white/60 hover:text-white transition-colors bg-black/30 p-2 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteIdea(idea.id);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors bg-black/30 p-2 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Logo & Title */}
                <div className="flex items-start mb-4">
                  {idea.logo_url ? (
                    <div 
                      className="w-12 h-12 rounded-lg overflow-hidden mr-4 flex-shrink-0"
                      style={{ backgroundColor: idea.logo_bg_color || '#FFFFFF' }}
                    >
                      <img
                        src={idea.logo_url}
                        alt={idea.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mr-4 flex-shrink-0">
                      <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg mb-1 truncate">{idea.title}</h3>
                    {idea.description && (
                      <p className="text-white/60 text-sm line-clamp-2">{idea.description}</p>
                    )}
                  </div>
                </div>

                {/* Local Folder Link */}
                {idea.local_folder_path && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openLocalFolder(idea.local_folder_path);
                    }}
                    className="w-full mt-4 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Folder className="w-4 h-4" />
                    <span>Open Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}

                {/* Metadata */}
                <div className="mt-4 pt-4 border-t border-white/10 text-white/40 text-xs">
                  {new Date(idea.created_at).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>

                {/* Folders Section */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60 text-sm font-medium">Mapjes</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openFolderModal(idea.id);
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Map toevoegen"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {expandedIdeas[idea.id] && folders[idea.id] && folders[idea.id].length > 0 ? (
                    <div className="space-y-2">
                      {folders[idea.id].map((folder) => (
                        <div key={folder.id} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Folder className="w-4 h-4 text-yellow-400" />
                              <span className="text-white text-sm font-medium">{folder.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openScreenshotModal(folder.id);
                                }}
                                className="p-1 text-green-400 hover:text-green-300 transition-colors"
                                title="Screenshot toevoegen"
                              >
                                <FileImage className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteFolder(folder.id, idea.id);
                                }}
                                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                title="Map verwijderen"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Screenshots in folder */}
                          {screenshots[folder.id] && screenshots[folder.id].length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {screenshots[folder.id].map((screenshot, idx) => (
                                <div 
                                  key={screenshot.id} 
                                  className="relative group cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openLightbox(screenshots[folder.id], idx);
                                  }}
                                >
                                  <img
                                    src={screenshot.image_url}
                                    alt={screenshot.note || 'Screenshot'}
                                    className="w-full h-20 object-contain bg-white/5 rounded border border-white/10 hover:border-blue-400 transition-colors"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteScreenshot(screenshot.id, folder.id);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-red-500/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </button>
                                  {screenshot.note && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                                      <p className="text-white text-xs truncate">{screenshot.note}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleIdeaExpanded(idea.id);
                      }}
                      className="w-full text-white/40 text-xs hover:text-white/60 transition-colors text-left"
                    >
                      {expandedIdeas[idea.id] ? 'Nog geen mapjes' : 'Klik om mapjes te bekijken'}
                    </button>
                  )}
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
              {editingIdea ? 'Idee Bewerken' : 'Nieuw Idee Toevoegen'}
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Titel *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Bijv. Nieuwe App Idee"
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
                  placeholder="Beschrijf je idee..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 h-24"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Logo</label>
                <div className="flex items-center space-x-4">
                  {formData.logo_url && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden group" style={{ backgroundColor: formData.logo_bg_color }}>
                      <img src={formData.logo_url} alt="Logo preview" className="w-full h-full object-contain" />
                      <button
                        onClick={removeLogo}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Verwijder logo"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  )}
                  <label className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors flex items-center justify-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>{formData.logo_url ? 'Wijzig Logo' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Logo Background Color */}
              {formData.logo_url && (
                <div>
                  <label className="block text-white/70 text-sm mb-2">Logo Achtergrondkleur</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.logo_bg_color}
                      onChange={(e) => setFormData({ ...formData, logo_bg_color: e.target.value })}
                      className="w-16 h-10 rounded border border-white/20 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={formData.logo_bg_color}
                      onChange={(e) => setFormData({ ...formData, logo_bg_color: e.target.value })}
                      placeholder="#FFFFFF"
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Photos Upload */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Foto's</label>
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
                        <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-20 object-cover rounded-lg" />
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

              {/* Local Folder Path */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Lokale Map Pad (optioneel)</label>
                <input
                  type="text"
                  value={formData.local_folder_path}
                  onChange={(e) => setFormData({ ...formData, local_folder_path: e.target.value })}
                  placeholder="/Users/naam/Documents/Project"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                />
                <p className="text-white/40 text-xs mt-1">
                  Plak het volledige pad naar je lokale project map
                </p>
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
                  <span>{editingIdea ? 'Bijwerken' : 'Toevoegen'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-semibold">Nieuwe Map</h3>
              <button onClick={() => setShowFolderModal(false)} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Mapnaam *</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Bijv. Screenshots, Inspiratie, Mockups..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={createFolder}
                  className="flex-1 btn-primary px-6 py-3 rounded-lg text-white font-medium"
                >
                  Map Aanmaken
                </button>
                <button
                  onClick={() => setShowFolderModal(false)}
                  className="flex-1 glass-effect px-6 py-3 rounded-lg text-white font-medium"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshotModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-semibold">Screenshot Toevoegen</h3>
              <button onClick={() => setShowScreenshotModal(false)} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Screenshot Upload */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Screenshot *</label>
                {newScreenshot.image_url ? (
                  <div className="relative">
                    <img
                      src={newScreenshot.image_url}
                      alt="Preview"
                      className="w-full h-48 object-contain bg-white/5 rounded-lg border border-white/20"
                    />
                    <button
                      onClick={() => {
                        setNewScreenshot({ ...newScreenshot, image_url: '' });
                        setScreenshotFile(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-lg hover:bg-red-500"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full px-4 py-8 bg-white/10 border-2 border-dashed border-white/20 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors flex flex-col items-center justify-center space-y-2">
                    <FileImage className="w-8 h-8 text-white/60" />
                    <span className="text-sm">Klik om screenshot te uploaden</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-white/70 text-sm mb-2 flex items-center space-x-2">
                  <StickyNote className="w-4 h-4" />
                  <span>Notitie (optioneel)</span>
                </label>
                <textarea
                  value={newScreenshot.note}
                  onChange={(e) => setNewScreenshot({ ...newScreenshot, note: e.target.value })}
                  placeholder="Voeg een notitie toe aan deze screenshot..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 h-24"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={createScreenshot}
                  disabled={uploading}
                  className="flex-1 btn-primary px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50"
                >
                  {uploading ? 'Uploaden...' : 'Screenshot Toevoegen'}
                </button>
                <button
                  onClick={() => setShowScreenshotModal(false)}
                  disabled={uploading}
                  className="flex-1 glass-effect px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {showLightbox && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
};

export default IdeaCenterPage;
