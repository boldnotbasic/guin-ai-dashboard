import React, { useState, useEffect } from 'react';
import { Save, User, Bell, Shield, Palette, Upload, X } from 'lucide-react';
import { supabase, profiles } from '../utils/supabaseClient';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: false,
    darkMode: true,
    language: 'nl',
    timezone: 'Europe/Amsterdam'
  });

  const [profileData, setProfileData] = useState({
    name: 'Gijs Meteor',
    email: 'gijs@meteor.com',
    role: 'admin'
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      // Load profile from Supabase
      const profile = await profiles.getById(user.id);
      if (profile) {
        setProfileData({
          name: profile.name || 'Gijs Meteor',
          email: profile.email || user.email || 'gijs@meteor.com',
          role: profile.role || 'admin'
        });
        setProfilePhoto(profile.profile_photo_url || null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateProfileData = (key, value) => {
    setProfileData(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      if (!userId) {
        alert('Gebruiker niet gevonden');
        return;
      }

      console.log('Saving profile photo URL:', profilePhoto);
      console.log('User ID:', userId);

      // Try to save to Supabase profiles table
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            name: profileData.name,
            email: profileData.email,
            role: profileData.role,
            profile_photo_url: profilePhoto
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }

        console.log('Updated profile:', data);
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue anyway - save to localStorage
      }

      // Also save to localStorage for quick access
      localStorage.setItem('userSettings', JSON.stringify({
        ...settings,
        ...profileData,
        profilePhoto
      }));
      
      alert('Instellingen opgeslagen!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Fout bij opslaan van instellingen: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selecteer een afbeelding');
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `profile_${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { data, error } = await supabase.storage
        .from('inspiration')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('inspiration')
        .getPublicUrl(filePath);

      setProfilePhoto(publicUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Fout bij uploaden van foto');
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePhoto = () => {
    setProfilePhoto(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/70">Beheer je account en applicatie instellingen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center mb-6">
            <User className="w-5 h-5 text-white mr-3" />
            <h2 className="text-white text-xl font-semibold">Profiel</h2>
          </div>
          
          <div className="space-y-4">
            {/* Profile Photo */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Profielfoto</label>
              <div className="flex items-center space-x-4">
                {profilePhoto ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden group">
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    <button
                      onClick={removeProfilePhoto}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Verwijder foto"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                <label className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white cursor-pointer hover:bg-white/20 transition-colors flex items-center justify-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Uploaden...' : profilePhoto ? 'Wijzig Foto' : 'Upload Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Naam</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => updateProfileData('name', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => updateProfileData('email', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Rol</label>
              <select 
                value={profileData.role}
                onChange={(e) => updateProfileData('role', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              >
                <option value="admin" className="bg-gray-800">Administrator</option>
                <option value="user" className="bg-gray-800">Gebruiker</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center mb-6">
            <Bell className="w-5 h-5 text-white mr-3" />
            <h2 className="text-white text-xl font-semibold">Notificaties</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white">Push notificaties</span>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => updateSetting('notifications', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">Email updates</span>
              <input
                type="checkbox"
                checked={settings.emailUpdates}
                onChange={(e) => updateSetting('emailUpdates', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center mb-6">
            <Palette className="w-5 h-5 text-white mr-3" />
            <h2 className="text-white text-xl font-semibold">Uiterlijk</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">Taal</label>
              <select 
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              >
                <option value="nl" className="bg-gray-800">Nederlands</option>
                <option value="en" className="bg-gray-800">English</option>
                <option value="fr" className="bg-gray-800">Français</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Tijdzone</label>
              <select 
                value={settings.timezone}
                onChange={(e) => updateSetting('timezone', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
              >
                <option value="Europe/Amsterdam" className="bg-gray-800">Amsterdam</option>
                <option value="Europe/London" className="bg-gray-800">London</option>
                <option value="America/New_York" className="bg-gray-800">New York</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="gradient-card rounded-xl p-6">
          <div className="flex items-center mb-6">
            <Shield className="w-5 h-5 text-white mr-3" />
            <h2 className="text-white text-xl font-semibold">Beveiliging</h2>
          </div>
          
          <div className="space-y-4">
            <button className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white hover:bg-white/20 transition-colors">
              Wachtwoord wijzigen
            </button>
            <button className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white hover:bg-white/20 transition-colors">
              Twee-factor authenticatie
            </button>
            <button className="w-full bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2 text-red-300 hover:bg-red-500/30 transition-colors">
              Account deactiveren
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={saveSettings}
          disabled={saving}
          className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Opslaan...' : 'Instellingen opslaan'}</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
