'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, Package, Search } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDate, getErrorMessage, getId, money } from '@/lib/api';

const ORDER_STATUSES = ['confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];
const ADMIN_MANUAL_ORDER_STATUSES = ['confirmed', 'processing'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cod'];
const CANCELLABLE_ORDER_STATUSES = ['confirmed', 'processing'];

function hasShadowfaxSummary(order) {
  const shadowfax = order?.shadowfax;
  return Boolean(
    shadowfax?.orderId ||
      shadowfax?.awbNumber ||
      shadowfax?.clientOrderId ||
      shadowfax?.trackingUrl ||
      shadowfax?.shipmentStatus ||
      shadowfax?.statusDisplay ||
      shadowfax?.syncStatus
  );
}

function getShippingSummary(order) {
  const provider = String(order?.shippingProvider || '').toLowerCase();
  const useShadowfax = provider === 'shadowfax' || (!provider && hasShadowfaxSummary(order));

  if (useShadowfax) {
    const shadowfax = order?.shadowfax || {};
    return {
      provider: 'shadowfax',
      providerLabel: 'Shadowfax',
      providerOrderId: shadowfax.orderId || '',
      awbCode: shadowfax.awbNumber || '',
      courierName: 'Shadowfax',
      shipmentStatus: shadowfax.statusDisplay || shadowfax.shipmentStatus || '',
      syncStatus: shadowfax.syncStatus || '',
      trackingUrl: shadowfax.trackingUrl || '',
    };
  }

  const shiprocket = order?.shiprocket || {};
  return {
    provider: 'shiprocket',
    providerLabel: 'Shiprocket',
    providerOrderId: shiprocket.shiprocketOrderId || '',
    shipmentId: shiprocket.shipmentId || '',
    awbCode: shiprocket.awbCode || '',
    courierName: shiprocket.courierName || '',
    shipmentStatus: shiprocket.shipmentStatus || '',
    syncStatus: shiprocket.syncStatus || '',
    trackingUrl: shiprocket.trackingUrl || '',
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [busyId, setBusyId] = useState('');
  const [cancelReasons, setCancelReasons] = useState({});
  const [copiedOrderId, setCopiedOrderId] = useState('');
  const { success, error: showError } = useContext(NotificationContext);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ limit: '100' });
      if (status) params.set('status', status);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);
      const response = await api.get(`/api/admin/orders?${params.toString()}`);
      setOrders(response.data.data.orders || []);
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to load orders');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [paymentStatus, showError, status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const visibleOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) =>
      [
        order.orderNumber,
        order.customer?.phone,
        order.customer?.email,
        order.customer?.firstName,
        order.customer?.lastName,
        order.deliveryAddress?.fullName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [orders, search]);

  const updateStatus = async (order, nextStatus) => {
    const id = getId(order);
    const previousStatus = order.orderStatus;
    try {
      setBusyId(id);
      const response = await api.patch(`/api/admin/orders/${id}`, { orderStatus: nextStatus });
      setOrders((current) => current.map((entry) => (getId(entry) === id ? response.data.data.order : entry)));
      success('Order status updated');
    } catch (err) {
      setOrders((current) => current.map((entry) => (getId(entry) === id ? { ...entry, orderStatus: previousStatus } : entry)));
      showError(getErrorMessage(err, 'Unable to update order'));
    } finally {
      setBusyId('');
    }
  };

  const updateCancelReason = (id, value) => {
    setCancelReasons((current) => ({ ...current, [id]: value }));
  };

  const cancelOrder = async (order) => {
    const id = getId(order);
    const reason = String(cancelReasons[id] || '').trim();

    if (!reason) {
      showError('Cancellation reason is required');
      return;
    }

    try {
      setBusyId(`cancel:${id}`);
      const response = await api.post(`/api/admin/orders/${id}/cancel`, { reason });
      setOrders((current) => current.map((entry) => (getId(entry) === id ? response.data.data.order : entry)));
      setCancelReasons((current) => ({ ...current, [id]: '' }));
      success('Order cancelled');
    } catch (err) {
      const updatedOrder = err?.response?.data?.error?.details?.order;
      if (updatedOrder) {
        setOrders((current) => current.map((entry) => (getId(entry) === id ? updatedOrder : entry)));
      }
      showError(getErrorMessage(err, 'Unable to cancel order'));
    } finally {
      setBusyId('');
    }
  };

  const retryShiprocketSync = async (order) => {
    const id = getId(order);
    try {
      setBusyId(`shiprocket:${id}`);
      const response = await api.post(`/api/admin/orders/${id}/shiprocket/retry`);
      setOrders((current) => current.map((entry) => (getId(entry) === id ? response.data.data.order : entry)));
      success(response.data.data.synced ? 'Shiprocket sync completed' : 'Shiprocket sync checked');
    } catch (err) {
      showError(getErrorMessage(err, 'Unable to retry Shiprocket sync'));
    } finally {
      setBusyId('');
    }
  };

  const retryRefund = async (order) => {
    const id = getId(order);
    try {
      setBusyId(`refund:${id}`);
      const response = await api.post(`/api/admin/orders/${id}/refund/retry`);
      setOrders((current) => current.map((entry) => (getId(entry) === id ? response.data.data.order : entry)));
      success('Refund retry checked');
    } catch (err) {
      const updatedOrder = err?.response?.data?.error?.details?.order;
      if (updatedOrder) {
        setOrders((current) => current.map((entry) => (getId(entry) === id ? updatedOrder : entry)));
      }
      showError(getErrorMessage(err, 'Unable to retry refund'));
    } finally {
      setBusyId('');
    }
  };

  const copyOrderId = async (event, orderId) => {
    event?.preventDefault();
    event?.stopPropagation();

    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(orderId);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = orderId;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedOrderId(orderId);
      success('Copied');
      globalThis.setTimeout(() => {
        setCopiedOrderId((current) => (current === orderId ? '' : current));
      }, 1400);
    } catch {
      showError('Copy failed');
    }
  };

  return (
    <div className='space-y-6'>
      <header>
        <h1 className='text-3xl font-bold text-gray-950'>Orders</h1>
        <p className='mt-1 text-sm text-gray-500'>Inspect orders and update fulfillment status.</p>
      </header>

      <section className='rounded border border-gray-200 bg-white p-4'>
        <div className='grid gap-3 md:grid-cols-[1fr_180px_180px]'>
          <label className='relative block'>
            <Search className='absolute left-3 top-2.5 text-gray-400' size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search order, phone, email'
              className='w-full rounded border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-black'
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className='rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'>
            <option value=''>All statuses</option>
            {ORDER_STATUSES.map((entry) => <option key={entry} value={entry}>{displayValue(entry)}</option>)}
          </select>
          <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className='rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'>
            <option value=''>All payments</option>
            {PAYMENT_STATUSES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
        </div>
      </section>

      {loading ? (
        <StateMessage message='Loading orders...' />
      ) : error ? (
        <StateMessage tone='error' message={error} onRetry={loadOrders} />
      ) : visibleOrders.length === 0 ? (
        <StateMessage message='No orders found.' />
      ) : (
        <div className='space-y-4'>
          {visibleOrders.map((order) => {
            const id = getId(order);
            const isOpen = Boolean(expanded[id]);
            const displayOrderId = order.orderNumber || id;
            const shipping = getShippingSummary(order);
            return (
              <section key={id} className='rounded border border-gray-200 bg-white'>
                <div className='flex w-full items-center justify-between gap-4 px-5 py-4 text-left'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <p className='font-semibold text-gray-950'>{displayOrderId}</p>
                      <button
                        type='button'
                        onClick={(event) => copyOrderId(event, displayOrderId)}
                        className='inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-950'
                        aria-label='Copy order ID'
                        title='Copy order ID'
                      >
                        {copiedOrderId === displayOrderId ? <Check size={15} strokeWidth={1.8} /> : <Copy size={15} strokeWidth={1.7} />}
                      </button>
                      <Badge>{displayValue(order.orderStatus)}</Badge>
                      <Badge tone='muted'>{displayValue(order.payment?.method)} / {displayValue(order.payment?.paymentStatus)}</Badge>
                    </div>
                    <p className='mt-1 text-sm text-gray-500'>
                      {customerName(order) || order.customer?.phone || 'Customer'} | {itemsSummary(order.items)} | {money(order.amounts?.finalAmount)}
                    </p>
                    <p className='mt-1 text-xs text-gray-400'>{formatDate(order.createdAt)}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setExpanded((current) => ({ ...current, [id]: !current[id] }))}
                    className='inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950'
                    aria-label={isOpen ? 'Collapse order details' : 'Expand order details'}
                  >
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>

                {isOpen && (
                  <div className='space-y-5 border-t border-gray-100 px-5 py-5'>
                    <div className='grid gap-4 xl:grid-cols-4'>
                      <Info title='Customer' lines={[
                        customerName(order),
                        order.customer?.phone ? `${order.customer.phone}${order.customer?.phoneVerified ? ' (verified)' : ''}` : '',
                        order.customer?.email || order.deliveryAddress?.email,
                      ]} />
                      <Info title='Delivery Address' lines={[
                        order.deliveryAddress?.fullName,
                        order.deliveryAddress?.addressLine,
                        [order.deliveryAddress?.city, order.deliveryAddress?.state, order.deliveryAddress?.pincode].filter(Boolean).join(', '),
                        order.deliveryAddress?.type,
                      ]} />
                      <Info title='Payment' lines={[
                        `Method: ${displayValue(order.payment?.method)}`,
                        `Status: ${displayValue(order.payment?.paymentStatus)}`,
                        order.payment?.razorpayOrderId ? `Razorpay Order: ${order.payment.razorpayOrderId}` : '',
                        order.payment?.razorpayPaymentId ? `Razorpay Payment: ${order.payment.razorpayPaymentId}` : '',
                      ]} />
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='mb-3 text-xs font-semibold uppercase text-gray-500'>Order Status</p>
                        <select
                          value={order.orderStatus}
                          onChange={(event) => updateStatus(order, event.target.value)}
                          disabled={busyId === id || order.orderStatus === 'cancelled'}
                          className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'
                        >
                          {!ADMIN_MANUAL_ORDER_STATUSES.includes(order.orderStatus) && (
                            <option value={order.orderStatus}>
                              {displayValue(order.orderStatus)} ({shipping.providerLabel})
                            </option>
                          )}
                          {ADMIN_MANUAL_ORDER_STATUSES.map((entry) => <option key={entry} value={entry}>{displayValue(entry)}</option>)}
                        </select>
                        <p className='mt-2 text-xs text-gray-500'>
                          Shipped and delivery statuses update from {shipping.providerLabel}.
                        </p>
                      </div>
                    </div>

                    <div className='rounded border border-gray-200'>
                      <div className='border-b border-gray-100 px-4 py-3 font-semibold text-gray-950'>Items</div>
                      <div className='divide-y divide-gray-100'>
                        {(order.items || []).map((item, index) => (
                          <div key={`${item.productId || item.name}-${item.size}-${index}`} className='flex items-center gap-4 px-4 py-3 text-sm'>
                            <div className='flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100'>
                              {item.image ? <img src={item.image} alt={item.name || 'Product'} className='h-full w-full object-cover' /> : <Package size={20} className='text-gray-400' />}
                            </div>
                            <div className='min-w-0 flex-1'>
                              <p className='truncate font-semibold text-gray-950'>{displayValue(item.name)}</p>
                              <p className='text-gray-500'>{item.productType === 'combo' ? 'Perfume Combo' : displayValue(item.size)} | Qty {item.quantity || 0} | Unit {money(item.unitPrice)}</p>
                              {item.productType === 'combo' && item.comboItems?.length > 0 && (
                                <p className='mt-1 text-xs text-gray-500'>
                                  Includes {item.comboItems.map((entry) => `${entry.name || 'Product'} ${entry.size || entry.variantId} x ${entry.quantity}`).join(', ')}
                                </p>
                              )}
                            </div>
                            <p className='font-semibold text-gray-950'>{money(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className='grid gap-3 text-sm md:grid-cols-4'>
                      <Summary label='Subtotal' value={money(order.amounts?.subtotal)} />
                      <Summary label='Discount' value={money(order.amounts?.discount)} />
                      <Summary label='Coupon' value={order.coupon?.code || '-'} />
                      <Summary label='Final Amount' value={money(order.amounts?.finalAmount)} strong />
                    </div>

                    <Info title='Shipping' lines={[
                      `Provider: ${shipping.providerLabel}`,
                      shipping.providerOrderId ? `${shipping.providerLabel} Order: ${shipping.providerOrderId}` : '',
                      shipping.shipmentId ? `Shipment ID: ${shipping.shipmentId}` : '',
                      shipping.awbCode ? `AWB: ${shipping.awbCode}` : '',
                      shipping.courierName ? `Courier: ${shipping.courierName}` : '',
                      shipping.shipmentStatus ? `Shipment Status: ${shipping.shipmentStatus}` : '',
                      shipping.syncStatus ? `Sync: ${shipping.syncStatus}` : '',
                    ]} />
                    {order.payment?.method === 'razorpay' && order.payment?.refundStatus && order.payment.refundStatus !== 'not_required' && (
                      <div className='rounded border border-gray-200 p-4 text-sm'>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div>
                            <p className='mb-3 text-xs font-semibold uppercase text-gray-500'>Refund</p>
                            <div className='space-y-1 text-gray-600'>
                              <p>Refund Status: <span className='font-semibold text-gray-950'>{displayValue(order.payment.refundStatus)}</span></p>
                              <p>Refund Amount: <span className='font-semibold text-gray-950'>{money(order.payment.refundAmount || order.amounts?.finalAmount)}</span></p>
                              {order.payment.razorpayRefundId && <p>Razorpay Refund: <span className='font-semibold text-gray-950'>{order.payment.razorpayRefundId}</span></p>}
                              {order.payment.refundInitiatedAt && <p>Initiated At: <span className='font-semibold text-gray-950'>{formatDate(order.payment.refundInitiatedAt)}</span></p>}
                              {order.payment.refundedAt && <p>Refunded At: <span className='font-semibold text-gray-950'>{formatDate(order.payment.refundedAt)}</span></p>}
                            </div>
                          </div>
                          {order.payment.refundStatus === 'failed' && (
                            <button
                              type='button'
                              onClick={() => retryRefund(order)}
                              disabled={busyId === `refund:${id}`}
                              className='inline-flex w-fit rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                            >
                              {busyId === `refund:${id}` ? 'Retrying...' : 'Retry Refund'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {order.cancellation?.status === 'failed' && (
                      <div className='rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                        <p className='font-semibold'>Cancellation failed</p>
                        <p className='mt-1'>{order.cancellation?.shiprocketCancelError || order.stockRestoration?.error || 'Please review and retry if still eligible.'}</p>
                      </div>
                    )}
                    {order.orderStatus === 'cancelled' && (
                      <div className='rounded border border-red-100 bg-red-50 p-4 text-sm text-red-700'>
                        <p className='font-semibold'>Cancelled</p>
                        <p className='mt-1'>
                          {[order.cancellation?.cancelledBy ? `By ${displayValue(order.cancellation.cancelledBy)}` : '', order.cancellation?.reason ? `Reason: ${order.cancellation.reason}` : ''].filter(Boolean).join(' | ') || 'Order cancelled'}
                        </p>
                      </div>
                    )}
                    {CANCELLABLE_ORDER_STATUSES.includes(order.orderStatus) && (
                      <div className='rounded border border-gray-200 p-4'>
                        <p className='mb-3 text-xs font-semibold uppercase text-gray-500'>Cancel Order</p>
                        <textarea
                          value={cancelReasons[id] || ''}
                          onChange={(event) => updateCancelReason(id, event.target.value)}
                          disabled={busyId === `cancel:${id}`}
                          rows={3}
                          placeholder='Enter cancellation reason'
                          className='w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black disabled:opacity-60'
                        />
                        <button
                          type='button'
                          onClick={() => cancelOrder(order)}
                          disabled={busyId === `cancel:${id}`}
                          className='mt-3 inline-flex w-fit rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {busyId === `cancel:${id}` ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      </div>
                    )}
                    {['failed', 'not_configured'].includes(order.shiprocket?.syncStatus) && !order.shiprocket?.shiprocketOrderId && !order.shiprocket?.shipmentId && (
                      <button
                        type='button'
                        onClick={() => retryShiprocketSync(order)}
                        disabled={busyId === `shiprocket:${id}`}
                        className='inline-flex w-fit rounded border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        {busyId === `shiprocket:${id}` ? 'Retrying...' : 'Retry Shiprocket Sync'}
                      </button>
                    )}
                    {shipping.trackingUrl && (
                      <a href={shipping.trackingUrl} target='_blank' rel='noreferrer' className='inline-flex items-center gap-2 text-sm font-semibold text-black underline'>
                        Open tracking <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function customerName(order) {
  return [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || order.deliveryAddress?.fullName || '';
}

function displayValue(value) {
  return String(value || '-')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function itemsSummary(items = []) {
  if (!items.length) return 'No items';
  const first = items[0]?.name || 'Item';
  const extra = items.length > 1 ? ` +${items.length - 1} more` : '';
  return `${first}${extra}`;
}

function Badge({ children, tone = 'default' }) {
  return <span className={`rounded px-2 py-1 text-xs font-semibold ${tone === 'muted' ? 'bg-gray-100 text-gray-700' : 'bg-black text-white'}`}>{children}</span>;
}

function Info({ title, lines }) {
  const visibleLines = lines.filter(Boolean);
  return (
    <div className='rounded border border-gray-200 p-4'>
      <p className='mb-3 text-xs font-semibold uppercase text-gray-500'>{title}</p>
      {visibleLines.length ? visibleLines.map((line) => <p key={line} className='break-words text-sm text-gray-700'>{line}</p>) : <p className='text-sm text-gray-400'>-</p>}
    </div>
  );
}

function Summary({ label, value, strong = false }) {
  return (
    <div className='rounded border border-gray-200 bg-white p-3'>
      <p className='text-xs uppercase text-gray-500'>{label}</p>
      <p className={`mt-1 ${strong ? 'font-bold text-gray-950' : 'font-semibold text-gray-800'}`}>{value}</p>
    </div>
  );
}

function StateMessage({ message, tone = 'default', onRetry }) {
  return (
    <div className={`rounded border bg-white p-6 text-sm ${tone === 'error' ? 'border-red-200 text-red-700' : 'border-gray-200 text-gray-500'}`}>
      <p>{message}</p>
      {onRetry && <button onClick={onRetry} className='mt-3 rounded border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50'>Retry</button>}
    </div>
  );
}
