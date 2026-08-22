'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDate, getErrorMessage, getId, money } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [busyId, setBusyId] = useState('');
  const { success, error: showError } = useContext(NotificationContext);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/users?limit=100');
      setUsers(response.data.data.users || []);
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to load users');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const visibleUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [user.phone, user.email, user.firstName, user.lastName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [search, users]);

  const loadDetails = async (user) => {
    const id = getId(user);
    if (expandedId === id) {
      setExpandedId('');
      return;
    }
    setExpandedId(id);
    if (details[id]) return;

    try {
      setBusyId(id);
      const response = await api.get(`/api/admin/users/${id}`);
      setDetails((current) => ({ ...current, [id]: response.data.data }));
    } catch (err) {
      showError(getErrorMessage(err, 'Unable to load user details'));
    } finally {
      setBusyId('');
    }
  };

  const updateStatus = async (user, nextStatus) => {
    const id = getId(user);
    const action = nextStatus === 'suspended' ? 'suspend' : 'unsuspend';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      setBusyId(id);
      const response = await api.patch(`/api/admin/users/${id}`, { status: nextStatus });
      const updatedUser = response.data.data.user;
      setUsers((current) => current.map((entry) => (getId(entry) === id ? { ...entry, ...updatedUser } : entry)));
      setDetails((current) => current[id] ? { ...current, [id]: { ...current[id], user: updatedUser } } : current);
      success(nextStatus === 'suspended' ? 'User suspended' : 'User unsuspended');
    } catch (err) {
      showError(getErrorMessage(err, 'Unable to update user'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className='space-y-6'>
      <header>
        <h1 className='text-3xl font-bold text-gray-950'>Users</h1>
        <p className='mt-1 text-sm text-gray-500'>View customers, addresses, order history, and account status.</p>
      </header>

      <section className='rounded border border-gray-200 bg-white p-4'>
        <label className='relative block'>
          <Search className='absolute left-3 top-2.5 text-gray-400' size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search phone, name, email'
            className='w-full rounded border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-black'
          />
        </label>
      </section>

      {loading ? (
        <StateMessage message='Loading users...' />
      ) : error ? (
        <StateMessage tone='error' message={error} onRetry={loadUsers} />
      ) : visibleUsers.length === 0 ? (
        <StateMessage message='No users found.' />
      ) : (
        <div className='space-y-3'>
          {visibleUsers.map((user) => {
            const id = getId(user);
            const isOpen = expandedId === id;
            const detail = details[id];
            const activeUser = detail?.user || user;
            return (
              <section key={id} className='rounded border border-gray-200 bg-white'>
                <button onClick={() => loadDetails(user)} className='flex w-full items-center justify-between gap-4 px-5 py-4 text-left'>
                  <div className='grid min-w-0 flex-1 gap-3 md:grid-cols-[1.2fr_1fr_120px_120px_120px] md:items-center'>
                    <div>
                      <p className='font-semibold text-gray-950'>{fullName(user) || 'Unnamed user'}</p>
                      <p className='text-sm text-gray-500'>{user.phone || '-'}</p>
                    </div>
                    <p className='truncate text-sm text-gray-600'>{user.email || '-'}</p>
                    <p className='text-sm text-gray-600'>{user.totalOrders || 0} orders</p>
                    <Badge tone={user.status === 'suspended' ? 'danger' : 'default'}>{user.status || 'active'}</Badge>
                    <p className='text-sm text-gray-500'>{formatDate(user.createdAt)}</p>
                  </div>
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {isOpen && (
                  <div className='space-y-5 border-t border-gray-100 px-5 py-5'>
                    {busyId === id && !detail ? (
                      <StateMessage message='Loading user details...' />
                    ) : (
                      <>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                          <div className='text-sm text-gray-600'>
                            <p>Verified phone: {activeUser.phoneVerified ? 'Yes' : 'No'}</p>
                            <p>Status: {activeUser.status || 'active'}</p>
                          </div>
                          {activeUser.status === 'suspended' ? (
                            <button onClick={() => updateStatus(activeUser, 'active')} disabled={busyId === id} className='rounded border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50'>Unsuspend</button>
                          ) : (
                            <button onClick={() => updateStatus(activeUser, 'suspended')} disabled={busyId === id} className='rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700'>Suspend</button>
                          )}
                        </div>

                        <div className='grid gap-4 lg:grid-cols-2'>
                          <Panel title='Saved Addresses'>
                            {(activeUser.addresses || []).length ? (
                              <div className='space-y-3'>
                                {activeUser.addresses.map((address) => (
                                  <div key={address._id || `${address.addressLine}-${address.pincode}`} className='rounded border border-gray-200 p-3 text-sm'>
                                    <p className='font-semibold text-gray-950'>{address.fullName || '-'}</p>
                                    <p>{address.addressLine || '-'}</p>
                                    <p>{[address.city, address.state, address.pincode].filter(Boolean).join(', ') || '-'}</p>
                                    <p className='text-gray-500'>{address.type || 'Home'}{address.isDefault ? ' | Default' : ''}</p>
                                  </div>
                                ))}
                              </div>
                            ) : <p className='text-sm text-gray-400'>No saved addresses.</p>}
                          </Panel>

                          <Panel title='Order History'>
                            {(detail?.orders || []).length ? (
                              <div className='space-y-3'>
                                {detail.orders.map((order) => (
                                  <div key={getId(order)} className='rounded border border-gray-200 p-3 text-sm'>
                                    <div className='flex items-center justify-between gap-3'>
                                      <p className='font-semibold text-gray-950'>{order.orderNumber}</p>
                                      <Badge>{order.orderStatus}</Badge>
                                    </div>
                                    <p className='mt-1 text-gray-500'>{formatDate(order.createdAt)} | {money(order.amounts?.finalAmount)} | {order.payment?.method || '-'}</p>
                                  </div>
                                ))}
                              </div>
                            ) : <p className='text-sm text-gray-400'>No orders found.</p>}
                          </Panel>
                        </div>
                      </>
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

function fullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

function Badge({ children, tone = 'default' }) {
  const className = tone === 'danger' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
  return <span className={`w-fit rounded px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function Panel({ title, children }) {
  return (
    <div className='rounded border border-gray-200 p-4'>
      <p className='mb-3 text-xs font-semibold uppercase text-gray-500'>{title}</p>
      {children}
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
