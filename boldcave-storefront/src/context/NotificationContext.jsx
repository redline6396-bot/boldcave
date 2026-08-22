'use client';

import { createContext, useState, useCallback } from 'react';

export const NotificationContext = createContext();

const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    const notification = { message, type, id };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    showNotification: (message, type = 'success', duration = 3500) => addNotification(message, type, duration),
    success: (message, duration) => addNotification(message, 'success', duration),
    error: (message, duration) => addNotification(message, 'error', duration),
    warning: (message, duration) => addNotification(message, 'warning', duration),
    info: (message, duration) => addNotification(message, 'info', duration),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
