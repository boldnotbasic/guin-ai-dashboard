import React, { useState, useEffect, useRef } from 'react';
import { Package, Calendar, Scan, Plus, Trash2, Download, Upload, BarChart3, Camera, X } from 'lucide-react';
import { db } from '../utils/supabaseClient';
import Quagga from '@ericblade/quagga2';
import './StoktelllingPage.css';

const StoktelllingPage = () => {
  const [stockCounts, setStockCounts] = useState([]);
  const [currentCount, setCurrentCount] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [manualEntry, setManualEntry] = useState({
    product: '',
    size: '',
    quantity: 1,
    barcode: ''
  });
  const [showManualModal, setShowManualModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [scanMode, setScanMode] = useState('manual'); // 'manual' or 'camera'
  const barcodeInputRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    loadStockCounts();
  }, []);

  useEffect(() => {
    if (isScanning && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [isScanning]);

  const loadStockCounts = async () => {
    try {
      const counts = await db.stockCounts.getAll();
      setStockCounts(counts || []);
    } catch (error) {
      console.error('Error loading stock counts:', error);
    }
  };

  const startNewCount = () => {
    const newCount = {
      date: new Date().toISOString(),
      status: 'in_progress',
      items: []
    };
    setCurrentCount(newCount);
    setScannedItems([]);
    setIsScanning(true);
  };

  const handleBarcodeScanned = (barcode) => {
    if (!barcode.trim()) return;

    const existingItem = scannedItems.find(item => item.barcode === barcode);
    
    if (existingItem) {
      setScannedItems(scannedItems.map(item => 
        item.barcode === barcode 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setScannedItems([...scannedItems, {
        barcode,
        product: `Product ${barcode}`,
        size: 'Onbekend',
        quantity: 1,
        scannedAt: new Date().toISOString()
      }]);
    }
    
    setBarcodeInput('');
  };

  const handleBarcodeInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleBarcodeScanned(barcodeInput);
    }
  };

  const addManualItem = () => {
    if (!manualEntry.product.trim()) {
      alert('Vul een productnaam in');
      return;
    }

    const newItem = {
      barcode: manualEntry.barcode || `MANUAL-${Date.now()}`,
      product: manualEntry.product,
      size: manualEntry.size || 'N/A',
      quantity: parseInt(manualEntry.quantity) || 1,
      scannedAt: new Date().toISOString()
    };

    setScannedItems([...scannedItems, newItem]);
    setManualEntry({ product: '', size: '', quantity: 1, barcode: '' });
    setShowManualModal(false);
  };

  const updateItemQuantity = (barcode, newQuantity) => {
    setScannedItems(scannedItems.map(item =>
      item.barcode === barcode
        ? { ...item, quantity: Math.max(0, parseInt(newQuantity) || 0) }
        : item
    ));
  };

  const removeItem = (barcode) => {
    setScannedItems(scannedItems.filter(item => item.barcode !== barcode));
  };

  const saveStockCount = async () => {
    if (!currentCount || scannedItems.length === 0) {
      alert('Geen items om op te slaan');
      return;
    }

    try {
      const stockCountData = {
        date: currentCount.date,
        status: 'completed',
        items: scannedItems,
        total_items: scannedItems.length,
        total_quantity: scannedItems.reduce((sum, item) => sum + item.quantity, 0),
        completed_at: new Date().toISOString()
      };

      await db.stockCounts.create(stockCountData);
      
      setCurrentCount(null);
      setScannedItems([]);
      setIsScanning(false);
      loadStockCounts();
      
      alert('Stoktelling opgeslagen!');
    } catch (error) {
      console.error('Error saving stock count:', error);
      alert('Fout bij opslaan: ' + error.message);
    }
  };

  const cancelStockCount = () => {
    if (scannedItems.length > 0) {
      if (!window.confirm('Weet je zeker dat je wilt annuleren? Alle gescande items gaan verloren.')) {
        return;
      }
    }
    stopCameraScanner();
    setCurrentCount(null);
    setScannedItems([]);
    setIsScanning(false);
    setScanMode('manual');
  };

  const startCameraScanner = () => {
    setIsCameraScanning(true);
    setScanMode('camera');
    
    setTimeout(() => {
      if (scannerRef.current) {
        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              facingMode: "environment",
              aspectRatio: { min: 1, max: 2 }
            },
            area: {
              top: "20%",
              right: "10%",
              left: "10%",
              bottom: "20%"
            }
          },
          locator: {
            patchSize: "medium",
            halfSample: false
          },
          numOfWorkers: 4,
          frequency: 10,
          decoder: {
            readers: [
              "ean_reader",
              "ean_8_reader",
              "code_128_reader",
              "code_39_reader",
              "code_39_vin_reader",
              "upc_reader",
              "upc_e_reader",
              "i2of5_reader"
            ],
            multiple: false
          },
          locate: true
        }, (err) => {
          if (err) {
            console.error('QuaggaJS init error:', err);
            alert('Camera kon niet worden gestart. Controleer camera permissies.');
            setIsCameraScanning(false);
            setScanMode('manual');
            return;
          }
          Quagga.start();
        });

        let lastScannedCode = '';
        let lastScannedTime = 0;
        
        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            const barcode = result.codeResult.code;
            const now = Date.now();
            
            // Prevent duplicate scans within 1 second
            if (barcode === lastScannedCode && now - lastScannedTime < 1000) {
              return;
            }
            
            lastScannedCode = barcode;
            lastScannedTime = now;
            
            handleBarcodeScanned(barcode);
            
            // Visual feedback
            const canvas = Quagga.canvas.dom.overlay;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.strokeStyle = '#00ff00';
              ctx.lineWidth = 3;
              ctx.strokeRect(0, 0, canvas.width, canvas.height);
              setTimeout(() => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }, 500);
            }
          }
        });
      }
    }, 100);
  };

  const stopCameraScanner = () => {
    if (isCameraScanning) {
      Quagga.stop();
      setIsCameraScanning(false);
    }
  };

  const toggleScanMode = () => {
    if (scanMode === 'manual') {
      startCameraScanner();
    } else {
      stopCameraScanner();
      setScanMode('manual');
    }
  };

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  const exportToCSV = () => {
    if (scannedItems.length === 0) return;

    const headers = ['Product', 'Maat', 'Aantal', 'Barcode'];
    const rows = scannedItems.map(item => [
      item.product,
      item.size,
      item.quantity,
      item.barcode
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stoktelling-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const totalQuantity = scannedItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-blue-purple rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Stoktelling</h1>
            <p className="text-white/60">Scan producten met barcode scanner</p>
          </div>
        </div>
        
        {!currentCount && (
          <button
            onClick={startNewCount}
            className="btn-primary px-6 py-3 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuwe Telling</span>
          </button>
        )}
      </div>

      {/* Active Stock Count */}
      {currentCount && (
        <div className="glass-effect rounded-xl p-6 space-y-6">
          {/* Date and Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-white">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="font-medium">{formatDate(currentCount.date)}</span>
              </div>
              <div className="h-6 w-px bg-white/20"></div>
              <div className="flex items-center space-x-4">
                <div className="text-white/60">
                  <span className="text-2xl font-bold text-white">{scannedItems.length}</span>
                  <span className="ml-1">producten</span>
                </div>
                <div className="text-white/60">
                  <span className="text-2xl font-bold text-white">{totalQuantity}</span>
                  <span className="ml-1">stuks</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={exportToCSV}
                disabled={scannedItems.length === 0}
                className="glass-effect px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setShowManualModal(true)}
                className="glass-effect px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Handmatig</span>
              </button>
            </div>
          </div>

          {/* Scan Mode Toggle */}
          <div className="flex items-center justify-center space-x-3 mb-4">
            <button
              onClick={() => {
                if (scanMode === 'camera') {
                  stopCameraScanner();
                  setScanMode('manual');
                }
              }}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
                scanMode === 'manual'
                  ? 'bg-gradient-blue-purple text-white'
                  : 'glass-effect text-white/60 hover:text-white'
              }`}
            >
              <Scan className="w-5 h-5" />
              <span>Handmatig/Scanner</span>
            </button>
            <button
              onClick={toggleScanMode}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
                scanMode === 'camera'
                  ? 'bg-gradient-blue-purple text-white'
                  : 'glass-effect text-white/60 hover:text-white'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span>Camera Scannen</span>
            </button>
          </div>

          {/* Camera Scanner View */}
          {scanMode === 'camera' && (
            <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ height: '500px' }}>
              <div ref={scannerRef} className="w-full h-full flex items-center justify-center" />
              
              {/* Scanning guide overlay */}
              {isCameraScanning && (
                <>
                  {/* Top bar with status and close */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                    <div className="bg-green-500/90 px-4 py-2 rounded-lg text-white font-medium flex items-center space-x-2">
                      <Camera className="w-5 h-5 animate-pulse" />
                      <span>Scan Area - Plaats barcode in kader</span>
                    </div>
                    <button
                      onClick={() => {
                        stopCameraScanner();
                        setScanMode('manual');
                      }}
                      className="bg-red-500/90 p-2 rounded-lg text-white hover:bg-red-600/90 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Scanning area guide */}
                  <div className="absolute inset-0 pointer-events-none z-5">
                    <div className="absolute inset-0" style={{
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 20%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 80%)',
                    }}>
                      <div className="absolute left-0 right-0" style={{
                        top: '20%',
                        height: '60%',
                        background: 'linear-gradient(to right, rgba(0,0,0,0.5) 10%, transparent 10%, transparent 90%, rgba(0,0,0,0.5) 90%)',
                      }}>
                        {/* Corner guides */}
                        <div className="absolute border-l-4 border-t-4 border-green-400" style={{ top: 0, left: '10%', width: '30px', height: '30px' }}></div>
                        <div className="absolute border-r-4 border-t-4 border-green-400" style={{ top: 0, right: '10%', width: '30px', height: '30px' }}></div>
                        <div className="absolute border-l-4 border-b-4 border-green-400" style={{ bottom: 0, left: '10%', width: '30px', height: '30px' }}></div>
                        <div className="absolute border-r-4 border-b-4 border-green-400" style={{ bottom: 0, right: '10%', width: '30px', height: '30px' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom instruction */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-6 py-3 rounded-lg text-white text-center z-10">
                    <p className="text-sm font-medium">Houd barcode horizontaal in het groene kader</p>
                    <p className="text-xs text-white/70 mt-1">Zorg voor goede verlichting</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Manual Barcode Input */}
          {scanMode === 'manual' && (
            <div className="bg-white/5 rounded-lg p-4 border-2 border-dashed border-blue-400/50">
              <div className="flex items-center space-x-3">
                <Scan className="w-6 h-6 text-blue-400 animate-pulse" />
                <div className="flex-1">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyPress={handleBarcodeInputKeyPress}
                    placeholder="Scan barcode of typ handmatig..."
                    className="w-full bg-transparent border-none text-white text-lg placeholder-white/40 focus:outline-none"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => handleBarcodeScanned(barcodeInput)}
                  disabled={!barcodeInput.trim()}
                  className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Toevoegen
                </button>
              </div>
            </div>
          )}

          {/* Scanned Items Table */}
          {scannedItems.length > 0 ? (
            <div className="bg-white/5 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-4 py-3 text-left text-white/70 font-medium">Product</th>
                    <th className="px-4 py-3 text-left text-white/70 font-medium">Maat</th>
                    <th className="px-4 py-3 text-left text-white/70 font-medium">Barcode</th>
                    <th className="px-4 py-3 text-center text-white/70 font-medium">Aantal</th>
                    <th className="px-4 py-3 text-center text-white/70 font-medium">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {scannedItems.map((item, index) => (
                    <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{item.product}</td>
                      <td className="px-4 py-3 text-white/80">{item.size}</td>
                      <td className="px-4 py-3 text-white/60 font-mono text-sm">{item.barcode}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.barcode, e.target.value)}
                          className="w-20 px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-center focus:outline-none focus:border-blue-400"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeItem(item.barcode)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-white/40">
              <Scan className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Scan je eerste product om te beginnen</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              onClick={cancelStockCount}
              className="glass-effect px-6 py-3 rounded-lg text-white hover:bg-white/10 transition-colors"
            >
              Annuleren
            </button>
            <button
              onClick={saveStockCount}
              disabled={scannedItems.length === 0}
              className="btn-primary px-6 py-3 rounded-lg disabled:opacity-50 flex items-center space-x-2"
            >
              <Package className="w-5 h-5" />
              <span>Telling Opslaan</span>
            </button>
          </div>
        </div>
      )}

      {/* Previous Stock Counts */}
      {!currentCount && stockCounts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Vorige Tellingen</span>
          </h2>
          
          <div className="grid gap-4">
            {stockCounts.map((count, index) => (
              <div key={index} className="glass-effect rounded-lg p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <Package className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">{formatDate(count.date)}</div>
                      <div className="text-white/60 text-sm">
                        {count.total_items} producten • {count.total_quantity} stuks
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                      Voltooid
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentCount && stockCounts.length === 0 && (
        <div className="glass-effect rounded-xl p-12 text-center">
          <Package className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nog geen tellingen</h3>
          <p className="text-white/60 mb-6">Start je eerste stoktelling met de barcode scanner</p>
          <button
            onClick={startNewCount}
            className="btn-primary px-6 py-3 rounded-lg inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuwe Telling Starten</span>
          </button>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-effect rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Handmatig Product Toevoegen</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Product Naam *</label>
                <input
                  type="text"
                  value={manualEntry.product}
                  onChange={(e) => setManualEntry({ ...manualEntry, product: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  placeholder="Bijv. T-shirt Logo"
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2">Maat</label>
                <input
                  type="text"
                  value={manualEntry.size}
                  onChange={(e) => setManualEntry({ ...manualEntry, size: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  placeholder="Bijv. M, L, XL"
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2">Aantal</label>
                <input
                  type="number"
                  value={manualEntry.quantity}
                  onChange={(e) => setManualEntry({ ...manualEntry, quantity: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2">Barcode (optioneel)</label>
                <input
                  type="text"
                  value={manualEntry.barcode}
                  onChange={(e) => setManualEntry({ ...manualEntry, barcode: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  placeholder="Scan of typ barcode"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowManualModal(false);
                  setManualEntry({ product: '', size: '', quantity: 1, barcode: '' });
                }}
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button
                onClick={addManualItem}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoktelllingPage;
