'use client';

import { useCallback, useContext, useEffect, useState } from 'react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, getErrorMessage } from '@/lib/api';

const EMPTY_MESSAGING = { defaultMessage: '', siteUrl: '' };
const EMPTY_NOTIFICATIONS = {
  email: '',
  newCustomer: true,
  newOrder: true,
  orderCancelled: true,
};

export default function MessagingSettings() {
  const [messaging, setMessaging] = useState(EMPTY_MESSAGING);
  const [notifications, setNotifications] = useState(EMPTY_NOTIFICATIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const { success, error: showError } = useContext(NotificationContext);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/store-settings');
      setMessaging({ ...EMPTY_MESSAGING, ...(response.data.data.customerMessaging || {}) });
      setNotifications({ ...EMPTY_NOTIFICATIONS, ...(response.data.data.adminNotifications || {}) });
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to load messaging settings'));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveMessaging = async () => {
    try {
      setSaving('messaging');
      const response = await api.patch('/api/admin/store-settings', { customerMessaging: messaging });
      setMessaging(response.data.data.customerMessaging);
      success('Customer message settings saved');
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to save customer message settings'));
    } finally {
      setSaving('');
    }
  };

  const saveNotifications = async () => {
    try {
      setSaving('notifications');
      const response = await api.patch('/api/admin/store-settings', { adminNotifications: notifications });
      setNotifications(response.data.data.adminNotifications);
      success('Owner notification settings saved');
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to save owner notification settings'));
    } finally {
      setSaving('');
    }
  };

  if (loading) {
    return <section className='rounded-[12px] border border-slate-200 bg-white p-5 text-sm text-slate-500'>Loading messaging settings...</section>;
  }

  return (
    <section className='grid gap-6 xl:grid-cols-2'>
      <div className='rounded-[12px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-slate-950'>Customer messaging</h2>
        <p className='mt-1 text-xs text-slate-500'>Default content used when you open Send Message for a customer.</p>
        <label className='mt-4 block text-sm font-medium text-slate-700'>
          Default message
          <textarea
            value={messaging.defaultMessage}
            onChange={(event) => setMessaging((current) => ({ ...current, defaultMessage: event.target.value }))}
            rows={9}
            maxLength={5000}
            className='mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-950'
          />
        </label>
        <p className='mt-1 text-xs text-slate-500'>Available variables: {'{{name}}'}, {'{{coupon_code}}'}, {'{{site_url}}'}</p>
        <label className='mt-4 block text-sm font-medium text-slate-700'>
          Storefront URL
          <input
            type='text'
            value={messaging.siteUrl}
            onChange={(event) => setMessaging((current) => ({ ...current, siteUrl: event.target.value }))}
            placeholder='www.boldcave.com'
            className='mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-950'
          />
        </label>
        <button
          type='button'
          onClick={saveMessaging}
          disabled={Boolean(saving)}
          className='mt-4 rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50'
        >
          {saving === 'messaging' ? 'Saving...' : 'Save customer messaging'}
        </button>
      </div>

      <div className='rounded-[12px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-slate-950'>Owner notifications</h2>
        <p className='mt-1 text-xs text-slate-500'>New events always appear in the admin notification bell. Email delivery is optional.</p>
        <label className='mt-4 block text-sm font-medium text-slate-700'>
          Optional notification email
          <input
            type='email'
            value={notifications.email}
            onChange={(event) => setNotifications((current) => ({ ...current, email: event.target.value }))}
            placeholder='owner@example.com'
            className='mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal outline-none focus:border-slate-950'
          />
        </label>
        <div className='mt-4 space-y-3'>
          {[
            ['newCustomer', 'New customer'],
            ['newOrder', 'New order'],
            ['orderCancelled', 'Order cancelled'],
          ].map(([key, label]) => (
            <label key={key} className='flex items-center gap-3 text-sm text-slate-700'>
              <input
                type='checkbox'
                checked={notifications[key]}
                onChange={(event) => setNotifications((current) => ({ ...current, [key]: event.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
        <button
          type='button'
          onClick={saveNotifications}
          disabled={Boolean(saving)}
          className='mt-5 rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50'
        >
          {saving === 'notifications' ? 'Saving...' : 'Save owner notifications'}
        </button>
      </div>
    </section>
  );
}
