'use client';

import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { NotificationContext } from '@/context/NotificationContext';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Phone,
} from 'lucide-react';

const currency = 'Rs.';

const getAddress = (order) => order?.address || {};

const getCustomerName = (order) => {
  const address = getAddress(order);
  const name = [address.firstName, address.lastName].filter(Boolean).join(' ').trim();
  return address.fullName || name || address.name || 'Customer';
};

const getCustomerEmail = (order) => getAddress(order).email || order.email || 'N/A';

const getCustomerPhone = (order) => getAddress(order).phone || order.phone || 'N/A';

const getOrderAmount = (order) => Number(order.amount || order.totalAmount || 0);

const getItemPrice = (item) => Number(item.variant?.price || item.price || item.sellingPrice || 0);

const getVariantLabel = (item) => item.variant?.weight || item.variantWeight || item.weight || 'N/A';

const getItemImage = (item) => {
  if (item.image) return item.image;
  if (Array.isArray(item.images) && item.images.length > 0) {
    const firstImage = item.images[0];
    if (typeof firstImage === 'string') return firstImage;
    if (firstImage?.url) return firstImage.url;
  }
  return null;
};

const getStatusColor = (status) => {
  const statusLower = status?.toLowerCase();
  if (statusLower === 'delivered') return { bg: '#E8F5E9', text: '#2F6B3F', badge: '#2F6B3F' };
  if (statusLower === 'confirmed') return { bg: '#E3F2FD', text: '#1976D2', badge: '#1976D2' };
  if (statusLower === 'shipped') return { bg: '#E3F2FD', text: '#1976D2', badge: '#1976D2' };
  if (statusLower === 'out_for_delivery') return { bg: '#FFF3E0', text: '#E67E22', badge: '#E67E22' };
  if (statusLower === 'placed') return { bg: '#F3E5F5', text: '#7B1FA2', badge: '#7B1FA2' };
  if (statusLower === 'cancelled') return { bg: '#FFEBEE', text: '#D6524A', badge: '#D6524A' };
  if (statusLower === 'refunded') return { bg: '#E8F5E9', text: '#2F6B3F', badge: '#2F6B3F' };
  return { bg: '#F5F5F5', text: '#666', badge: '#999' };
};

const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
};

const Orders = () => {
  const [token, setToken] = useState(null);
  const [orders, setOrders] = useState([]);
  const [expandedOrders, setExpandedOrders] = useState({});
  const { error: showError } = useContext(NotificationContext);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchAllOrders = async () => {
    if (!token) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.post(
        `${backendUrl}/api/order/list`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setOrders(response.data.orders || []);
      } else {
        showError(response.data.message || 'Unable to fetch orders');
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Unable to load orders');
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllOrders();
    }
  }, [token]);

  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F5F5' }}>
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-3xl font-bold" style={{ color: '#2F6B3F' }}>
          All Orders
        </h1>

        {orders.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center">
            <Package size={44} className="mx-auto mb-4" style={{ color: '#CCC' }} />
            <p style={{ color: '#999' }}>No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusColor = getStatusColor(order.status);
              const isExpanded = expandedOrders[order._id];
              const address = getAddress(order);
              const amount = getOrderAmount(order);

              return (
                <div key={order._id} className="rounded-lg border bg-white p-6" style={{ borderColor: '#E6E1D8' }}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => toggleExpand(order._id)}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-lg font-bold">
                          Order #{String(order._id).slice(-6).toUpperCase()}
                        </div>
                        <span
                          className="rounded px-3 py-1 text-xs font-semibold"
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                        >
                          {formatStatus(order.status)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm" style={{ color: '#666' }}>
                        Customer: {getCustomerName(order)} | Amount: {currency}{amount.toFixed(2)}
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp size={22} style={{ color: '#999' }} />
                    ) : (
                      <ChevronDown size={22} style={{ color: '#999' }} />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-6 space-y-5 border-t pt-6" style={{ borderColor: '#E6E1D8' }}>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <InfoBlock icon={Mail} label="Email" value={getCustomerEmail(order)} />
                        <InfoBlock icon={Phone} label="Phone" value={getCustomerPhone(order)} />
                        <InfoBlock
                          icon={Calendar}
                          label="Date"
                          value={order.date ? new Date(order.date).toDateString() : 'N/A'}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg border p-4" style={{ borderColor: '#E6E1D8', backgroundColor: '#FAFAF8' }}>
                          <div className="mb-3 flex items-center gap-2">
                            <MapPin size={17} style={{ color: '#2F6B3F' }} />
                            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#555' }}>
                              Delivery Address
                            </p>
                          </div>
                          <div className="space-y-1 text-sm" style={{ color: '#666' }}>
                            <p className="font-semibold" style={{ color: '#1A1A1A' }}>{getCustomerName(order)}</p>
                            <p>{address.street || 'N/A'}</p>
                            <p>{[address.city, address.state, address.zipcode || address.postalCode].filter(Boolean).join(', ')}</p>
                            <p>{address.country || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border p-4" style={{ borderColor: '#E6E1D8', backgroundColor: '#FAFAF8' }}>
                          <div className="mb-3 flex items-center gap-2">
                            <CreditCard size={17} style={{ color: '#2F6B3F' }} />
                            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#555' }}>
                              Payment
                            </p>
                          </div>
                          <div className="space-y-2 text-sm">
                            <SummaryRow label="Method" value={order.paymentMethod || 'N/A'} />
                            <SummaryRow label="Paid" value={order.payment ? 'Yes' : 'No'} />
                            <SummaryRow label="Coupon" value={order.couponCode || '-'} />
                            <SummaryRow label="Discount" value={`${currency}${Number(order.discountAmount || 0).toFixed(2)}`} />
                            <SummaryRow label="Amount" value={`${currency}${amount.toFixed(2)}`} strong />
                          </div>
                        </div>
                      </div>

                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <div>
                          <p className="mb-3 font-bold">Items</p>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => {
                              const price = getItemPrice(item);
                              const image = getItemImage(item);
                              const lineTotal = price * Number(item.quantity || 0);

                              return (
                                <div
                                  key={`${item.productId || item._id || idx}-${idx}`}
                                  className="flex items-center gap-4 rounded-lg p-3 text-sm"
                                  style={{ backgroundColor: '#F8F6F2' }}
                                >
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-white">
                                    {image ? (
                                      <img src={image} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <Package size={22} style={{ color: '#AAA' }} />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">{item.name || 'Product'}</p>
                                    <p className="mt-1" style={{ color: '#666' }}>
                                      Variant: {getVariantLabel(item)} | Qty: {item.quantity || 0}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <p className="font-semibold" style={{ color: '#2F6B3F' }}>
                                      {currency}{lineTotal.toFixed(2)}
                                    </p>
                                    <p className="text-xs" style={{ color: '#999' }}>
                                      {currency}{price.toFixed(2)} each
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function InfoBlock({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border bg-white p-4" style={{ borderColor: '#E6E1D8' }}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={16} style={{ color: '#2F6B3F' }} />
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#999' }}>{label}</p>
      </div>
      <p className="break-words font-semibold">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ color: '#666' }}>{label}</span>
      <span className={strong ? 'font-bold' : 'font-semibold'}>{value}</span>
    </div>
  );
}

export default Orders;
