'use client';

import React, { createContext, useState } from 'react';

export const NotificationContext = createContext();

export default function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info', duration = 4000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };
  const clearNotification = () => setNotification(null);

  const success = (message) => showNotification(message, 'success');
  const error = (message) => showNotification(message, 'error');
  const warning = (message) => showNotification(message, 'warning');
  const info = (message) => showNotification(message, 'info');

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotification, success, error, warning, info, notification }}>
      {children}
    </NotificationContext.Provider>
  );
}
