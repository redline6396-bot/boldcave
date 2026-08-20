'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDate, getErrorMessage, getId, money } from '@/lib/api';

const EMPTY_FORM = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  minimumOrder: '',
  expiryDate: '',
  active: true,
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { success, error: showError } = useContext(NotificationContext);

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/coupons');
      setCoupons(response.data.data.coupons || []);
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to load coupons');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const visibleCoupons = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return coupons;
    return coupons.filter((coupon) => String(coupon.code || '').toLowerCase().includes(needle));
  }, [coupons, search]);

  const openCreate = () => {
    setEditingCoupon({ mode: 'create' });
    setFormData(EMPTY_FORM);
    setFormErrors({});
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: String(coupon.discountValue ?? ''),
      minimumOrder: String(coupon.minimumOrder ?? ''),
      expiryDate: toDateInput(coupon.expiryDate),
      active: Boolean(coupon.active),
    });
    setFormErrors({});
  };

  const validate = () => {
    const errors = {};
    const discountValue = Number(formData.discountValue);
    if (!formData.code.trim()) errors.code = 'Coupon code is required';
    if (!discountValue || discountValue <= 0) errors.discountValue = 'Discount value must be greater than zero';
    if (formData.discountType === 'percentage' && discountValue > 100) errors.discountValue = 'Percentage cannot exceed 100';
    if (Number(formData.minimumOrder || 0) < 0) errors.minimumOrder = 'Minimum order cannot be negative';
    if (!formData.expiryDate) errors.expiryDate = 'Expiry date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveCoupon = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      minimumOrder: Number(formData.minimumOrder || 0),
      expiryDate: formData.expiryDate,
      active: Boolean(formData.active),
    };

    try {
      setSaving(true);
      if (editingCoupon?.mode === 'create') {
        const response = await api.post('/api/admin/coupons', payload);
        setCoupons((current) => [response.data.data.coupon, ...current]);
        success('Coupon created');
      } else {
        const id = getId(editingCoupon);
        const response = await api.patch(`/api/admin/coupons/${id}`, payload);
        setCoupons((current) => current.map((coupon) => (getId(coupon) === id ? response.data.data.coupon : coupon)));
        success('Coupon updated');
      }
      setEditingCoupon(null);
      setFormData(EMPTY_FORM);
    } catch (err) {
      showError(getErrorMessage(err, 'Unable to save coupon'));
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (coupon) => {
    const id = getId(coupon);
    try {
      setBusyId(id);
      const response = await api.patch(`/api/admin/coupons/${id}`, { active: !coupon.active });
      setCoupons((current) => current.map((entry) => (getId(entry) === id ? response.data.data.coupon : entry)));
      success(response.data.data.coupon.active ? 'Coupon activated' : 'Coupon deactivated');
    } catch (err) {
      showError(getErrorMessage(err, 'Unable to update coupon'));
    } finally {
      setBusyId('');
    }
  };

  const deleteCoupon = async (coupon) => {
    const id = getId(coupon);
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      setBusyId(id);
      await api.delete(`/api/admin/coupons/${id}`);
      setCoupons((current) => current.filter((entry) => getId(entry) !== id));
      success('Coupon deleted');
    } catch (err) {
      showError(getErrorMessage(err, 'Unable to delete coupon'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className='space-y-6'>
      <header className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-950'>Coupons</h1>
          <p className='mt-1 text-sm text-gray-500'>Create and manage simple discount coupons.</p>
        </div>
        <button onClick={openCreate} className='inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800'>
          <Plus size={16} />
          Create
        </button>
      </header>

      <section className='rounded border border-gray-200 bg-white p-4'>
        <label className='relative block'>
          <Search className='absolute left-3 top-2.5 text-gray-400' size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search coupon code' className='w-full rounded border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-black' />
        </label>
      </section>

      {loading ? (
        <StateMessage message='Loading coupons...' />
      ) : error ? (
        <StateMessage tone='error' message={error} onRetry={loadCoupons} />
      ) : visibleCoupons.length === 0 ? (
        <StateMessage message='No coupons found.' />
      ) : (
        <div className='overflow-hidden rounded border border-gray-200 bg-white'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[760px] text-sm'>
              <thead className='border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500'>
                <tr>
                  <th className='px-4 py-3'>Code</th>
                  <th className='px-4 py-3'>Discount</th>
                  <th className='px-4 py-3'>Minimum Order</th>
                  <th className='px-4 py-3'>Expiry</th>
                  <th className='px-4 py-3'>Status</th>
                  <th className='px-4 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {visibleCoupons.map((coupon) => {
                  const expired = isExpired(coupon.expiryDate);
                  return (
                    <tr key={getId(coupon)} className='hover:bg-gray-50'>
                      <td className='px-4 py-3 font-semibold text-gray-950'>{coupon.code}</td>
                      <td className='px-4 py-3'>{coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : money(coupon.discountValue)}</td>
                      <td className='px-4 py-3'>{money(coupon.minimumOrder)}</td>
                      <td className='px-4 py-3'>{formatDate(coupon.expiryDate)}</td>
                      <td className='px-4 py-3'><Badge tone={expired ? 'danger' : coupon.active ? 'success' : 'muted'}>{expired ? 'Expired' : coupon.active ? 'Active' : 'Inactive'}</Badge></td>
                      <td className='px-4 py-3'>
                        <div className='flex justify-end gap-2'>
                          <button disabled={busyId === getId(coupon) || expired} onClick={() => toggleCoupon(coupon)} className='rounded border border-gray-300 px-3 py-2 font-semibold hover:bg-gray-50 disabled:opacity-50'>{coupon.active ? 'Deactivate' : 'Activate'}</button>
                          <button onClick={() => openEdit(coupon)} className='inline-flex h-9 w-9 items-center justify-center rounded border border-gray-300 hover:bg-gray-50' title='Edit coupon'><Edit2 size={16} /></button>
                          <button disabled={busyId === getId(coupon)} onClick={() => deleteCoupon(coupon)} className='inline-flex h-9 w-9 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50' title='Delete coupon'><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingCoupon && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-xl rounded bg-white p-6 shadow-xl'>
            <div className='mb-5 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-gray-950'>{editingCoupon.mode === 'create' ? 'Create Coupon' : 'Edit Coupon'}</h2>
              <button onClick={() => setEditingCoupon(null)} className='rounded p-1 hover:bg-gray-100'><X size={20} /></button>
            </div>
            <form onSubmit={saveCoupon} className='space-y-4'>
              <Field label='Coupon Code' error={formErrors.code}>
                <input value={formData.code} onChange={(event) => setFormData({ ...formData, code: event.target.value })} className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black' />
              </Field>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='Discount Type'>
                  <select value={formData.discountType} onChange={(event) => setFormData({ ...formData, discountType: event.target.value })} className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'>
                    <option value='percentage'>Percentage</option>
                    <option value='fixed'>Fixed Amount</option>
                  </select>
                </Field>
                <Field label='Discount Value' error={formErrors.discountValue}>
                  <input type='number' min='0' step='0.01' value={formData.discountValue} onChange={(event) => setFormData({ ...formData, discountValue: event.target.value })} className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black' />
                </Field>
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='Minimum Order' error={formErrors.minimumOrder}>
                  <input type='number' min='0' step='0.01' value={formData.minimumOrder} onChange={(event) => setFormData({ ...formData, minimumOrder: event.target.value })} className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black' />
                </Field>
                <Field label='Expiry Date' error={formErrors.expiryDate}>
                  <input type='date' value={formData.expiryDate} onChange={(event) => setFormData({ ...formData, expiryDate: event.target.value })} className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black' />
                </Field>
              </div>
              <label className='flex items-center gap-2 text-sm font-semibold text-gray-700'>
                <input type='checkbox' checked={formData.active} onChange={(event) => setFormData({ ...formData, active: event.target.checked })} />
                Active
              </label>
              <div className='flex gap-3 pt-2'>
                <button type='submit' disabled={saving} className='flex-1 rounded bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-50'>{saving ? 'Saving...' : 'Save'}</button>
                <button type='button' onClick={() => setEditingCoupon(null)} disabled={saving} className='flex-1 rounded border border-gray-300 px-4 py-2 font-semibold hover:bg-gray-50'>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className='block text-sm font-semibold text-gray-700'>
      {label}
      <span className='mt-1 block'>{children}</span>
      {error && <span className='mt-1 block text-xs text-red-600'>{error}</span>}
    </label>
  );
}

function Badge({ children, tone = 'default' }) {
  const classes = {
    default: 'bg-black text-white',
    success: 'bg-green-100 text-green-700',
    muted: 'bg-gray-100 text-gray-700',
    danger: 'bg-red-100 text-red-700',
  };
  return <span className={`rounded px-2 py-1 text-xs font-semibold ${classes[tone] || classes.default}`}>{children}</span>;
}

function StateMessage({ message, tone = 'default', onRetry }) {
  return (
    <div className={`rounded border bg-white p-6 text-sm ${tone === 'error' ? 'border-red-200 text-red-700' : 'border-gray-200 text-gray-500'}`}>
      <p>{message}</p>
      {onRetry && <button onClick={onRetry} className='mt-3 rounded border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50'>Retry</button>}
    </div>
  );
}

function isExpired(value) {
  return value ? new Date(value) < new Date() : false;
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
