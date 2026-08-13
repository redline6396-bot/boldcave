import React from 'react';
import ShopContextProvider from '@/context/ShopContext';
import NotificationProvider from '@/context/NotificationContext';
import DeliveryContextProvider from '@/context/DeliveryContext';
import RootLayoutClient from '@/components/RootLayoutClient';
import '@/assets/globals.css';

export const metadata = {
  title: 'Green Valley Naturals - 100% Organic Products',
  description: 'Premium organic products certified by APEDA. Farm to table, 100% pure and authentic.',
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
          <ShopContextProvider>
            <DeliveryContextProvider>
              <RootLayoutClient>{children}</RootLayoutClient>
            </DeliveryContextProvider>
          </ShopContextProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
