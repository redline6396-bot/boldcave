'use client';

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { NotificationContext } from '@/context/NotificationContext';
import { X, Plus, Trash2 } from 'lucide-react';

const Coupon = () => {
  const { showNotification } = useContext(NotificationContext);
  const [token, setToken] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    maxDiscount: '',
    minOrderAmount: '',
    expiryDate: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get(`${backendUrl}/api/coupon/list`, { headers });

      if (response.data.success) {
        setCoupons(response.data.coupons || []);
      } else {
        showNotification('Failed to load coupons', 'error');
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
      showNotification('Failed to load coupons', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCoupons();
    }
  }, [token]);

  const validateForm = () => {
    const errors = {};

    if (!formData.code.trim()) {
      errors.code = 'Code is required';
    } else if (formData.code.trim().length < 3) {
      errors.code = 'Code must be at least 3 characters';
    }

    if (!formData.discountValue) {
      errors.discountValue = 'Discount value is required';
    } else if (formData.discountValue <= 0) {
      errors.discountValue = 'Discount must be greater than 0';
    } else if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      errors.discountValue = 'Percentage cannot exceed 100';
    }

    if (!formData.expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    }

    if (formData.minOrderAmount && formData.minOrderAmount < 0) {
      errors.minOrderAmount = 'Minimum order amount cannot be negative';
    }

    if (formData.maxDiscount && formData.maxDiscount < 0) {
      errors.maxDiscount = 'Max discount cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : undefined,
        expiryDate: formData.expiryDate
      };

      const response = await axios.post(`${backendUrl}/api/coupon/create`, payload, { headers });

      if (response.data.success) {
        showNotification('Coupon created successfully', 'success');
        setFormData({
          code: '',
          discountType: 'percentage',
          discountValue: '',
          maxDiscount: '',
          minOrderAmount: '',
          expiryDate: ''
        });
        setFormErrors({});
        setShowCreateModal(false);
        fetchCoupons();
      } else {
        showNotification(response.data.message || 'Failed to create coupon', 'error');
      }
    } catch (err) {
      console.error('Error creating coupon:', err);
      showNotification(err.response?.data?.message || 'Failed to create coupon', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (couponId, currentStatus) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post(
        `${backendUrl}/api/coupon/toggle-status`,
        { couponId },
        { headers }
      );

      if (response.data.success) {
        setCoupons(coupons.map(c => c._id === couponId ? { ...c, isActive: !c.isActive } : c));
        showNotification('Coupon status updated', 'success');
      } else {
        showNotification('Failed to update coupon status', 'error');
      }
    } catch (err) {
      console.error('Error toggling coupon status:', err);
      showNotification('Failed to update coupon status', 'error');
    }
  };

  const handleDeleteRequest = (couponId) => {
    setDeleteId(couponId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post(
        `${backendUrl}/api/coupon/delete`,
        { couponId: deleteId },
        { headers }
      );

      if (response.data.success) {
        showNotification('Coupon deleted successfully', 'success');
        setCoupons(coupons.filter(c => c._id !== deleteId));
        setShowDeleteModal(false);
        setDeleteId(null);
        fetchCoupons();
      } else {
        showNotification('Failed to delete coupon', 'error');
      }
    } catch (err) {
      console.error('Error deleting coupon:', err);
      showNotification('Failed to delete coupon', 'error');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  const getStatusDisplay = (coupon) => {
    if (isExpired(coupon.expiryDate)) {
      return { text: 'Expired', bgColor: 'bg-red-100', textColor: 'text-red-700', hoverColor: 'hover:bg-red-200' };
    }
    return coupon.isActive 
      ? { text: 'Active', bgColor: 'bg-green-100', textColor: 'text-green-700', hoverColor: 'hover:bg-green-200' }
      : { text: 'Inactive', bgColor: 'bg-gray-100', textColor: 'text-gray-700', hoverColor: 'hover:bg-gray-200' };
  };

  if (!token) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
            <p className="text-gray-600 mt-2">Create and manage discount coupons</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
        </div>

        {/* Coupons Table */}
        {isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No coupons created yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Discount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Min Order</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Expiry</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {coupons.map((coupon) => (
                    <tr key={coupon._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {coupon.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {coupon.discountType === 'percentage' ? 
                          `${coupon.discountValue}%` : 
                          `₹${coupon.discountValue}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(coupon.expiryDate)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const status = getStatusDisplay(coupon);
                          return (
                            <button
                              onClick={() => !isExpired(coupon.expiryDate) && handleToggleStatus(coupon._id, coupon.isActive)}
                              disabled={isExpired(coupon.expiryDate)}
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                status.bgColor
                              } ${status.textColor} ${!isExpired(coupon.expiryDate) ? status.hoverColor : 'cursor-not-allowed opacity-60'}`}
                            >
                              {status.text}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteRequest(coupon._id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Coupon</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormErrors({});
                    setFormData({
                      code: '',
                      discountType: 'percentage',
                      discountValue: '',
                      maxDiscount: '',
                      minOrderAmount: '',
                      expiryDate: ''
                    });
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., SAVE10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.code && <p className="text-xs text-red-600 mt-1">{formErrors.code}</p>}
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      placeholder="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.discountValue && <p className="text-xs text-red-600 mt-1">{formErrors.discountValue}</p>}
                  </div>
                </div>

                {/* Max Discount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Discount (₹) <span className="text-gray-400">Optional</span>
                  </label>
                  <input
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    placeholder="Leave empty for no limit"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.maxDiscount && <p className="text-xs text-red-600 mt-1">{formErrors.maxDiscount}</p>}
                </div>

                {/* Min Order Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Order Amount (₹) <span className="text-gray-400">Optional</span>
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder="Leave empty for no minimum"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.minOrderAmount && <p className="text-xs text-red-600 mt-1">{formErrors.minOrderAmount}</p>}
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.expiryDate && <p className="text-xs text-red-600 mt-1">{formErrors.expiryDate}</p>}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Coupon'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormErrors({});
                      setFormData({
                        code: '',
                        discountType: 'percentage',
                        discountValue: '',
                        maxDiscount: '',
                        minOrderAmount: '',
                        expiryDate: ''
                      });
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-sm w-full p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Delete Coupon?</h2>
              <p className="text-gray-600 mb-6">
                This action cannot be undone. The coupon will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteId(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Coupon;
