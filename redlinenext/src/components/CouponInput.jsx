'use client';

import React, { useState } from 'react';
import { Loader, Check, X } from 'lucide-react';
import axios from 'axios';

const CouponInput = ({ cartTotal, onApplyCoupon }) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setMessage('Please enter a coupon code');
      setMessageType('error');
      return;
    }

    if (cartTotal <= 0) {
      setMessage('Your cart is empty');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await axios.post(`${backendUrl}/api/coupon/validate`, {
        code: couponCode.trim().toUpperCase(),
        cartTotal
      });

      if (response.data.success) {
        setMessageType('success');
        setMessage(`Coupon applied! You saved ₹${response.data.discount.toFixed(0)}`);
        
        // Call parent callback with discount
        onApplyCoupon({
          code: couponCode.trim().toUpperCase(),
          discount: response.data.discount
        });

        // Clear input after successful application
        setCouponCode('');
        
        // Clear message after 5 seconds
        setTimeout(() => {
          setMessage('');
        }, 5000);
      }
    } catch (error) {
      setMessageType('error');
      setMessage(
        error.response?.data?.message || 
        'Failed to apply coupon. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleApplyCoupon();
    }
  };

  return (
    <div className="w-full">
      {/* Input Section */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={couponCode}
          onChange={(e) => {
            setCouponCode(e.target.value.toUpperCase());
            // Clear message when user starts typing
            if (message) setMessage('');
          }}
          onKeyPress={handleKeyPress}
          placeholder="Enter coupon code"
          disabled={loading}
          className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm border rounded-lg transition-all focus:outline-none focus:ring-2"
          style={{
            borderColor: message && messageType === 'error' ? '#D6524A' : '#E6E1D8',
            color: '#333',
            backgroundColor: '#FFFFFF',
            '--tw-ring-color': '#2F6B3F'
          }}
        />
        <button
          onClick={handleApplyCoupon}
          disabled={loading || !couponCode.trim()}
          className="px-4 sm:px-6 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap"
          style={{
            backgroundColor: couponCode.trim() && !loading ? '#2F6B3F' : '#E6E1D8',
            color: couponCode.trim() && !loading ? '#FFF' : '#999',
            cursor: couponCode.trim() && !loading ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Apply</span>
              <span className="sm:hidden">Go</span>
            </>
          )}
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className="px-3 sm:px-4 py-2 rounded-lg flex items-start gap-2 animate-in"
          style={{
            backgroundColor: messageType === 'success' ? '#E8F5E9' : '#FFEBEE',
            borderLeft: `3px solid ${messageType === 'success' ? '#2F6B3F' : '#D6524A'}`
          }}
        >
          {messageType === 'success' ? (
            <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#2F6B3F' }} />
          ) : (
            <X className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#D6524A' }} />
          )}
          <p
            className="text-xs sm:text-sm font-medium"
            style={{ color: messageType === 'success' ? '#2F6B3F' : '#D6524A' }}
          >
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default CouponInput;
