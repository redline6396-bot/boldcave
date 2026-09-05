import React from 'react';
import AuthProvider from '@/context/AuthContext';
import CartProvider from '@/context/CartContext';
import CouponProvider from '@/context/CouponContext';
import NotificationProvider from '@/context/NotificationContext';
import { StoreSettingsProvider } from '@/context/StoreSettingsContext';
import ComingSoonScreen from '@/components/ComingSoonScreen';
import RootLayoutClient from '@/components/RootLayoutClient';
import { withRuntimeDatabase } from '@/lib/cloudflareMongoose';
import appIcon from './icon-new.png';
import {
  BRAND_ICON_PATH,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
} from '@/lib/seo';
import { getSerializedStoreSettings } from '@/lib/storeSettings';
import '@/assets/globals.css';

export const dynamic = 'force-dynamic';

const APP_ICON_PATH = appIcon.src;

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
    icon: APP_ICON_PATH,
    shortcut: APP_ICON_PATH,
    apple: APP_ICON_PATH,
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
    storeSettings = await withRuntimeDatabase(() =>
      getSerializedStoreSettings({ cache: false })
    );
  } catch {
    storeSettings = null;
  }

  if (storeSettings?.comingSoonMode) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
          <link rel="icon" href={APP_ICON_PATH} />
        </head>
        <body>
          <ComingSoonScreen />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href={APP_ICON_PATH} />
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
