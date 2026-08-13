'use client';

import React, { useContext, useEffect, useState } from 'react';
import { NotificationContext } from '@/context/NotificationContext';
import './Notification.css';

const Notification = () => {
  const { notification, showNotification: clearNotification } = useContext(NotificationContext);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
    }
  }, [notification]);

  if (!notification) return null;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`notification notification-${notification.type} ${isVisible ? 'notification-visible' : ''}`}>
      <div className="notification-content">
        <span className="notification-icon">{iconMap[notification.type]}</span>
        <span className="notification-message">{notification.message}</span>
        <button
          className="notification-close"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => clearNotification(null, notification.type), 300);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;
