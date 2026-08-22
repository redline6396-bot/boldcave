'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Package, Search } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDate, getErrorMessage, getId, money } from '@/lib/api';

const ORDER_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cod'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [busyId, setBusyId] = useState('');
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
            {ORDER_STATUSES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
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
            return (
              <section key={id} className='rounded border border-gray-200 bg-white'>
                <button onClick={() => setExpanded((current) => ({ ...current, [id]: !current[id] }))} className='flex w-full items-center justify-between gap-4 px-5 py-4 text-left'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <p className='font-semibold text-gray-950'>{order.orderNumber || id}</p>
                      <Badge>{order.orderStatus}</Badge>
                      <Badge tone='muted'>{displayValue(order.payment?.method)} / {displayValue(order.payment?.paymentStatus)}</Badge>
                    </div>
                    <p className='mt-1 text-sm text-gray-500'>
                      {customerName(order) || order.customer?.phone || 'Customer'} | {itemsSummary(order.items)} | {money(order.amounts?.finalAmount)}
                    </p>
                    <p className='mt-1 text-xs text-gray-400'>{formatDate(order.createdAt)}</p>
                  </div>
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

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
                          disabled={busyId === id}
                          className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'
                        >
                          {ORDER_STATUSES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                        </select>
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
                      order.shiprocket?.shiprocketOrderId ? `Shiprocket Order: ${order.shiprocket.shiprocketOrderId}` : '',
                      order.shiprocket?.shipmentId ? `Shipment ID: ${order.shiprocket.shipmentId}` : '',
                      order.shiprocket?.awbCode ? `AWB: ${order.shiprocket.awbCode}` : '',
                      order.shiprocket?.courierName ? `Courier: ${order.shiprocket.courierName}` : '',
                      order.shiprocket?.shipmentStatus ? `Shipment Status: ${order.shiprocket.shipmentStatus}` : '',
                      order.shiprocket?.syncStatus ? `Sync: ${order.shiprocket.syncStatus}` : '',
                    ]} />
                    {order.shiprocket?.trackingUrl && (
                      <a href={order.shiprocket.trackingUrl} target='_blank' rel='noreferrer' className='inline-flex items-center gap-2 text-sm font-semibold text-black underline'>
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
  return value || '-';
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
