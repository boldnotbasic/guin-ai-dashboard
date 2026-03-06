import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, Phone, Mail, Globe, Building2, CheckCircle, XCircle, TrendingUp, Filter, Plus, Edit, Trash2, Navigation, Star } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { db } from '../utils/supabaseClient';
import TabQuickLinks from './TabQuickLinks';

// Google Maps API key
const GOOGLE_MAPS_API_KEY = 'AIzaSyBUDSBv8zotL-p7l4mHYFykUGxKveqWB5k';

const libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const ProspectsPage = () => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLocation, setSearchLocation] = useState('');
  const [currentLocation, setCurrentLocation] = useState({ lat: 50.9667, lng: 4.6333 }); // Keerbergen default
  const [zoom, setZoom] = useState(12);
  const [filterStatus, setFilterStatus] = useState('all'); // all, contacted, not_contacted
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);
  const [map, setMap] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [nearbyBusinesses, setNearbyBusinesses] = useState([]);
  const [searchRadius, setSearchRadius] = useState(2000); // 2km default
  const [newProspect, setNewProspect] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    contacted: false,
    likelihood: 'medium',
    notes: ''
  });

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });

  // Load prospects from database
  useEffect(() => {
    loadProspects();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);
          setZoom(14);
          
          // Center map on user location
          if (map) {
            map.panTo(newLocation);
          }
          
          alert('Locatie gevonden! Kaart gecentreerd op jouw positie.');
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Kon locatie niet ophalen. Zorg dat locatietoestemming is ingeschakeld.');
        }
      );
    } else {
      alert('Geolocatie wordt niet ondersteund door je browser.');
    }
  };

  const searchNearbyBusinesses = useCallback(() => {
    if (!map || !window.google) {
      alert('Kaart is nog niet geladen. Probeer het opnieuw.');
      return;
    }

    const service = new window.google.maps.places.PlacesService(map);
    const request = {
      location: currentLocation,
      radius: searchRadius,
      type: ['store', 'establishment']
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        // Haal details op voor elk bedrijf
        const detailedResults = [];
        let processed = 0;
        
        results.slice(0, 20).forEach((place) => {
          service.getDetails(
            { placeId: place.place_id, fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'user_ratings_total', 'photos', 'geometry'] },
            (details, detailsStatus) => {
              processed++;
              if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK) {
                detailedResults.push({
                  ...place,
                  details: details
                });
              }
              
              if (processed === Math.min(results.length, 20)) {
                setNearbyBusinesses(detailedResults);
              }
            }
          );
        });
      } else {
        alert('Geen bedrijven gevonden in deze straal.');
      }
    });
  }, [map, currentLocation, searchRadius]);

  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const loadProspects = async () => {
    try {
      setLoading(true);
      const data = await db.prospects.getAll();
      setProspects(data);
    } catch (error) {
      console.error('Error loading prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProspect = async () => {
    if (!newProspect.name || !newProspect.address) {
      alert('Naam en adres zijn verplicht');
      return;
    }

    try {
      if (editingProspect) {
        await db.prospects.update(editingProspect.id, newProspect);
      } else {
        await db.prospects.create(newProspect);
      }
      await loadProspects();
      resetForm();
    } catch (error) {
      console.error('Error saving prospect:', error);
      alert('Fout bij opslaan prospect');
    }
  };

  const deleteProspect = async (id) => {
    if (!window.confirm('Dit prospect verwijderen?')) return;
    try {
      await db.prospects.delete(id);
      await loadProspects();
    } catch (error) {
      console.error('Error deleting prospect:', error);
      alert('Fout bij verwijderen prospect');
    }
  };

  const toggleContacted = async (prospect) => {
    try {
      await db.prospects.update(prospect.id, { contacted: !prospect.contacted });
      await loadProspects();
    } catch (error) {
      console.error('Error updating prospect:', error);
    }
  };

  const updateLikelihood = async (prospect, likelihood) => {
    try {
      await db.prospects.update(prospect.id, { likelihood });
      await loadProspects();
    } catch (error) {
      console.error('Error updating likelihood:', error);
    }
  };

  const startEdit = (prospect) => {
    setEditingProspect(prospect);
    setNewProspect({
      name: prospect.name,
      address: prospect.address,
      phone: prospect.phone || '',
      email: prospect.email || '',
      website: prospect.website || '',
      contacted: prospect.contacted,
      likelihood: prospect.likelihood,
      notes: prospect.notes || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setNewProspect({
      name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      contacted: false,
      likelihood: 'medium',
      notes: ''
    });
    setEditingProspect(null);
    setShowAddModal(false);
  };

  const getLikelihoodColor = (likelihood) => {
    switch (likelihood) {
      case 'high': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getLikelihoodLabel = (likelihood) => {
    switch (likelihood) {
      case 'high': return 'Hoog';
      case 'medium': return 'Gemiddeld';
      case 'low': return 'Laag';
      default: return 'Onbekend';
    }
  };

  const addBusinessAsProspect = async (business) => {
    const newProspectData = {
      name: business.name,
      address: business.vicinity || business.formatted_address || '',
      phone: business.formatted_phone_number || '',
      website: business.website || '',
      contacted: false,
      likelihood: 'medium',
      notes: `Gevonden via Google Places. Rating: ${business.rating || 'N/A'}`,
      latitude: business.geometry.location.lat(),
      longitude: business.geometry.location.lng()
    };

    try {
      await db.prospects.create(newProspectData);
      await loadProspects();
      alert('Bedrijf toegevoegd als prospect!');
    } catch (error) {
      console.error('Error adding business as prospect:', error);
      alert('Fout bij toevoegen bedrijf');
    }
  };

  if (loadError) {
    return <div className="text-white p-6">Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="text-white p-6">Loading Google Maps...</div>;
  }

  const filteredProspects = prospects.filter(p => {
    if (filterStatus === 'contacted') return p.contacted;
    if (filterStatus === 'not_contacted') return !p.contacted;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Tab Quick Links */}
      <TabQuickLinks tabName="Prospects" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Prospects</h1>
          <p className="text-white/70">Beheer potentiële klanten in je omgeving</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Prospect Toevoegen</span>
        </button>
      </div>

      {/* Map Placeholder & Location Search */}
      <div className="gradient-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xl font-semibold flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-blue-300" />
            <span>Kaart Weergave</span>
          </h2>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Zoek locatie..."
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 w-64"
              />
            </div>
          </div>
        </div>

        {/* Google Maps */}
        <div className="rounded-lg h-96 overflow-hidden border border-white/10">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={currentLocation}
            zoom={zoom}
            onLoad={onMapLoad}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {/* Markers voor opgeslagen prospects */}
            {prospects.filter(p => p.latitude && p.longitude).map((prospect) => (
              <Marker
                key={`prospect-${prospect.id}`}
                position={{ lat: prospect.latitude, lng: prospect.longitude }}
                onClick={() => setSelectedMarker({ type: 'prospect', data: prospect })}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }}
              />
            ))}

            {/* Markers voor gevonden bedrijven in de buurt */}
            {nearbyBusinesses.map((business, index) => (
              <Marker
                key={`business-${index}`}
                position={{
                  lat: business.geometry.location.lat(),
                  lng: business.geometry.location.lng()
                }}
                onClick={() => setSelectedMarker({ type: 'business', data: business })}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                }}
              />
            ))}

            {/* InfoWindow voor geselecteerde marker */}
            {selectedMarker && selectedMarker.type === 'prospect' && (
              <InfoWindow
                position={{
                  lat: selectedMarker.data.latitude,
                  lng: selectedMarker.data.longitude
                }}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div style={{ color: '#000', padding: '8px' }}>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {selectedMarker.data.name}
                  </h3>
                  <p style={{ fontSize: '12px', marginBottom: '4px' }}>
                    {selectedMarker.data.address}
                  </p>
                  <p style={{ fontSize: '12px' }}>
                    {selectedMarker.data.contacted ? '✓ Benaderd' : '✗ Niet benaderd'}
                  </p>
                  <p style={{ fontSize: '12px' }}>
                    Kans: {getLikelihoodLabel(selectedMarker.data.likelihood)}
                  </p>
                </div>
              </InfoWindow>
            )}

            {selectedMarker && selectedMarker.type === 'business' && (
              <InfoWindow
                position={{
                  lat: selectedMarker.data.geometry.location.lat(),
                  lng: selectedMarker.data.geometry.location.lng()
                }}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div style={{ color: '#000', padding: '8px', minWidth: '200px' }}>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                    {selectedMarker.data.name}
                  </h3>
                  <p style={{ fontSize: '12px', marginBottom: '6px', color: '#666' }}>
                    📍 {selectedMarker.data.details?.formatted_address || selectedMarker.data.vicinity}
                  </p>
                  {selectedMarker.data.rating && (
                    <p style={{ fontSize: '12px', marginBottom: '6px' }}>
                      ⭐ {selectedMarker.data.rating} ({selectedMarker.data.user_ratings_total || 0} reviews)
                    </p>
                  )}
                  {selectedMarker.data.details?.formatted_phone_number && (
                    <p style={{ fontSize: '12px', marginBottom: '6px' }}>
                      📞 <a 
                        href={`tel:${selectedMarker.data.details.formatted_phone_number}`}
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                      >
                        {selectedMarker.data.details.formatted_phone_number}
                      </a>
                    </p>
                  )}
                  {selectedMarker.data.details?.website && (
                    <p style={{ fontSize: '12px', marginBottom: '8px' }}>
                      🌐 <a 
                        href={selectedMarker.data.details.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'none' }}
                      >
                        Website
                      </a>
                    </p>
                  )}
                  <button
                    onClick={() => addBusinessAsProspect(selectedMarker.data)}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      width: '100%'
                    }}
                  >
                    ➕ Toevoegen als Prospect
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>

        {/* Map Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={getUserLocation}
              className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
            >
              <Navigation className="w-4 h-4" />
              <span>Mijn Locatie</span>
            </button>
            <select
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="input-plain rounded-lg px-3 py-2 text-sm"
            >
              <option value="1000">1 km</option>
              <option value="2000">2 km</option>
              <option value="5000">5 km</option>
              <option value="10000">10 km</option>
            </select>
            <button
              onClick={searchNearbyBusinesses}
              className="btn-primary px-4 py-2 rounded-lg text-white text-sm flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Zoek Bedrijven</span>
            </button>
          </div>
          <p className="text-white/40 text-xs">
            {nearbyBusinesses.length} bedrijven gevonden
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-white/60" />
          <span className="text-white/70 text-sm">Filter:</span>
        </div>
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === 'all' 
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Alle ({prospects.length})
        </button>
        <button
          onClick={() => setFilterStatus('contacted')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === 'contacted' 
              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Benaderd ({prospects.filter(p => p.contacted).length})
        </button>
        <button
          onClick={() => setFilterStatus('not_contacted')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterStatus === 'not_contacted' 
              ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Niet Benaderd ({prospects.filter(p => !p.contacted).length})
        </button>
      </div>

      {/* Nearby Businesses */}
      {nearbyBusinesses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-white text-2xl font-bold flex items-center space-x-2">
            <Search className="w-6 h-6 text-blue-400" />
            <span>Gevonden Bedrijven ({nearbyBusinesses.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyBusinesses.map((business, index) => {
              const details = business.details || {};
              return (
                <div key={index} className="gradient-card rounded-xl p-6 hover:scale-105 transition-transform">
                  {/* Business Info */}
                  <div className="mb-4">
                    <div className="flex items-start space-x-3 mb-2">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg">{business.name}</h3>
                        <p className="text-white/60 text-sm flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {details.formatted_address || business.vicinity}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  {business.rating && (
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(business.rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-white/70 text-sm">
                        {business.rating} ({business.user_ratings_total || 0})
                      </span>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    {details.formatted_phone_number && (
                      <div className="flex items-center text-white/70 text-sm">
                        <Phone className="w-4 h-4 mr-2" />
                        <a href={`tel:${details.formatted_phone_number}`} className="hover:text-blue-300">
                          {details.formatted_phone_number}
                        </a>
                      </div>
                    )}
                    {details.website && (
                      <div className="flex items-center text-white/70 text-sm">
                        <Globe className="w-4 h-4 mr-2" />
                        <a href={details.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-300 truncate">
                          Website
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Add to Prospects Button */}
                  <button
                    onClick={() => {
                      setNewProspect({
                        name: business.name,
                        address: details.formatted_address || business.vicinity,
                        phone: details.formatted_phone_number || '',
                        email: '',
                        website: details.website || '',
                        contacted: false,
                        lat: business.geometry?.location?.lat() || null,
                        lng: business.geometry?.location?.lng() || null
                      });
                      setShowAddModal(true);
                    }}
                    className="w-full btn-primary px-4 py-2 rounded-lg text-white text-sm flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Toevoegen als Prospect</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prospects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-white/60">
            Laden...
          </div>
        ) : filteredProspects.length === 0 ? (
          <div className="col-span-full text-center py-12 text-white/60">
            Geen prospects gevonden. Klik "Prospect Toevoegen" om te beginnen.
          </div>
        ) : (
          filteredProspects.map((prospect) => (
            <div key={prospect.id} className="gradient-card rounded-xl p-6 hover:scale-105 transition-transform relative group">
              {/* Edit/Delete Buttons */}
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => startEdit(prospect)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteProspect(prospect.id)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Company Info */}
              <div className="mb-4">
                <div className="flex items-start space-x-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-gradient-blue-purple flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">{prospect.name}</h3>
                    <p className="text-white/60 text-sm flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {prospect.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {prospect.phone && (
                  <div className="flex items-center text-white/70 text-sm">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{prospect.phone}</span>
                  </div>
                )}
                {prospect.email && (
                  <div className="flex items-center text-white/70 text-sm">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{prospect.email}</span>
                  </div>
                )}
                {prospect.website && (
                  <div className="flex items-center text-white/70 text-sm">
                    <Globe className="w-4 h-4 mr-2" />
                    <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-300">
                      Website
                    </a>
                  </div>
                )}
              </div>

              {/* Status & Likelihood */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                {/* Contacted Status */}
                <button
                  onClick={() => toggleContacted(prospect)}
                  className={`w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    prospect.contacted
                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {prospect.contacted ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Benaderd</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Nog Niet Benaderd</span>
                    </>
                  )}
                </button>

                {/* Likelihood Selector */}
                <div>
                  <label className="block text-white/60 text-xs mb-1">Kans op samenwerking:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'medium', 'high'].map((level) => (
                      <button
                        key={level}
                        onClick={() => updateLikelihood(prospect, level)}
                        className={`py-1 px-2 rounded text-xs font-medium border transition-colors ${
                          prospect.likelihood === level
                            ? getLikelihoodColor(level)
                            : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {getLikelihoodLabel(level)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {prospect.notes && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-white/50 text-xs">{prospect.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">
                {editingProspect ? 'Prospect Bewerken' : 'Nieuw Prospect Toevoegen'}
              </h2>
              <button onClick={resetForm} className="text-white/70 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-white/70 text-sm mb-2">Bedrijfsnaam *</label>
                <input
                  type="text"
                  value={newProspect.name}
                  onChange={(e) => setNewProspect({...newProspect, name: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Bedrijfsnaam"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Adres *</label>
                <input
                  type="text"
                  value={newProspect.address}
                  onChange={(e) => setNewProspect({...newProspect, address: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Straat 123, Stad"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Telefoon</label>
                <input
                  type="tel"
                  value={newProspect.phone}
                  onChange={(e) => setNewProspect({...newProspect, phone: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="+32 123 45 67 89"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={newProspect.email}
                  onChange={(e) => setNewProspect({...newProspect, email: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="info@bedrijf.be"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Website</label>
                <input
                  type="url"
                  value={newProspect.website}
                  onChange={(e) => setNewProspect({...newProspect, website: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://bedrijf.be"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Kans op samenwerking</label>
                <select
                  value={newProspect.likelihood}
                  onChange={(e) => setNewProspect({...newProspect, likelihood: e.target.value})}
                  className="w-full input-plain rounded-lg px-4 py-2"
                >
                  <option value="low">Laag</option>
                  <option value="medium">Gemiddeld</option>
                  <option value="high">Hoog</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm mb-2">Notities</label>
                <textarea
                  value={newProspect.notes}
                  onChange={(e) => setNewProspect({...newProspect, notes: e.target.value})}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400 h-24"
                  placeholder="Extra informatie over dit prospect..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProspect.contacted}
                    onChange={(e) => setNewProspect({...newProspect, contacted: e.target.checked})}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-white/70 text-sm">Al benaderd</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={addProspect}
                className="btn-primary px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                {editingProspect ? 'Opslaan' : 'Toevoegen'}
              </button>
              <button
                onClick={resetForm}
                className="glass-effect px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectsPage;
