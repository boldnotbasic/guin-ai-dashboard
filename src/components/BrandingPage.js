import React, { useState, useEffect } from 'react';
import { FileText, Copy, Download, Plus, Edit2, Trash2, X } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const BrandingPage = ({ setActiveTab }) => {
  const [copyToast, setCopyToast] = useState('');
  const [colors, setColors] = useState([]);
  const [fonts, setFonts] = useState([]);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [editingFont, setEditingFont] = useState(null);
  const [newColor, setNewColor] = useState({ hex: '#000000', name: '' });
  const [newFont, setNewFont] = useState({ name: '', type: 'heading', file_url: '' });
  const [loading, setLoading] = useState(true);

  // Helper function to convert HEX to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0 0';
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r} ${g} ${b}`;
  };

  // Helper function to convert RGB to CMYK
  const rgbToCmyk = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0 0 0';
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const k = 1 - Math.max(r, g, b);
    const c = (1 - r - k) / (1 - k) || 0;
    const m = (1 - g - k) / (1 - k) || 0;
    const y = (1 - b - k) / (1 - k) || 0;
    
    return `${Math.round(c * 100)} ${Math.round(m * 100)} ${Math.round(y * 100)} ${Math.round(k * 100)}`;
  };

  useEffect(() => {
    loadBrandingData();
  }, []);

  const loadBrandingData = async () => {
    try {
      const [colorsData, fontsData] = await Promise.all([
        db.brandColors?.getAll() || Promise.resolve([]),
        db.brandFonts?.getAll() || Promise.resolve([])
      ]);
      
      setColors(colorsData || []);
      setFonts(fontsData || []);
    } catch (error) {
      console.error('Error loading branding data:', error);
      setColors([]);
      setFonts([]);
    } finally {
      setLoading(false);
    }
  };
  const brandingTools = [
    {
      id: 'tekkel-branding',
      title: 'Tekkel Branding',
      description: 'Brand guidelines and assets',
      logo: '/tekkel-logo.png',
      badgeClass: 'bg-slate-900/80',
      external: false
    },
    {
      id: 'templates',
      title: 'Templates',
      description: 'Brand templates collection',
      logo: '/tekkel-logo.png',
      badgeClass: 'bg-slate-900/80',
      external: false
    },
    {
      id: 'canva',
      title: 'Canva',
      description: 'Design platform for graphics',
      logo: '/Canva.png',
      badgeClass: 'bg-white',
      external: true,
      url: 'https://www.canva.com/folder/FAFlIEMEtxg'
    },
    {
      id: 'figma',
      title: 'Figma',
      description: 'Collaborative design tool',
      logo: '/Figma.png',
      badgeClass: 'bg-white',
      external: true,
      url: 'https://www.figma.com/files/team/1245743302420148172/recents-and-sharing?fuid=1245740596127828302'
    }
  ];

  const handleCardClick = (tool) => {
    if (tool.external) {
      window.open(tool.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!setActiveTab) return;

    if (tool.id === 'tekkel-branding') {
      setActiveTab('branding-tekkel');
    } else if (tool.id === 'templates') {
      setActiveTab('branding-templates');
    }
  };

  const handleCopyColor = async (hex) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(hex);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = hex;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      // Show toast notification
      setCopyToast(`${hex} gekopieerd!`);
      setTimeout(() => setCopyToast(''), 2000);
    } catch (e) {
      console.error('Failed to copy color', e);
      setCopyToast('Kopiëren mislukt');
      setTimeout(() => setCopyToast(''), 2000);
    }
  };

  const handleDownloadFont = (fontName, fileUrl) => {
    const link = document.createElement('a');
    link.href = fileUrl || `/${fontName}.zip`;
    link.download = fileUrl ? fileUrl.split('/').pop() : `${fontName}.zip`;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveColor = async () => {
    try {
      const colorData = {
        hex: newColor.hex,
        rgb: hexToRgb(newColor.hex),
        cmyk: rgbToCmyk(newColor.hex),
        name: newColor.name || newColor.hex
      };

      if (editingColor) {
        if (db.brandColors?.update) {
          const updated = await db.brandColors.update(editingColor.id, colorData);
          setColors(colors.map(c => c.id === editingColor.id ? updated : c));
        } else {
          setColors(colors.map(c => c.id === editingColor.id ? { ...colorData, id: editingColor.id } : c));
        }
        setEditingColor(null);
      } else {
        if (db.brandColors?.create) {
          const created = await db.brandColors.create(colorData);
          setColors([...colors, created]);
        } else {
          setColors([...colors, { ...colorData, id: Date.now() }]);
        }
      }
      
      setShowColorModal(false);
      setNewColor({ hex: '#000000', name: '' });
    } catch (error) {
      console.error('Error saving color:', error);
      alert('Fout bij opslaan kleur');
    }
  };

  const deleteColor = async (id) => {
    if (!window.confirm('Deze kleur verwijderen?')) return;
    try {
      if (db.brandColors?.delete) {
        await db.brandColors.delete(id);
      }
      setColors(colors.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting color:', error);
    }
  };

  const saveFont = async () => {
    try {
      if (editingFont) {
        if (db.brandFonts?.update) {
          const updated = await db.brandFonts.update(editingFont.id, newFont);
          setFonts(fonts.map(f => f.id === editingFont.id ? updated : f));
        } else {
          setFonts(fonts.map(f => f.id === editingFont.id ? { ...newFont, id: editingFont.id } : f));
        }
        setEditingFont(null);
      } else {
        if (db.brandFonts?.create) {
          const created = await db.brandFonts.create(newFont);
          setFonts([...fonts, created]);
        } else {
          setFonts([...fonts, { ...newFont, id: Date.now() }]);
        }
      }
      
      setShowFontModal(false);
      setNewFont({ name: '', type: 'heading', file_url: '' });
    } catch (error) {
      console.error('Error saving font:', error);
      alert('Fout bij opslaan font');
    }
  };

  const deleteFont = async (id) => {
    if (!window.confirm('Dit font verwijderen?')) return;
    try {
      if (db.brandFonts?.delete) {
        await db.brandFonts.delete(id);
      }
      setFonts(fonts.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting font:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Branding</h1>
          <p className="text-white/60">Design tools and brand resources</p>
        </div>
      </div>

      {/* Branding Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {brandingTools.map((tool) => {
          const Icon = tool.icon;
          
          return (
            <div
              key={tool.id}
              onClick={() => handleCardClick(tool)}
              className="glass-effect rounded-xl p-6 cursor-pointer hover:scale-105 transition-all duration-200 group border border-white/10 hover:border-white/20"
            >
              {/* Logo badge */}
              <div className={`w-16 h-16 rounded-xl ${tool.badgeClass || 'bg-slate-900/60'} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 p-2`}>
                {tool.logo ? (
                  <img 
                    src={tool.logo} 
                    alt={`${tool.title} logo`}
                    className="w-full h-full object-contain"
                  />
                ) : Icon ? (
                  <Icon className="w-8 h-8 text-white" />
                ) : (
                  <div className="w-8 h-8 bg-white/20 rounded"></div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-white/60 text-sm">
                  {tool.description}
                </p>
              </div>

              {/* External link indicator */}
              {tool.external && (
                <div className="mt-4 flex items-center text-white/40 text-xs">
                  <span>External link</span>
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Color palette */}
      <div className="glass-effect rounded-xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Colors</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Copy className="w-3 h-3" />
              Klik om HEX te kopiëren
            </span>
            <button
              onClick={() => {
                setEditingColor(null);
                setNewColor({ hex: '#000000', name: '' });
                setShowColorModal(true);
              }}
              className="btn-primary px-3 py-1.5 rounded-lg text-white text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Kleur Toevoegen
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {colors.map((color) => (
            <div key={color.id || color.hex} className="relative group">
              <button
                onClick={() => handleCopyColor(color.hex)}
                className="w-full flex items-center gap-3 rounded-lg hover:bg-white/5 border border-white/10 hover:border-blue-400/60 transition-colors px-3 py-2 text-left"
              >
                <div
                  className="w-8 h-8 rounded-md border border-white/10 shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="text-[11px] leading-tight text-white/70 space-y-0.5 flex-1">
                  {color.name && (
                    <div className="text-white font-medium text-xs mb-1">{color.name}</div>
                  )}
                  <div>
                    <span className="font-semibold text-white mr-1">HEX</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyColor(color.hex);
                      }}
                      className="font-mono text-white/80 hover:text-blue-300 transition-colors cursor-pointer"
                      title="Klik om HEX te kopiëren"
                    >
                      {color.hex}
                    </button>
                  </div>
                  <div>
                    <span className="font-semibold text-white mr-1">RGB</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyColor(color.rgb);
                      }}
                      className="font-mono text-white/60 hover:text-blue-300 transition-colors cursor-pointer"
                      title="Klik om RGB te kopiëren"
                    >
                      {color.rgb}
                    </button>
                  </div>
                  <div>
                    <span className="font-semibold text-white mr-1">CMYK</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyColor(color.cmyk);
                      }}
                      className="font-mono text-white/60 hover:text-blue-300 transition-colors cursor-pointer"
                      title="Klik om CMYK te kopiëren"
                    >
                      {color.cmyk}
                    </button>
                  </div>
                </div>
                <Copy className="w-3 h-3 text-white/40 group-hover:text-white/70" />
              </button>
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingColor(color);
                    setNewColor({ hex: color.hex, name: color.name || '' });
                    setShowColorModal(true);
                  }}
                  className="p-1 rounded bg-blue-500/80 hover:bg-blue-500 text-white"
                  title="Bewerken"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteColor(color.id);
                  }}
                  className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white"
                  title="Verwijderen"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fonts widget */}
      <div className="glass-effect rounded-xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Fonts</h2>
          <button
            onClick={() => {
              setEditingFont(null);
              setNewFont({ name: '', type: 'heading', file_url: '' });
              setShowFontModal(true);
            }}
            className="btn-primary px-3 py-1.5 rounded-lg text-white text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Font Toevoegen
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {fonts.map((font) => (
            <div key={font.id || font.name} className="relative group rounded-lg border border-white/10 px-4 py-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wide text-white/40">{font.type === 'heading' ? 'Heading' : 'Body'}</span>
                  <div className="text-sm font-semibold text-white">{font.name}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownloadFont(font.name, font.file_url)}
                    className="p-1.5 rounded-md border border-white/20 hover:border-blue-400/60 hover:bg-white/5 transition-colors"
                    title={`Download ${font.name} font`}
                  >
                    <Download className="w-3 h-3 text-white/60 hover:text-white" />
                  </button>
                </div>
              </div>
              <div className="mt-1 text-lg text-white/90" style={{ fontFamily: `${font.name}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` }}>
                {font.type === 'heading' ? 'Tekkel Branding Headline' : 'Dit is een voorbeeld van body copy. Gebruik dit font voor langere teksten.'}
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button
                  onClick={() => {
                    setEditingFont(font);
                    setNewFont({ name: font.name, type: font.type, file_url: font.file_url || '' });
                    setShowFontModal(true);
                  }}
                  className="p-1 rounded bg-blue-500/80 hover:bg-blue-500 text-white"
                  title="Bewerken"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteFont(font.id)}
                  className="p-1 rounded bg-red-500/80 hover:bg-red-500 text-white"
                  title="Verwijderen"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="glass-effect rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Brand Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-white font-medium mb-2">Design Guidelines</h3>
            <p className="text-white/60 text-sm">
              Access our complete brand guidelines including logos, colors, typography, and usage rules.
            </p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">Asset Library</h3>
            <p className="text-white/60 text-sm">
              Download high-resolution logos, icons, and other brand assets for your projects.
            </p>
          </div>
        </div>
      </div>

      {/* Copy Toast Notification */}
      {copyToast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {copyToast}
        </div>
      )}

      {/* Color Modal */}
      {showColorModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-semibold">
                {editingColor ? 'Kleur Bewerken' : 'Kleur Toevoegen'}
              </h2>
              <button
                onClick={() => {
                  setShowColorModal(false);
                  setEditingColor(null);
                  setNewColor({ hex: '#000000', name: '' });
                }}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Naam (optioneel)</label>
                <input
                  type="text"
                  value={newColor.name}
                  onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                  placeholder="Bijv. Primary Blue"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">HEX Kleur</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={newColor.hex}
                    onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                    className="w-16 h-12 rounded-lg border border-white/20 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newColor.hex}
                    onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                    placeholder="#000000"
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>
                <p className="text-white/50 text-xs mt-2">
                  RGB en CMYK worden automatisch berekend
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 space-y-1 text-sm">
                <div className="text-white/70">
                  <span className="font-semibold text-white">RGB:</span> {hexToRgb(newColor.hex)}
                </div>
                <div className="text-white/70">
                  <span className="font-semibold text-white">CMYK:</span> {rgbToCmyk(newColor.hex)}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowColorModal(false);
                  setEditingColor(null);
                  setNewColor({ hex: '#000000', name: '' });
                }}
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button
                onClick={saveColor}
                className="btn-primary px-4 py-2 rounded-lg text-white"
              >
                {editingColor ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Font Modal */}
      {showFontModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-xl font-semibold">
                {editingFont ? 'Font Bewerken' : 'Font Toevoegen'}
              </h2>
              <button
                onClick={() => {
                  setShowFontModal(false);
                  setEditingFont(null);
                  setNewFont({ name: '', type: 'heading', file_url: '' });
                }}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Font Naam</label>
                <input
                  type="text"
                  value={newFont.name}
                  onChange={(e) => setNewFont({ ...newFont, name: e.target.value })}
                  placeholder="Bijv. Acherus"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Type</label>
                <select
                  value={newFont.type}
                  onChange={(e) => setNewFont({ ...newFont, type: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="heading">Heading</option>
                  <option value="body">Body</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Download URL (optioneel)</label>
                <input
                  type="text"
                  value={newFont.file_url}
                  onChange={(e) => setNewFont({ ...newFont, file_url: e.target.value })}
                  placeholder="/fonts/MyFont.zip"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowFontModal(false);
                  setEditingFont(null);
                  setNewFont({ name: '', type: 'heading', file_url: '' });
                }}
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button
                onClick={saveFont}
                className="btn-primary px-4 py-2 rounded-lg text-white"
              >
                {editingFont ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandingPage;
