'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ShoppingBag, UserPlus, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, formatDateTime } from '@/lib/api';

const POLL_INTERVAL_MS = 30_000;

export default function AdminNotificationPanel() {
  const router = useRouter();
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState('');

  const loadNotifications = useCallback(async ({ quiet = false } = {}) => {
    try {
      if (!quiet) setLoading(true);
      const response = await api.get('/api/admin/notifications?limit=20');
      setNotifications(response.data.data.notifications || []);
      setUnreadCount(Number(response.data.data.unreadCount) || 0);
      setError('');
    } catch {
      if (!quiet) setError('Unable to load notifications.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(
      () => loadNotifications({ quiet: true }),
      POLL_INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    const closePanel = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closePanel);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closePanel);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const togglePanel = () => {
    setOpen((current) => {
      const next = !current;
      if (next) loadNotifications({ quiet: true });
      return next;
    });
  };

  const openNotification = async (notification) => {
    try {
      if (!notification.readAt) {
        setUpdating(notification.id);
        const response = await api.patch('/api/admin/notifications', {
          action: 'markRead',
          id: notification.id,
        });
        setUnreadCount(Number(response.data.data.unreadCount) || 0);
        setNotifications((current) =>
          current.map((entry) =>
            entry.id === notification.id
              ? { ...entry, readAt: response.data.data.notification.readAt }
              : entry
          )
        );
      }
    } catch {
      setError('Unable to update notification.');
    } finally {
      setUpdating('');
      setOpen(false);
      router.push(notification.href || '/admin');
    }
  };

  const markAllRead = async () => {
    if (!unreadCount || updating) return;
    try {
      setUpdating('all');
      await api.patch('/api/admin/notifications', { action: 'markAllRead' });
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, readAt: notification.readAt || readAt }))
      );
      setUnreadCount(0);
      setError('');
    } catch {
      setError('Unable to mark notifications as read.');
    } finally {
      setUpdating('');
    }
  };

  return (
    <div ref={panelRef} className='relative'>
      <button
        type='button'
        onClick={togglePanel}
        className='relative inline-flex h-10 w-10 items-center justify-center rounded border border-gray-300 text-gray-700 hover:bg-gray-50'
        aria-label='Admin notifications'
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className='absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-white'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className='absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl'>
          <div className='flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3'>
            <div>
              <p className='font-semibold text-gray-950'>Notifications</p>
              <p className='text-xs text-gray-500'>{unreadCount} unread</p>
            </div>
            <button
              type='button'
              onClick={markAllRead}
              disabled={!unreadCount || Boolean(updating)}
              className='inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-black disabled:opacity-40'
            >
              <CheckCheck size={15} />
              Mark all read
            </button>
          </div>

          <div className='max-h-[min(65vh,34rem)] overflow-y-auto'>
            {loading ? (
              <p className='px-4 py-8 text-center text-sm text-gray-500'>Loading notifications...</p>
            ) : error && notifications.length === 0 ? (
              <div className='px-4 py-8 text-center text-sm text-red-600'>
                <p>{error}</p>
                <button type='button' onClick={() => loadNotifications()} className='mt-2 font-semibold underline'>Retry</button>
              </div>
            ) : notifications.length === 0 ? (
              <p className='px-4 py-8 text-center text-sm text-gray-500'>No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  disabled={updating === notification.id}
                  onClick={() => openNotification(notification)}
                />
              ))
            )}
          </div>

          {error && notifications.length > 0 && (
            <p className='border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700'>{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification, disabled, onClick }) {
  const Icon = notification.kind === 'new_customer'
    ? UserPlus
    : notification.kind === 'order_cancelled'
      ? XCircle
      : ShoppingBag;
  const iconClass = notification.kind === 'order_cancelled'
    ? 'bg-red-50 text-red-600'
    : notification.kind === 'new_customer'
      ? 'bg-blue-50 text-blue-600'
      : 'bg-green-50 text-green-600';

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-60 ${notification.readAt ? 'bg-white' : 'bg-slate-50'}`}
    >
      <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
        <Icon size={17} />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='flex items-start justify-between gap-2'>
          <span className='text-sm font-semibold text-gray-950'>{notification.title}</span>
          {!notification.readAt && <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600' />}
        </span>
        <span className='mt-1 block whitespace-pre-line text-xs leading-5 text-gray-600'>{notification.message}</span>
        <span className='mt-1.5 block text-[11px] text-gray-400'>{formatDateTime(notification.createdAt)} IST</span>
      </span>
    </button>
  );
}
