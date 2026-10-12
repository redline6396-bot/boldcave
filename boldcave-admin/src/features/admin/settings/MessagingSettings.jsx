'use client';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ExternalLink, ImageUp, Trash2 } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, getErrorMessage } from '@/lib/api';
import {
  deleteTemporaryPromotionalImage,
  PROMOTIONAL_IMAGE_ACCEPT,
  uploadPromotionalImage,
  validatePromotionalImageFile,
} from '@/lib/promotionalImages';

const EMPTY_MESSAGING = { defaultMessage: '', siteUrl: '', promotionalImage: null };
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
  const [imageUpload, setImageUpload] = useState({ status: '', progress: 0, message: '' });
  const imageInputRef = useRef(null);
  const persistedImageRef = useRef(null);
  const pendingImageIdRef = useRef('');
  const { success, error: showError } = useContext(NotificationContext);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/store-settings');
      const customerMessaging = { ...EMPTY_MESSAGING, ...(response.data.data.customerMessaging || {}) };
      setMessaging(customerMessaging);
      persistedImageRef.current = customerMessaging.promotionalImage || null;
      pendingImageIdRef.current = '';
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

  useEffect(() => () => {
    if (pendingImageIdRef.current) {
      void deleteTemporaryPromotionalImage(pendingImageIdRef.current).catch(() => {});
    }
  }, []);

  const selectPromotionalImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const validationError = validatePromotionalImageFile(file);
    if (validationError) {
      setImageUpload({ status: 'error', progress: 0, message: validationError });
      showError(validationError);
      return;
    }

    const previousPendingId = pendingImageIdRef.current;
    try {
      setImageUpload({ status: 'uploading', progress: 0, message: 'Uploading image...' });
      const image = await uploadPromotionalImage(file, (progress) => {
        setImageUpload({ status: 'uploading', progress, message: `Uploading image... ${progress}%` });
      });
      pendingImageIdRef.current = image.publicId;
      setMessaging((current) => ({ ...current, promotionalImage: image }));
      setImageUpload({ status: 'success', progress: 100, message: 'Image uploaded. Save to make it the global default.' });
      if (previousPendingId && previousPendingId !== image.publicId) {
        void deleteTemporaryPromotionalImage(previousPendingId).catch(() => {});
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to upload promotional image');
      setImageUpload({ status: 'error', progress: 0, message });
      showError(message);
    }
  };

  const removePromotionalImage = () => {
    const pendingId = pendingImageIdRef.current;
    if (pendingId) {
      pendingImageIdRef.current = '';
      void deleteTemporaryPromotionalImage(pendingId).catch(() => {});
    }
    setMessaging((current) => ({ ...current, promotionalImage: null }));
    setImageUpload({ status: 'success', progress: 0, message: 'Image removed. Save to update the global default.' });
  };

  const restoreSavedPromotionalImage = () => {
    const pendingId = pendingImageIdRef.current;
    if (pendingId) {
      pendingImageIdRef.current = '';
      void deleteTemporaryPromotionalImage(pendingId).catch(() => {});
    }
    setMessaging((current) => ({ ...current, promotionalImage: persistedImageRef.current }));
    setImageUpload({ status: '', progress: 0, message: '' });
  };

  const saveMessaging = async () => {
    try {
      setSaving('messaging');
      const response = await api.patch('/api/admin/store-settings', { customerMessaging: messaging });
      setMessaging(response.data.data.customerMessaging);
      persistedImageRef.current = response.data.data.customerMessaging?.promotionalImage || null;
      pendingImageIdRef.current = '';
      setImageUpload({ status: 'success', progress: 100, message: 'Promotional messaging saved.' });
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
        <h2 className='text-sm font-semibold uppercase tracking-wide text-slate-950'>Promotional messaging</h2>
        <p className='mt-1 text-xs text-slate-500'>Default message and image used when you open Send Message for a customer.</p>
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
        <div className='mt-4'>
          <div className='flex items-center justify-between gap-3'>
            <p className='text-sm font-medium text-slate-700'>Promotional image <span className='font-normal text-slate-400'>(optional)</span></p>
            {messaging.promotionalImage && (
              <a href={messaging.promotionalImage.url} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950'>
                Open image <ExternalLink size={13} />
              </a>
            )}
          </div>
          {messaging.promotionalImage ? (
            <div className='mt-2 flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-3'>
              <img src={messaging.promotionalImage.url} alt='Global promotional preview' className='h-20 w-20 rounded border border-slate-200 bg-white object-cover' />
              <div className='min-w-0 flex-1 text-xs text-slate-500'>
                <p className='font-medium text-slate-700'>{pendingImageIdRef.current ? 'New image ready to save' : 'Saved global image'}</p>
                <p className='mt-1'>JPG, PNG, or WebP · maximum 5 MB</p>
              </div>
              <button type='button' onClick={removePromotionalImage} disabled={imageUpload.status === 'uploading'} className='inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50'>
                <Trash2 size={14} /> Remove
              </button>
            </div>
          ) : (
            <p className='mt-2 rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500'>No global promotional image selected.</p>
          )}
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <input ref={imageInputRef} type='file' accept={PROMOTIONAL_IMAGE_ACCEPT} onChange={selectPromotionalImage} className='hidden' />
            <button type='button' onClick={() => imageInputRef.current?.click()} disabled={imageUpload.status === 'uploading' || Boolean(saving)} className='inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'>
              <ImageUp size={15} /> {messaging.promotionalImage ? 'Replace image' : 'Upload image'}
            </button>
            {persistedImageRef.current && messaging.promotionalImage?.publicId !== persistedImageRef.current.publicId && (
              <button type='button' onClick={restoreSavedPromotionalImage} disabled={imageUpload.status === 'uploading' || Boolean(saving)} className='rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'>Use saved image</button>
            )}
            {imageUpload.message && (
              <span className={`text-xs ${imageUpload.status === 'error' ? 'text-red-600' : imageUpload.status === 'success' ? 'text-emerald-700' : 'text-slate-500'}`}>{imageUpload.message}</span>
            )}
          </div>
          {imageUpload.status === 'uploading' && (
            <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100' aria-label={`Upload progress ${imageUpload.progress}%`}>
              <div className='h-full rounded-full bg-slate-950 transition-[width]' style={{ width: `${imageUpload.progress}%` }} />
            </div>
          )}
        </div>
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
          disabled={Boolean(saving) || imageUpload.status === 'uploading'}
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
