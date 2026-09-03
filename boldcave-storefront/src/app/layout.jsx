import React from 'react';
import AuthProvider from '@/context/AuthContext';
import CartProvider from '@/context/CartContext';
import CouponProvider from '@/context/CouponContext';
import NotificationProvider from '@/context/NotificationContext';
import { StoreSettingsProvider } from '@/context/StoreSettingsContext';
import RootLayoutClient from '@/components/RootLayoutClient';
import { withRuntimeDatabase } from '@/lib/cloudflareMongoose';
import {
  BRAND_ICON_PATH,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
} from '@/lib/seo';
import { getSerializedStoreSettings } from '@/lib/storeSettings';
import '@/assets/globals.css';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [BRAND_ICON_PATH],
  },
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
        <link rel="icon" href="/icon.png" />
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
