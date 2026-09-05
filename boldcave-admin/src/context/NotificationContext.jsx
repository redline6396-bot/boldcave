'use client';

import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const NotificationContext = createContext();

export default function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);
  const timeoutRef = useRef(null);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showNotification = useCallback((message, type = 'info', duration = 4000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setNotification({ message, type });
    timeoutRef.current = setTimeout(() => {
      setNotification(null);
      timeoutRef.current = null;
    }, duration);
  }, []);

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const success = useCallback((message) => showNotification(message, 'success'), [showNotification]);
  const error = useCallback((message) => showNotification(message, 'error'), [showNotification]);
  const warning = useCallback((message) => showNotification(message, 'warning'), [showNotification]);
  const info = useCallback((message) => showNotification(message, 'info'), [showNotification]);

  const value = useMemo(
    () => ({
      showNotification,
      clearNotification,
      success,
      error,
      warning,
      info,
      notification,
    }),
    [clearNotification, error, info, notification, showNotification, success, warning]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
