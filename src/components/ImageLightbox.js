import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ImageLightbox = ({ images, currentIndex, onClose, onNavigate }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose, onNavigate]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div 
      className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Navigation Buttons */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Image Container */}
      <div 
        className="max-w-7xl max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.image_url}
          alt={currentImage.note || `Screenshot ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
        
        {/* Image Info */}
        {currentImage.note && (
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-white text-center">{currentImage.note}</p>
          </div>
        )}

        {/* Counter */}
        <div className="mt-2 text-center text-white/60 text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
