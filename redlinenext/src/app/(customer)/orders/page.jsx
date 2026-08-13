'use client';

import React, { useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation';
import { ShopContext } from '@/context/ShopContext';
import AuthPrompt from '@/components/AuthPrompt';
import axios from 'axios';
import { Package, Download, Calendar, MapPin, CreditCard, ChevronRight, Check, Truck, MapPinCheck, Home, AlertCircle } from 'lucide-react';

const OrdersPage = () => {
  const router = useRouter();
  const { backendUrl, token, currency } = useContext(ShopContext);
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in
  if (!token) {
    return <AuthPrompt title="View Your Orders" subtitle="Sign in to track and manage all your purchases" />;
  }

  const loadOrderData = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${backendUrl}/api/order/userOrders`, {}, { headers: { Authorization: `Bearer ${token}` } })
      if (response.data.success) {
        let allOrderItems = []
        response.data.orders.map((order) => {
          order.items.map((item) => {
            item['status'] = order.status
            item['payment'] = order.payment
            item['paymentMethod'] = order.paymentMethod
            item['date'] = order.date
            item['orderId'] = order._id
            item['address'] = order.address
            item['couponCode'] = order.couponCode
            item['discountAmount'] = order.discountAmount
            item['amount'] = order.amount
            allOrderItems.push(item)
          })
        })
        setOrderData(allOrderItems.reverse())
      }
    }
    catch (error) {
      console.error(error)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrderData()
  }, [token])

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'delivered') return { bg: '#E8F5E9', text: '#2F6B3F', border: '#2F6B3F' };
    if (statusLower === 'confirmed') return { bg: '#E3F2FD', text: '#1976D2', border: '#1976D2' };
    if (statusLower === 'shipped') return { bg: '#E3F2FD', text: '#1976D2', border: '#1976D2' };
    if (statusLower === 'out_for_delivery') return { bg: '#FFF3E0', text: '#E67E22', border: '#E67E22' };
    if (statusLower === 'placed') return { bg: '#F3E5F5', text: '#7B1FA2', border: '#7B1FA2' };
    if (statusLower === 'cancelled') return { bg: '#FFEBEE', text: '#D6524A', border: '#D6524A' };
    if (statusLower === 'refunded') return { bg: '#E8F5E9', text: '#2F6B3F', border: '#2F6B3F' };
    return { bg: '#F5F5F5', text: '#666', border: '#E6E1D8' };
  }

  // Order status timeline config
  const STATUS_TIMELINE = {
    placed: { order: 1, label: 'Placed', icon: '📦', color: '#7B1FA2' },
    confirmed: { order: 2, label: 'Confirmed', icon: '✅', color: '#1976D2' },
    shipped: { order: 3, label: 'Shipped', icon: '🚚', color: '#1976D2' },
    out_for_delivery: { order: 4, label: 'Out for Delivery', icon: '📍', color: '#E67E22' },
    delivered: { order: 5, label: 'Delivered', icon: '🏠', color: '#2F6B3F' },
  };

  const CANCELLED_TIMELINE = {
    placed: { order: 1, label: 'Placed', icon: '📦', color: '#7B1FA2' },
    cancelled: { order: 2, label: 'Cancelled', icon: '❌', color: '#D6524A' },
    refunded: { order: 3, label: 'Refunded', icon: '💰', color: '#2F6B3F' },
  };

  // Get timeline for order
  const getTimelineSteps = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'cancelled' || statusLower === 'refunded') {
      return CANCELLED_TIMELINE;
    }
    return STATUS_TIMELINE;
  };

  // Get current step in timeline
  const getCurrentStep = (status) => {
    const statusLower = status?.toLowerCase();
    const timeline = getTimelineSteps(statusLower);
    return timeline[statusLower]?.order || 0;
  };

  const handleDownload = async (productId) => {
    try {
      const response = await axios.post(`${backendUrl}/api/product/download`, 
        { productId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        window.open(response.data.downloadLink, '_blank');
      } else {
        console.error('Download failed:', response.data.message);
      }
    } catch (error) {
      console.error('Download error:', error.response?.data || error.message);
    }
  }

  const getProductId = (item) => {
    const productId = item.productId || item._id || item.id;
    if (productId && typeof productId === 'object') {
      return productId._id || productId.id || '';
    }
    return productId || '';
  };

  const getItemImage = (item) => {
    if (item.image) return item.image;
    if (Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      if (typeof firstImage === 'string') return firstImage;
      if (firstImage?.url) return firstImage.url;
    }
    return 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png';
  };

  const getItemPrice = (item) => {
    return Number(item.variant?.price || item.price || item.sellingPrice || 0);
  };

  const getVariantLabel = (item) => {
    return item.variant?.weight || item.variantWeight || item.weight || 'N/A';
  };

  const getAddressName = (address = {}) => {
    const fullName = [address.firstName, address.lastName].filter(Boolean).join(' ').trim();
    return address.fullName || fullName || address.name || 'N/A';
  };

  const getPostalCode = (address = {}) => {
    return address.zipcode || address.postalCode || address.pincode || '';
  };

  if (!loading && orderData.length === 0) {
    return (
      <div style={{ backgroundColor: '#FAFAF8' }} className='min-h-screen py-12'>
        <div className='max-w-6xl mx-auto px-4'>
          <div className='text-center py-12'>
            <Package size={64} className='mx-auto mb-6' style={{ color: '#CCC' }} />
            <h1 className='text-3xl font-bold mb-2' style={{ color: '#1A1A1A' }}>
              No Orders Yet
            </h1>
            <p className='text-base mb-8' style={{ color: '#666' }}>
              You haven't placed any orders yet. Start exploring our collection!
            </p>
            <button
              onClick={() => router.push('/collection')}
              className='px-8 py-3 rounded-lg font-bold text-white transition'
              style={{ backgroundColor: '#2F6B3F' }}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#FAFAF8' }} className='min-h-screen py-12'>
      <div className='max-w-6xl mx-auto px-4'>
        
        {/* Header */}
        <div className='mb-12'>
          <h1 className='text-4xl font-bold' style={{ color: '#1A1A1A' }}>
            My Orders
          </h1>
          <p className='text-base mt-2' style={{ color: '#666' }}>
            Track and manage all your purchases
          </p>
        </div>

        {/* Orders List */}
        <div className='space-y-4'>
          {orderData.map((item, index) => {
            const statusColor = getStatusColor(item.status);
            const itemPrice = getItemPrice(item);
            const itemImage = getItemImage(item);
            const variantLabel = getVariantLabel(item);
            const productId = getProductId(item);
            const lineTotal = itemPrice * Number(item.quantity || 0);
            return (
              <div key={index} className='bg-white rounded-lg border overflow-hidden transition' style={{ borderColor: '#E6E1D8' }}>
                
                {/* Order Header */}
                <div className='px-6 py-4 flex items-center justify-between' style={{ backgroundColor: '#F8F6F2', borderBottom: '1px solid #E6E1D8' }}>
                  <div>
                    <p className='text-sm font-semibold' style={{ color: '#999' }}>
                      Order ID: <span style={{ color: '#1A1A1A' }}>{item.orderId?.slice(0, 12)}</span>
                    </p>
                    <div className='flex items-center gap-4 mt-2 text-sm'>
                      <span className='flex items-center gap-1' style={{ color: '#666' }}>
                        <Calendar size={16} />
                        {new Date(item.date).toDateString()}
                      </span>
                    </div>
                  </div>
                  <div 
                    className='px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2'
                    style={{ backgroundColor: statusColor.bg, color: statusColor.text, border: `2px solid ${statusColor.border}` }}
                  >
                    <div className='w-2 h-2 rounded-full' style={{ backgroundColor: statusColor.text }}></div>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace(/_/g, ' ')}
                  </div>
                </div>

                {/* Order Status Timeline */}
                <div className='px-6 py-6 border-b' style={{ borderColor: '#E6E1D8', backgroundColor: '#FAFAF8' }}>
                  <p className='text-xs font-semibold mb-4' style={{ color: '#999', textTransform: 'uppercase' }}>Delivery Status</p>
                  <div className='flex items-center justify-between'>
                    {Object.entries(getTimelineSteps(item.status)).map(([statusKey, stepInfo], idx, arr) => {
                      const currentStep = getCurrentStep(item.status);
                      const isCompleted = stepInfo.order <= currentStep;
                      const isCurrent = stepInfo.order === currentStep;
                      const isLast = idx === arr.length - 1;
                      
                      return (
                        <div key={statusKey} className='flex items-center flex-1'>
                          {/* Step Circle */}
                          <div className='flex flex-col items-center flex-1'>
                            <div
                              className='w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg relative z-10 transition'
                              style={{
                                backgroundColor: isCompleted ? stepInfo.color : '#E6E1D8',
                                color: isCompleted ? '#FFF' : '#999',
                                boxShadow: isCurrent ? `0 0 0 4px ${stepInfo.color}33` : 'none'
                              }}
                            >
                              {isCompleted ? '✓' : (idx + 1)}
                            </div>
                            <p className='text-xs font-medium mt-2 text-center' style={{ color: isCompleted ? '#1A1A1A' : '#999', maxWidth: '60px' }}>
                              {stepInfo.label}
                            </p>
                          </div>

                          {/* Connector Line */}
                          {!isLast && (
                            <div
                              className='h-1'
                              style={{
                                flex: 1,
                                backgroundColor: isCompleted && arr[idx + 1][1].order <= currentStep ? stepInfo.color : '#E6E1D8',
                                margin: '0 2px'
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Item */}
                <div className='px-6 py-6 flex items-center gap-6 border-b' style={{ borderColor: '#E6E1D8' }}>
                  <img
                    src={itemImage}
                    alt={item.name}
                    className='w-24 h-24 object-cover rounded-lg'
                  />
                  <div className='flex-1'>
                    <h3 className='text-lg font-semibold text-gray-900'>{item.name}</h3>
                    <p className='text-sm mt-2 flex items-center gap-4'>
                      <span style={{ color: '#666' }}>Variant: <strong>{variantLabel}</strong></span>
                    </p>
                    <p className='text-sm mt-1 flex items-center gap-4'>
                      <span style={{ color: '#666' }}>Quantity: <strong>{item.quantity}</strong></span>
                      <span style={{ color: '#666' }}>Price: <strong style={{ color: '#2F6B3F' }}>{currency}{itemPrice.toFixed(2)}</strong></span>
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm' style={{ color: '#999' }}>Total</p>
                    <p className='text-2xl font-bold' style={{ color: '#2F6B3F' }}>
                      {currency}{lineTotal.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Delivery Address & Price Details */}
                <div className='px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b' style={{ borderColor: '#E6E1D8', backgroundColor: '#FAFAF8' }}>
                  {/* Delivery Address */}
                  <div>
                    <div className='flex items-center gap-2 mb-4'>
                      <MapPin size={18} style={{ color: '#2F6B3F' }} />
                      <p className='text-xs font-bold tracking-wide uppercase' style={{ color: '#555' }}>
                        Delivery Address
                      </p>
                    </div>
                    {item.address ? (
                      <div style={{ color: '#666' }} className='text-sm space-y-1'>
                        <p className='font-semibold' style={{ color: '#1A1A1A' }}>{getAddressName(item.address)}</p>
                        <p>{item.address.street}</p>
                        <p>{item.address.city}, {item.address.state} {getPostalCode(item.address)}</p>
                        <p>{item.address.country}</p>
                        {item.address.phone && <p style={{ color: '#666' }}>Phone: {item.address.phone}</p>}
                      </div>
                    ) : (
                      <p style={{ color: '#999' }}>No address available</p>
                    )}
                  </div>

                  {/* Price Details */}
                  <div>
                    <div className='mb-4'>
                      <p className='text-xs font-bold tracking-wide uppercase' style={{ color: '#555' }}>
                        Price Details
                      </p>
                    </div>
                    <div className='space-y-3 text-sm'>
                      <div className='flex justify-between items-center pb-3' style={{ borderBottom: '1px solid #E6E1D8' }}>
                        <span style={{ color: '#666' }}>{item.name}</span>
                        <span style={{ color: '#1A1A1A', fontWeight: '600' }}>
                          {currency}{lineTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className='flex justify-between items-center'>
                        <span style={{ color: '#666' }}>Price</span>
                        <span style={{ color: '#1A1A1A', fontWeight: '600' }}>
                          {currency}{(lineTotal + (item.discountAmount || 0)).toFixed(2)}
                        </span>
                      </div>

                      {item.discountAmount > 0 && (
                        <div className='flex justify-between items-center'>
                          <span style={{ color: '#666' }}>Discount</span>
                          <span style={{ color: '#D6524A', fontWeight: '600' }}>
                            −{currency}{(item.discountAmount || 0).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className='flex justify-between items-center'>
                        <span style={{ color: '#666' }}>Delivery</span>
                        <span style={{ color: '#1A1A1A', fontWeight: '600' }}>FREE</span>
                      </div>

                      {item.couponCode && (
                        <div className='flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg text-sm' style={{ backgroundColor: '#E8F5E9' }}>
                          <div>
                            <p style={{ color: '#1A1A1A', fontWeight: '600' }}>
                              {item.couponCode}
                            </p>
                            <p style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>
                              −{currency}{(item.discountAmount || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className='flex justify-between items-center pt-3 border-t' style={{ borderColor: '#E6E1D8', color: '#1A1A1A', fontWeight: '600', fontSize: '15px' }}>
                        <span>Order Amount</span>
                        <span style={{ color: '#2F6B3F' }}>
                          {currency}{Number(item.amount || lineTotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Footer */}
                <div className='px-6 py-4 flex items-center justify-between' style={{ backgroundColor: '#FAFAF8' }}>
                  <div className='flex items-center gap-4 text-sm'>
                    <span style={{ color: '#666' }}>
                      <strong className='font-semibold'>Payment:</strong> {item.paymentMethod}
                    </span>
                  </div>
                  <div className='flex items-center gap-3'>
                    {item.downloadLink && (
                      <button 
                        onClick={() => handleDownload(productId)}
                        className='px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition border-2'
                        style={{ borderColor: '#2F6B3F', color: '#2F6B3F', backgroundColor: '#FFF' }}
                      >
                        <Download size={18} />
                        Download
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/product/${productId}`)}
                      className='px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition'
                      style={{ backgroundColor: '#2F6B3F', color: '#FFF' }}
                      disabled={!productId}
                    >
                      View Details
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}

export default OrdersPage;
