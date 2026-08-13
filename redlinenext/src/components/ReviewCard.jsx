'use client';

import React, { useState } from 'react';
import axios from 'axios';
import StarRating from './StarRating';
import ReviewForm from './ReviewForm';
import PhotoGalleryLightbox from './PhotoGalleryLightbox';
import { ThumbsUp } from 'lucide-react';

const ReviewCard = ({ review, onDelete = null, onEdit = null, currentUserId = null, backendUrl = '', token = '' }) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [isUserHelpful, setIsUserHelpful] = useState(review.helpfulUsers?.includes(currentUserId) || false);
  const [isLoadingHelpful, setIsLoadingHelpful] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());

  const isReviewByCurrentUser = currentUserId && review.userId === currentUserId;

  // Check if review is older than 24 hours
  const isReviewOlderThan24Hours = () => {
    const reviewDate = new Date(review.createdAt);
    const now = new Date();
    const diffInHours = (now - reviewDate) / (1000 * 60 * 60);
    return diffInHours > 24;
  };

  const canEditReview = isReviewByCurrentUser && !isReviewOlderThan24Hours();
  
  // Debug logging
  if (typeof window !== 'undefined') {
    if (!window.reviewCardLogged) {
      window.reviewCardLogged = new Set();
    }
    if (!window.reviewCardLogged.has(review._id)) {
      console.log('=== ReviewCard Debug ===', {
        id: review._id,
        title: review.title,
        userName: review.userName,
        rating: review.rating,
        reviewText: review.reviewText?.substring(0, 30),
        photosRaw: review.photos,
        photoCount: review.photos?.length || 0,
        photosArray: Array.isArray(review.photos),
        firstPhoto: review.photos?.[0],
        currentUserId,
        reviewUserId: review.userId,
        isReviewByCurrentUser,
        canEditReview,
        hasOnEdit: !!onEdit,
        hasOnDelete: !!onDelete
      });
      window.reviewCardLogged.add(review._id);
    }
  }
  
  const formattedDate = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const photos = review.photos && Array.isArray(review.photos) && review.photos.length > 0 ? review.photos : [];

  const handleImageError = (index) => {
    console.error(`Image failed to load at index ${index}:`, photos[index]);
    setFailedImages(prev => new Set([...prev, index]));
  };

  // Handle marking review as helpful
  const handleMarkHelpful = async () => {
    if (isUserHelpful || isLoadingHelpful || !currentUserId) return;

    try {
      setIsLoadingHelpful(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        `${backendUrl}/api/review/${review._id}/helpful`,
        { userId: currentUserId },
        { headers }
      );

      if (response.data.success) {
        setHelpfulCount(response.data.helpfulCount);
        setIsUserHelpful(true);
      }
    } catch (err) {
      console.error('Error marking review as helpful:', err);
    } finally {
      setIsLoadingHelpful(false);
    }
  };

  return (
    <>
      <div className="border rounded-lg p-5 sm:p-6 space-y-4" style={{ borderColor: '#E6E1D8', backgroundColor: '#FFFFFF' }}>
        {/* Header Section */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            {/* Reviewer Info with Avatar */}
            <div className="flex items-center gap-3 mb-3">
              {/* User Avatar */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: '#2F6B3F' }}
              >
                {review.userName?.substring(0, 2).toUpperCase() || 'U'}
              </div>
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{review.userName}</span>
                  {review.verified && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#E8F5E9', color: '#2F6B3F' }}>
                      ✓ Verified
                    </span>
                  )}
                </div>
                <span className="text-xs" style={{ color: '#777' }}>{formattedDate}</span>
              </div>
            </div>

            {/* Rating Stars */}
            <div className="mb-3">
              <StarRating rating={review.rating} isInteractive={false} size="md" />
            </div>

            {/* Title */}
            {review.title && (
              <h4 className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{review.title}</h4>
            )}
          </div>

          {/* Action Buttons */}
          {isReviewByCurrentUser && (onDelete || onEdit) && (
            <div className="flex gap-2 shrink-0 text-xs">
              {canEditReview && onEdit && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="font-semibold transition-colors"
                  style={{ color: '#2F6B3F' }}
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(review._id)}
                  className="font-semibold transition-colors"
                  style={{ color: '#D6524A' }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Review Text */}
        <p className="text-sm leading-relaxed" style={{ color: '#555' }}>
          {review.reviewText}
        </p>

        {/* Edit Form */}
        {isEditing && onEdit && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E6E1D8' }}>
            <ReviewForm
              productId={review.productId}
              reviewId={review._id}
              initialData={{
                rating: review.rating,
                title: review.title,
                reviewText: review.reviewText
              }}
              isEditing={true}
              onSubmit={async (formData) => {
                const result = await onEdit(formData);
                if (result && result.success) {
                  setIsEditing(false);
                }
                return result;
              }}
              onClose={() => setIsEditing(false)}
            />
          </div>
        )}

        {/* Photos Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2">
            {photos.map((photo, index) => {
              const photoUrl = photo?.url || photo;
              const isFailedImage = failedImages.has(index);
              
              return (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedPhotoIndex(index);
                    setCurrentPhotoIndex(index);
                  }}
                  className="cursor-pointer group relative overflow-hidden rounded-lg h-20 sm:h-24 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#F8F6F2' }}
                >
                  {isFailedImage ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-xs" style={{ color: '#777' }}>Error</p>
                    </div>
                  ) : (
                    <img
                      src={photoUrl}
                      alt={`Review photo ${index + 1}`}
                      onError={() => handleImageError(index)}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Verified Badge */}
        {review.verified && (
          <div className="flex items-center gap-1.5 text-xs pt-2" style={{ color: '#2F6B3F' }}>
            <span>✓</span>
            <span className="font-medium">Verified Purchase</span>
          </div>
        )}

        {/* Helpful Button */}
        <div className="pt-4" style={{ borderTop: '1px solid #E6E1D8' }}>
          <button
            onClick={handleMarkHelpful}
            disabled={isUserHelpful || isLoadingHelpful || !currentUserId}
            className="flex items-center gap-2 text-xs sm:text-sm font-medium transition-colors"
            style={{
              color: isUserHelpful ? '#777' : (currentUserId ? '#2F6B3F' : '#AAA'),
              cursor: (isUserHelpful || isLoadingHelpful || !currentUserId) ? 'default' : 'pointer',
              opacity: isLoadingHelpful ? 0.6 : 1
            }}
          >
            <ThumbsUp className={`w-4 h-4 sm:w-5 sm:h-5 ${isUserHelpful ? 'fill-current' : ''}`} />
            <span>{isUserHelpful ? 'Helpful' : 'Helpful'} ({helpfulCount})</span>
          </button>
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhotoIndex !== null && (
        <PhotoGalleryLightbox
          photos={photos}
          initialIndex={currentPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
        />
      )}
    </>
  );
};

export default ReviewCard;
