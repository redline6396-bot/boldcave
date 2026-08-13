'use client';

import React, { useState } from 'react';
import ReviewCard from './ReviewCard';
import { ChevronDown } from 'lucide-react';

const ReviewList = ({ reviews = [], isLoading = false, onDeleteReview = null, onEditReview = null, currentUserId = null, backendUrl = '', token = '' }) => {
  const [showMore, setShowMore] = useState(false);

  const initialDisplayCount = 3;
  const displayedReviews = showMore ? reviews : reviews.slice(0, initialDisplayCount);
  const hasMoreReviews = reviews.length > initialDisplayCount;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg p-5 h-40 animate-pulse" style={{ backgroundColor: '#F8F6F2' }} />
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-base" style={{ color: '#555' }}>No reviews yet. Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Reviews List */}
      {displayedReviews.map((review) => (
        <ReviewCard
          key={review._id}
          review={review}
          onDelete={onDeleteReview}
          onEdit={onEditReview}
          currentUserId={currentUserId}
          backendUrl={backendUrl}
          token={token}
        />
      ))}

      {/* See More Button */}
      {hasMoreReviews && (
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 group text-sm sm:text-base"
          style={{
            borderColor: '#E6E1D8',
            color: '#2F6B3F',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E6E1D8'
          }}
        >
          {showMore ? (
            <>
              Show Less
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-1 transition-transform rotate-180" />
            </>
          ) : (
            <>
              See All Reviews ({reviews.length})
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ReviewList;
