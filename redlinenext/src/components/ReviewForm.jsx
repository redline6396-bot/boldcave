'use client';

import React, { useState } from 'react';
import StarRating from './StarRating';
import PhotoUpload from './PhotoUpload';
import { Send } from 'lucide-react';

const ReviewForm = ({ productId, onSubmit = null, onClose = null, isLoading = false, initialData = null, isEditing = false, reviewId = null }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [reviewText, setReviewText] = useState(initialData?.reviewText || '');
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!reviewText.trim()) {
      setError('Please write a review');
      return;
    }

    if (title && title.length > 100) {
      setError('Title must be less than 100 characters');
      return;
    }

    // Prepare form data
    const formData = new FormData();
    if (isEditing && reviewId) {
      formData.append('reviewId', reviewId);
    }
    formData.append('productId', productId);
    formData.append('rating', rating);
    formData.append('title', title || 'Review');
    formData.append('reviewText', reviewText);

    // Add photos
    if (photos && photos.length > 0) {
      photos.forEach((photo, index) => {
        formData.append(`photo_${index}`, photo);
      });
    }

    if (onSubmit) {
      try {
        await onSubmit(formData);
        setSuccessMessage(isEditing ? 'Your review has been updated!' : 'Your review has been posted!');
        setTimeout(() => {
          // Reset form
          setTitle('');
          setReviewText('');
          setRating(0);
          setPhotos([]);
          if (onClose) onClose();
        }, 1500);
      } catch (err) {
        setError(err.message || 'Failed to post review');
      }
    } else {
      setError('Form handler not configured');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-6 sm:p-8 space-y-5" style={{ borderColor: '#E6E1D8', backgroundColor: '#FFFFFF' }}>
      <h3 className="text-lg sm:text-xl font-semibold" style={{ color: '#1A1A1A' }}>
        {isEditing ? 'Edit Review' : 'Write a Review'}
      </h3>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: '#1A1A1A' }}>Rating</label>
        <StarRating
          rating={rating}
          onRatingChange={setRating}
          isInteractive={true}
          size="xl"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>Title (Optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 100))}
          placeholder="Brief summary of your review"
          maxLength={100}
          className="w-full px-4 py-3 rounded border text-base focus:outline-none transition-all"
          style={{
            borderColor: '#DCDCDC',
            color: '#1A1A1A',
            backgroundColor: '#FFFFFF'
          }}
        />
      </div>

      {/* Review Text */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>Your Review</label>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience..."
          rows="6"
          className="w-full px-4 py-3 rounded border text-base focus:outline-none transition-all resize-none"
          style={{
            borderColor: '#DCDCDC',
            color: '#1A1A1A',
            backgroundColor: '#FFFFFF'
          }}
        />
      </div>

      {/* Photos */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>Photos (Optional)</label>
        <PhotoUpload onPhotosChange={setPhotos} maxPhotos={2} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 sm:p-4 rounded text-sm" style={{ backgroundColor: '#FEE6E6', color: '#C41C1C' }}>
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 sm:p-4 rounded text-sm" style={{ backgroundColor: '#E6F6E6', color: '#2F6B3F' }}>
          {successMessage}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="py-3 px-6 rounded font-medium text-base transition-all flex items-center justify-center gap-2 flex-1 sm:flex-initial"
          style={{
            backgroundColor: '#2F6B3F',
            color: '#FFF',
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? (isEditing ? 'Updating...' : 'Posting...') : (
            <>
              <Send className="w-4 h-4" />
              {isEditing ? 'Update Review' : 'Post Review'}
            </>
          )}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-6 rounded font-medium text-base transition-all flex-1 sm:flex-initial"
            style={{
              borderColor: '#DCDCDC',
              color: '#555',
              backgroundColor: '#FFFFFF',
              border: '1px solid #DCDCDC'
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ReviewForm;
