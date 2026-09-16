'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  History,
  PackageCheck,
  RefreshCw,
  Search,
} from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDateTime, getErrorMessage, money } from '@/lib/api';

const ACTIVE_STATES = ['requesting', 'scheduled', 'needs_reconciliation'];
const HISTORY_STATES = [
  'scheduled',
  'cancelled',
  'failed',
  'needs_reconciliation',
  'no_ready_shipments',
];

function displayValue(value) {
  return String(value || '-')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatIstDateTime(value) {
  const formatted = formatDateTime(value);
  if (formatted === '-') return '-';
  return `${formatted.replace(/\b(am|pm)\b/gi, (period) => period.toUpperCase())} IST`;
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

function formatPickupTime(value) {
  const match = /^(\d{2}):(\d{2})/.exec(String(value || ''));
  if (!match) return '-';
  const hour = Number(match[1]);
  const minute = match[2];
  if (!Number.isInteger(hour) || hour > 23) return '-';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
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

function sourceLabel(source) {
  if (source === 'automatic') return 'Automatic';
  if (source === 'legacy_snapshot') return 'Existing pickup';
  return 'Created from admin';
}

function statusSourceLabel(source) {
  return source === 'admin_confirmed_provider_action'
    ? 'Cancellation confirmed by admin'
    : 'Bold Cave record';
}

export default function PickupsPage() {
  const [settings, setSettings] = useState(null);
  const [pickups, setPickups] = useState([]);
  const [readyOrders, setReadyOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [pickupDate, setPickupDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [pageError, setPageError] = useState('');
  const { success, error: showError } = useContext(NotificationContext);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      const params = new URLSearchParams({ limit: '200' });
      if (statusFilter) params.set('state', statusFilter);
      const [settingsResponse, historyResponse] = await Promise.all([
        api.get('/api/admin/shipping/delhivery/pickup-settings'),
        api.get(`/api/admin/shipping/delhivery/pickups?${params.toString()}`),
      ]);
      const nextSettings = settingsResponse.data.data.delhiveryPickup || null;
      setSettings(nextSettings);
      setPickupDate((current) => getPickupDateSelection(current, nextSettings));
      setPickups(historyResponse.data.data.pickups || []);
      setReadyOrders(historyResponse.data.data.readyOrders || []);
      setTotal(Number(historyResponse.data.data.total) || 0);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load Delhivery pickups');
      setPageError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visiblePickups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return pickups;
    return pickups.filter((pickup) =>
      [
        pickup.pickupId,
        pickup.requestDate,
        pickup.pickupLocation,
        pickup.state,
        pickup.source,
        pickup.lastError,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [pickups, search]);

  const applySettings = (nextSettings) => {
    setSettings(nextSettings);
    setPickupDate((current) => getPickupDateSelection(current, nextSettings));
  };

  const toggleAutomaticPickup = async () => {
    if (!settings || busy) return;
    try {
      setBusy('toggle');
      const response = await api.patch('/api/admin/shipping/delhivery/pickup-settings', {
        autoPickupEnabled: !settings.autoPickupEnabled,
      });
      applySettings(response.data.data.delhiveryPickup);
      success('Automatic pickup setting updated');
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to update pickup setting'));
    } finally {
      setBusy('');
    }
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
      success(response.data.data.message || 'Delhivery pickup scheduled');
      await loadData();
    } catch (error) {
      const updated = error?.response?.data?.error?.details?.delhiveryPickup;
      if (updated) applySettings(updated);
      showError(getErrorMessage(error, 'Unable to request Delhivery pickup'));
      await loadData();
    } finally {
      setBusy('');
    }
  };

  const openCurrentPickup = () => {
    const pickupId = String(settings?.pickupId || '').trim();
    if (!pickupId) {
      showError('Pickup ID is unavailable');
      return;
    }
    globalThis.open(providerPickupUrl(pickupId), '_blank', 'noopener,noreferrer');
  };

  const confirmPickupCancellation = async () => {
    const pickupId = String(settings?.pickupId || '').trim();
    if (!pickupId || busy) return;
    const confirmed = globalThis.confirm(
      `Confirm only after Pickup ${pickupId} shows Cancelled in Delhivery One. This updates pickup history only and does not cancel orders, shipments, stock, or refunds.`
    );
    if (!confirmed) return;

    try {
      setBusy('cancel-confirm');
      const response = await api.post(
        '/api/admin/shipping/delhivery/pickup-cancellation',
        { pickupId, confirmedProviderCancellation: true }
      );
      applySettings(response.data.data.delhiveryPickup);
      success(response.data.data.message || 'Pickup cancellation confirmed');
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to confirm pickup cancellation'));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className='space-y-6'>
      <header className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-950'>Pickup Management</h1>
          <p className='mt-1 text-sm text-gray-500'>Schedule Delhivery pickups and see exactly which orders are ready or included.</p>
        </div>
        <a
          href='https://one.delhivery.com/v2/pickup-requests/domestic'
          target='_blank'
          rel='noreferrer'
          className='inline-flex h-10 w-fit items-center gap-2 rounded border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50'
        >
          Open Delhivery One <ExternalLink size={15} />
        </a>
      </header>

      {pageError ? (
        <div className='rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          <p>{pageError}</p>
          <button type='button' onClick={loadData} className='mt-3 rounded border border-red-300 px-3 py-2 font-semibold'>Retry</button>
        </div>
      ) : null}

      {loading && !settings ? (
        <section className='rounded border border-gray-200 bg-white p-5 text-sm text-gray-500'>Loading pickup controls...</section>
      ) : settings ? (
        <>
          <section className='grid gap-4 md:grid-cols-3'>
            <SummaryTile
              label='Ready for pickup'
              value={`${readyOrders.length} order${readyOrders.length === 1 ? '' : 's'}`}
              detail='Will be included in the next request'
              tone={readyOrders.length ? 'blue' : 'neutral'}
            />
            <SummaryTile
              label='Latest pickup'
              value={displayValue(settings.state)}
              detail={settings.pickupId ? `Pickup ID ${settings.pickupId}` : 'No provider pickup ID yet'}
              tone={settings.state === 'scheduled' ? 'green' : settings.state === 'failed' ? 'red' : 'neutral'}
            />
            <SummaryTile
              label='Pickup location'
              value={settings.pickupLocation || '-'}
              detail='Pickup window 2:00 PM – 6:00 PM'
              tone='neutral'
            />
          </section>

          <section className='grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]'>
            <div className='rounded border border-gray-200 bg-white p-5'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Most recent request</p>
                  <div className='mt-2 flex flex-wrap items-center gap-2'>
                    <h2 className='text-lg font-semibold text-gray-950'>Latest pickup details</h2>
                    <StatusBadge state={settings.state} />
                  </div>
                </div>
                {settings.pickupId ? (
                  <button
                    type='button'
                    onClick={openCurrentPickup}
                    className='inline-flex h-9 w-fit items-center gap-2 rounded border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50'
                  >
                    View in Delhivery <ExternalLink size={14} />
                  </button>
                ) : null}
              </div>

              <dl className='mt-5 divide-y divide-gray-100 rounded border border-gray-200'>
                <DataRow label='Pickup ID' value={settings.pickupId || 'Not assigned'} mono />
                <DataRow label='Pickup date' value={formatPickupDate(settings.requestDate)} />
                <DataRow label='Expected packages' value={Number(settings.expectedPackageCount) || 0} />
                <DataRow label='Created' value={formatIstDateTime(settings.requestedAt)} />
                {settings.cancelledAt ? <DataRow label='Cancelled' value={formatIstDateTime(settings.cancelledAt)} /> : null}
                {settings.lastError ? <DataRow label='Last error' value={settings.lastError} /> : null}
              </dl>

              {settings.state === 'scheduled' && settings.pickupId ? (
                <div className='mt-5 rounded border border-amber-200 bg-amber-50 p-4'>
                  <p className='text-sm font-semibold text-amber-900'>Need to cancel this pickup?</p>
                  <p className='mt-1 text-xs leading-5 text-amber-800'>Cancel it in Delhivery first, then confirm here so Bold Cave shows the same status.</p>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    <button
                      type='button'
                      onClick={openCurrentPickup}
                      disabled={Boolean(busy)}
                      className='inline-flex h-9 items-center gap-2 rounded border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 disabled:opacity-50'
                    >
                      Cancel in Delhivery <ExternalLink size={14} />
                    </button>
                    <button
                      type='button'
                      onClick={confirmPickupCancellation}
                      disabled={Boolean(busy)}
                      className='inline-flex h-9 items-center rounded border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 disabled:opacity-50'
                    >
                      {busy === 'cancel-confirm' ? 'Updating...' : 'Confirm cancellation'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className='rounded border border-gray-200 bg-white p-5'>
              <div className='flex items-center gap-2'>
                <CalendarClock size={20} className='text-gray-500' />
                <h2 className='text-lg font-semibold text-gray-950'>Schedule next pickup</h2>
              </div>
              <p className='mt-1 text-sm leading-5 text-gray-500'>This warehouse-level request sends Delhivery the expected package count for the orders listed below.</p>

              <label className='mt-5 block text-xs font-semibold uppercase tracking-wide text-gray-500'>
                Pickup date
                <input
                  type='date'
                  value={pickupDate}
                  min={settings.pickupDateMin || undefined}
                  max={settings.pickupDateMax || undefined}
                  onChange={(event) => setPickupDate(event.target.value)}
                  disabled={Boolean(busy) || ACTIVE_STATES.includes(settings.state)}
                  className='mt-2 block h-11 w-full px-3 text-sm font-normal text-gray-950 disabled:bg-gray-100'
                />
              </label>
              <p className='mt-2 text-xs text-gray-500'>Selected: {formatPickupDate(pickupDate)} · 2:00 PM – 6:00 PM</p>
              <button
                type='button'
                onClick={requestPickup}
                disabled={Boolean(busy) || !pickupDate || ACTIVE_STATES.includes(settings.state)}
                className='mt-4 inline-flex h-11 w-full items-center justify-center rounded bg-black px-4 text-sm font-semibold text-white disabled:opacity-50'
              >
                {busy === 'request' ? 'Requesting...' : `Request pickup for ${readyOrders.length} order${readyOrders.length === 1 ? '' : 's'}`}
              </button>

              <div className='mt-5 border-t border-gray-100 pt-4'>
                <div className='flex items-center justify-between gap-4'>
                  <div>
                    <p className='text-sm font-semibold text-gray-800'>Automatic scheduling</p>
                    <p className='mt-1 text-xs text-gray-500'>{settings.autoPickupEnabled ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <button
                    type='button'
                    onClick={toggleAutomaticPickup}
                    disabled={loading || Boolean(busy) || !settings}
                    role='switch'
                    aria-checked={settings.autoPickupEnabled === true}
                    className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${settings.autoPickupEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    aria-label='Toggle automatic pickup scheduling'
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${settings.autoPickupEnabled ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {settings.state === 'cancelled' && readyOrders.length > 0 ? (
            <div className='rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800'>
              The previous pickup is closed. {readyOrders.length} order{readyOrders.length === 1 ? ' is' : 's are'} ready for a new pickup.
            </div>
          ) : null}
        </>
      ) : null}

      <section className='rounded border border-gray-200 bg-white p-5'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <PackageCheck size={20} className='text-gray-500' />
              <h2 className='font-semibold text-gray-950'>Orders ready for pickup</h2>
            </div>
            <p className='mt-1 text-sm text-gray-500'>These manifested orders are counted when the next warehouse pickup is requested.</p>
          </div>
          <p className='text-sm font-semibold text-gray-700'>{readyOrders.length} ready</p>
        </div>
        <ReadyOrdersTable orders={readyOrders} loading={loading} />
      </section>

      <section className='rounded border border-gray-200 bg-white p-5'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <History size={20} className='text-gray-500' />
              <h2 className='font-semibold text-gray-950'>Pickup history</h2>
            </div>
            <p className='mt-1 text-sm text-gray-500'>{total} pickup record{total === 1 ? '' : 's'}.</p>
          </div>
          <div className='grid gap-2 sm:grid-cols-[260px_190px_auto]'>
            <label className='relative block'>
              <Search className='absolute left-3 top-2.5 text-gray-400' size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Search pickup ID, date, status'
                className='h-10 w-full py-2 pl-10 pr-3'
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className='h-10 px-3'
            >
              <option value=''>All statuses</option>
              {HISTORY_STATES.map((state) => (
                <option key={state} value={state}>{displayValue(state)}</option>
              ))}
            </select>
            <button
              type='button'
              onClick={loadData}
              disabled={loading}
              className='inline-flex h-10 items-center justify-center gap-2 rounded border border-gray-300 px-3 text-sm font-semibold text-gray-700 disabled:opacity-50'
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <div className='mt-5 space-y-3'>
          {loading && pickups.length === 0 ? (
            <p className='text-sm text-gray-500'>Loading pickup history...</p>
          ) : visiblePickups.length === 0 ? (
            <p className='rounded border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500'>No pickup history matches these filters.</p>
          ) : visiblePickups.map((pickup) => {
            const isOpen = Boolean(expanded[pickup.id]);
            return (
              <article key={pickup.id} className='overflow-hidden rounded border border-gray-200'>
                <div className='flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='font-semibold text-gray-950'>{pickup.pickupId || `Attempt ${pickup.id.slice(-6)}`}</p>
                      <StatusBadge state={pickup.state} />
                      <span className='rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600'>{sourceLabel(pickup.source)}</span>
                    </div>
                    <p className='mt-1 text-sm text-gray-600'>
                      {formatPickupDate(pickup.requestDate)} · {formatPickupTime(pickup.pickupTime)} IST · {pickup.pickupLocation || '-'}
                    </p>
                    <p className='mt-1 text-xs text-gray-400'>Recorded {formatIstDateTime(pickup.createdAt)}</p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    {pickup.pickupId ? (
                      <a
                        href={providerPickupUrl(pickup.pickupId)}
                        target='_blank'
                        rel='noreferrer'
                        className='inline-flex h-9 items-center gap-2 rounded border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50'
                      >
                        View in Delhivery <ExternalLink size={14} />
                      </a>
                    ) : null}
                    <button
                      type='button'
                      onClick={() => setExpanded((current) => ({ ...current, [pickup.id]: !isOpen }))}
                      className='inline-flex h-9 items-center gap-2 rounded border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50'
                    >
                      {isOpen ? 'Hide details' : 'View details'}
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>
                {isOpen ? <PickupDetails pickup={pickup} /> : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SummaryTile({ label, value, detail, tone = 'neutral' }) {
  const accents = {
    blue: 'border-l-blue-500',
    green: 'border-l-emerald-500',
    red: 'border-l-red-500',
    neutral: 'border-l-gray-400',
  };
  return (
    <div className={`rounded border border-gray-200 border-l-4 bg-white p-4 ${accents[tone]}`}>
      <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>{label}</p>
      <p className='mt-2 break-words text-xl font-semibold text-gray-950'>{value}</p>
      <p className='mt-1 text-xs leading-5 text-gray-500'>{detail}</p>
    </div>
  );
}

function DataRow({ label, value, mono = false }) {
  return (
    <div className='grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-start'>
      <dt className='text-xs font-semibold uppercase tracking-wide text-gray-500'>{label}</dt>
      <dd className={`break-words text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

function ReadyOrdersTable({ orders, loading }) {
  if (loading && orders.length === 0) {
    return <p className='mt-5 text-sm text-gray-500'>Loading ready orders...</p>;
  }
  if (orders.length === 0) {
    return (
      <div className='mt-5 rounded border border-dashed border-gray-300 p-6 text-center'>
        <p className='font-semibold text-gray-800'>No orders are waiting for pickup</p>
        <p className='mt-1 text-sm text-gray-500'>Manifested Delhivery orders will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className='mt-5 overflow-x-auto rounded border border-gray-200'>
      <table className='min-w-full divide-y divide-gray-200 text-left text-sm'>
        <thead className='bg-gray-50 text-xs uppercase text-gray-500'>
          <tr>
            <th className='px-4 py-3 font-semibold'>Order</th>
            <th className='px-4 py-3 font-semibold'>AWB</th>
            <th className='px-4 py-3 font-semibold'>Customer</th>
            <th className='px-4 py-3 font-semibold'>Payment</th>
            <th className='px-4 py-3 font-semibold'>Amount</th>
            <th className='px-4 py-3 font-semibold'>Order status</th>
            <th className='px-4 py-3 font-semibold'>Pickup</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-100 bg-white'>
          {orders.map((order) => (
            <tr key={order.orderId} className='align-top hover:bg-gray-50'>
              <td className='px-4 py-3'>
                <Link href={orderHref(order)} className='font-semibold text-blue-700 hover:underline'>
                  {order.orderNumber || '-'}
                </Link>
                <p className='mt-1 text-xs text-gray-400'>{formatIstDateTime(order.orderedAt)}</p>
              </td>
              <td className='px-4 py-3 font-mono text-xs text-gray-700'>{order.waybill || '-'}</td>
              <td className='px-4 py-3 text-gray-700'>{order.customerName || '-'}</td>
              <td className='px-4 py-3 text-gray-700'>{displayValue(order.paymentMethod)}</td>
              <td className='px-4 py-3 font-semibold text-gray-800'>{money(order.finalAmount)}</td>
              <td className='px-4 py-3'><StatusBadge state={order.orderStatus} /></td>
              <td className='px-4 py-3'>
                <span className='rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700'>Counted in request</span>
                {order.pickupId && order.pickupState === 'cancelled' ? (
                  <p className='mt-1 text-xs text-gray-400'>Previous {order.pickupId} cancelled</p>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ state }) {
  const tones = {
    scheduled: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-gray-100 text-gray-700',
    failed: 'bg-red-50 text-red-700',
    needs_reconciliation: 'bg-amber-50 text-amber-800',
    no_ready_shipments: 'bg-gray-100 text-gray-600',
    requesting: 'bg-violet-50 text-violet-700',
  };
  return <span className={`rounded px-2 py-1 text-xs font-semibold ${tones[state] || 'bg-gray-100 text-gray-700'}`}>{displayValue(state)}</span>;
}

function PickupDetails({ pickup }) {
  return (
    <div className='border-t border-gray-200 bg-gray-50 p-4'>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <Detail label='Pickup ID' value={pickup.pickupId || '-'} />
        <Detail label='Expected packages' value={pickup.expectedPackageCount} />
        <Detail label='Provider HTTP status' value={pickup.providerHttpStatus || '-'} />
        <Detail label='Record source' value={statusSourceLabel(pickup.statusSource)} />
        <Detail label='Requested at' value={formatIstDateTime(pickup.requestedAt)} />
        <Detail label='Cancelled at' value={formatIstDateTime(pickup.cancelledAt)} />
        <Detail label='Last updated' value={formatIstDateTime(pickup.updatedAt)} />
        <Detail label='Last error' value={pickup.lastError || '-'} />
      </div>
      <div className='mt-4'>
        <p className='text-xs font-semibold uppercase text-gray-500'>Bold Cave orders counted ({pickup.orders?.length || 0})</p>
        {pickup.orders?.length ? (
          <div className='mt-2 overflow-x-auto rounded border border-gray-200 bg-white'>
            <table className='min-w-full divide-y divide-gray-200 text-left text-sm'>
              <thead className='bg-gray-50 text-xs uppercase text-gray-500'>
                <tr>
                  <th className='px-3 py-2 font-semibold'>Order</th>
                  <th className='px-3 py-2 font-semibold'>AWB</th>
                  <th className='px-3 py-2 font-semibold'>Customer</th>
                  <th className='px-3 py-2 font-semibold'>Payment</th>
                  <th className='px-3 py-2 font-semibold'>Amount</th>
                  <th className='px-3 py-2 font-semibold'>Status when requested</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {pickup.orders.map((order) => (
                  <tr key={order.orderId || order.orderNumber}>
                    <td className='px-3 py-2'>
                      <Link href={orderHref(order)} className='font-semibold text-blue-700 hover:underline'>
                        {order.orderNumber || '-'}
                      </Link>
                    </td>
                    <td className='px-3 py-2 font-mono text-xs text-gray-700'>{order.waybill || '-'}</td>
                    <td className='px-3 py-2 text-gray-700'>{order.customerName || '-'}</td>
                    <td className='px-3 py-2 text-gray-700'>{displayValue(order.paymentMethod)}</td>
                    <td className='px-3 py-2 font-semibold text-gray-800'>{money(order.finalAmount)}</td>
                    <td className='px-3 py-2 text-gray-700'>{displayValue(order.orderStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className='mt-2 text-sm text-gray-500'>Order-level details were not stored for this older pickup.</p>
        )}
      </div>
      <div className='mt-4'>
        <p className='text-xs font-semibold uppercase text-gray-500'>Timeline</p>
        {pickup.events?.length ? (
          <div className='mt-2 space-y-2'>
            {[...pickup.events].reverse().map((event, index) => (
              <div key={`${event.type}-${event.at}-${index}`} className='rounded border border-gray-200 bg-white p-3 text-sm'>
                <p className='font-semibold text-gray-900'>{displayValue(event.type)}</p>
                <p className='text-gray-600'>{event.message || '-'}</p>
                <p className='mt-1 text-xs text-gray-400'>{formatIstDateTime(event.at)}</p>
              </div>
            ))}
          </div>
        ) : <p className='mt-2 text-sm text-gray-500'>No timeline events stored.</p>}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className='rounded border border-gray-200 bg-white p-3'>
      <p className='text-xs uppercase text-gray-500'>{label}</p>
      <p className='mt-1 break-words text-sm font-semibold text-gray-800'>{value}</p>
    </div>
  );
}
