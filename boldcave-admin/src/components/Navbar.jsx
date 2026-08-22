'use client';

import React, { useContext, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NotificationContext } from '@/context/NotificationContext';
import { api, getErrorMessage } from '@/lib/api';

const Navbar = ({ onLogout }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useContext(NotificationContext);

  const logout = async () => {
    try {
      setLoading(true);
      await api.post('/api/admin/auth/logout');
      localStorage.removeItem('token');
      success('Logged out');
      onLogout?.();
      router.replace('/login');
    } catch (error) {
      showError(getErrorMessage(error, 'Logout failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3'>
      <div>
        <p className='text-sm font-semibold text-gray-900'>Bold Cave Admin</p>
        <p className='text-xs text-gray-500'>Perfume store operations</p>
      </div>
      <button
        onClick={logout}
        disabled={loading}
        className='inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
        title='Logout'
      >
        <LogOut size={16} />
        {loading ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
};

export default Navbar;
