'use client';

import { useCallback, useContext, useEffect, useState } from 'react';
import { Check, Search, Trash2, X } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDate, getId } from '@/lib/api';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState('');
  const [approved, setApproved] = useState('');
  const [productId, setProductId] = useState('');
  const [search, setSearch] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const { success, error: showError } = useContext(NotificationContext);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ limit: '100' });
      if (rating) params.set('rating', rating);
      if (approved) params.set('approved', approved);
      if (productId) params.set('productId', productId);
      if (search.trim()) params.set('search', search.trim());
      const response = await api.get(`/api/admin/reviews?${params.toString()}`);
      setReviews(response.data.data.reviews || []);
    } catch {
      const message = 'Reviews could not be loaded. Please retry.';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [approved, productId, rating, search, showError]);

  useEffect(() => {
    const timer = setTimeout(loadReviews, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadReviews, search]);

  const patchReview = async (review, updates, message, action) => {
    const id = getId(review);
    if (!id || busyAction) return;

    try {
      setBusyAction(`${id}:${action}`);
      const response = await api.patch(`/api/admin/reviews/${id}`, updates);
      setReviews((current) => current.map((entry) => (getId(entry) === id ? { ...entry, ...response.data.data.review } : entry)));
      success(message);
    } catch {
      showError('Could not update this review. Please try again.');
    } finally {
      setBusyAction('');
    }
  };

  const deleteReview = async (review) => {
    const id = getId(review);
    if (!id || busyAction) return;
    if (!window.confirm('Delete this review permanently?')) return;

    try {
      setBusyAction(`${id}:delete`);
      await api.delete(`/api/admin/reviews/${id}`);
      setReviews((current) => current.filter((entry) => getId(entry) !== id));
      success('Review deleted');
    } catch {
      showError('Could not delete this review. Please try again.');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className='space-y-6'>
      <header>
        <h1 className='text-3xl font-bold text-gray-950'>Reviews</h1>
        <p className='mt-1 text-sm text-gray-500'>Moderate customer reviews and verified purchase labels.</p>
      </header>

      <section className='rounded border border-gray-200 bg-white p-4'>
        <div className='grid gap-3 lg:grid-cols-[1fr_150px_170px_1fr]'>
          <label className='relative block'>
            <Search className='absolute left-3 top-2.5 text-gray-400' size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search title or text' className='w-full rounded border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-black' />
          </label>
          <select value={rating} onChange={(event) => setRating(event.target.value)} className='rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'>
            <option value=''>All ratings</option>
            {[5, 4, 3, 2, 1].map((entry) => <option key={entry} value={entry}>{entry} stars</option>)}
          </select>
          <select value={approved} onChange={(event) => setApproved(event.target.value)} className='rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'>
            <option value=''>All statuses</option>
            <option value='true'>Approved</option>
            <option value='false'>Hidden</option>
          </select>
          <input value={productId} onChange={(event) => setProductId(event.target.value)} placeholder='Product ObjectId filter' className='rounded border border-gray-300 px-3 py-2 outline-none focus:border-black' />
        </div>
      </section>

      {loading ? (
        <StateMessage message='Loading reviews...' />
      ) : error ? (
        <StateMessage tone='error' message={error} onRetry={loadReviews} />
      ) : reviews.length === 0 ? (
        <StateMessage message='No reviews found.' />
      ) : (
        <div className='space-y-4'>
          {reviews.map((review) => (
            <ReviewCard
              key={getId(review)}
              review={review}
              busyAction={busyAction}
              onPatch={patchReview}
              onDelete={deleteReview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, busyAction, onPatch, onDelete }) {
  const reviewId = getId(review);
  const rowBusy = Boolean(busyAction && busyAction.startsWith(`${reviewId}:`));
  const approveBusy = busyAction === `${reviewId}:approval`;
  const verifyBusy = busyAction === `${reviewId}:verification`;
  const deleteBusy = busyAction === `${reviewId}:delete`;
  const productName = review.product?.name || 'Deleted product';
  const customerName =
    [review.user?.firstName, review.user?.lastName].filter(Boolean).join(' ') ||
    review.user?.phone ||
    'Customer';
  const customerEmail = review.user?.email || '-';

  return (
    <section className='rounded border border-gray-200 bg-white p-5'>
              <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                <div className='min-w-0 flex-1 space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='font-semibold text-gray-950'>{productName}</p>
                    <Badge>{review.rating}/5</Badge>
                    <Badge tone={review.approved ? 'success' : 'muted'}>{review.approved ? 'Approved' : 'Hidden'}</Badge>
                    <Badge tone={review.verifiedPurchase ? 'success' : 'muted'}>{review.verifiedPurchase ? 'Verified purchase' : 'Unverified'}</Badge>
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-gray-900'>{review.title || 'Untitled review'}</p>
                    <p className='mt-1 whitespace-pre-line text-sm text-gray-600'>{review.text}</p>
                  </div>
                  <p className='text-xs text-gray-500'>
                    {customerName} | {customerEmail} | {formatDate(review.createdAt)}
                  </p>
                  {review.photos?.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {review.photos.map((photo, index) => (
                        <AdminReviewPhoto key={getPhotoKey(photo, index)} photo={photo} />
                      ))}
                    </div>
                  )}
                </div>

                <div className='flex flex-wrap gap-2'>
                  <button disabled={rowBusy} onClick={() => onPatch(review, { approved: !review.approved }, review.approved ? 'Review hidden' : 'Review approved', 'approval')} className='inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'>
                    {review.approved ? <X size={16} /> : <Check size={16} />}
                    {approveBusy ? (review.approved ? 'Hiding...' : 'Approving...') : review.approved ? 'Hide' : 'Approve'}
                  </button>
                  <button disabled={rowBusy} onClick={() => onPatch(review, { verifiedPurchase: !review.verifiedPurchase }, 'Review verification updated', 'verification')} className='inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'>
                    <Check size={16} />
                    {verifyBusy ? (review.verifiedPurchase ? 'Unverifying...' : 'Verifying...') : review.verifiedPurchase ? 'Unverify' : 'Verify'}
                  </button>
                  <button disabled={rowBusy} onClick={() => onDelete(review)} className='inline-flex items-center gap-2 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'>
                    <Trash2 size={16} />
                    {deleteBusy ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </section>
  );
}

function AdminReviewPhoto({ photo }) {
  const [failed, setFailed] = useState(false);
  const url = typeof photo === 'string' ? photo : photo?.url || photo?.secure_url || '';

  if (!url || failed) return null;

  return (
    <a href={url} target='_blank' rel='noreferrer' className='block h-16 w-16 overflow-hidden rounded border border-gray-200 bg-gray-100'>
      <img src={url} alt='Review photo' onError={() => setFailed(true)} className='h-full w-full object-cover' />
    </a>
  );
}

function getPhotoKey(photo, index) {
  if (typeof photo === 'string') return `${photo}-${index}`;
  return photo?.publicId || photo?.url || `review-photo-${index}`;
}

function Badge({ children, tone = 'default' }) {
  const classes = {
    default: 'bg-black text-white',
    success: 'bg-green-100 text-green-700',
    muted: 'bg-gray-100 text-gray-700',
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
