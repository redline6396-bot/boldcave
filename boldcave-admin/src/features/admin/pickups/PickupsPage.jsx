'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertCircle
} from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, getErrorMessage, money } from '@/lib/api';

const ACTIVE_STATES = ['requesting', 'scheduled', 'needs_reconciliation'];
const DELHIVERY_READY_TO_SHIP_URL = 'https://one.delhivery.com/orders/forward/ready-to-ship';
const WAITING_ORDER_STATUSES = ['shipping_pending', 'confirmed', 'processing'];

function displayValue(value) {
  return String(value || '-')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getIstDateInputValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatPickupDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return '-';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function orderHref(order) {
  return `/orders?order=${encodeURIComponent(order.orderId || order.orderNumber || '')}`;
}

function getPickupDateSelection(currentValue, settings) {
  if (ACTIVE_STATES.includes(settings?.state) && settings?.requestDate) {
    return String(settings.requestDate);
  }
  const current = String(currentValue || '');
  const minimum = String(settings?.pickupDateMin || '');
  const maximum = String(settings?.pickupDateMax || '');
  if (!current || (minimum && current < minimum) || (maximum && current > maximum)) {
    return String(settings?.suggestedPickupDate || minimum || '');
  }
  return current;
}

function providerPickupUrl(pickupId) {
  return `https://one.delhivery.com/v2/pickup-requests/${encodeURIComponent(pickupId)}`;
}

export default function PickupsPage() {
  const [settings, setSettings] = useState(null);
  const [pickups, setPickups] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [pageError, setPageError] = useState('');
  const { success, error: showError } = useContext(NotificationContext);

  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [confirmModalOrder, setConfirmModalOrder] = useState(null);
  const [confirmSelectedPickupId, setConfirmSelectedPickupId] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const params = new URLSearchParams({ limit: '50' });
      const [settingsResponse, historyResponse] = await Promise.all([
        api.get('/api/admin/shipping/delhivery/pickup-settings'),
        api.get(`/api/admin/shipping/delhivery/pickups?${params.toString()}`),
      ]);
      const nextSettings = settingsResponse.data.data.delhiveryPickup || null;
      setSettings(nextSettings);
      setPickupDate((current) => getPickupDateSelection(current, nextSettings));
      setPickups(historyResponse.data.data.pickups || []);
      setReadyOrders(historyResponse.data.data.readyOrders || []);
      setConfirmedOrders(historyResponse.data.data.confirmedOrders || []);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load Delhivery pickups');
      setPageError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allManifestedOrders = useMemo(() => {
    const map = new Map();
    readyOrders.forEach(o => map.set(o.orderId, { ...o, isAlreadyConfirmed: false }));
    confirmedOrders.forEach(o => map.set(o.orderId, { ...o, isAlreadyConfirmed: true }));
    return Array.from(map.values())
      .filter((o) => WAITING_ORDER_STATUSES.includes(o.orderStatus))
      .sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));
  }, [readyOrders, confirmedOrders]);

  const todayIstStr = useMemo(() => getIstDateInputValue(), []);
  const todayPickup = useMemo(() => {
    return pickups.find(p => p.requestDate === todayIstStr);
  }, [pickups, todayIstStr]);

  const newAfterRequestCount = useMemo(() => {
    if (!todayPickup || !todayPickup.requestedAt) return 0;
    const requestedTime = new Date(todayPickup.requestedAt).getTime();
    return allManifestedOrders.filter(o => new Date(o.orderedAt).getTime() > requestedTime).length;
  }, [todayPickup, allManifestedOrders]);

  const applySettings = (nextSettings) => {
    setSettings(nextSettings);
    setPickupDate((current) => getPickupDateSelection(current, nextSettings));
  };

  const requestPickup = async () => {
    if (busy) return;
    if (!pickupDate) {
      showError('Select a pickup date');
      return;
    }
    try {
      setBusy('request');
      const response = await api.post('/api/admin/shipping/delhivery/pickup-request', {
        pickupDate,
      });
      applySettings(response.data.data.delhiveryPickup);
      success(response.data.data.message || 'Pickup requested successfully.');
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      const updated = error?.response?.data?.error?.details?.delhiveryPickup;
      if (updated) applySettings(updated);
      
      const errMsg = getErrorMessage(error, 'Pickup request could not be completed right now. Please retry.');
      if (errMsg.toLowerCase().includes('already exist')) {
        showError("Today's pickup is already scheduled.");
      } else {
        showError(errMsg);
      }
      await loadData();
    } finally {
      setBusy('');
    }
  };

  const toggleAutomaticPickup = async () => {
    if (!settings || busy) return;
    try {
      setBusy('toggle');
      const response = await api.patch('/api/admin/shipping/delhivery/pickup-settings', {
        autoPickupEnabled: !settings.autoPickupEnabled,
      });
      applySettings(response.data.data.delhiveryPickup);
      success(`Automatic pickup request ${response.data.data.delhiveryPickup.autoPickupEnabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to update automatic pickup setting'));
    } finally {
      setBusy('');
    }
  };

  const confirmOrderAddedToPickup = async () => {
    if (!confirmModalOrder || !confirmSelectedPickupId || busy) return;
    try {
      setBusy('confirm_order');
      const response = await api.post('/api/admin/shipping/delhivery/pickup-order-confirmation', {
        orderId: confirmModalOrder.orderId,
        pickupId: confirmSelectedPickupId,
        action: 'confirm'
      });
      success(response.data?.data?.message || 'Order marked as added to pickup.');
      setConfirmModalOrder(null);
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to confirm order added to pickup.'));
    } finally {
      setBusy('');
    }
  };

  const copyAWBs = (awbs) => {
    const validAWBs = awbs.filter(Boolean);
    if (validAWBs.length === 0) return;
    globalThis.navigator.clipboard.writeText(validAWBs.join('\n'));
    success(`${validAWBs.length} AWB${validAWBs.length === 1 ? '' : 's'} copied`);
  };

  const copySelectedAWBs = () => {
    const awbs = allManifestedOrders
      .filter(o => selectedOrders.has(o.orderId))
      .map(o => o.waybill);
    copyAWBs(awbs);
  };

  const toggleOrderSelection = (orderId) => {
    const next = new Set(selectedOrders);
    if (next.has(orderId)) {
      next.delete(orderId);
    } else {
      next.add(orderId);
    }
    setSelectedOrders(next);
  };

  const toggleAllSelection = () => {
    if (selectedOrders.size === allManifestedOrders.length && allManifestedOrders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(allManifestedOrders.map(o => o.orderId)));
    }
  };

  if (pageError && !settings && allManifestedOrders.length === 0) {
    return (
      <div className='rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
        <p>{pageError}</p>
        <button type='button' onClick={loadData} className='mt-3 rounded border border-red-300 px-3 py-2 font-semibold'>Retry</button>
      </div>
    );
  }

  return (
    <div className='space-y-6 pb-20'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-950'>Shipping</h1>
          <p className='mt-1 text-sm text-gray-500'>Manage pickup requests and orders waiting for Delhivery pickup.</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <a
            href='https://one.delhivery.com'
            target='_blank'
            rel='noreferrer'
            className='inline-flex h-10 items-center justify-center rounded border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50'
          >
            Open Delhivery <ExternalLink size={15} className='ml-2' />
          </a>
          <button
            type='button'
            onClick={() => setIsModalOpen(true)}
            className='inline-flex h-10 items-center justify-center rounded bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-gray-800'
          >
            Request Pickup
          </button>
        </div>
      </header>

      {/* TOP SUMMARY STRIP */}
      <section className='grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded border border-gray-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0'>
        <div className='flex flex-col justify-center p-5'>
          <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Orders Waiting</p>
          <p className='mt-1 text-lg font-semibold text-gray-900'>
            {allManifestedOrders.length} order{allManifestedOrders.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className='flex flex-col justify-center p-5'>
          <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Today's Pickup</p>
          {todayPickup ? (
            <div>
              <p className='mt-1 text-lg font-semibold text-gray-900'>
                {displayValue(todayPickup.state)}
              </p>
              <div className='mt-0.5 text-sm text-gray-500'>
                {todayPickup.pickupId ? (
                  <span className='block font-semibold'>Pickup #{todayPickup.pickupId}</span>
                ) : null}
                <span>2:00 PM – 6:00 PM</span>
              </div>
            </div>
          ) : (
            <p className='mt-1 text-lg font-semibold text-gray-900'>Not requested</p>
          )}
        </div>

        <div className='flex flex-col justify-center p-5'>
          <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Auto Request</p>
          <p className='mt-1 text-lg font-semibold text-gray-900'>
            {settings?.autoPickupEnabled ? 'Enabled' : 'Disabled'}
          </p>
          {settings?.autoPickupEnabled && (
            <p className='mt-0.5 text-sm text-gray-500'>Request at 1:00 PM</p>
          )}
        </div>
      </section>

      {/* MAIN CONTENT LAYOUT */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* LEFT CARD: ORDERS WAITING FOR PICKUP */}
        <section className='flex flex-col rounded border border-gray-200 bg-white lg:col-span-2 h-fit'>
          <div className='flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <h2 className='text-base font-semibold uppercase tracking-wide text-gray-900'>Orders Waiting For Pickup</h2>
              <p className='mt-1 text-sm text-gray-500'>
                AWB-generated orders that still need pickup handling in Delhivery.
              </p>
            </div>
            <div className='shrink-0 text-right'>
              <span className='font-semibold text-gray-900'>{allManifestedOrders.length}</span> <span className='text-sm text-gray-500'>order{allManifestedOrders.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          
          {newAfterRequestCount > 0 && todayPickup && (
            <div className='m-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start justify-between'>
              <div>
                <p className='font-semibold'>
                  {newAfterRequestCount} order{newAfterRequestCount === 1 ? '' : 's'} became ready after today's pickup request.
                </p>
                <span className='mt-1 inline-block rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-900'>
                  Manual add required
                </span>
              </div>
              <a
                href={DELHIVERY_READY_TO_SHIP_URL}
                target='_blank'
                rel='noreferrer'
                className='inline-flex h-8 items-center rounded bg-amber-900 px-3 text-xs font-semibold text-white hover:bg-amber-950'
              >
                Open Delhivery & Add Orders <ExternalLink size={12} className='ml-1' />
              </a>
            </div>
          )}

          <div className='overflow-x-auto'>
            {loading && allManifestedOrders.length === 0 ? (
              <div className='p-8 text-center text-sm text-gray-500'>Loading...</div>
            ) : allManifestedOrders.length === 0 ? (
              <div className='p-10 text-center'>
                <p className='text-sm font-semibold text-gray-900'>No manifested orders are currently waiting for pickup.</p>
              </div>
            ) : (
              <table className='min-w-full divide-y divide-gray-200 text-left text-sm'>
                <thead className='bg-gray-50 text-xs uppercase tracking-wider text-gray-500'>
                  <tr>
                    <th className='px-4 py-3'>
                      <input
                        type='checkbox'
                        checked={selectedOrders.size > 0 && selectedOrders.size === allManifestedOrders.length}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = selectedOrders.size > 0 && selectedOrders.size < allManifestedOrders.length;
                          }
                        }}
                        onChange={toggleAllSelection}
                        className='rounded border-gray-300 text-gray-900 focus:ring-gray-900'
                      />
                    </th>
                    <th className='px-4 py-3 font-semibold'>Order</th>
                    <th className='px-4 py-3 font-semibold'>AWB</th>
                    <th className='px-4 py-3 font-semibold'>Customer</th>
                    <th className='px-4 py-3 font-semibold'>Payment</th>
                    <th className='px-4 py-3 font-semibold'>Current Status</th>
                    <th className='px-4 py-3 font-semibold text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 bg-white'>
                  {allManifestedOrders.map((order) => {
                    return (
                      <tr key={order.orderId} className='align-middle hover:bg-gray-50'>
                        <td className='px-4 py-3'>
                          <input
                            type='checkbox'
                            checked={selectedOrders.has(order.orderId)}
                            onChange={() => toggleOrderSelection(order.orderId)}
                            className='rounded border-gray-300 text-gray-900 focus:ring-gray-900'
                          />
                        </td>
                        <td className='px-4 py-3'>
                          <Link href={orderHref(order)} className='font-semibold text-blue-700 hover:underline'>
                            {order.orderNumber || '-'}
                          </Link>
                        </td>
                        <td className='px-4 py-3 font-mono text-xs text-gray-700'>{order.waybill || '-'}</td>
                        <td className='px-4 py-3 text-gray-700'>{order.customerName || '-'}</td>
                        <td className='px-4 py-3'>
                          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${order.paymentMethod === 'cod' ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {order.paymentMethod === 'cod' ? 'COD' : 'Razorpay / Paid'}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700'>
                            {displayValue(order.orderStatus)}
                          </span>
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            {!order.isAlreadyConfirmed && (
                              <button
                                type='button'
                                onClick={() => {
                                  setConfirmModalOrder(order);
                                  const eligible = pickups.filter(p => p.pickupId);
                                  if (eligible.length > 0) setConfirmSelectedPickupId(eligible[0].pickupId);
                                }}
                                className='inline-flex h-8 items-center rounded border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                              >
                                Confirm Added
                              </button>
                            )}
                            <Link
                              href={orderHref(order)}
                              className='inline-flex h-8 items-center rounded border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50'
                            >
                              View Order
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className='flex flex-col items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 p-4 sm:flex-row'>
            <p className='text-xs text-gray-500'>
              Pickup requests can be created here, but AWBs must still be assigned to the pickup in Delhivery.
            </p>
            <div className='flex flex-wrap items-center gap-2'>
              <button
                type='button'
                onClick={copySelectedAWBs}
                disabled={selectedOrders.size === 0}
                className='inline-flex h-9 items-center justify-center gap-2 rounded border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50'
              >
                <Copy size={14} /> Copy Selected AWBs
              </button>
              <a
                href={DELHIVERY_READY_TO_SHIP_URL}
                target='_blank'
                rel='noreferrer'
                className='inline-flex h-9 items-center justify-center gap-2 rounded border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50'
              >
                Open Delhivery & Add Orders <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </section>

        {/* RIGHT CARDS */}
        <div className='flex flex-col gap-6 lg:col-span-1'>
          
          {/* DAILY PICKUP REQUEST */}
          <section className='rounded border border-gray-200 bg-white p-5'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-900'>Automatic Daily Pickup Request</h2>
              </div>
              <button
                type='button'
                onClick={toggleAutomaticPickup}
                disabled={loading || Boolean(busy) || !settings}
                role='switch'
                aria-checked={settings?.autoPickupEnabled === true}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${settings?.autoPickupEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                aria-label='Toggle automatic pickup scheduling'
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings?.autoPickupEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            
            <div className='mt-5 space-y-3'>
              <div className='flex justify-between text-sm'>
                <span className='font-medium text-gray-900'>{settings?.autoPickupEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-500'>Request time</span>
                <span className='font-medium text-gray-900'>1:00 PM</span>
              </div>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-500'>Default pickup window</span>
                <span className='font-medium text-gray-900'>2:00 PM – 6:00 PM</span>
              </div>
              <div className='pt-2 text-xs leading-5 text-gray-600'>
                <p>Automatically creates today's pickup request when eligible orders are waiting.</p>
              </div>
            </div>
            <div className='mt-5 rounded bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700'>
              AWBs are not automatically assigned to the pickup. Add them manually in Delhivery.
            </div>
          </section>

        </div>
      </div>

      {/* PICKUP HISTORY */}
      <section className='mt-8'>
        <div className='mb-4'>
          <h2 className='text-lg font-semibold uppercase tracking-wide text-gray-900'>Pickup History</h2>
        </div>

        <div className='space-y-3'>
          {loading && pickups.length === 0 ? (
            <p className='text-sm text-gray-500'>Loading history...</p>
          ) : pickups.length === 0 ? (
            <div className='rounded border border-dashed border-gray-300 p-8 text-center'>
              <p className='text-sm text-gray-500'>No pickup requests yet.</p>
            </div>
          ) : (
            pickups.map((pickup) => (
              <PickupHistoryRow key={pickup.id} pickup={pickup} />
            ))
          )}
        </div>
      </section>

      {/* REQUEST PICKUP MODAL */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
            <h2 className='text-xl font-bold text-gray-900'>Request Pickup</h2>
            <p className='mt-1 text-sm text-gray-500'>Create a pickup request in Delhivery.</p>
            
            <div className='mt-6 space-y-4'>
              <label className='block'>
                <span className='text-sm font-semibold text-gray-700'>Pickup Date</span>
                <input
                  type='date'
                  value={pickupDate}
                  min={settings?.pickupDateMin || undefined}
                  max={settings?.pickupDateMax || undefined}
                  onChange={(event) => setPickupDate(event.target.value)}
                  disabled={Boolean(busy)}
                  className='mt-1 block h-10 w-full rounded border-gray-300 px-3 text-sm focus:border-gray-900 focus:ring-gray-900 disabled:bg-gray-100'
                />
              </label>
              
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <span className='block text-sm font-semibold text-gray-700'>Pickup Window</span>
                  <p className='mt-1 text-sm text-gray-900'>2:00 PM – 6:00 PM</p>
                </div>
                <div>
                  <span className='block text-sm font-semibold text-gray-700'>Expected Packages</span>
                  <p className='mt-1 text-sm text-gray-900'>
                    {Math.max(1, allManifestedOrders.length)} package{Math.max(1, allManifestedOrders.length) === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              
              <div>
                <span className='block text-sm font-semibold text-gray-700'>Pickup Location</span>
                <p className='mt-1 text-sm text-gray-900'>{settings?.pickupLocation || 'Default location'}</p>
              </div>
            </div>

            <div className='mt-8 flex items-center justify-end gap-3'>
              <button
                type='button'
                onClick={() => setIsModalOpen(false)}
                disabled={Boolean(busy)}
                className='h-10 rounded px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={requestPickup}
                disabled={Boolean(busy) || !pickupDate}
                className='inline-flex h-10 items-center justify-center rounded bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50'
              >
                {busy === 'request' ? 'Requesting...' : 'Request Pickup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ORDER ADDED MODAL */}
      {confirmModalOrder && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
            <h2 className='text-xl font-bold text-gray-900'>Confirm Order Added</h2>
            <p className='mt-1 text-sm text-gray-500'>Record that this order was manually assigned to an existing pickup in Delhivery.</p>
            
            <div className='mt-6 space-y-4'>
              <div className='rounded bg-gray-50 p-3 border border-gray-200'>
                <div className='flex justify-between'>
                  <span className='text-xs font-semibold text-gray-500'>Order</span>
                  <span className='text-xs font-semibold text-gray-900'>{confirmModalOrder.orderNumber || '-'}</span>
                </div>
                <div className='flex justify-between mt-1'>
                  <span className='text-xs font-semibold text-gray-500'>AWB</span>
                  <span className='text-xs font-semibold text-gray-900'>{confirmModalOrder.waybill || '-'}</span>
                </div>
              </div>
              
              <label className='block'>
                <span className='text-sm font-semibold text-gray-700'>Select Delhivery Pickup</span>
                <select
                  value={confirmSelectedPickupId}
                  onChange={(e) => setConfirmSelectedPickupId(e.target.value)}
                  disabled={Boolean(busy) || pickups.filter(p => p.pickupId).length === 0}
                  className='mt-1 block h-10 w-full rounded border-gray-300 px-3 text-sm focus:border-gray-900 focus:ring-gray-900 disabled:bg-gray-100'
                >
                  {pickups.filter(p => p.pickupId).map(p => (
                    <option key={p.pickupId} value={p.pickupId}>
                      Pickup #{p.pickupId} · {formatPickupDate(p.requestDate)}
                    </option>
                  ))}
                </select>
                {pickups.filter(p => p.pickupId).length === 0 && (
                  <p className='mt-1 text-xs text-red-600'>No eligible pickups found with a confirmed Delhivery Pickup ID.</p>
                )}
              </label>

              <div className='rounded border border-blue-200 bg-blue-50 p-3'>
                <p className='text-sm font-semibold text-blue-900'>Have you already added this order to the selected pickup in Delhivery?</p>
                <p className='mt-1 text-xs text-blue-700'>This action does not create an assignment in Delhivery, it only records it here.</p>
              </div>
            </div>

            <div className='mt-8 flex items-center justify-end gap-3'>
              <button
                type='button'
                onClick={() => setConfirmModalOrder(null)}
                disabled={Boolean(busy)}
                className='h-10 rounded px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={confirmOrderAddedToPickup}
                disabled={Boolean(busy) || !confirmSelectedPickupId}
                className='inline-flex h-10 items-center justify-center rounded bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50'
              >
                {busy === 'confirm_order' ? 'Confirming...' : 'Confirm Added'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function PickupHistoryRow({ pickup }) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusLabel = (state) => {
    switch (state) {
      case 'needs_reconciliation': return 'Needs attention';
      default: return displayValue(state);
    }
  };

  const getStatusColor = (state) => {
    switch (state) {
      case 'scheduled': return 'bg-emerald-50 text-emerald-700';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      case 'failed': return 'bg-red-50 text-red-700';
      case 'needs_reconciliation': return 'bg-amber-50 text-amber-700';
      default: return 'bg-blue-50 text-blue-700';
    }
  };

  const title = pickup.pickupId 
    ? `Pickup #${pickup.pickupId}`
    : `Pickup Request · ${formatPickupDate(pickup.requestDate)}`;

  return (
    <div className='overflow-hidden rounded border border-gray-200 bg-white'>
      <div 
        className='flex cursor-pointer flex-col gap-3 p-4 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between'
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className='flex items-start gap-3 sm:items-center'>
          <button type='button' className='mt-1 text-gray-400 sm:mt-0'>
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          <div>
            <div className='flex items-center gap-2'>
              <h3 className='font-semibold text-gray-900'>{title}</h3>
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusColor(pickup.state)}`}>
                {getStatusLabel(pickup.state)}
              </span>
            </div>
            <div className='mt-1 text-xs text-gray-500'>
              {formatPickupDate(pickup.requestDate)} · 2:00 PM – 6:00 PM
            </div>
          </div>
        </div>
        
        <div className='flex flex-col items-end gap-2 pl-8 sm:pl-0'>
          <p className='text-xs text-gray-500'>
            Requested for {pickup.expectedPackageCount} package{pickup.expectedPackageCount === 1 ? '' : 's'}
          </p>
          <div className='flex items-center gap-2'>
            {pickup.pickupId && (
              <a
                href={providerPickupUrl(pickup.pickupId)}
                target='_blank'
                rel='noreferrer'
                onClick={(e) => e.stopPropagation()}
                className='inline-flex h-8 items-center gap-2 rounded border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100'
              >
                Open in Delhivery <ExternalLink size={12} className='ml-1' />
              </a>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className='border-t border-gray-200 bg-gray-50 p-4'>
          <div className='flex justify-between items-center mb-3'>
            <div>
              <h4 className='text-xs font-semibold uppercase text-gray-900'>Orders prepared when request was made</h4>
              {pickup.state === 'needs_reconciliation' && (
                <p className='mt-1 text-xs text-amber-700 flex items-center gap-1'>
                  <AlertCircle size={14} /> We could not confirm a Delhivery pickup ID for this request. Check the request in Delhivery.
                </p>
              )}
            </div>
          </div>
          {pickup.orders && pickup.orders.length > 0 ? (
            <div className='overflow-x-auto rounded border border-gray-200 bg-white'>
              <table className='min-w-full divide-y divide-gray-200 text-left text-sm'>
                <thead className='bg-gray-50 text-xs uppercase text-gray-500'>
                  <tr>
                    <th className='px-4 py-2 font-semibold'>Order</th>
                    <th className='px-4 py-2 font-semibold'>AWB</th>
                    <th className='px-4 py-2 font-semibold'>Customer</th>
                    <th className='px-4 py-2 font-semibold'>Payment</th>
                    <th className='px-4 py-2 font-semibold'>Amount</th>
                    <th className='px-4 py-2 font-semibold'>Current Status</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {pickup.orders.map((order) => (
                    <tr key={order.orderId || order.orderNumber}>
                      <td className='px-4 py-2'>
                        <Link href={orderHref(order)} className='font-semibold text-blue-700 hover:underline'>
                          {order.orderNumber || '-'}
                        </Link>
                      </td>
                      <td className='px-4 py-2 font-mono text-xs text-gray-700'>{order.waybill || '-'}</td>
                      <td className='px-4 py-2 text-gray-700'>{order.customerName || '-'}</td>
                      <td className='px-4 py-2 text-gray-700'>
                        {order.paymentMethod === 'cod' ? 'COD' : 'Razorpay / Paid'}
                      </td>
                      <td className='px-4 py-2 font-semibold text-gray-800'>{money(order.finalAmount)}</td>
                      <td className='px-4 py-2'>
                        {order.currentOrderStatus ? (
                          <span className='rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700'>
                            {displayValue(order.currentOrderStatus)}
                          </span>
                        ) : (
                          <span className='text-xs text-gray-500'>Status unavailable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className='text-sm text-gray-500'>No order details were saved for this pickup request.</p>
          )}
        </div>
      )}
    </div>
  );
}
