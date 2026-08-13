'use client';

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { NotificationContext } from '@/context/NotificationContext';
import { Check, X, Trash2, RefreshCw } from 'lucide-react';

const ReviewModeration = () => {
  const { showNotification } = useContext(NotificationContext);
  const [token, setToken] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [regenerateProductId, setRegenerateProductId] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Filters
  const [ratingFilter, setRatingFilter] = useState('');
  const [approvedFilter, setApprovedFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [limit] = useState(100);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (ratingFilter) params.append('rating', ratingFilter);
      if (approvedFilter !== '') params.append('approved', approvedFilter);
      if (productFilter) params.append('productId', productFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', limit);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `${backendUrl}/api/review/admin/all?${params.toString()}`,
        { headers }
      );

      if (response.data.success) {
        setReviews(response.data.reviews || []);
        setTotalCount(response.data.totalCount || response.data.reviews?.length || 0);
      } else {
        setError(response.data.message || 'Failed to fetch reviews');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err.message || 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReviews();
    }
  }, [ratingFilter, approvedFilter, productFilter, searchQuery, token]);

  const handleToggleApprove = async (reviewId, currentStatus) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.patch(
        `${backendUrl}/api/review/admin/${reviewId}/approve`,
        {},
        { headers }
      );

      if (response.data.success) {
        setReviews(reviews.map(r => r._id === reviewId ? { ...r, approved: !r.approved } : r));
        showNotification(response.data.message || 'Review updated', 'success');
      } else {
        showNotification(response.data.message || 'Failed to update review', 'error');
      }
    } catch (err) {
      console.error('Error updating review:', err);
      setError(err.message || 'Failed to update review');
    }
  };

  const handleToggleVerify = async (reviewId) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.patch(
        `${backendUrl}/api/review/admin/${reviewId}/verify`,
        {},
        { headers }
      );

      if (response.data.success) {
        setReviews(reviews.map(r => r._id === reviewId ? { ...r, verified: !r.verified } : r));
        showNotification(response.data.message || 'Review updated', 'success');
      } else {
        showNotification(response.data.message || 'Failed to update review', 'error');
      }
    } catch (err) {
      console.error('Error updating review:', err);
      showNotification(err.message || 'Failed to update review', 'error');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.delete(
        `${backendUrl}/api/review/admin/${reviewId}`,
        { headers }
      );

      if (response.data.success) {
        setReviews(reviews.filter(r => r._id !== reviewId));
        showNotification('Review deleted successfully', 'success');
      } else {
        showNotification(response.data.message || 'Failed to delete review', 'error');
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      showNotification(err.message || 'Failed to delete review', 'error');
    }
  };

  const getProductIds = () => {
    const ids = new Set(reviews.map(r => r.productId));
    return Array.from(ids).sort((a, b) => a - b);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getReviewPreview = (text) => {
    return text.substring(0, 80) + (text.length > 80 ? '...' : '');
  };

  const handleRegenerateReviewSummary = async () => {
    if (!regenerateProductId.trim()) {
      showNotification('Please enter a product ID', 'error');
      return;
    }

    try {
      setIsRegenerating(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.post(
        `${backendUrl}/api/product/${regenerateProductId}/regenerate-review-summary`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showNotification('Review summary regenerated successfully', 'success');
        setRegenerateProductId('');
      } else {
        showNotification(response.data.message || 'Failed to regenerate review summary', 'error');
      }
    } catch (err) {
      console.error('Error regenerating review summary:', err);
      showNotification(err.response?.data?.message || 'Failed to regenerate review summary', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!token) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Review Moderation</h1>
          <p className="text-gray-600 mt-2">Manage and moderate customer reviews</p>
        </div>

        {/* Regenerate Review Summary Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-end gap-4 flex-col md:flex-row">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Regenerate Review Summary for Product
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Enter product ID to manually regenerate the review summary
              </p>
              <input
                type="text"
                value={regenerateProductId}
                onChange={(e) => setRegenerateProductId(e.target.value)}
                placeholder="Enter product ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isRegenerating}
              />
            </div>
            <button
              onClick={handleRegenerateReviewSummary}
              disabled={isRegenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4" />
              {isRegenerating ? 'Regenerating...' : 'Regenerate Summary'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by User Name
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating
              </label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            {/* Approved Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={approvedFilter}
                onChange={(e) => setApprovedFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Status</option>
                <option value="true">Approved</option>
                <option value="false">Unapproved</option>
              </select>
            </div>

            {/* Product Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product ID
              </label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Products</option>
                {getProductIds().map((pid) => (
                  <option key={pid} value={pid}>
                    Product {pid}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRatingFilter('');
                  setApprovedFilter('');
                  setProductFilter('');
                }}
                className="w-full px-3 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {reviews.length} of {totalCount} reviews
        </div>

        {/* Reviews Table */}
        {isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No reviews found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Product ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Review</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Approved</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Verified</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reviews.map((review) => (
                    <tr key={review._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {review.productId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div>
                          <p className="font-medium">{review.userName}</p>
                          <p className="text-gray-500 text-xs">{review.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        <span className="inline-block px-2.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          {'★'.repeat(review.rating)} {review.rating}/5
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="max-w-xs">
                          <p>{getReviewPreview(review.reviewText)}</p>
                          {review.title && <p className="text-gray-500 text-xs">Title: {review.title}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleApprove(review._id, review.approved)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                              review.approved
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                            title={review.approved ? 'Approved - click to unapprove' : 'Unapproved - click to approve'}
                          >
                            {review.approved ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleToggleVerify(review._id)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                              review.verified
                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={review.verified ? 'Verified - click to unverify' : 'Unverified - click to verify'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review._id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Delete review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewModeration;
