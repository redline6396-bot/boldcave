import React from 'react';
import AuthProvider from '@/context/AuthContext';
import CartProvider from '@/context/CartContext';
import CouponProvider from '@/context/CouponContext';
import NotificationProvider from '@/context/NotificationContext';
import RootLayoutClient from '@/components/RootLayoutClient';
import '@/assets/globals.css';

export const metadata = {
  title: 'Perfume Brand',
  description: 'Premium perfume.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <NotificationProvider>
          <AuthProvider>
            <CartProvider>
              <CouponProvider>
                <RootLayoutClient>{children}</RootLayoutClient>
              </CouponProvider>
            </CartProvider>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
