'use client';

import Link from 'next/link';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  IndianRupee,
  Package,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Store,
  TicketPercent,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDate, getErrorMessage } from '@/lib/api';

const RANGE_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
];

const STATUS_META = {
  confirmed: {
    label: 'Confirmed',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    bar: 'bg-slate-500',
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
    bar: 'bg-amber-500',
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-blue-50 text-blue-700 ring-blue-200',
    bar: 'bg-blue-500',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    bar: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 ring-red-200',
    bar: 'bg-red-500',
  },
};

const quickActions = [
  { label: 'Add Product', href: '/add', icon: PackagePlus },
  { label: 'View Orders', href: '/orders', icon: ReceiptText },
  { label: 'Manage Homepage', href: '/homepage', icon: Store },
  { label: 'Create Coupon', href: '/coupon', icon: TicketPercent },
];

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN');

const displayValue = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const paymentLabel = (payment = {}) => {
  const method = String(payment.method || '').toLowerCase();
  if (method === 'cod') return 'COD';
  if (method === 'razorpay') return 'Online';
  return displayValue(method || 'Payment');
};

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storeSettingsSaving, setStoreSettingsSaving] = useState(false);
  const [error, setError] = useState('');
  const hasLoadedDashboardRef = useRef(false);
  const { error: showError, success: showSuccess } = useContext(NotificationContext);

  const loadDashboard = useCallback(async () => {
    const isInitialLoad = !hasLoadedDashboardRef.current;

    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');

      const response = await api.get(`/api/admin/dashboard?range=${range}`);
      setDashboard(response.data.data);
      hasLoadedDashboardRef.current = true;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load dashboard');

      if (isInitialLoad) {
        setError(message);
      }

      showError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, showError]);

  const toggleAcceptingOrders = async () => {
    const nextAcceptingOrders = !dashboard?.storeSettings?.acceptingOrders;

    try {
      setStoreSettingsSaving(true);
      const response = await api.patch('/api/admin/store-settings', {
        acceptingOrders: nextAcceptingOrders,
      });

      setDashboard((current) => ({
        ...current,
        storeSettings: response.data.data || { acceptingOrders: nextAcceptingOrders },
      }));

      showSuccess(
        nextAcceptingOrders
          ? 'Store is accepting orders.'
          : 'Store orders are currently disabled.'
      );
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to update store order setting');
      showError(message);
    } finally {
      setStoreSettingsSaving(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const cards = useMemo(() => {
    if (!dashboard) return [];

    return [
      {
        label: 'Revenue',
        value: formatCurrency(dashboard.revenue),
        detail: `${formatCurrency(dashboard.period?.revenue)} in selected period`,
        icon: IndianRupee,
      },
      {
        label: 'Orders',
        value: formatNumber(dashboard.totalOrders),
        detail: `${formatNumber(dashboard.ordersToday)} placed today`,
        icon: ShoppingBag,
      },
      {
        label: 'Customers',
        value: formatNumber(dashboard.customers),
        detail: `${formatNumber(dashboard.newCustomers)} new in selected period`,
        icon: Users,
      },
      {
        label: 'Products',
        value: formatNumber(dashboard.products),
        detail: `${formatNumber(dashboard.publishedProducts)} currently published`,
        icon: Package,
      },
    ];
  }, [dashboard]);

  if (loading) return <StateMessage message='Loading dashboard...' />;
  if (error) return <StateMessage tone='error' message={error} onRetry={loadDashboard} />;
  if (!dashboard) return <StateMessage message='No dashboard data available' />;

  return (
    <div className='mx-auto w-full max-w-[1440px] space-y-6 pb-8 text-[#17202d]'>
      <header className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <h1 className='text-[28px] font-semibold tracking-[-0.025em] text-[#111827] md:text-[32px]'>
            Dashboard
          </h1>
          <p className='mt-1 text-sm text-slate-500'>
            Store performance and operations overview
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <div className='inline-flex rounded-[10px] border border-slate-200 bg-white p-1'>
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() => setRange(option.value)}
                className={[
                  'h-8 cursor-pointer rounded-[8px] px-3 text-xs font-medium transition-colors',
                  range === option.value
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>

          <button
            type='button'
            onClick={loadDashboard}
            disabled={refreshing}
            className='inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      <StoreStatusCard
        acceptingOrders={dashboard.storeSettings?.acceptingOrders !== false}
        saving={storeSettingsSaving}
        onToggle={toggleAcceptingOrders}
      />

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </section>

      <section className='grid gap-6 xl:grid-cols-12'>
        <RevenueCard
          className='xl:col-span-8'
          period={dashboard.period}
          series={dashboard.revenueSeries || []}
          range={range}
        />
        <OrderStatusCard
          className='xl:col-span-4'
          statuses={dashboard.orderStatusCounts || []}
        />
      </section>

      <section className='grid items-start gap-6 xl:grid-cols-12'>
        <RecentOrdersCard
          className='xl:col-span-8'
          orders={dashboard.recentOrders || []}
        />
        <InventoryCard
          className='xl:col-span-4'
          items={dashboard.stockAttention || []}
        />
      </section>

      <section className='grid items-start gap-6 xl:grid-cols-12'>
        <TopProductsCard
          className='xl:col-span-8'
          products={dashboard.topProducts || []}
          range={range}
        />
        <QuickActionsCard className='xl:col-span-4' />
      </section>
    </div>
  );
};

function StoreStatusCard({ acceptingOrders, saving, onToggle }) {
  return (
    <section className='rounded-[12px] border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-start gap-3'>
          <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-slate-100 text-slate-700'>
            <Store size={19} strokeWidth={1.8} />
          </span>
          <div>
            <p className='text-sm font-semibold text-slate-950'>Store status</p>
            <div className='mt-1 flex flex-wrap items-center gap-2'>
              <span
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
                  acceptingOrders
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-red-50 text-red-700 ring-red-200',
                ].join(' ')}
              >
                <span
                  className={[
                    'h-1.5 w-1.5 rounded-full',
                    acceptingOrders ? 'bg-emerald-500' : 'bg-red-500',
                  ].join(' ')}
                />
                {acceptingOrders ? 'Accepting orders' : 'Orders paused'}
              </span>
              <span className='text-xs text-slate-500'>
                {acceptingOrders
                  ? 'Customers can currently place orders.'
                  : 'Customers can browse, but checkout is unavailable.'}
              </span>
            </div>
          </div>
        </div>

        <button
          type='button'
          onClick={onToggle}
          disabled={saving}
          role='switch'
          aria-checked={acceptingOrders}
          className={[
            'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
            acceptingOrders
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-slate-300 bg-slate-300',
          ].join(' ')}
          title={acceptingOrders ? 'Turn orders off' : 'Turn orders on'}
        >
          <span
            className={[
              'h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
              acceptingOrders ? 'translate-x-[25px]' : 'translate-x-[3px]',
            ].join(' ')}
          />
        </button>
      </div>
    </section>
  );
}

function KpiCard({ label, value, detail, icon: Icon }) {
  return (
    <section className='min-h-[128px] rounded-[12px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <p className='text-xs font-medium uppercase tracking-[0.08em] text-slate-500'>
            {label}
          </p>
          <p className='mt-3 truncate text-[27px] font-semibold tracking-[-0.025em] text-slate-950'>
            {value}
          </p>
          {detail && <p className='mt-2 text-xs text-slate-500'>{detail}</p>}
        </div>
        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-slate-100 text-slate-700'>
          <Icon size={19} strokeWidth={1.8} />
        </span>
      </div>
    </section>
  );
}

function RevenueCard({ className = '', period, series, range }) {
  const hasRevenue = series.some((point) => Number(point.revenue) > 0);
  const averageOrderValue = Number(period?.orders || 0)
    ? Number(period?.revenue || 0) / Number(period.orders)
    : 0;

  return (
    <section className={`rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      <div className='flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h2 className='text-sm font-semibold text-slate-950'>Revenue Overview</h2>
          <p className='mt-1 text-xs text-slate-500'>
            {formatCurrency(period?.revenue)} total across {period?.orders || 0} orders
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {averageOrderValue > 0 && (
            <span className='hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500 sm:inline-flex'>
              AOV&nbsp;<strong className='font-medium text-slate-700'>{formatCurrency(averageOrderValue)}</strong>
            </span>
          )}
          <span className='w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600'>
            {range === '30d' ? '30D' : '7D'}
          </span>
        </div>
      </div>

      <div className='px-4 py-5 sm:px-5'>
        {hasRevenue ? (
          <RevenueChart series={series} />
        ) : (
          <div className='flex h-[260px] items-center justify-center rounded-[10px] border border-dashed border-slate-200 bg-slate-50/60 text-center'>
            <div>
              <p className='text-sm font-medium text-slate-700'>No sales data for this period yet.</p>
              <p className='mt-1 text-xs text-slate-500'>Revenue will appear here after paid or COD orders.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function RevenueChart({ series }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const width = 640;
  const height = 238;
  const padding = { top: 18, right: 20, bottom: 32, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...series.map((point) => Number(point.revenue) || 0), 1);

  const points = series.map((point, index) => {
    const x =
      padding.left +
      (series.length <= 1 ? chartWidth : (index / (series.length - 1)) * chartWidth);
    const y =
      padding.top +
      chartHeight -
      ((Number(point.revenue) || 0) / maxRevenue) * chartHeight;
    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;
  const hoverPoint = hoverIndex === null ? null : points[hoverIndex];
  const yGuides = [0, 0.5, 1];

  return (
    <div className='relative h-[260px] w-full'>
      <svg viewBox={`0 0 ${width} ${height}`} className='h-full w-full' role='img' aria-label='Revenue over time'>
        {yGuides.map((ratio) => {
          const y = padding.top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke='#e5e7eb' strokeWidth='1' />
              <text x={padding.left - 10} y={y + 4} textAnchor='end' className='fill-slate-400 text-[11px]'>
                {formatCurrency(maxRevenue * ratio)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill='#f1f5f9' />
        <path d={linePath} fill='none' stroke='#0f172a' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />

        {hoverPoint && (
          <line
            x1={hoverPoint.x}
            x2={hoverPoint.x}
            y1={padding.top}
            y2={padding.top + chartHeight}
            stroke='#cbd5e1'
            strokeWidth='1'
            strokeDasharray='4 4'
          />
        )}

        {points.map((point, index) => (
          <g key={point.date}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoverIndex === index ? 4.5 : 3}
              fill='#0f172a'
              className='cursor-pointer'
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <title>{`${point.label}: ${formatCurrency(point.revenue)} · ${point.orders} orders`}</title>
            </circle>
            {(index === 0 || index === points.length - 1 || series.length <= 7) && (
              <text x={point.x} y={height - 10} textAnchor='middle' className='fill-slate-400 text-[11px]'>
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {hoverPoint && (
        <div className='pointer-events-none absolute right-3 top-3 rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm'>
          <p className='font-medium text-slate-950'>{hoverPoint.label}</p>
          <p className='mt-0.5 text-slate-500'>{formatCurrency(hoverPoint.revenue)}</p>
          <p className='text-slate-500'>{hoverPoint.orders} orders</p>
        </div>
      )}
    </div>
  );
}

function OrderStatusCard({ className = '', statuses }) {
  const total = statuses.reduce((sum, item) => sum + Number(item.count || 0), 0);

  return (
    <section className={`rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4'>
        <div>
          <h2 className='text-sm font-semibold text-slate-950'>Order Status</h2>
          <p className='mt-1 text-xs text-slate-500'>{formatNumber(total)} total orders</p>
        </div>
        <Link href='/orders' className='cursor-pointer text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline'>
          View all
        </Link>
      </div>

      <div className='space-y-4 p-5'>
        {statuses.map((item) => {
          const meta = STATUS_META[item.status] || STATUS_META.confirmed;
          const percent = total ? Math.round((Number(item.count || 0) / total) * 100) : 0;
          return (
            <div key={item.status}>
              <div className='mb-1.5 flex items-center justify-between gap-3 text-xs'>
                <span className='font-medium text-slate-700'>{meta.label}</span>
                <span className='text-slate-500'>{formatNumber(item.count)} · {percent}%</span>
              </div>
              <div className='h-2 overflow-hidden rounded-full bg-slate-100'>
                <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecentOrdersCard({ className = '', orders }) {
  return (
    <section className={`rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4'>
        <h2 className='text-sm font-semibold text-slate-950'>Recent Orders</h2>
        <Link href='/orders' className='cursor-pointer text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline'>
          View all
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className='px-5 py-8 text-sm text-slate-500'>No orders yet.</p>
      ) : (
        <>
          <div className='hidden md:block'>
            <div className='grid grid-cols-[1.15fr_1fr_0.9fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400'>
              <span>Order</span>
              <span>Customer</span>
              <span>Date</span>
              <span>Payment</span>
              <span className='text-right'>Amount</span>
              <span className='text-right'>Status</span>
            </div>
            <div className='divide-y divide-slate-100'>
              {orders.map((order) => (
                <div key={order._id} className='grid min-h-[62px] grid-cols-[1.15fr_1fr_0.9fr_0.8fr_0.8fr_0.8fr] items-center gap-4 px-5 py-3 text-sm transition-colors hover:bg-slate-50/70'>
                  <p className='truncate font-medium text-slate-950'>{order.orderNumber || order._id}</p>
                  <p className='truncate text-slate-600'>{order.customerName || order.customer?.phone || 'Customer'}</p>
                  <p className='text-slate-500'>{formatDate(order.createdAt)}</p>
                  <p className='text-slate-600'>{paymentLabel(order.payment)}</p>
                  <p className='text-right font-medium text-slate-950'>{formatCurrency(order.amounts?.finalAmount)}</p>
                  <div className='flex justify-end'>
                    <StatusBadge status={order.orderStatus} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='divide-y divide-slate-100 md:hidden'>
            {orders.map((order) => (
              <div key={order._id} className='px-5 py-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-slate-950'>{order.orderNumber || order._id}</p>
                    <p className='mt-1 text-xs text-slate-500'>{order.customerName || order.customer?.phone || 'Customer'} · {formatDate(order.createdAt)}</p>
                  </div>
                  <StatusBadge status={order.orderStatus} />
                </div>
                <div className='mt-3 flex items-center justify-between text-sm'>
                  <span className='text-slate-500'>{paymentLabel(order.payment)}</span>
                  <span className='font-medium text-slate-950'>{formatCurrency(order.amounts?.finalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function InventoryCard({ className = '', items }) {
  return (
    <section className={`rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4'>
        <div>
          <h2 className='text-sm font-semibold text-slate-950'>Inventory Attention</h2>
          <p className='mt-1 text-xs text-slate-500'>Out of stock and low-stock variants</p>
        </div>
        {items.length === 0 ? (
          <CheckCircle2 size={18} strokeWidth={1.8} className='text-emerald-600' />
        ) : (
          <TriangleAlert size={18} strokeWidth={1.8} className='text-amber-600' />
        )}
      </div>

      {items.length === 0 ? (
        <div className='flex items-start gap-3 px-5 py-6'>
          <CheckCircle2 size={19} strokeWidth={1.8} className='mt-0.5 text-emerald-600' />
          <div>
            <p className='text-sm font-medium text-slate-900'>Inventory looks healthy</p>
            <p className='mt-1 text-xs text-slate-500'>No products currently need stock attention.</p>
          </div>
        </div>
      ) : (
        <div className='divide-y divide-slate-100'>
          {items.map((item) => (
            <div key={`${item.productId}-${item.size}`} className='flex items-center justify-between gap-3 px-5 py-3.5'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium text-slate-950'>{item.name}</p>
                <p className='mt-1 text-xs text-slate-500'>{item.productType === 'combo' ? 'Combo' : item.size}</p>
              </div>
              <div className='shrink-0 text-right'>
                <p className='text-xs font-medium text-slate-600'>{formatNumber(item.stock)} remaining</p>
                <span
                  className={[
                    'mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1',
                    item.level === 'out'
                      ? 'bg-red-50 text-red-700 ring-red-200'
                      : 'bg-amber-50 text-amber-700 ring-amber-200',
                  ].join(' ')}
                >
                  {item.level === 'out' ? 'Out' : 'Low'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TopProductsCard({ className = '', products, range }) {
  return (
    <section className={`rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4'>
        <div>
          <h2 className='text-sm font-semibold text-slate-950'>Top-selling variants</h2>
          <p className='mt-1 text-xs text-slate-500'>{range === '30d' ? 'Last 30 days' : 'Last 7 days'} by variant revenue</p>
        </div>
      </div>

      {products.length === 0 ? (
        <p className='px-5 py-8 text-sm text-slate-500'>No product sales in this period yet.</p>
      ) : (
        <div className='divide-y divide-slate-100'>
          {products.map((product) => (
            <div key={`${product.productId}-${product.name}-${product.size}`} className='grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5'>
              <div className='flex h-11 w-11 items-center justify-center overflow-hidden rounded-[8px] border border-slate-200 bg-slate-50'>
                {product.image ? (
                  <img src={product.image} alt={product.name} className='h-full w-full object-contain' />
                ) : (
                  <Package size={18} className='text-slate-400' />
                )}
              </div>
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium text-slate-950'>{product.name}</p>
                <p className='mt-1 text-xs text-slate-500'>{product.size || 'Variant'} · {formatNumber(product.units)} units</p>
              </div>
              <p className='text-right text-sm font-medium text-slate-950'>{formatCurrency(product.revenue)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function QuickActionsCard({ className = '' }) {
  return (
    <section className={`rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      <div className='border-b border-slate-100 px-5 py-4'>
        <h2 className='text-sm font-semibold text-slate-950'>Quick Actions</h2>
        <p className='mt-1 text-xs text-slate-500'>Common admin tasks</p>
      </div>

      <div className='grid gap-2 p-4'>
        {quickActions.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className='flex cursor-pointer items-center justify-between rounded-[10px] border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950'
          >
            <span className='flex items-center gap-2.5'>
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </span>
            <ChevronRight size={15} strokeWidth={1.8} className='text-slate-400' />
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.confirmed;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function StateMessage({ message, tone = 'default', onRetry }) {
  return (
    <div className={`mx-auto max-w-[1440px] rounded-[12px] border bg-white p-6 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${tone === 'error' ? 'border-red-200 text-red-700' : 'border-slate-200 text-slate-500'}`}>
      <p>{message}</p>
      {onRetry && (
        <button
          type='button'
          onClick={onRetry}
          className='mt-3 cursor-pointer rounded-[8px] border border-slate-300 px-3 py-2 text-slate-700 transition-colors hover:bg-slate-50'
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default Dashboard;
