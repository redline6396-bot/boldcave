'use client';

import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import ReviewForm from './ReviewForm';
import ReviewList from './ReviewList';
import RatingSummary from './RatingSummary';
import { ShopContext } from '@/context/ShopContext';

const ReviewSection = ({ productId }) => {
  const { token, backendUrl } = useContext(ShopContext);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID from localStorage (set when user logs in)
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    setCurrentUserId(userId);
    console.log('Current user ID from localStorage:', userId);
  }, []);

  // Debug user context
  useEffect(() => {
    console.log('=== ReviewSection User Context ===', {
      currentUserId,
      token: !!token,
      backendUrl
    });
  }, [currentUserId, token]);

  // Fetch reviews from API
  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Fetch reviews
      const reviewResponse = await axios.get(`${backendUrl}/api/review/product/${productId}`);
      
      if (reviewResponse.data.success) {
        setReviews(reviewResponse.data.reviews || []);
        setAverageRating(reviewResponse.data.averageRating || 0);
      } else {
        setReviews([]);
        setAverageRating(0);
      }

      // Fetch product data (for review summary)
      try {
        const productResponse = await axios.get(`${backendUrl}/api/product/single?id=${productId}`);
        if (productResponse.data.success) {
          setProduct(productResponse.data.product);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
      setReviews([]);
      setAverageRating(0);
    } finally {
      setIsLoading(false);
    }
  };


  // Handle review submission via API
  const handleReviewSubmit = async (formData) => {
    try {
      setIsFormLoading(true);
      setError('');

      // Add token to headers if available
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        `${backendUrl}/api/review/add`,
        formData,
        { headers }
      );

      if (response.data.success) {
        // Refresh reviews list
        await fetchReviews();
        setShowForm(false);
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Failed to post review');
      }
    } catch (err) {
      console.error('Error posting review:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to post review';
      setError(errorMsg);
      throw err;
    } finally {
      setIsFormLoading(false);
    }
  };

  // Handle review deletion via API
  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      // Add token to headers if available
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.delete(
        `${backendUrl}/api/review/${reviewId}`,
        { headers }
      );

      if (response.data.success) {
        // Refresh reviews list
        await fetchReviews();
      } else {
        setError(response.data.message || 'Failed to delete review');
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete review';
      setError(errorMsg);
    }
  };

  // Handle review edit via API
  const handleEditReview = async (formData) => {
    try {
      setError('');
      const reviewId = formData.get('reviewId');

      // Add token to headers if available
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.put(
        `${backendUrl}/api/review/${reviewId}`,
        formData,
        { headers }
      );

      if (response.data.success) {
        // Refresh reviews list
        await fetchReviews();
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Failed to update review');
      }
    } catch (err) {
      console.error('Error updating review:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update review';
      setError(errorMsg);
      throw err;
    }
  };

  // Get sorted reviews based on sort option
  const getSortedReviews = () => {
    const sortedReviews = [...reviews];

    switch (sortOption) {
      case 'oldest':
        return sortedReviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'highest':
        return sortedReviews.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return sortedReviews.sort((a, b) => a.rating - b.rating);
      case 'newest':
      default:
        return sortedReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  // Handle write review button click - redirect to login if not authenticated
  const handleWriteReviewClick = () => {
    if (!token) {
      // Redirect to login page if not authenticated
      router.push('/login');
    } else {
      // Show review form if authenticated
      setShowForm(!showForm);
    }
  };

  // Initialize router
  const router = useRouter();

  return (
    <section className="py-8 sm:py-12 px-4 sm:px-6 md:px-8 border-t" style={{ borderColor: '#E6E1D8' }}>
      <div className="max-w-5xl mx-auto">
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#1A1A1A' }}>Customer Reviews</h2>
          <button
            onClick={handleWriteReviewClick}
            className="px-3 py-1.5 md:px-6 md:py-2.5 rounded-lg font-semibold transition-colors text-xs md:text-sm whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: showForm ? '#E6E1D8' : '#2F6B3F',
              color: showForm ? '#555' : '#FFF',
              border: `1px solid ${showForm ? '#D0C8BC' : '#2F6B3F'}`
            }}
          >
            {showForm ? 'Cancel' : 'Write a Review'}
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <span className="text-lg sm:text-xl font-bold" style={{ color: '#2F6B3F' }}>
              {averageRating > 0 ? averageRating.toFixed(1) : 'No'} ★
            </span>
            <span className="text-xs sm:text-sm" style={{ color: '#555' }}>
              ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="mb-8">
          <ReviewForm
            productId={productId}
            onSubmit={handleReviewSubmit}
            onClose={() => setShowForm(false)}
            isLoading={isFormLoading}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg mb-6 border" style={{ backgroundColor: '#FFEBEE', borderColor: '#D6524A' }}>
          <p className="text-sm" style={{ color: '#D6524A' }}>{error}</p>
        </div>
      )}

      {/* Rating Summary */}
      <div className="mb-8">
        <RatingSummary reviews={reviews} averageRating={averageRating} />
      </div>

      {/* Sorting Controls */}
      <div className="flex items-center gap-1.5 md:gap-2 mb-6">
        <label className="text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#1A1A1A' }}>Sort:</label>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="px-2 py-1.5 md:px-3 md:py-2 rounded-lg border font-medium text-xs md:text-sm transition-all focus:outline-none focus:ring-2"
          style={{
            borderColor: '#E6E1D8',
            color: '#1A1A1A',
            backgroundColor: '#FFF',
            focusRing: '2px solid #2F6B3F'
          }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest</option>
          <option value="lowest">Lowest</option>
        </select>
      </div>

      {/* Reviews List */}
      <ReviewList
        reviews={getSortedReviews()}
        isLoading={isLoading}
        onDeleteReview={handleDeleteReview}
        onEditReview={handleEditReview}
        currentUserId={currentUserId}
        backendUrl={backendUrl}
        token={token}
      />
      </div>
    </section>
  );
};

export default ReviewSection;
