import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Hotel, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  MapPin,
  Euro,
  Users,
  Calendar,
  Star,
  TrendingDown,
  Archive,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  GripVertical,
  Link
} from 'lucide-react';
import { db, supabase } from '../utils/supabaseClient';
import PersonalAgenda from './PersonalAgenda';

const ReizenPage = () => {
  const [destinations, setDestinations] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);
  const [showAddHotel, setShowAddHotel] = useState(false);
  const [showAddFlight, setShowAddFlight] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [editingFlight, setEditingFlight] = useState(null);
  const [selectedHotels, setSelectedHotels] = useState(new Set());
  const [selectedFlights, setSelectedFlights] = useState(new Set());

  const [formData, setFormData] = useState({
    name: '',
    country: '',
    travelers: 2,
    budget: 0,
    start_date: '',
    end_date: '',
    notes: '',
    image_url: '',
    photos: [],
    is_archived: false
  });

  const [imageFile, setImageFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const [newHotel, setNewHotel] = useState({
    name: '',
    price_per_night: 0,
    nights: 1,
    rating: 0,
    notes: '',
    url: '',
    is_favorite: false,
    is_selected: false
  });

  const [newFlight, setNewFlight] = useState({
    airline: '',
    departure: '',
    arrival: '',
    price: 0,
    baggage_included: false,
    notes: '',
    url: '',
    is_favorite: false,
    is_selected: false
  });

  useEffect(() => {
    loadDestinations();
  }, []);

  useEffect(() => {
    if (selectedDestination) {
      loadHotelsAndFlights(selectedDestination.id);
    }
  }, [selectedDestination]);

  const loadDestinations = async () => {
    try {
      setLoading(true);
      const data = await db.destinations.getAll();
      setDestinations(data);
      
      // Load all hotels and flights for all destinations
      if (data.length > 0) {
        const allHotelsPromises = data.map(dest => db.hotels.getByDestination(dest.id));
        const allFlightsPromises = data.map(dest => db.flights.getByDestination(dest.id));
        
        const allHotelsArrays = await Promise.all(allHotelsPromises);
        const allFlightsArrays = await Promise.all(allFlightsPromises);
        
        const allHotels = allHotelsArrays.flat();
        const allFlights = allFlightsArrays.flat();
        
        setHotels(allHotels);
        setFlights(allFlights);
        
        // Initialize selection Sets with all is_selected items
        const selectedHotelIds = new Set(allHotels.filter(h => h.is_selected).map(h => h.id));
        const selectedFlightIds = new Set(allFlights.filter(f => f.is_selected).map(f => f.id));
        setSelectedHotels(selectedHotelIds);
        setSelectedFlights(selectedFlightIds);
      }
    } catch (error) {
      console.error('Error loading destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHotelsAndFlights = async (destinationId) => {
    // Hotels and flights are already loaded globally, no need to reload
    // This function is kept for compatibility but doesn't reload data
  };

  const uploadFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('reizen')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('reizen')
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
    if (!formData.name.trim() || !formData.country.trim()) {
      alert('Vul minimaal naam en land in');
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

      const destinationData = {
        name: formData.name.trim(),
        country: formData.country.trim(),
        travelers: formData.travelers,
        budget: formData.budget,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes.trim(),
        image_url: imageUrl,
        photos: photoUrls,
        is_archived: formData.is_archived
      };

      if (editingDestination) {
        await db.destinations.update(editingDestination.id, destinationData);
        setDestinations(destinations.map(d => d.id === editingDestination.id ? { ...d, ...destinationData } : d));
      } else {
        const newDestination = await db.destinations.create(destinationData);
        setDestinations([newDestination, ...destinations]);
      }

      resetForm();
      loadDestinations();
    } catch (error) {
      console.error('Error saving destination:', error);
      if (error.message.includes('Bucket')) {
        alert('Storage bucket "reizen" bestaat nog niet. Maak deze aan in Supabase Storage.');
      } else {
        alert('Fout bij opslaan: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (destination) => {
    setEditingDestination(destination);
    setFormData({
      name: destination.name,
      country: destination.country,
      travelers: destination.travelers || 2,
      budget: destination.budget || 0,
      start_date: destination.start_date || '',
      end_date: destination.end_date || '',
      notes: destination.notes || '',
      image_url: destination.image_url || '',
      photos: destination.photos || [],
      is_archived: destination.is_archived || false
    });
    setImageFile(null);
    setPhotoFiles([]);
    setShowAddModal(true);
  };

  const deleteDestination = async (id) => {
    if (!window.confirm('Weet je zeker dat je deze bestemming wilt verwijderen?')) return;

    try {
      await db.destinations.delete(id);
      setDestinations(destinations.filter(d => d.id !== id));
      if (selectedDestination?.id === id) {
        setSelectedDestination(null);
      }
    } catch (error) {
      console.error('Error deleting destination:', error);
    }
  };

  const toggleArchive = async (destination) => {
    try {
      await db.destinations.update(destination.id, {
        is_archived: !destination.is_archived
      });
      loadDestinations();
    } catch (error) {
      console.error('Error archiving destination:', error);
    }
  };

  const openLightbox = (destination) => {
    const allPhotos = [];
    if (destination.image_url) allPhotos.push(destination.image_url);
    if (destination.photos && destination.photos.length > 0) allPhotos.push(...destination.photos);
    
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
      country: '',
      travelers: 2,
      budget: 0,
      start_date: '',
      end_date: '',
      notes: '',
      image_url: '',
      photos: [],
      is_archived: false
    });
    setImageFile(null);
    setPhotoFiles([]);
    setEditingDestination(null);
    setShowAddModal(false);
  };

  const addHotel = async () => {
    if (!newHotel.name || !selectedDestination) {
      alert('Vul minimaal hotelnaam in');
      return;
    }

    try {
      // Only send DB columns that exist: name, price_per_night, nights, rating, notes, is_favorite
      const dbPayload = {
        name: newHotel.name,
        price_per_night: Number(newHotel.price_per_night) || 0,
        nights: Number(newHotel.nights) || 1,
        rating: Number(newHotel.rating) || 0,
        notes: newHotel.notes || '',
        is_favorite: !!newHotel.is_favorite,
        url: newHotel.url || ''
      };

      if (editingHotel) {
        await db.hotels.update(editingHotel.id, dbPayload);
        setHotels(hotels.map(h => h.id === editingHotel.id ? { ...h, ...dbPayload } : h));
        setEditingHotel(null);
      } else {
        const hotel = await db.hotels.create({
          ...dbPayload,
          destination_id: selectedDestination.id
        });
        setHotels([...hotels, hotel]);
      }
      setNewHotel({
        name: '',
        price_per_night: 0,
        nights: 1,
        rating: 0,
        notes: '',
        url: '',
        is_favorite: false,
        is_selected: false
      });
      setShowAddHotel(false);
    } catch (error) {
      console.error('Error saving hotel:', error);
      alert('Fout bij opslaan hotel: ' + (error?.message || 'Onbekende fout'));
    }
  };

  const startEditHotel = (hotel) => {
    setEditingHotel(hotel);
    setNewHotel({
      name: hotel.name,
      price_per_night: hotel.price_per_night,
      nights: hotel.nights,
      rating: hotel.rating || 0,
      notes: hotel.notes || '',
      url: hotel.url || '',
      is_favorite: hotel.is_favorite || false,
      is_selected: hotel.is_selected || false
    });
    setShowAddHotel(true);
  };

  const addFlight = async () => {
    if (!newFlight.airline || !selectedDestination) {
      alert('Vul minimaal airline in');
      return;
    }

    try {
      // Sanitize payload for DB columns
      const dbFlight = {
        airline: newFlight.airline,
        departure: newFlight.departure || '',
        arrival: newFlight.arrival || '',
        price: Number(newFlight.price) || 0,
        baggage_included: !!newFlight.baggage_included,
        notes: newFlight.notes || '',
        url: newFlight.url || ''
      };

      if (editingFlight) {
        await db.flights.update(editingFlight.id, dbFlight);
        setFlights(flights.map(f => f.id === editingFlight.id ? { ...f, ...dbFlight } : f));
        setEditingFlight(null);
      } else {
        const flight = await db.flights.create({
          ...dbFlight,
          destination_id: selectedDestination.id
        });
        setFlights([...flights, flight]);
      }
      setNewFlight({
        airline: '',
        departure: '',
        arrival: '',
        price: 0,
        baggage_included: false,
        notes: '',
        url: '',
        is_favorite: false,
        is_selected: false
      });
      setShowAddFlight(false);
    } catch (error) {
      console.error('Error saving flight:', error);
      alert('Fout bij opslaan vlucht');
    }
  };

  const startEditFlight = (flight) => {
    setEditingFlight(flight);
    setNewFlight({
      airline: flight.airline,
      departure: flight.departure || '',
      arrival: flight.arrival || '',
      price: flight.price,
      baggage_included: flight.baggage_included || false,
      notes: flight.notes || '',
      url: flight.url || '',
      is_favorite: flight.is_favorite || false,
      is_selected: flight.is_selected || false
    });
    setShowAddFlight(true);
  };

  const deleteHotel = async (id) => {
    try {
      await db.hotels.delete(id);
      setHotels(hotels.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting hotel:', error);
    }
  };

  const deleteFlight = async (id) => {
    try {
      await db.flights.delete(id);
      setFlights(flights.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting flight:', error);
    }
  };

  const toggleFavoriteHotel = async (hotel) => {
    try {
      await db.hotels.update(hotel.id, {
        is_favorite: !hotel.is_favorite
      });
      loadHotelsAndFlights(selectedDestination.id);
    } catch (error) {
      console.error('Error updating hotel:', error);
    }
  };

  const toggleFavoriteFlight = async (flight) => {
    try {
      await db.flights.update(flight.id, {
        is_favorite: !flight.is_favorite
      });
      loadHotelsAndFlights(selectedDestination.id);
    } catch (error) {
      console.error('Error updating flight:', error);
    }
  };

  const toggleSelectHotel = async (hotel) => {
    const newSelected = new Set(selectedHotels);
    const isSelected = !newSelected.has(hotel.id);
    
    if (newSelected.has(hotel.id)) {
      newSelected.delete(hotel.id);
    } else {
      newSelected.add(hotel.id);
    }
    setSelectedHotels(newSelected);
    
    // Update database
    try {
      await db.hotels.update(hotel.id, { is_selected: isSelected });
      // Update local state
      setHotels(hotels.map(h => h.id === hotel.id ? { ...h, is_selected: isSelected } : h));
    } catch (error) {
      console.error('Error updating hotel selection:', error);
    }
  };

  const toggleSelectFlight = async (flight) => {
    const newSelected = new Set(selectedFlights);
    const isSelected = !newSelected.has(flight.id);
    
    if (newSelected.has(flight.id)) {
      newSelected.delete(flight.id);
    } else {
      newSelected.add(flight.id);
    }
    setSelectedFlights(newSelected);
    
    // Update database
    try {
      await db.flights.update(flight.id, { is_selected: isSelected });
      // Update local state
      setFlights(flights.map(f => f.id === flight.id ? { ...f, is_selected: isSelected } : f));
    } catch (error) {
      console.error('Error updating flight selection:', error);
    }
  };

  const calculateDetailedCosts = () => {
    if (!selectedDestination) return null;

    // Filter alleen geselecteerde items voor deze bestemming
    const selectedHotelsList = hotels.filter(h => 
      h.destination_id === selectedDestination.id && selectedHotels.has(h.id)
    );
    const selectedFlightsList = flights.filter(f => 
      f.destination_id === selectedDestination.id && selectedFlights.has(f.id)
    );

    const totalHotelCost = selectedHotelsList.reduce((sum, h) => sum + (h.price_per_night * h.nights), 0);
    const totalFlightCost = selectedFlightsList.reduce((sum, f) => sum + f.price, 0);
    const totalCost = totalHotelCost + totalFlightCost;
    const costPerPerson = selectedDestination.travelers > 0 ? totalCost / selectedDestination.travelers : 0;
    
    const nights = selectedHotelsList.length > 0 ? Math.max(...selectedHotelsList.map(h => h.nights), 1) : 0;
    const costPerDay = nights > 0 ? totalCost / nights : 0;

    // Filter hotels and flights for current destination only
    const destHotels = hotels.filter(h => h.destination_id === selectedDestination.id);
    const destFlights = flights.filter(f => f.destination_id === selectedDestination.id);
    
    const bestHotel = destHotels.length > 0 
      ? destHotels.reduce((best, h) => {
          const cost = h.price_per_night * h.nights;
          const bestCost = best.price_per_night * best.nights;
          return cost < bestCost ? h : best;
        })
      : null;

    const bestFlight = destFlights.length > 0
      ? destFlights.reduce((best, f) => f.price < best.price ? f : best)
      : null;

    return {
      totalHotelCost,
      totalFlightCost,
      totalCost,
      costPerPerson,
      costPerDay,
      bestHotel,
      bestFlight,
      selectedCount: selectedHotelsList.length + selectedFlightsList.length
    };
  };

  const getBudgetStatus = (destination) => {
    // Always return green
    return 'green';
  };

  const getSelectedTotal = (destination) => {
    const destHotels = hotels.filter(h => h.destination_id === destination.id && selectedHotels.has(h.id));
    const destFlights = flights.filter(f => f.destination_id === destination.id && selectedFlights.has(f.id));
    
    const hotelTotal = destHotels.reduce((sum, h) => sum + (h.price_per_night * h.nights), 0);
    const flightTotal = destFlights.reduce((sum, f) => sum + f.price, 0);
    
    // Don't multiply by travelers - show the same total as detail view
    return hotelTotal + flightTotal;
  };

  const costs = selectedDestination ? calculateDetailedCosts() : null;
  const activeDestinations = destinations.filter(d => !d.is_archived);
  const archivedDestinations = destinations.filter(d => d.is_archived);
  
  // Filter hotels and flights for the selected destination only (for detail view)
  const currentHotels = selectedDestination 
    ? hotels.filter(h => h.destination_id === selectedDestination.id)
    : [];
  const currentFlights = selectedDestination
    ? flights.filter(f => f.destination_id === selectedDestination.id)
    : [];

  // Total across all destinations based on selected items
  const allSelectedTotal = activeDestinations.reduce((sum, d) => sum + getSelectedTotal(d), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Plane className="w-8 h-8 mr-3" />
          Reizen
        </h1>
        <p className="text-white/60">Plan en vergelijk je vakanties</p>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-white font-medium px-3 py-2 rounded bg-gradient-to-r from-green-500 to-emerald-600 bg-opacity-20">
          €{allSelectedTotal.toFixed(2)}
        </span>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nieuwe Bestemming</span>
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="gradient-card rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingDestination ? 'Bestemming Bewerken' : 'Nieuwe Bestemming'}
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
                    <label className="block text-white/80 text-sm mb-2">Naam Bestemming *</label>
                    <input
                      type="text"
                      placeholder="bijv. Alicante"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Land *</label>
                    <input
                      type="text"
                      placeholder="bijv. Spanje"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Aantal Reizigers</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.travelers}
                      onChange={(e) => setFormData({ ...formData, travelers: parseInt(e.target.value) || 1 })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Budget (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Startdatum</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Einddatum</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
                  placeholder="Tips, links, to-do's..."
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
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Opslaan...</span>
                    </>
                  ) : (
                    <span>{editingDestination ? 'Bijwerken' : 'Toevoegen'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Destinations Grid */}
      {loading ? (
        <div className="text-center py-12 text-white/50">Laden...</div>
      ) : activeDestinations.length === 0 ? (
        <div className="text-center py-12">
          <Plane className="w-16 h-16 text-blue-400/50 mx-auto mb-4" />
          <p className="text-white/50 text-lg mb-2">Nog geen bestemmingen toegevoegd</p>
          <p className="text-white/40 text-sm">Klik "Nieuwe Bestemming" om te beginnen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeDestinations.map((destination) => {
            const budgetStatus = getBudgetStatus(destination);
            const budgetColors = {
              green: 'from-green-500 to-emerald-600',
              orange: 'from-orange-500 to-yellow-600',
              red: 'from-red-500 to-pink-600',
              default: 'from-blue-500 to-purple-600'
            };

            return (
              <div
                key={destination.id}
                className="gradient-card rounded-xl overflow-hidden hover:scale-105 transition-transform cursor-pointer"
                onClick={() => setSelectedDestination(destination)}
              >
                {/* Image */}
                <div 
                  className="h-48 bg-gradient-to-br from-blue-500/20 to-purple-600/20 relative overflow-hidden"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (destination.image_url || (destination.photos && destination.photos.length > 0)) {
                      openLightbox(destination);
                    }
                  }}
                >
                  {destination.image_url ? (
                    <img
                      src={destination.image_url}
                      alt={destination.name}
                      className="w-full h-full object-contain bg-white/5"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-16 h-16 text-white/20" />
                    </div>
                  )}
                  {destination.photos && destination.photos.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>{destination.photos.length}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{destination.name}</h3>
                      <p className="text-white/60 text-sm flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{destination.country}</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(destination);
                        }}
                        className="text-white/60 hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArchive(destination);
                        }}
                        className="text-white/60 hover:text-yellow-400 transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDestination(destination.id);
                        }}
                        className="text-white/60 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60 flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>Reizigers</span>
                      </span>
                      <span className="text-white font-medium">{destination.travelers}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Totaal Geselecteerd</span>
                      <span className="text-white font-medium px-2 py-1 rounded bg-gradient-to-r from-green-500 to-emerald-600 bg-opacity-20">
                        €{getSelectedTotal(destination).toFixed(2)}
                      </span>
                    </div>

                    {(destination.start_date || destination.end_date) && (
                      <div className="flex items-center space-x-1 text-sm text-white/60 pt-2 border-t border-white/10">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {destination.start_date && new Date(destination.start_date).toLocaleDateString('nl-NL')}
                          {destination.start_date && destination.end_date && ' - '}
                          {destination.end_date && new Date(destination.end_date).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived Section */}
      {archivedDestinations.length > 0 && (
        <div className="gradient-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Gearchiveerd ({archivedDestinations.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedDestinations.map((destination) => (
              <div
                key={destination.id}
                className="bg-white/5 rounded-lg p-4 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{destination.name}</h3>
                    <p className="text-white/60 text-sm">{destination.country}</p>
                  </div>
                  <button
                    onClick={() => toggleArchive(destination)}
                    className="text-white/60 hover:text-white"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={closeLightbox}>
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

      {/* Detail View Modal */}
      {selectedDestination && !showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setSelectedDestination(null)}>
          <div className="gradient-card rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">{selectedDestination.name}</h2>
              <button
                onClick={() => setSelectedDestination(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {costs && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-1">Totale Kosten</div>
                  <div className="text-2xl font-bold text-white">€{costs.totalCost.toFixed(2)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-1">Per Persoon</div>
                  <div className="text-2xl font-bold text-white">€{costs.costPerPerson.toFixed(2)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/60 text-sm mb-1">Per Dag</div>
                  <div className="text-2xl font-bold text-white">€{costs.costPerDay.toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Hotels Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Hotel className="w-5 h-5" />
                  <span>Hotels</span>
                </h3>
                <button
                  onClick={() => setShowAddHotel(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Toevoegen</span>
                </button>
              </div>

              {showAddHotel && (
                <div className="bg-white/5 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Hotel Naam</label>
                      <input
                        type="text"
                        value={newHotel.name}
                        onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Prijs per Nacht (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newHotel.price_per_night}
                        onChange={(e) => setNewHotel({ ...newHotel, price_per_night: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Aantal Nachten</label>
                      <input
                        type="number"
                        min="1"
                        value={newHotel.nights}
                        onChange={(e) => setNewHotel({ ...newHotel, nights: parseInt(e.target.value) || 1 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Score (1-5)</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={newHotel.rating}
                        onChange={(e) => setNewHotel({ ...newHotel, rating: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Hotel URL (optioneel)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newHotel.url}
                        onChange={(e) => setNewHotel({ ...newHotel, url: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-3">
                    <button
                      onClick={() => setShowAddHotel(false)}
                      className="px-4 py-2 text-white/60 hover:text-white"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={addHotel}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                    >
                      {editingHotel ? 'Bijwerken' : 'Toevoegen'}
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/60 text-sm font-medium pb-3 w-8"></th>
                      <th className="text-left text-white/60 text-sm font-medium pb-3">Naam</th>
                      <th className="text-left text-white/60 text-sm font-medium pb-3">€/Nacht</th>
                      <th className="text-left text-white/60 text-sm font-medium pb-3">Nachten</th>
                      <th className="text-left text-white/60 text-sm font-medium pb-3">Totaal</th>
                      <th className="text-left text-white/60 text-sm font-medium pb-3">Score</th>
                      <th className="text-right text-white/60 text-sm font-medium pb-3">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentHotels.map((hotel) => {
                      const totalPrice = hotel.price_per_night * hotel.nights;
                      const isBest = costs?.bestHotel?.id === hotel.id;
                      
                      return (
                        <tr key={hotel.id} className={`border-b border-white/5 ${isBest ? 'bg-green-500/10' : ''} ${selectedHotels.has(hotel.id) ? 'bg-blue-500/10' : ''}`}>
                          <td className="py-4 px-2">
                            <input
                              type="checkbox"
                              checked={selectedHotels.has(hotel.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectHotel(hotel);
                              }}
                              className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer accent-blue-500"
                            />
                          </td>
                          <td className="py-4 px-3 text-white">
                            <div className="flex items-center space-x-2">
                              {hotel.is_favorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                              {isBest && <TrendingDown className="w-4 h-4 text-green-400" />}
                              <span>{hotel.name}</span>
                              {hotel.url && (
                                <a href={hotel.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300" title="Open link">
                                  <Link className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-3 text-white">€{hotel.price_per_night.toFixed(2)}</td>
                          <td className="py-4 px-3 text-white">{hotel.nights}</td>
                          <td className="py-4 px-3 text-white font-semibold">€{totalPrice.toFixed(2)}</td>
                          <td className="py-4 px-3 text-white">
                            {hotel.rating > 0 && (
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span>{hotel.rating}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => startEditHotel(hotel)}
                                className="text-white/60 hover:text-blue-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleFavoriteHotel(hotel)}
                                className="text-white/60 hover:text-yellow-400"
                              >
                                <Star className={`w-4 h-4 ${hotel.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              </button>
                              <button
                                onClick={() => deleteHotel(hotel.id)}
                                className="text-white/60 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {hotels.length === 0 && (
                  <div className="text-center text-white/40 py-8">
                    Nog geen hotels toegevoegd
                  </div>
                )}
              </div>
            </div>

            {/* Flights Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Plane className="w-5 h-5" />
                  <span>Vluchten</span>
                </h3>
                <button
                  onClick={() => setShowAddFlight(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Toevoegen</span>
                </button>
              </div>

              {showAddFlight && (
                <div className="bg-white/5 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Airline</label>
                      <input
                        type="text"
                        value={newFlight.airline}
                        onChange={(e) => setNewFlight({ ...newFlight, airline: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Prijs (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newFlight.price}
                        onChange={(e) => setNewFlight({ ...newFlight, price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Vertrek</label>
                      <input
                        type="text"
                        placeholder="bijv. BRU"
                        value={newFlight.departure}
                        onChange={(e) => setNewFlight({ ...newFlight, departure: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Aankomst</label>
                      <input
                        type="text"
                        placeholder="bijv. ALC"
                        value={newFlight.arrival}
                        onChange={(e) => setNewFlight({ ...newFlight, arrival: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="baggage"
                        checked={newFlight.baggage_included}
                        onChange={(e) => setNewFlight({ ...newFlight, baggage_included: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="baggage" className="text-white text-sm">Bagage inbegrepen</label>
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-1">Vlucht URL (optioneel)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newFlight.url}
                        onChange={(e) => setNewFlight({ ...newFlight, url: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-3">
                    <button
                      onClick={() => setShowAddFlight(false)}
                      className="px-4 py-2 text-white/60 hover:text-white"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={addFlight}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                    >
                      {editingFlight ? 'Bijwerken' : 'Toevoegen'}
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/60 text-sm font-medium pb-3 w-8"></th>
                      <th className="text-left text-white/60 text-sm font-medium pb-3">Airline</th>
                      <th className="text-left text-white/60 text-sm font-medium pb-3">Route</th>
                      <th className="text-left text-white/60 text-sm font-medium pb-3">Prijs</th>
                      <th className="text-left text-white/60 text-sm font-medium pb-3">Bagage</th>
                      <th className="text-right text-white/60 text-sm font-medium pb-3">Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFlights.map((flight) => {
                      const isBest = costs?.bestFlight?.id === flight.id;
                      
                      return (
                        <tr key={flight.id} className={`border-b border-white/5 ${isBest ? 'bg-green-500/10' : ''} ${selectedFlights.has(flight.id) ? 'bg-blue-500/10' : ''}`}>
                          <td className="py-4 px-2">
                            <input
                              type="checkbox"
                              checked={selectedFlights.has(flight.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectFlight(flight);
                              }}
                              className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer accent-blue-500"
                            />
                          </td>
                          <td className="py-4 px-3 text-white">
                            <div className="flex items-center space-x-2">
                              {flight.is_favorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                              {isBest && <TrendingDown className="w-4 h-4 text-green-400" />}
                              <span>{flight.airline}</span>
                              {flight.url && (
                                <a href={flight.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300" title="Open link">
                                  <Link className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-3 text-white text-sm">
                            {flight.departure} → {flight.arrival}
                          </td>
                          <td className="py-4 px-3 text-white font-semibold">€{flight.price.toFixed(2)}</td>
                          <td className="py-4 px-3 text-white">
                            {flight.baggage_included ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <X className="w-4 h-4 text-red-400" />
                            )}
                          </td>
                          <td className="py-4 px-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => startEditFlight(flight)}
                                className="text-white/60 hover:text-blue-400"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleFavoriteFlight(flight)}
                                className="text-white/60 hover:text-yellow-400"
                              >
                                <Star className={`w-4 h-4 ${flight.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              </button>
                              <button
                                onClick={() => deleteFlight(flight.id)}
                                className="text-white/60 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {flights.length === 0 && (
                  <div className="text-center text-white/40 py-8">
                    Nog geen vluchten toegevoegd
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <PersonalAgenda />
    </div>
  );
};

export default ReizenPage;
