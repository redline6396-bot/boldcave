'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ token }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLOR_PRIMARY = '#2F6B3F';
  const COLOR_ACCENT = '#D6524A';
  const COLOR_BORDER = '#E6E1D8';
  const COLOR_LIGHT_BG = '#F8F6F2';

  useEffect(() => {
    const fetchStats = async () => {
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

    if (token) {
      fetchStats();
    }
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

  const StatCard = ({ title, value, subtitle, color, bgColor }) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Products"
          value={stats.totalProducts || 0}
          color={COLOR_PRIMARY}
          bgColor={COLOR_LIGHT_BG}
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders || 0}
          color={COLOR_PRIMARY}
          bgColor={COLOR_LIGHT_BG}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue || 0}`}
          color={COLOR_PRIMARY}
          bgColor={COLOR_LIGHT_BG}
        />
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders || 0}
          color={COLOR_ACCENT}
          bgColor={COLOR_LIGHT_BG}
        />
      </div>
    </div>
  );
};

export default Dashboard;
