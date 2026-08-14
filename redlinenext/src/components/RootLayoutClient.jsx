'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import MainNavbar from '@/components/layout/MainNavbar';
import Footer from '@/components/layout/Footer';
import Notification from '@/components/Notification';

export default function RootLayoutClient({ children }) {
  const pathname = usePathname();
  const isBackNavigation = useRef(false);
  const isLoginPage = ['/login', '/auth/login', '/newlogin', '/finish-login'].includes(pathname);
  const isNavbarPreviewPage = pathname === '/navbar-preview';
  const isForHimPreviewPage = pathname === '/for-him-preview';
  const isFooterPreviewPage = pathname === '/footer-preview';
  const shouldShowSiteChrome = !isLoginPage && !isNavbarPreviewPage && !isForHimPreviewPage && !isFooterPreviewPage;
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    setIsSmallScreen(window.innerWidth < 768);
  }, []);

  // Detect back button navigation
  useEffect(() => {
    const handlePopState = () => {
      isBackNavigation.current = true;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Save scroll position before navigation
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`scroll-${pathname}`, window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Handle scroll on route change
  useEffect(() => {
    if (isBackNavigation.current) {
      // Going back - restore previous scroll position
      const scrollPos = sessionStorage.getItem(`scroll-${pathname}`);
      if (scrollPos) {
        setTimeout(() => window.scrollTo(0, parseInt(scrollPos)), 0);
      }
      isBackNavigation.current = false;
    } else {
      // Forward navigation - scroll to top
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  // Store last visited path (excluding login pages)
  useEffect(() => {
    const loginPaths = ['/login', '/auth/login', '/newlogin', '/finish-login'];
    if (!loginPaths.includes(pathname)) {
      localStorage.setItem('lastVisitedPath', pathname);
    }
  }, [pathname]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isClient) {
    return null;
  }

  const paddingTop = isLoginPage ? '0px' : isSmallScreen ? '0px' : '0px';
  const backgroundStyle = 'transparent';

  return (
    <div
      style={{
        paddingTop,
        background: backgroundStyle,
        minHeight: '100vh',
      }}
    >
      <Notification />
      {shouldShowSiteChrome && (
        <>
          <AnnouncementBar />
          <MainNavbar />
        </>
      )}
      <main>{children}</main>
      {shouldShowSiteChrome && <Footer />}
    </div>
  );
}
