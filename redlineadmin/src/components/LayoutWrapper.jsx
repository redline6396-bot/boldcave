'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { api } from '@/lib/api';

const LayoutWrapper = ({ children }) => {
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';
  const isRootPage = pathname === '/';

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        await api.get('/api/admin/auth/me');

        if (!mounted) return;

        setAuthenticated(true);

        if (isLoginPage || isRootPage) {
          router.replace('/admin');
        }
      } catch {
        if (!mounted) return;

        setAuthenticated(false);
        localStorage.removeItem('token');

        if (!isLoginPage) {
          router.replace('/login');
        }
      } finally {
        if (mounted) {
          setChecked(true);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [isLoginPage, isRootPage, router]);

  if (!checked) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500'>
        Checking admin session...
      </div>
    );
  }

  if (isLoginPage || !authenticated) {
    return <>{children}</>;
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar onLogout={() => setAuthenticated(false)} />

      <div className='flex min-h-[calc(100vh-57px)] w-full'>
        <Sidebar />

        <main className='w-full min-w-0 p-4 text-base text-gray-700 md:p-8'>
          {children}
        </main>
      </div>
    </div>
  );
};

export default LayoutWrapper;