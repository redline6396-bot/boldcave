'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const PhotoGalleryLightbox = ({ photos, initialIndex = 0, onClose = null }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Normalize photos to always be URL strings
  const normalizedPhotos = photos.map(photo => {
    if (typeof photo === 'string') return photo;
    if (photo?.url) return photo.url;
    return photo;
  });

  console.log('PhotoGalleryLightbox opened:', { 
    photosRaw: photos, 
    normalizedPhotos,
    currentIndex,
    currentPhoto: normalizedPhotos[currentIndex]
  });

  // Prevent body scroll when modal opens
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    setImageLoaded(false);
    setCurrentIndex((prev) => (prev === normalizedPhotos.length - 1 ? 0 : prev + 1));
    setIsZoomed(false);
  }, [normalizedPhotos.length]);

  const handlePrevious = useCallback(() => {
    setImageLoaded(false);
    setCurrentIndex((prev) => (prev === 0 ? normalizedPhotos.length - 1 : prev - 1));
    setIsZoomed(false);
  }, [normalizedPhotos.length]);

  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  // Swipe detection for mobile
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart !== null && e.changedTouches[0].clientX) {
      const distance = touchStart - e.changedTouches[0].clientX;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      if (isLeftSwipe) {
        handleNext();
      }
      if (isRightSwipe) {
        handlePrevious();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleClose}
    >
      {/* Main Modal Container */}
      <div
        className="relative w-full h-full max-w-5xl max-h-screen flex flex-col items-center justify-center px-4 py-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-3 hover:bg-white/15 rounded-full backdrop-blur-md border border-white/10 transition-all duration-200 z-10 group"
          aria-label="Close gallery"
        >
          <X className="w-5 h-5 text-white group-hover:text-[#FFD700]" />
        </button>

        {/* Image Counter Badge */}
        <div className="absolute top-4 left-4 bg-black/40 px-4 py-2.5 rounded-full backdrop-blur-md border border-white/10 text-white text-sm font-medium z-10">
          📷 {currentIndex + 1} / {normalizedPhotos.length}
        </div>

        {/* Main Image Container with Zoom */}
        <div className="relative flex-1 flex items-center justify-center mb-6 w-full max-h-[70vh]">
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg bg-black/30"
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Image with Loading State */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}

            <img
              src={normalizedPhotos[currentIndex]}
              alt={`Gallery image ${currentIndex + 1}`}
              className={`max-w-full max-h-full object-contain transition-all duration-500 ${
                isZoomed ? 'scale-150' : 'scale-100'
              } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />

            {/* Hover Zoom Hint */}
            {imageLoaded && !isZoomed && (
              <div className="absolute bottom-4 right-4 text-white/50 text-xs md:text-sm backdrop-blur-md bg-black/30 px-3 py-2 rounded-full border border-white/10">
                Hover to zoom
              </div>
            )}
          </div>

          {/* Arrow Navigation Buttons */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 hover:bg-white/15 rounded-full backdrop-blur-md border border-white/10 transition-all duration-200 group hidden md:flex items-center justify-center"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 text-white group-hover:text-[#FFD700]" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 hover:bg-white/15 rounded-full backdrop-blur-md border border-white/10 transition-all duration-200 group hidden md:flex items-center justify-center"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 text-white group-hover:text-[#FFD700]" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {normalizedPhotos.length > 1 && (
          <div className="w-full">
            <div className="flex gap-2 justify-center overflow-x-auto pb-2">
              {normalizedPhotos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setImageLoaded(false);
                    setCurrentIndex(idx);
                    setIsZoomed(false);
                  }}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-300 border-2 ${
                    idx === currentIndex
                      ? 'scale-105 ring-1 ring-white/50 shadow-lg shadow-white/20 border-white/50'
                      : 'border-white/20 hover:border-white/40 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Keyboard Hints */}
            <div className="flex items-center justify-center gap-4 mt-4 text-white/50 text-xs md:text-sm flex-wrap px-2">
              <span className="bg-black/30 px-3 py-1.5 rounded backdrop-blur-md border border-white/10">
                ← → Arrow Keys
              </span>
              <span className="bg-black/30 px-3 py-1.5 rounded backdrop-blur-md border border-white/10">
                ESC to Close
              </span>
              {normalizedPhotos.length > 1 && (
                <span className="bg-black/30 px-3 py-1.5 rounded backdrop-blur-md border border-white/10">
                  Click Thumbs
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoGalleryLightbox;
