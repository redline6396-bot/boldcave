'use client';

import { useContext, useEffect, useState } from 'react';
import { AlertTriangle, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDate, getErrorMessage, money } from '@/lib/api';

const statCards = [
  { key: 'products', label: 'Products', icon: Package },
  { key: 'totalOrders', label: 'Orders', icon: ShoppingCart },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'revenue', label: 'Revenue', icon: TrendingUp, money: true },
];

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [storeSettings, setStoreSettings] = useState({
    acceptingOrders: true,
  });
  const [loading, setLoading] = useState(true);
  const [storeSettingsSaving, setStoreSettingsSaving] = useState(false);
  const [error, setError] = useState('');
  const { error: showError, success: showSuccess } = useContext(NotificationContext);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const [dashboardResponse, settingsResponse] = await Promise.all([
        api.get('/api/admin/dashboard'),
        api.get('/api/admin/store-settings'),
      ]);
      setDashboard(dashboardResponse.data.data);
      setStoreSettings(settingsResponse.data.data || { acceptingOrders: true });
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load dashboard');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAcceptingOrders = async () => {
    const nextAcceptingOrders = !storeSettings.acceptingOrders;

    try {
      setStoreSettingsSaving(true);
      const response = await api.patch('/api/admin/store-settings', {
        acceptingOrders: nextAcceptingOrders,
      });
      setStoreSettings(response.data.data || { acceptingOrders: nextAcceptingOrders });
      showSuccess(
        nextAcceptingOrders
          ? 'Store is accepting orders.'
          : 'Store orders are currently disabled.'
      );
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to update store order setting');
      showError(message);
    } finally {
      setStoreSettingsSaving(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return <StateMessage message='Loading dashboard...' />;
  if (error) return <StateMessage tone='error' message={error} onRetry={loadDashboard} />;
  if (!dashboard) return <StateMessage message='No dashboard data available' />;

  return (
    <div className='space-y-6'>
      <header>
        <h1 className='text-3xl font-bold text-gray-950'>Dashboard</h1>
        <p className='mt-1 text-sm text-gray-500'>Live overview from the Bold Cave API.</p>
      </header>

      <section className='rounded border border-gray-200 bg-white p-5'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h2 className='font-semibold text-gray-950'>Store Orders</h2>
            <p className='mt-1 text-sm text-gray-500'>
              Accepting Orders
              <span
                className={`ml-2 rounded px-2 py-0.5 text-xs font-semibold ${
                  storeSettings.acceptingOrders
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {storeSettings.acceptingOrders ? 'ON' : 'OFF'}
              </span>
            </p>
            {!storeSettings.acceptingOrders && (
              <p className='mt-2 text-sm text-amber-700'>
                Customers can browse the store but cannot place new orders.
              </p>
            )}
          </div>

          <button
            type='button'
            onClick={toggleAcceptingOrders}
            disabled={storeSettingsSaving}
            className={`rounded px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              storeSettings.acceptingOrders
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {storeSettingsSaving
              ? 'Saving...'
              : storeSettings.acceptingOrders
                ? 'Turn Off'
                : 'Turn On'}
          </button>
        </div>
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {statCards.map(({ key, ...card }) => (
          <StatCard
            key={key}
            {...card}
            value={dashboard[key]}
          />
        ))}        
      </section>

      <section className='grid gap-6 xl:grid-cols-2'>
        <div className='rounded border border-gray-200 bg-white'>
          <div className='border-b border-gray-200 px-5 py-4'>
            <h2 className='font-semibold text-gray-950'>Recent Orders</h2>
          </div>
          <div className='divide-y divide-gray-100'>
            {(dashboard.recentOrders || []).length === 0 ? (
              <p className='px-5 py-6 text-sm text-gray-500'>No orders yet.</p>
            ) : (
              dashboard.recentOrders.map((order) => (
                <div key={order._id} className='flex items-center justify-between gap-4 px-5 py-4 text-sm'>
                  <div>
                    <p className='font-semibold text-gray-900'>{order.orderNumber}</p>
                    <p className='text-gray-500'>{order.customer?.phone || 'No phone'} | {formatDate(order.createdAt)}</p>
                  </div>
                  <div className='text-right'>
                    <p className='font-semibold text-gray-900'>{money(order.amounts?.finalAmount)}</p>
                    <p className='text-xs uppercase text-gray-500'>{order.orderStatus}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='rounded border border-gray-200 bg-white'>
          <div className='flex items-center gap-2 border-b border-gray-200 px-5 py-4'>
            <AlertTriangle size={18} className='text-amber-600' />
            <h2 className='font-semibold text-gray-950'>Low Stock</h2>
          </div>
          <div className='divide-y divide-gray-100'>
            {(dashboard.lowStockProducts || []).length === 0 ? (
              <p className='px-5 py-6 text-sm text-gray-500'>No low stock products.</p>
            ) : (
              dashboard.lowStockProducts.map((product) => (
                <div key={product._id} className='px-5 py-4 text-sm'>
                  <p className='font-semibold text-gray-900'>{product.name}</p>
                  <p className='mt-1 text-gray-500'>
                    {(product.variants || [])
                      .filter((variant) => Number(variant.stock) < 5)
                      .map((variant) => `${variant.size}: ${variant.stock}`)
                      .join(', ') || 'Check variants'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

function StatCard({ label, value, icon: Icon, money: isMoney }) {
  return (
    <div className='rounded border border-gray-200 bg-white p-5'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-sm font-medium text-gray-500'>{label}</p>
          <p className='mt-2 text-2xl font-bold text-gray-950'>{isMoney ? money(value) : Number(value || 0).toLocaleString('en-IN')}</p>
        </div>
        <span className='rounded bg-gray-100 p-2 text-gray-700'>
          <Icon size={20} />
        </span>
      </div>
    </div>
  );
}

function StateMessage({ message, tone = 'default', onRetry }) {
  return (
    <div className={`rounded border bg-white p-6 text-sm ${tone === 'error' ? 'border-red-200 text-red-700' : 'border-gray-200 text-gray-500'}`}>
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className='mt-3 rounded border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50'>
          Retry
        </button>
      )}
    </div>
  );
}

export default Dashboard;
