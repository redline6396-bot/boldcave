'use client';

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, ImageUp, Mail, MessageCircle, Search, Trash2, X } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDate, formatDateTime, getErrorMessage, getId, money } from '@/lib/api';
import {
  copyPromotionalImageToClipboard,
  deleteTemporaryPromotionalImage,
  PROMOTIONAL_IMAGE_ACCEPT,
  uploadPromotionalImage,
  validatePromotionalImageFile,
} from '@/lib/promotionalImages';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [expandedId, setExpandedId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [messageUser, setMessageUser] = useState(null);
  const [messageData, setMessageData] = useState(null);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [messageImage, setMessageImage] = useState(null);
  const [messageImageOrigin, setMessageImageOrigin] = useState('none');
  const [messageImageUpload, setMessageImageUpload] = useState({ status: '', progress: 0, message: '' });
  const [copyingImage, setCopyingImage] = useState(false);
  const [couponId, setCouponId] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { success, error: showError } = useContext(NotificationContext);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ limit: '100', sort });
      if (search.trim()) params.set('search', search.trim());
      const response = await api.get(`/api/admin/users?${params.toString()}`);
      setUsers(response.data.data.users || []);
    } catch (err) {
      const message = getErrorMessage(err, 'Unable to load users');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [search, showError, sort]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadUsers, search]);

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

  const openMessage = async (user) => {
    setMessageUser(user);
    setMessageData(null);
    setMessageTemplate('');
    setMessageImage(null);
    setMessageImageOrigin('none');
    setMessageImageUpload({ status: '', progress: 0, message: '' });
    setCopyingImage(false);
    setCouponId('');
    try {
      setMessageLoading(true);
      const response = await api.get(`/api/admin/users/${getId(user)}/message`);
      const data = response.data.data;
      setMessageData(data);
      setMessageTemplate(data.customerMessaging?.defaultMessage || '');
      setMessageImage(data.customerMessaging?.promotionalImage || null);
      setMessageImageOrigin(data.customerMessaging?.promotionalImage ? 'global' : 'none');
    } catch (err) {
      showError(getErrorMessage(err, 'Unable to load message details'));
      setMessageUser(null);
    } finally {
      setMessageLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageData?.user?.email || sending) return;
    try {
      setSending(true);
      const response = await api.post(`/api/admin/users/${messageData.user.id}/message`, {
        message: messageTemplate,
        couponId: couponId || null,
      });
      setMessageData((current) => ({ ...current, lastMessage: response.data.data.delivery }));
      success('Email sent to customer');
    } catch (err) {
      const failedDelivery = err?.response?.data?.error?.details?.delivery;
      if (failedDelivery) {
        setMessageData((current) => ({ ...current, lastMessage: failedDelivery }));
      }
      showError(getErrorMessage(err, 'Unable to send email'));
    } finally {
      setSending(false);
    }
  };

  const uploadMessageImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const validationError = validatePromotionalImageFile(file);
    if (validationError) {
      setMessageImageUpload({ status: 'error', progress: 0, message: validationError });
      showError(validationError);
      return;
    }

    const previousOverride = messageImageOrigin === 'override'
      ? messageImage?.publicId
      : '';
    try {
      setMessageImageUpload({ status: 'uploading', progress: 0, message: 'Uploading image...' });
      const image = await uploadPromotionalImage(file, (progress) => {
        setMessageImageUpload({ status: 'uploading', progress, message: `Uploading image... ${progress}%` });
      });
      setMessageImage(image);
      setMessageImageOrigin('override');
      setMessageImageUpload({ status: 'success', progress: 100, message: 'Customer-specific image uploaded.' });
      if (previousOverride && previousOverride !== image.publicId) {
        void deleteTemporaryPromotionalImage(previousOverride).catch(() => {});
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to upload promotional image');
      setMessageImageUpload({ status: 'error', progress: 0, message });
      showError(message);
    }
  };

  const removeMessageImage = () => {
    if (messageImageOrigin === 'override' && messageImage?.publicId) {
      void deleteTemporaryPromotionalImage(messageImage.publicId).catch(() => {});
    }
    setMessageImage(null);
    setMessageImageOrigin('none');
    setMessageImageUpload({ status: 'success', progress: 0, message: 'Image removed for this customer only.' });
  };

  const restoreGlobalMessageImage = () => {
    if (messageImageOrigin === 'override' && messageImage?.publicId) {
      void deleteTemporaryPromotionalImage(messageImage.publicId).catch(() => {});
    }
    const globalImage = messageData?.customerMessaging?.promotionalImage || null;
    setMessageImage(globalImage);
    setMessageImageOrigin(globalImage ? 'global' : 'none');
    setMessageImageUpload({ status: '', progress: 0, message: '' });
  };

  const closeMessage = () => {
    if (sending || messageImageUpload.status === 'uploading') return;
    if (messageImageOrigin === 'override' && messageImage?.publicId) {
      void deleteTemporaryPromotionalImage(messageImage.publicId).catch(() => {});
    }
    setMessageUser(null);
    setMessageData(null);
    setMessageImage(null);
    setMessageImageOrigin('none');
    setMessageImageUpload({ status: '', progress: 0, message: '' });
    setCopyingImage(false);
  };

  const copyMessageImage = async () => {
    if (!messageImage?.url || copyingImage) return;
    try {
      setCopyingImage(true);
      await copyPromotionalImageToClipboard(messageImage.url);
      success('Image copied. Paste it into WhatsApp or Gmail.');
    } catch (error) {
      showError(error?.message || 'Unable to copy image');
    } finally {
      setCopyingImage(false);
    }
  };

  const selectedCoupon = useMemo(
    () => messageData?.coupons?.find((coupon) => coupon.id === couponId) || null,
    [couponId, messageData?.coupons]
  );
  const preview = useMemo(
    () => resolvePreview({
      template: messageTemplate,
      user: messageData?.user,
      couponCode: selectedCoupon?.code || '',
      siteUrl: messageData?.customerMessaging?.siteUrl || '',
    }),
    [messageData?.customerMessaging?.siteUrl, messageData?.user, messageTemplate, selectedCoupon?.code]
  );
  const whatsappUrl = useMemo(
    () => buildWhatsAppUrl(messageData?.user?.phone, preview, selectedCoupon?.code),
    [messageData?.user?.phone, preview, selectedCoupon?.code]
  );
  const gmailUrl = useMemo(
    () => buildGmailUrl(messageData?.user?.email, preview, selectedCoupon?.code),
    [messageData?.user?.email, preview, selectedCoupon?.code]
  );

  return (
    <div className='space-y-6'>
      <header>
        <h1 className='text-3xl font-bold text-gray-950'>Users</h1>
        <p className='mt-1 text-sm text-gray-500'>View customers, addresses, order history, and account status.</p>
      </header>

      <section className='flex flex-col gap-3 rounded border border-gray-200 bg-white p-4 sm:flex-row'>
        <label className='relative block flex-1'>
          <Search className='absolute left-3 top-2.5 text-gray-400' size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search ID, order, phone, name...'
            className='w-full rounded border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-black'
          />
        </label>
        <label className='flex items-center gap-2 text-sm font-semibold text-gray-700'>
          Sort
          <select value={sort} onChange={(event) => setSort(event.target.value)} className='rounded border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black'>
            <option value='newest'>Newest to Oldest</option>
            <option value='oldest'>Oldest to Newest</option>
          </select>
        </label>
      </section>

      {loading ? (
        <StateMessage message='Loading users...' />
      ) : error ? (
        <StateMessage tone='error' message={error} onRetry={loadUsers} />
      ) : users.length === 0 ? (
        <StateMessage message='No users found.' />
      ) : (
        <div className='space-y-3'>
          {users.map((user) => {
            const id = getId(user);
            const isOpen = expandedId === id;
            const detail = details[id];
            const activeUser = detail?.user || user;
            return (
              <section key={id} className='rounded border border-gray-200 bg-white'>
                <div className='flex items-center gap-2 px-3 sm:px-5'>
                  <button onClick={() => loadDetails(user)} className='flex min-w-0 flex-1 items-center justify-between gap-4 py-4 text-left'>
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
                  <button type='button' onClick={() => openMessage(user)} className='inline-flex shrink-0 items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50'>
                    <Mail size={16} />
                    <span className='hidden sm:inline'>Message</span>
                  </button>
                </div>

                {isOpen && (
                  <div className='space-y-5 border-t border-gray-100 px-5 py-5'>
                    {busyId === id && !detail ? (
                      <StateMessage message='Loading user details...' />
                    ) : (
                      <>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                          <div className='text-sm text-gray-600'>
                            <p>User ID: {id}</p>
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
                                    <p className='mt-1 text-gray-500'>{formatDateTime(order.createdAt)} IST | {money(order.amounts?.finalAmount)} | {order.payment?.method || '-'}</p>
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

      {messageUser && (
        <MessageModal
          loading={messageLoading}
          data={messageData}
          template={messageTemplate}
          setTemplate={setMessageTemplate}
          couponId={couponId}
          setCouponId={setCouponId}
          preview={preview}
          image={messageImage}
          imageOrigin={messageImageOrigin}
          globalImage={messageData?.customerMessaging?.promotionalImage || null}
          imageUpload={messageImageUpload}
          onImageUpload={uploadMessageImage}
          onImageRemove={removeMessageImage}
          onRestoreGlobalImage={restoreGlobalMessageImage}
          copyingImage={copyingImage}
          onCopyImage={copyMessageImage}
          whatsappUrl={whatsappUrl}
          gmailUrl={gmailUrl}
          sending={sending}
          onSend={sendMessage}
          onClose={closeMessage}
        />
      )}
    </div>
  );
}

function MessageModal({ loading, data, template, setTemplate, couponId, setCouponId, preview, image, imageOrigin, globalImage, imageUpload, onImageUpload, onImageRemove, onRestoreGlobalImage, copyingImage, onCopyImage, whatsappUrl, gmailUrl, sending, onSend, onClose }) {
  const user = data?.user;
  const lastMessage = data?.lastMessage;
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow-xl'>
        <div className='flex items-center justify-between gap-4'>
          <h2 className='text-xl font-bold text-gray-950'>Send Message</h2>
          <button type='button' onClick={onClose} disabled={sending || imageUpload.status === 'uploading'} className='rounded p-1 hover:bg-gray-100 disabled:opacity-50' aria-label='Close'><X size={20} /></button>
        </div>
        {loading || !data ? (
          <p className='mt-6 text-sm text-gray-500'>Loading customer message...</p>
        ) : (
          <div className='mt-5 space-y-4'>
            <div className='rounded border border-gray-200 bg-gray-50 p-3 text-sm'>
              <p className='font-semibold text-gray-950'>{user.name || 'Customer'}</p>
              <p className='text-gray-600'>{user.phone || '-'}</p>
              <p className='text-gray-600'>{user.email || 'No email address'}</p>
            </div>

            <label className='block text-sm font-semibold text-gray-700'>
              Coupon
              <select value={couponId} onChange={(event) => setCouponId(event.target.value)} className='mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black'>
                <option value=''>No Coupon</option>
                {(data.coupons || []).map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>{formatCoupon(coupon)}</option>
                ))}
              </select>
            </label>
            {(data.coupons || []).length === 0 && <p className='text-xs text-gray-500'>No eligible active coupons are currently available for this customer.</p>}

            <label className='block text-sm font-semibold text-gray-700'>
              Message
              <textarea value={template} onChange={(event) => setTemplate(event.target.value)} rows={9} maxLength={5000} className='mt-1 w-full rounded border border-gray-300 px-3 py-2 font-normal outline-none focus:border-black' />
            </label>

            <div>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-sm font-semibold text-gray-700'>Promotional Image <span className='font-normal text-gray-400'>(optional)</span></p>
                {image && (
                  <button type='button' onClick={onCopyImage} disabled={copyingImage} className='inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50'>
                    <Copy size={14} /> {copyingImage ? 'Copying...' : 'Copy Image'}
                  </button>
                )}
              </div>
              {image ? (
                <div className='mt-2 flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center'>
                  <img src={image.url} alt='Selected promotional preview' className='h-24 w-full rounded border border-gray-200 bg-white object-cover sm:w-24' />
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-medium text-gray-800'>{imageOrigin === 'global' ? 'Global default image' : 'Customer-specific image'}</p>
                    <p className='mt-1 text-xs text-gray-500'>JPG, PNG, or WebP · maximum 5 MB</p>
                  </div>
                  <button type='button' onClick={onImageRemove} disabled={imageUpload.status === 'uploading'} className='inline-flex items-center justify-center gap-1 rounded border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50'>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ) : (
                <p className='mt-2 rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500'>No image selected. Text-only messaging remains available.</p>
              )}
              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <label className={`inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 ${imageUpload.status === 'uploading' ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
                  <ImageUp size={15} /> {image ? 'Replace image' : 'Upload image'}
                  <input type='file' accept={PROMOTIONAL_IMAGE_ACCEPT} onChange={onImageUpload} disabled={imageUpload.status === 'uploading'} className='hidden' />
                </label>
                {globalImage && image?.publicId !== globalImage.publicId && (
                  <button type='button' onClick={onRestoreGlobalImage} disabled={imageUpload.status === 'uploading'} className='rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50'>Use global default</button>
                )}
                {imageUpload.message && (
                  <span className={`text-xs ${imageUpload.status === 'error' ? 'text-red-600' : imageUpload.status === 'success' ? 'text-green-700' : 'text-gray-500'}`}>{imageUpload.message}</span>
                )}
              </div>
              {imageUpload.status === 'uploading' && (
                <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100' aria-label={`Upload progress ${imageUpload.progress}%`}>
                  <div className='h-full rounded-full bg-black transition-[width]' style={{ width: `${imageUpload.progress}%` }} />
                </div>
              )}
            </div>

            <div className='rounded border border-gray-200 p-4'>
              <p className='text-xs font-semibold uppercase text-gray-500'>Preview</p>
              {image && <img src={image.url} alt='Promotional image preview' className='mt-3 max-h-64 w-full rounded border border-gray-200 bg-gray-50 object-contain' />}
              <p className='mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800'>{preview ? renderMessagePreview(preview, couponId ? data.coupons?.find((coupon) => coupon.id === couponId)?.code : '') : 'Message preview is empty.'}</p>
            </div>

            {data.emailDeliveryConfigured && lastMessage && (
              <div className={`rounded border p-3 text-sm ${lastMessage.status === 'sent' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                <p className='font-semibold'>{lastMessage.status === 'sent' ? 'Sent via Email' : 'Failed - Retry available'}</p>
                <p className='mt-1 text-xs'>{formatDateTime(lastMessage.sentAt || lastMessage.createdAt)} IST</p>
                {lastMessage.status === 'failed' && lastMessage.errorSummary && (
                  <p className='mt-1 text-xs'>{lastMessage.errorSummary}</p>
                )}
              </div>
            )}

            {!user.email && <p className='rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>This customer does not have an email address.</p>}
            {!whatsappUrl && <p className='rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>This customer does not have a valid WhatsApp phone number.</p>}

            <p className='text-xs text-gray-500'>WhatsApp opens a chat with the final message prefilled. Send confirmation happens inside WhatsApp.</p>
            {!data.emailDeliveryConfigured && user.email && (
              <p className='text-xs text-gray-500'>Gmail opens a compose window with the customer, subject, and final message prefilled. Send confirmation happens inside Gmail.</p>
            )}
            <div className='flex flex-wrap justify-end gap-3 pt-1'>
              <button type='button' onClick={onClose} disabled={sending || imageUpload.status === 'uploading'} className='rounded border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50'>Cancel</button>
              {whatsappUrl && imageUpload.status !== 'uploading' ? (
                <a href={whatsappUrl} target='_blank' rel='noreferrer' className='inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700'>
                  <MessageCircle size={16} />
                  Open WhatsApp
                </a>
              ) : (
                <button type='button' disabled className='inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white opacity-50'>
                  <MessageCircle size={16} />
                  Open WhatsApp
                </button>
              )}
              {data.emailDeliveryConfigured ? (
                <button type='button' onClick={onSend} disabled={sending || imageUpload.status === 'uploading' || !user.email || !template.trim() || !preview} className='inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50'>
                  <Mail size={16} />
                  {sending ? 'Sending...' : lastMessage?.status === 'sent' ? 'Send Again' : 'Send Email'}
                </button>
              ) : gmailUrl && imageUpload.status !== 'uploading' ? (
                <a href={gmailUrl} target='_blank' rel='noreferrer' className='inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800'>
                  <Mail size={16} />
                  Open Gmail
                </a>
              ) : (
                <button type='button' disabled className='inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-sm font-semibold text-white opacity-50'>
                  <Mail size={16} />
                  Open Gmail
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function resolvePreview({ template, user, couponCode, siteUrl }) {
  let value = String(template || '');
  if (!couponCode) {
    value = value.split(/\r?\n/).filter((line) => !/{{\s*coupon_code\s*}}/i.test(line)).join('\n');
  }
  return value
    .replace(/{{\s*name\s*}}/gi, user?.name || 'there')
    .replace(/{{\s*coupon_code\s*}}/gi, couponCode || '')
    .replace(/{{\s*site_url\s*}}/gi, siteUrl || '')
    .replace(/{{[^{}]+}}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildWhatsAppUrl(phone, message, couponCode) {
  const digits = String(phone || '').replace(/\D/g, '');
  const normalizedPhone = /^91[6-9]\d{9}$/.test(digits)
    ? digits
    : /^[6-9]\d{9}$/.test(digits)
      ? `91${digits}`
      : '';

  if (!normalizedPhone || !message) return '';
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(formatWhatsAppCoupon(message, couponCode))}`;
}

function formatWhatsAppCoupon(message, couponCode) {
  const code = String(couponCode || '').trim();
  if (!code) return message;
  const pattern = new RegExp(escapeRegExp(code), 'gi');
  return String(message).replace(pattern, (match, offset, source) => (
    source[offset - 1] === '*' && source[offset + match.length] === '*'
      ? match
      : `*${match}*`
  ));
}

function renderMessagePreview(message, couponCode) {
  const code = String(couponCode || '').trim();
  if (!code) return message;
  const pattern = new RegExp(`(${escapeRegExp(code)})`, 'gi');
  return String(message).split(pattern).map((part, index) => (
    part.toLowerCase() === code.toLowerCase()
      ? <strong key={`${part}-${index}`} className='font-bold text-gray-950'>{part}</strong>
      : part
  ));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildGmailUrl(email, message, couponCode) {
  const recipient = String(email || '').trim();
  if (!recipient || !message) return '';
  const subject = couponCode
    ? `${couponCode} - a special offer from Bold Cave`
    : 'A message from Bold Cave';
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: recipient,
    su: subject,
    body: message,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function formatCoupon(coupon) {
  const discount = coupon.discountType === 'percentage'
    ? `${coupon.discountValue}% OFF`
    : `${money(coupon.discountValue)} OFF`;
  const minimum = Number(coupon.minimumOrder) > 0 ? ` | Min ${money(coupon.minimumOrder)}` : '';
  return `${coupon.code} - ${discount}${minimum}`;
}

function fullName(user) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  if (name) return name;
  const lastAddress = user.addresses?.[user.addresses.length - 1];
  return lastAddress?.fullName || '';
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
