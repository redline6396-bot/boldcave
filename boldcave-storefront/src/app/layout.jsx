import React from 'react';
import AuthProvider from '@/context/AuthContext';
import CartProvider from '@/context/CartContext';
import CouponProvider from '@/context/CouponContext';
import NotificationProvider from '@/context/NotificationContext';
import { StoreSettingsProvider } from '@/context/StoreSettingsContext';
import RootLayoutClient from '@/components/RootLayoutClient';
import { withRuntimeDatabase } from '@/lib/cloudflareMongoose';
import { getSerializedStoreSettings } from '@/lib/storeSettings';
import '@/assets/globals.css';

export const metadata = {
  title: 'Bold Cave | Enter Your Bold Side',
  description:
    'Premium fragrances by Bold Cave, created for distinctive personalities and unforgettable presence.',
};

export default async function RootLayout({ children }) {
  let storeSettings = null;

  try {
    storeSettings = await withRuntimeDatabase(() => getSerializedStoreSettings());
  } catch {
    storeSettings = null;
  }

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
                <StoreSettingsProvider initialSettings={storeSettings}>
                  <RootLayoutClient>{children}</RootLayoutClient>
                </StoreSettingsProvider>
              </CouponProvider>
            </CartProvider>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
