import React from 'react';
import Script from "next/script";
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
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '1061596686650693');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src="https://www.facebook.com/tr?id=1061596686650693&ev=PageView&noscript=1"
              alt=""
            />
          </noscript>
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
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1061596686650693');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1061596686650693&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
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
