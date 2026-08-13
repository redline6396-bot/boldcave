'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { TrendingUp, ShoppingCart, AlertTriangle, FileText, Package } from 'lucide-react';

const Dashboard = () => {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLOR_PRIMARY = '#2F6B3F';
  const COLOR_ACCENT = '#D6524A';
  const COLOR_BORDER = '#E6E1D8';
  const COLOR_LIGHT_BG = '#F8F6F2';

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const response = await axios.get(
          `${backendUrl}/api/product/dashboard/stats`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          setStats(response.data.stats);
        } else {
          setError(response.data.message || 'Failed to fetch stats');
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p style={{ color: '#999' }}>Loading dashboard stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p style={{ color: '#D6524A' }}>Error loading stats: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <p style={{ color: '#999' }}>No stats available</p>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, color, bgColor }) => (
    <div className="bg-white rounded-lg border p-6" style={{ borderColor: COLOR_BORDER }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: '#999' }}>
            {title}
          </p>
          <p className="text-3xl font-bold" style={{ color: color }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-2" style={{ color: '#999' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="p-3 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={24} style={{ color: color }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
      <div className="mb-8">
        <h1 className="text-4xl font-bold" style={{ color: COLOR_PRIMARY }}>
          Dashboard
        </h1>
        <p className="text-sm mt-2" style={{ color: '#999' }}>
          Welcome back! Here's your store overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Products */}
        <StatCard
          icon={Package}
          title="Total Products"
          value={stats.totalProducts}
          subtitle="Published products in store"
          color={COLOR_PRIMARY}
          bgColor="#F0F8F4"
        />

        {/* Total Orders */}
        <StatCard
          icon={ShoppingCart}
          title="Total Orders"
          value={stats.totalOrders}
          subtitle="Orders received"
          color="#2563EB"
          bgColor="#EFF6FF"
        />

        {/* Total Revenue */}
        <StatCard
          icon={TrendingUp}
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
          subtitle="From paid orders"
          color="#10B981"
          bgColor="#ECFDF5"
        />

        {/* Low Stock Alert */}
        <StatCard
          icon={AlertTriangle}
          title="Low Stock Alert"
          value={stats.lowStockCount}
          subtitle="Products with <5 items"
          color={COLOR_ACCENT}
          bgColor="#FEF2F2"
        />

        {/* Draft Products */}
        <StatCard
          icon={FileText}
          title="Draft Products"
          value={stats.draftProducts}
          subtitle="Not yet published"
          color="#8B5CF6"
          bgColor="#F5F3FF"
        />
      </div>

      {/* Quick Info */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: COLOR_BORDER }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: COLOR_PRIMARY }}>
          Quick Stats
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: COLOR_BORDER }}>
            <span style={{ color: '#666' }}>Products Published</span>
            <span className="font-semibold" style={{ color: COLOR_PRIMARY }}>
              {stats.totalProducts - stats.draftProducts}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: COLOR_BORDER }}>
            <span style={{ color: '#666' }}>Average Order Value</span>
            <span className="font-semibold" style={{ color: COLOR_PRIMARY }}>
              {stats.totalOrders > 0 ? `₹${(stats.totalRevenue / stats.totalOrders).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ color: '#666' }}>Inventory Alert</span>
            <span className={`font-semibold px-3 py-1 rounded text-sm`} style={{ 
              backgroundColor: stats.lowStockCount > 5 ? '#FEF2F2' : '#F0F8F4',
              color: stats.lowStockCount > 5 ? COLOR_ACCENT : COLOR_PRIMARY
            }}>
              {stats.lowStockCount > 5 ? `⚠ ${stats.lowStockCount} items` : `✓ Good stock`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
