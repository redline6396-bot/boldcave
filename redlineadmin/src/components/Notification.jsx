'use client';

import React, { useContext, useEffect, useState } from 'react';
import { NotificationContext } from '@/context/NotificationContext';
import './Notification.css';

const iconMap = {
  success: 'OK',
  error: '!',
  warning: '!',
  info: 'i',
};

const Notification = () => {
  const { notification, clearNotification } = useContext(NotificationContext);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) setIsVisible(true);
  }, [notification]);

  if (!notification) return null;

  return (
    <div className={`notification notification-${notification.type} ${isVisible ? 'notification-visible' : ''}`}>
      <div className="notification-content">
        <span className="notification-icon">{iconMap[notification.type] || 'i'}</span>
        <span className="notification-message">{notification.message}</span>
        <button
          className="notification-close"
          onClick={() => {
            setIsVisible(false);
            setTimeout(clearNotification, 300);
          }}
        >
          x
        </button>
      </div>
    </div>
  );
};

export default Notification;
