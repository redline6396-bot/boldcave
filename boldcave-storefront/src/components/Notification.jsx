'use client';

import React, { useContext, useState } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Notification.css';

const NotificationItem = ({ notification, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="notification-icon notification-icon-success" strokeWidth={2.5} />;
      case 'error':
        return <AlertCircle className="notification-icon notification-icon-error" strokeWidth={2.5} />;
      case 'warning':
        return <AlertTriangle className="notification-icon notification-icon-warning" strokeWidth={2.5} />;
      case 'info':
        return <Info className="notification-icon notification-icon-info" strokeWidth={2.5} />;
      default:
        return <Info className="notification-icon notification-icon-info" strokeWidth={2.5} />;
    }
  };

  return (
    <div
      className={`notification ${isExiting ? 'notification-exit' : 'notification-enter'}`}
      data-type={notification.type}
    >
      <div className="notification-container">
        <div className="notification-content">
          {getIcon()}
          <div className="notification-text-wrapper">
            <p className="notification-message">{notification.message}</p>
          </div>
        </div>
        <button
          className="notification-close-btn"
          onClick={handleClose}
          aria-label="Close notification"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="notification-progress" />
    </div>
  );
};

const Notification = () => {
  const { notifications, removeNotification } = useContext(NotificationContext);

  return (
    <div className="notification-stack">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};

export default Notification;
