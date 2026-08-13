'use client';

import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';

const PhotoUpload = ({ onPhotosChange = null, maxPhotos = 2 }) => {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setError('');

    // Validate number of files
    if (photos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    // Validate each file
    const validFiles = [];
    for (let file of files) {
      // Check file type
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        setError('Only JPG and PNG files allowed');
        return;
      }

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Each photo must be less than 5MB');
        return;
      }

      validFiles.push(file);
    }

    // Create preview URLs
    const newPhotos = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random()
    }));

    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);

    // Notify parent component
    if (onPhotosChange) {
      onPhotosChange(updatedPhotos.map(p => p.file));
    }

    // Reset input
    event.target.value = '';
  };

  const removePhoto = (id) => {
    const updatedPhotos = photos.filter(p => p.id !== id);
    setPhotos(updatedPhotos);

    if (onPhotosChange) {
      onPhotosChange(updatedPhotos.map(p => p.file));
    }
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-green-600 hover:bg-green-50"
           onClick={() => document.getElementById('photoInput').click()}>
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">Click to upload or drag photos</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB • Max {maxPhotos} photos</p>
        <input
          id="photoInput"
          type="file"
          multiple
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.preview}
                alt="Review photo"
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
