'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { ImageUp, Save, Trash2 } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, getErrorMessage } from '@/lib/api';

const SLOT_COUNT = 3;

const blankHeroSlide = () => ({
  desktopImage: '',
  mobileImage: '',
  link: '/collection',
});

const blankFeaturedReview = () => ({
  image: '',
  name: '',
  text: '',
});

const normalizeSlots = (items, createBlank) =>
  Array.from({ length: SLOT_COUNT }, (_, index) => ({
    ...createBlank(),
    ...(Array.isArray(items) ? items[index] : {}),
  }));

async function uploadImage(file) {
  const signatureResponse = await api.post('/api/upload/cloudinary-signature', { folder: 'homepage' });
  const signature = signatureResponse.data.data;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', signature.timestamp);
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Image upload failed');
  const imageUrl = data.secure_url || data.url;
  if (!imageUrl) throw new Error('Image uploaded but Cloudinary did not return a preview URL');
  return imageUrl;
}

export default function HomepagePage() {
  const [heroSlides, setHeroSlides] = useState(() => normalizeSlots([], blankHeroSlide));
  const [featuredReviews, setFeaturedReviews] = useState(() => normalizeSlots([], blankFeaturedReview));
  const [collectionFragranceCount, setCollectionFragranceCount] = useState('5');
  const [collectionPersonalityCount, setCollectionPersonalityCount] = useState('5');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyField, setBusyField] = useState('');
  const [localError, setLocalError] = useState('');
  const { success, error: showError } = useContext(NotificationContext);
  const showErrorRef = useRef(showError);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  useEffect(() => {
    let mounted = true;

    async function loadHomepageSettings() {
      try {
        setLoading(true);
        setLocalError('');
        const response = await api.get('/api/admin/homepage-settings');
        if (!mounted) return;
        setHeroSlides(normalizeSlots(response.data.data?.heroSlides, blankHeroSlide));
        setFeaturedReviews(normalizeSlots(response.data.data?.featuredReviews, blankFeaturedReview));
        setCollectionFragranceCount(String(response.data.data?.collectionFragranceCount ?? 5));
        setCollectionPersonalityCount(String(response.data.data?.collectionPersonalityCount ?? 5));
      } catch (error) {
        const message = getErrorMessage(error, 'Unable to load homepage settings');
        setLocalError(message);
        showErrorRef.current(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadHomepageSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const setHeroField = (index, field, value) => {
    setHeroSlides((current) =>
      current.map((slide, itemIndex) =>
        itemIndex === index ? { ...slide, [field]: value } : slide
      )
    );
  };

  const setReviewField = (index, field, value) => {
    setFeaturedReviews((current) =>
      current.map((review, itemIndex) =>
        itemIndex === index ? { ...review, [field]: value } : review
      )
    );
  };

  const handleImageChange = async ({ file, fieldKey, onComplete }) => {
    if (!file) return;

    try {
      setBusyField(fieldKey);
      setLocalError('');
      const imageUrl = await uploadImage(file);
      onComplete(imageUrl);
      success('Image uploaded. Click Save to publish.');
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to upload image');
      setLocalError(message);
      showError(message);
    } finally {
      setBusyField('');
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setLocalError('');
      const response = await api.patch('/api/admin/homepage-settings', {
        heroSlides,
        featuredReviews,
        collectionFragranceCount,
        collectionPersonalityCount,
      });
      setHeroSlides(normalizeSlots(response.data.data?.heroSlides, blankHeroSlide));
      setFeaturedReviews(normalizeSlots(response.data.data?.featuredReviews, blankFeaturedReview));
      setCollectionFragranceCount(String(response.data.data?.collectionFragranceCount ?? 5));
      setCollectionPersonalityCount(String(response.data.data?.collectionPersonalityCount ?? 5));
      success('Homepage settings saved');
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to save homepage settings');
      setLocalError(message);
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <StateMessage message='Loading homepage settings...' />;
  }

  return (
    <div className='max-w-6xl space-y-6'>
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold text-gray-950'>Homepage</h1>
          <p className='mt-1 text-sm text-gray-500'>Manage hero banners and homepage featured reviews. Image upload only prepares the image; click Save to store it.</p>
        </div>
        <button
          type='button'
          onClick={saveSettings}
          disabled={saving || Boolean(busyField)}
          className='inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Homepage'}
        </button>
      </header>

      {localError && (
        <div className='rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          {localError}
        </div>
      )}

      <section className='rounded border border-gray-200 bg-white p-5'>
        <h2 className='text-lg font-semibold text-gray-950'>Hero Banners</h2>
        <div className='mt-4 space-y-5'>
          {heroSlides.map((slide, index) => (
            <div key={`hero-${index}`} className='rounded border border-gray-200 p-4'>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <h3 className='text-sm font-semibold text-gray-950'>Hero Slide {index + 1}</h3>
                <span className='text-xs text-gray-500'>Fixed slot {index + 1}/3</span>
              </div>

              <div className='grid gap-4 lg:grid-cols-2'>
                <ImageField
                  label='Desktop Image'
                  value={slide.desktopImage}
                  busy={busyField === `hero-${index}-desktop`}
                  onUrlChange={(value) => setHeroField(index, 'desktopImage', value)}
                  onChange={(file) =>
                    handleImageChange({
                      file,
                      fieldKey: `hero-${index}-desktop`,
                      onComplete: (url) => setHeroField(index, 'desktopImage', url),
                    })
                  }
                />
                <ImageField
                  label='Mobile Image'
                  value={slide.mobileImage}
                  busy={busyField === `hero-${index}-mobile`}
                  onUrlChange={(value) => setHeroField(index, 'mobileImage', value)}
                  onChange={(file) =>
                    handleImageChange({
                      file,
                      fieldKey: `hero-${index}-mobile`,
                      onComplete: (url) => setHeroField(index, 'mobileImage', url),
                    })
                  }
                />
              </div>

              <TextField
                label='Click URL'
                value={slide.link}
                onChange={(value) => setHeroField(index, 'link', value)}
                placeholder='/collection'
              />
            </div>
          ))}
        </div>
      </section>

      <section className='rounded border border-gray-200 bg-white p-5'>
        <h2 className='text-lg font-semibold text-gray-950'>Homepage Collection Copy</h2>
        <p className='mt-1 text-sm text-gray-500'>These numbers control the Shop The Collection subtitle. They are not product limits.</p>
        <div className='grid gap-4 lg:grid-cols-2'>
          <TextField
            label='Fragrance count'
            type='number'
            value={collectionFragranceCount}
            onChange={setCollectionFragranceCount}
            placeholder='5'
          />
          <TextField
            label='Personality count'
            type='number'
            value={collectionPersonalityCount}
            onChange={setCollectionPersonalityCount}
            placeholder='5'
          />
        </div>
      </section>

      <section className='rounded border border-gray-200 bg-white p-5'>
        <h2 className='text-lg font-semibold text-gray-950'>Homepage Featured Reviews</h2>
        <div className='mt-4 space-y-5'>
          {featuredReviews.map((review, index) => (
            <div key={`review-${index}`} className='rounded border border-gray-200 p-4'>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <h3 className='text-sm font-semibold text-gray-950'>Review Slot {index + 1}</h3>
                <span className='text-xs text-gray-500'>Fixed slot {index + 1}/3</span>
              </div>

              <ImageField
                label='Review Image'
                value={review.image}
                busy={busyField === `review-${index}-image`}
                onUrlChange={(value) => setReviewField(index, 'image', value)}
                onChange={(file) =>
                  handleImageChange({
                    file,
                    fieldKey: `review-${index}-image`,
                    onComplete: (url) => setReviewField(index, 'image', url),
                  })
                }
              />

              <div className='mt-4 grid gap-4 lg:grid-cols-2'>
                <TextField
                  label='Customer Name'
                  value={review.name}
                  onChange={(value) => setReviewField(index, 'name', value)}
                  placeholder='A. Sharma'
                />
                <TextareaField
                  label='Review Text'
                  value={review.text}
                  onChange={(value) => setReviewField(index, 'text', value)}
                  placeholder='Really impressed with the fragrance quality and how long it lasts.'
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ImageField({ label, value, busy, onUrlChange, onChange }) {
  return (
    <div>
      <p className='mb-2 text-sm font-medium text-gray-700'>{label}</p>
      <input
        value={value}
        onChange={(event) => onUrlChange(event.target.value)}
        placeholder='Paste image URL'
        className='mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black'
      />
      <div className='overflow-hidden rounded border border-gray-200 bg-gray-50'>
        <div className='flex h-44 items-center justify-center bg-gray-100 sm:h-56'>
          {value ? (
            <img src={value} alt='' className='h-full w-full object-contain' />
          ) : (
            <span className='text-xs font-medium text-gray-400'>No image selected</span>
          )}
        </div>
        <div className='flex items-center justify-between gap-3 border-t border-gray-200 bg-white p-3'>
          <p className='min-w-0 truncate text-xs text-gray-500'>{value || 'Current preview'}</p>
          <div className='flex shrink-0 items-center gap-2'>
            {value && (
              <button
                type='button'
                onClick={() => onUrlChange('')}
                disabled={busy}
                className='inline-flex cursor-pointer items-center gap-2 rounded border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <Trash2 size={15} />
                Remove image
              </button>
            )}
            <label className='inline-flex cursor-pointer items-center gap-2 rounded border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50'>
              <ImageUp size={15} />
              {busy ? 'Uploading...' : 'Replace image'}
              <input
                type='file'
                accept='image/*'
                hidden
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  onChange(file);
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label className='mt-4 block text-sm'>
      <span className='mb-1 block font-medium text-gray-700'>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onWheel={(event) => {
          if (type === 'number') event.currentTarget.blur();
        }}
        placeholder={placeholder}
        className={[
          'w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black',
          type === 'number'
            ? '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
            : '',
        ].join(' ')}
      />
    </label>
  );
}

function TextareaField({ label, value, onChange, placeholder = '' }) {
  return (
    <label className='block text-sm'>
      <span className='mb-1 block font-medium text-gray-700'>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'
      />
    </label>
  );
}

function StateMessage({ message }) {
  return (
    <div className='rounded border border-gray-200 bg-white p-6 text-sm text-gray-500'>
      {message}
    </div>
  );
}
