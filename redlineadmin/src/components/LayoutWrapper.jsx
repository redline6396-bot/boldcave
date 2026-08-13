'use client';

import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';

const LayoutWrapper = ({ children }) => {
  const [token, setToken] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    // Get token from localStorage on mount
    const storedToken = localStorage.getItem('token');
    setToken(storedToken || '');
  }, []);

  // Don't show navbar and sidebar on login page
  const isLoginPage = pathname === '/login';

  return (
    <>
      {!isLoginPage && token && (
        <>
          <Navbar setToken={setToken} />
          <hr />
        </>
      )}
      {!isLoginPage && token ? (
        <div className="bg-gray-50 min-h-screen">
          <div className="flex w-full">
            <Sidebar />
            <div className="w-[70%] mx-auto ml-[max(5vh,25px)] my-8 text-gray-700 text-base">
              {children}
            </div>
          </div>
        </div>
      ) : (
        <>{children}</>
      )}
    </>
  );
};

export default LayoutWrapper;
