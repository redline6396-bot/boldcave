'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';

const audienceOptions = ['Men', 'Women', 'Unisex'];
const MAX_IMAGES = 6;
const blankVariant = (size = '') => ({
  size,
  sellingPrice: '',
  mrp: '',
  costPrice: '',
  stock: '',
  sku: '',
  image: null,
  imagesText: '',
});

const emptyForm = {
  productType: 'product',
  name: '',
  slug: '',
  audienceTags: ['Unisex'],
  status: 'draft',
  featured: false,
  featuredOrder: 0,
  shortDescription: '',
  description: '',
  imagesText: '',
  fragranceProfile: '',
  longevity: '',
  projection: '',
  concentration: '',
  personality: '',
  positioning: '',
  whatYouGet: '',
  comboMrp: '',
  comboSellingPrice: '',
  comboCostPrice: '',
  comboItems: [{ productId: '', variantId: '', quantity: 1 }],
  bestFor: '',
  bestSeason: '',
  howToUse: '',
  storagePrecautions: '',
  ingredients: '',
  topNotes: '',
  heartNotes: '',
  baseNotes: '',
  variants: [blankVariant('10 ML'), blankVariant('50 ML')],
};

function lines(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function csv(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function generateSku(value, size) {
  const base =
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'PRODUCT';

  const sizeCode = String(size || '')
    .toUpperCase()
    .replace(/\s+/g, '');

  return `${base}-${sizeCode}`;
}

function imageUrlsFromImages(images = []) {
  return (Array.isArray(images) ? images : [])
    .map((image) => image?.url || image)
    .filter(Boolean);
}

function formFromProduct(product) {
  if (!product) return emptyForm;

  return {
    productType: product.productType === 'combo' ? 'combo' : 'product',
    name: product.name || '',
    slug: product.slug || '',
    audienceTags: product.audienceTags?.length ? product.audienceTags : ['Unisex'],
    status: product.status || 'draft',
    featured: Boolean(product.featured),
    featuredOrder: Number(product.featuredOrder) || 0,
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    imagesText: imageUrlsFromImages(product.images).join('\n'),
    fragranceProfile: product.fragranceProfile || '',
    longevity: product.longevity || '',
    projection: product.projection || '',
    concentration: product.concentration || '',
    personality: product.personality || '',
    positioning: product.positioning || '',
    whatYouGet: product.whatYouGet || '',
    comboMrp: product.productType === 'combo' ? product.variants?.[0]?.mrp ?? '' : '',
    comboSellingPrice: product.productType === 'combo' ? product.variants?.[0]?.sellingPrice ?? '' : '',
    comboCostPrice: product.productType === 'combo' ? product.variants?.[0]?.costPrice ?? '' : '',
    comboItems: product.comboItems?.length
      ? product.comboItems.map((item) => ({
          productId: item.productId || '',
          variantId: item.variantId || item.size || '',
          quantity: item.quantity || 1,
        }))
      : emptyForm.comboItems,
    bestFor: (product.bestFor || []).join(', '),
    bestSeason: (product.bestSeason || []).join(', '),
    howToUse: product.howToUse || '',
    storagePrecautions: product.storagePrecautions || '',
    ingredients: product.legalInformation?.ingredients || '',
    topNotes: (product.fragranceNotes?.top || []).join(', '),
    heartNotes: (product.fragranceNotes?.heart || []).join(', '),
    baseNotes: (product.fragranceNotes?.base || []).join(', '),
    variants: product.variants?.length ? product.variants.map((variant) => {
      const variantImages = imageUrlsFromImages(variant.images);
      const legacyVariantImage = imageUrlsFromImages(variant.image ? [variant.image] : []);

      return {
        size: variant.size || '',
        sellingPrice: variant.sellingPrice ?? '',
        mrp: variant.mrp ?? '',
        costPrice: variant.costPrice ?? '',
        stock: variant.stock ?? '',
        sku: variant.sku ?? '',
        image: variant.image || null,
        imagesText: (variantImages.length ? variantImages : legacyVariantImage).join('\n'),
      };
    }) : emptyForm.variants,
  };
}

async function uploadImage(file) {
  const signatureResponse = await api.post('/api/upload/cloudinary-signature', { folder: 'products' });
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
  return { url: data.secure_url, publicId: data.public_id };
}

function ImageManager({
  title = 'Images',
  imagesText,
  files,
  onImagesTextChange,
  onFilesChange,
  setLocalError,
  mainImageLabel = 'product',
}) {
  const urlImages = useMemo(() => lines(imagesText), [imagesText]);
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        src: URL.createObjectURL(file),
      })),
    [files]
  );
  const totalImageCount = urlImages.length + files.length;
  const remainingImageSlots = Math.max(0, MAX_IMAGES - totalImageCount);

  useEffect(() => {
    return () => {
      previews.forEach(({ src }) => URL.revokeObjectURL(src));
    };
  }, [previews]);

  const handleImageFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    const availableSlots = Math.max(0, MAX_IMAGES - urlImages.length - files.length);

    if (availableSlots === 0) {
      setLocalError(`Maximum ${MAX_IMAGES} images allowed`);
      event.target.value = '';
      return;
    }

    const acceptedFiles = selectedFiles.slice(0, availableSlots);
    onFilesChange([...files, ...acceptedFiles]);

    if (selectedFiles.length > availableSlots) {
      setLocalError(`Only ${MAX_IMAGES} images are allowed. Extra images were not added.`);
    } else {
      setLocalError('');
    }

    event.target.value = '';
  };

  const removeImageFile = (index) => {
    onFilesChange(files.filter((_, itemIndex) => itemIndex !== index));
    setLocalError('');
  };

  const moveImageFile = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= files.length) return;

    const next = [...files];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onFilesChange(next);
  };

  const removeUrlImage = (index) => {
    const next = urlImages.filter((_, itemIndex) => itemIndex !== index);
    onImagesTextChange(next.join('\n'));
    setLocalError('');
  };

  const moveUrlImage = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= urlImages.length) return;

    const next = [...urlImages];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onImagesTextChange(next.join('\n'));
  };

  return (
    <section className='rounded border border-gray-200 bg-white p-5'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h2 className='font-semibold text-gray-950'>{title}</h2>
        <span className='text-xs font-medium text-gray-500'>
          {totalImageCount}/{MAX_IMAGES} images
        </span>
      </div>

      <Textarea
        label='Image URLs'
        value={imagesText}
        onChange={onImagesTextChange}
        placeholder={'https://res.cloudinary.com/demo/image/upload/noir-main.jpg\nhttps://res.cloudinary.com/demo/image/upload/noir-box.jpg'}
      />

      {urlImages.length > 0 && (
        <div className='mt-4'>
          <p className='mb-2 text-xs font-medium text-gray-600'>URL images</p>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
            {urlImages.map((src, index) => (
              <ImagePreviewCard
                key={`${src}-${index}`}
                src={src}
                index={index}
                isMain={index === 0}
                canMoveLeft={index > 0}
                canMoveRight={index < urlImages.length - 1}
                onMoveLeft={() => moveUrlImage(index, -1)}
                onMoveRight={() => moveUrlImage(index, 1)}
                onRemove={() => removeUrlImage(index)}
              />
            ))}
          </div>
        </div>
      )}

      <label
        className={[
          'mt-4 flex items-center justify-center gap-2 rounded border border-dashed border-gray-300 px-4 py-5 text-sm transition-colors',
          remainingImageSlots > 0
            ? 'cursor-pointer text-gray-600 hover:bg-gray-50'
            : 'cursor-not-allowed bg-gray-50 text-gray-400',
        ].join(' ')}
      >
        <Upload size={18} />
        {remainingImageSlots > 0
          ? `Upload image files (${remainingImageSlots} slot${remainingImageSlots === 1 ? '' : 's'} left)`
          : `Maximum ${MAX_IMAGES} images added`}
        <input
          type='file'
          accept='image/*'
          multiple
          hidden
          disabled={remainingImageSlots === 0}
          onChange={handleImageFiles}
        />
      </label>

      {previews.length > 0 && (
        <div className='mt-4'>
          <p className='mb-2 text-xs font-medium text-gray-600'>Selected uploads</p>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
            {previews.map(({ file, src }, index) => (
              <ImagePreviewCard
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                src={src}
                index={urlImages.length + index}
                isMain={urlImages.length === 0 && index === 0}
                canMoveLeft={index > 0}
                canMoveRight={index < previews.length - 1}
                onMoveLeft={() => moveImageFile(index, -1)}
                onMoveRight={() => moveImageFile(index, 1)}
                onRemove={() => removeImageFile(index)}
              />
            ))}
          </div>
        </div>
      )}

      <p className='mt-3 text-xs leading-5 text-gray-500'>
        Maximum {MAX_IMAGES} images. The first image is the main {mainImageLabel} image. Use the arrows to reorder and the trash button to remove an image.
        URL images are placed before newly uploaded files.
      </p>
      <p className='mt-1 text-xs text-gray-500'>
        Cloudinary credentials are required only for file uploads. URL images can be saved without Cloudinary.
      </p>
    </section>
  );
}

export default function ProductForm({ product, submitLabel = 'Save Product', onSubmit }) {
  const [form, setForm] = useState(() => formFromProduct(product));
  const [files, setFiles] = useState([]);
  const [variantImageFiles, setVariantImageFiles] = useState({});
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const urlImages = useMemo(() => lines(form.imagesText), [form.imagesText]);
  const isCombo = form.productType === 'combo';
  const selectableProducts = useMemo(
    () =>
      catalogProducts.filter((entry) => {
        const id = String(entry._id || entry.id || '');
        return entry.productType !== 'combo' && id !== String(product?._id || product?.id || '');
      }),
    [catalogProducts, product]
  );

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!isCombo) return;

    let isMounted = true;
    api.get('/api/admin/products')
      .then((response) => {
        if (isMounted) setCatalogProducts(response.data.data.products || []);
      })
      .catch((error) => {
        if (isMounted) setLocalError(error.message || 'Unable to load products for combo');
      });

    return () => {
      isMounted = false;
    };
  }, [isCombo]);

  const setProductType = (productType) => {
    if (product) return;
    setForm((current) => ({ ...current, productType }));
    setLocalError('');
  };

  const setVariantFiles = (index, nextFiles) => {
    setVariantImageFiles((current) => ({
      ...current,
      [index]: nextFiles,
    }));
    setLocalError('');
  };

  const setVariant = (index, field, value) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, [field]: value } : variant
      ),
    }));
  };

  const addVariant = () => {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, blankVariant()],
    }));
  };

  const removeVariant = (index) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, itemIndex) => itemIndex !== index),
    }));
    setVariantImageFiles((current) =>
      Object.entries(current).reduce((next, [fileIndex, file]) => {
        const numericIndex = Number(fileIndex);
        if (numericIndex < index) next[numericIndex] = file;
        if (numericIndex > index) next[numericIndex - 1] = file;
        return next;
      }, {})
    );
  };

  const toggleAudienceTag = (tag) => {
    setForm((current) => {
      const currentTags = current.audienceTags || [];
      const nextTags = currentTags.includes(tag)
        ? currentTags.filter((item) => item !== tag)
        : [...currentTags, tag];

      return {
        ...current,
        audienceTags: nextTags.length ? nextTags : ['Unisex'],
      };
    });
  };

  const setComboItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      comboItems: current.comboItems.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextItem = { ...item, [field]: value };
        if (field === 'productId') nextItem.variantId = '';
        return nextItem;
      }),
    }));
  };

  const addComboItem = () => {
    setForm((current) => ({
      ...current,
      comboItems: [...current.comboItems, { productId: '', variantId: '', quantity: 1 }],
    }));
  };

  const removeComboItem = (index) => {
    setForm((current) => ({
      ...current,
      comboItems: current.comboItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const buildPayload = async () => {
    if (!form.name.trim()) throw new Error(isCombo ? 'Combo name is required' : 'Product name is required');
    if (!form.description.trim()) throw new Error('Description is required');
    if (urlImages.length + files.length > MAX_IMAGES) {
      throw new Error(`Maximum ${MAX_IMAGES} product images allowed`);
    }

    if (isCombo) {
      const comboItems = (form.comboItems || []).map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: Number(item.quantity || 1),
      }));

      if (!comboItems.length) throw new Error('Add at least one included product');
      if (comboItems.some((item) => !item.productId || !item.variantId || item.quantity < 1)) {
        throw new Error('Each included product needs product, size and quantity');
      }
      if (Number(form.comboMrp) <= 0 || Number(form.comboSellingPrice) <= 0) {
        throw new Error('MRP and selling price must be greater than zero');
      }
      if (Number(form.comboCostPrice || 0) < 0) {
        throw new Error('Cost price cannot be negative');
      }

      const uploadedImages = [];
      for (const file of files) {
        uploadedImages.push(await uploadImage(file));
      }

      return {
        productType: 'combo',
        name: form.name,
        slug: form.slug,
        audienceTags: form.audienceTags,
        status: form.status,
        featured: form.featured,
        featuredOrder: form.featuredOrder,
        shortDescription: form.shortDescription,
        description: form.description,
        images: [...urlImages.map((url) => ({ url })), ...uploadedImages],
        whatYouGet: form.whatYouGet,
        positioning: form.positioning,
        bestFor: csv(form.bestFor),
        mrp: Number(form.comboMrp),
        sellingPrice: Number(form.comboSellingPrice),
        costPrice: Number(form.comboCostPrice || 0),
        comboItems,
      };
    }

    const selectedVariants = form.variants
      .map(({ enabled, ...variant }) => ({
        ...variant,
        size: String(variant.size || '').trim(),
        sellingPrice: Number(variant.sellingPrice),
        mrp: Number(variant.mrp),
        costPrice: Number(variant.costPrice || 0),
        stock: Number(variant.stock || 0),
        sku:
          String(variant.sku || '').trim() ||
          generateSku(form.slug || form.name, variant.size),
      }));

    if (selectedVariants.length === 0) throw new Error('Add at least one variant');
    if (selectedVariants.some((variant) => !variant.size)) {
      throw new Error('Variant size label is required');
    }
    const normalizedSizes = selectedVariants.map((variant) => variant.size.toLowerCase());
    if (normalizedSizes.length !== new Set(normalizedSizes).size) {
      throw new Error('Duplicate variant sizes are not allowed');
    }
    if (selectedVariants.some((variant) => variant.sellingPrice <= 0 || variant.mrp <= 0)) {
      throw new Error('Selling price and MRP must be greater than zero');
    }
    if (selectedVariants.some((variant) => variant.stock < 0 || variant.costPrice < 0)) {
      throw new Error('Stock and cost price cannot be negative');
    }

    const variantsWithImages = [];
    for (const [index, variant] of selectedVariants.entries()) {
      const variantUrlImages = lines(form.variants[index]?.imagesText);
      const pendingFiles = variantImageFiles[index] || [];

      if (variantUrlImages.length + pendingFiles.length > MAX_IMAGES) {
        throw new Error(`Maximum ${MAX_IMAGES} images allowed per variant`);
      }

      const uploadedVariantImages = [];
      for (const file of pendingFiles) {
        uploadedVariantImages.push(await uploadImage(file));
      }

      const { imagesText, image, ...variantPayload } = variant;
      const legacyImageUrl = image?.url || image || '';
      variantsWithImages.push({
        ...variantPayload,
        image: legacyImageUrl && variantUrlImages.includes(legacyImageUrl) ? image : undefined,
        images: [...variantUrlImages.map((url) => ({ url })), ...uploadedVariantImages],
      });
    }

    return {
      productType: 'product',
      name: form.name,
      slug: form.slug,
      audienceTags: form.audienceTags,
      status: form.status,
      featured: form.featured,
      featuredOrder: form.featuredOrder,
      shortDescription: form.shortDescription,
      description: form.description,
      images: product ? urlImages.map((url) => ({ url })) : [],
      fragranceProfile: form.fragranceProfile,
      longevity: form.longevity,
      projection: form.projection,
      concentration: form.concentration,
      personality: form.personality,
      positioning: form.positioning,
      bestFor: csv(form.bestFor),
      bestSeason: csv(form.bestSeason),
      howToUse: form.howToUse,
      storagePrecautions: form.storagePrecautions,
      fragranceNotes: {
        top: csv(form.topNotes),
        heart: csv(form.heartNotes),
        base: csv(form.baseNotes),
      },
      variants: variantsWithImages,
      legalInformation: {
        ingredients: form.ingredients,
      },
    };
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setLocalError('');

    try {
      await onSubmit(await buildPayload());
    } catch (error) {
      setLocalError(error.message || 'Unable to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className='space-y-6'>
      {localError && <div className='rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{localError}</div>}

      {!product && (
        <section className='rounded border border-gray-200 bg-white p-5'>
          <div className='grid gap-3 sm:grid-cols-2'>
            {[
              ['product', 'ADD PRODUCT'],
              ['combo', 'ADD COMBO'],
            ].map(([value, label]) => (
              <button
                key={value}
                type='button'
                onClick={() => setProductType(value)}
                className={[
                  'rounded border px-4 py-3 text-sm font-semibold transition',
                  form.productType === value
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-black',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className='rounded border border-gray-200 bg-white p-5'>
        <h2 className='mb-4 font-semibold text-gray-950'>{isCombo ? 'Combo Details' : 'Product Details'}</h2>
        <div className='grid gap-4 md:grid-cols-2'>
          <Field label={isCombo ? 'Combo Name' : 'Name'} value={form.name} onChange={(value) => setField('name', value)} placeholder={isCombo ? 'Discovery Combo' : 'NOIR'} required />
          <Field label='Slug' value={form.slug} onChange={(value) => setField('slug', value)} placeholder='Auto-generated if blank' />
          <Select label='Status' value={form.status} onChange={(value) => setField('status', value)} options={['draft', 'published']} />
          <label className='flex cursor-pointer items-center gap-2 self-end text-sm font-medium text-gray-700'>
            <input
              type='checkbox'
              checked={Boolean(form.featured)}
              onChange={(event) => setField('featured', event.target.checked)}
            />
            Featured
          </label>
        </div>
        <div className='mt-4'>
          <div>
            <p className='mb-2 text-sm font-medium text-gray-700'>Audience Tags</p>
            <div className='flex flex-wrap gap-4 text-sm'>
              {audienceOptions.map((tag) => (
                <label key={tag} className='flex cursor-pointer items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={(form.audienceTags || []).includes(tag)}
                    onChange={() => toggleAudienceTag(tag)}
                  />
                  {tag}
                </label>
              ))}
            </div>
            <p className='mt-2 text-xs text-gray-400'>Example: select Men and Unisex for a fragrance that should appear in both audiences.</p>
          </div>
        </div>
        <div className='mt-4 grid gap-4'>
          <Field
            label='Short Description'
            value={form.shortDescription}
            onChange={(value) => setField('shortDescription', value)}
            placeholder='A bold, warm and sophisticated fragrance for evenings.'
          />
          <Textarea
            label='Description'
            value={form.description}
            onChange={(value) => setField('description', value)}
            placeholder='NOIR opens with bright citrus spice, settles into aromatic warmth, and finishes with a deep woody amber trail.'
            required
          />
          {isCombo && (
            <>
              <Textarea
                label='What You Get'
                value={form.whatYouGet}
                onChange={(value) => setField('whatYouGet', value)}
                placeholder={'VERTEX 10 ML x 1\nNOIR 10 ML x 1\nBLUE 10 ML x 1'}
              />
              <Field
                label='Best For / Positioning'
                helper='Simple customer-facing positioning. Separate multiple values with commas if needed.'
                value={form.bestFor}
                onChange={(value) => setField('bestFor', value)}
                placeholder='Gifting, Travel & Discovery'
              />
            </>
          )}
        </div>
      </section>

      {isCombo && (
        <section className='rounded border border-gray-200 bg-white p-5'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <h2 className='font-semibold text-gray-950'>Included Products</h2>
            <button
              type='button'
              onClick={addComboItem}
              className='rounded border border-gray-950 px-3 py-2 text-xs font-semibold text-gray-950 hover:bg-gray-950 hover:text-white'
            >
              + ADD ANOTHER PRODUCT
            </button>
          </div>
          <div className='space-y-3'>
            {form.comboItems.map((item, index) => {
              const selectedProduct = selectableProducts.find((entry) => String(entry._id || entry.id) === String(item.productId));
              const variants = selectedProduct?.variants || [];

              return (
                <div key={`combo-item-${index}`} className='grid gap-3 rounded border border-gray-200 p-4 md:grid-cols-[1.2fr_1fr_120px_auto] md:items-end'>
                  <label className='block text-sm'>
                    <span className='mb-1 block font-medium text-gray-700'>Select Product</span>
                    <select
                      value={item.productId}
                      onChange={(event) => setComboItem(index, 'productId', event.target.value)}
                      className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'
                    >
                      <option value=''>Choose product</option>
                      {selectableProducts.map((entry) => (
                        <option key={entry._id || entry.id} value={entry._id || entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className='block text-sm'>
                    <span className='mb-1 block font-medium text-gray-700'>Select Variant / Size</span>
                    <select
                      value={item.variantId}
                      onChange={(event) => setComboItem(index, 'variantId', event.target.value)}
                      className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'
                    >
                      <option value=''>Choose size</option>
                      {variants.map((variant) => (
                        <option key={variant.size} value={variant.size}>
                          {variant.size} ({variant.stock ?? 0} stock)
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label='Quantity'
                    type='number'
                    value={item.quantity}
                    onChange={(value) => setComboItem(index, 'quantity', value)}
                    placeholder='1'
                  />
                  {form.comboItems.length > 1 && (
                    <button
                      type='button'
                      onClick={() => removeComboItem(index)}
                      className='rounded border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50'
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {isCombo && (
        <section className='rounded border border-gray-200 bg-white p-5'>
          <h2 className='mb-4 font-semibold text-gray-950'>Pricing</h2>
          <div className='grid gap-4 md:grid-cols-3'>
            <Field label='MRP' type='number' value={form.comboMrp} onChange={(value) => setField('comboMrp', value)} placeholder='1999' />
            <Field label='Selling Price' type='number' value={form.comboSellingPrice} onChange={(value) => setField('comboSellingPrice', value)} placeholder='1499' />
            <Field label='Cost Price' type='number' value={form.comboCostPrice} onChange={(value) => setField('comboCostPrice', value)} placeholder='700' />
          </div>
          <p className='mt-2 text-xs text-gray-500'>Combo stock is derived from included variants. No manual stock is required.</p>
        </section>
      )}

      {isCombo && (
        <ImageManager
          title='Images'
          imagesText={form.imagesText}
          files={files}
          onImagesTextChange={(value) => setField('imagesText', value)}
          onFilesChange={setFiles}
          setLocalError={setLocalError}
          mainImageLabel='product'
        />
      )}

      {!isCombo && (
      <section className='rounded border border-gray-200 bg-white p-5'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <h2 className='font-semibold text-gray-950'>Variants</h2>
          <button
            type='button'
            onClick={addVariant}
            className='rounded border border-gray-950 px-3 py-2 text-xs font-semibold text-gray-950 hover:bg-gray-950 hover:text-white'
          >
            + ADD SIZE
          </button>
        </div>
        <div className='space-y-4'>
          {form.variants.map((variant, index) => (
            <div key={`variant-${index}`} className='rounded border border-gray-200 p-4'>
              <div className='mb-3 flex flex-wrap items-end justify-between gap-3'>
                <Field label='Size / Label' value={variant.size} onChange={(value) => setVariant(index, 'size', value)} placeholder='50 ML' />
                {form.variants.length > 1 && (
                  <button
                    type='button'
                    onClick={() => removeVariant(index)}
                    className='rounded border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50'
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className='grid gap-3 md:grid-cols-5'>
                <Field label='Selling Price' type='number' value={variant.sellingPrice} onChange={(value) => setVariant(index, 'sellingPrice', value)} placeholder='599' />
                <Field label='MRP' type='number' value={variant.mrp} onChange={(value) => setVariant(index, 'mrp', value)} placeholder='699' />
                <Field label='Cost Price' type='number' value={variant.costPrice} onChange={(value) => setVariant(index, 'costPrice', value)} placeholder='250' />
                <Field label='Stock' type='number' value={variant.stock} onChange={(value) => setVariant(index, 'stock', value)} placeholder='24' />
                <Field
                  label='SKU (Auto-generated)'
                  helper='Generated from product name/slug and size. You can still edit it manually.'
                  value={variant.sku || generateSku(form.slug || form.name, variant.size)}
                  onChange={(value) => setVariant(index, 'sku', value)}
                  placeholder='NOIR-50ML'
                />
              </div>
              <div className='mt-4'>
                <ImageManager
                  title='Variant Images'
                  imagesText={variant.imagesText || ''}
                  files={variantImageFiles[index] || []}
                  onImagesTextChange={(value) => setVariant(index, 'imagesText', value)}
                  onFilesChange={(nextFiles) => setVariantFiles(index, nextFiles)}
                  setLocalError={setLocalError}
                  mainImageLabel='variant'
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {!isCombo && (
      <section className='rounded border border-gray-200 bg-white p-5'>
        <h2 className='mb-4 font-semibold text-gray-950'>Perfume Attributes</h2>
        <div className='grid gap-4 md:grid-cols-2'>
          <Field
            label='Fragrance Profile'
            helper='Overall fragrance style — e.g. Woody, Spicy, Warm'
            value={form.fragranceProfile}
            onChange={(value) => setField('fragranceProfile', value)}
            placeholder='Woody, Spicy, Warm'
          />
          <Field
            label='Personality'
            helper='Mood or character of the fragrance — e.g. Bold, Confident, Sophisticated'
            value={form.personality}
            onChange={(value) => setField('personality', value)}
            placeholder='Bold, Confident, Sophisticated'
          />
          <Field
            label='Concentration'
            helper='Structured value such as 25% fragrance oil'
            value={form.concentration}
            onChange={(value) => setField('concentration', value)}
            placeholder='25% fragrance oil'
          />
          <Field
            label='Longevity'
            helper='Merchandising guidance, not a guaranteed lab claim'
            value={form.longevity}
            onChange={(value) => setField('longevity', value)}
            placeholder='8-10 hours'
          />
          <Field
            label='Projection'
            helper='Merchandising guidance, not a guaranteed lab claim'
            value={form.projection}
            onChange={(value) => setField('projection', value)}
            placeholder='Moderate to strong'
          />
          <Field
            label='Positioning'
            helper='How the perfume is positioned — e.g. Premium evening fragrance'
            value={form.positioning}
            onChange={(value) => setField('positioning', value)}
            placeholder='Premium evening fragrance'
          />
          <Field
            label='Best For'
            helper='Best occasions to wear it — separate multiple values with commas'
            value={form.bestFor}
            onChange={(value) => setField('bestFor', value)}
            placeholder='Date Night, Parties, Evening'
          />
          <Field
            label='Best Season'
            helper='Seasons where this fragrance works best'
            value={form.bestSeason}
            onChange={(value) => setField('bestSeason', value)}
            placeholder='Winter, Autumn, Monsoon'
          />
          <Field
            label='Top Notes'
            helper='First notes you smell after applying the perfume'
            value={form.topNotes}
            onChange={(value) => setField('topNotes', value)}
            placeholder='Bergamot, Lemon, Black Pepper'
          />
          <Field
            label='Heart Notes'
            helper='Main fragrance notes that appear after the top notes'
            value={form.heartNotes}
            onChange={(value) => setField('heartNotes', value)}
            placeholder='Lavender, Rose, Cedarwood'
          />
          <Field
            label='Base Notes'
            helper='Deep, long-lasting notes that remain at the end'
            value={form.baseNotes}
            onChange={(value) => setField('baseNotes', value)}
            placeholder='Musk, Amber, Vanilla, Sandalwood'
          />
        </div>
        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <Textarea
            label='How to Use'
            value={form.howToUse}
            onChange={(value) => setField('howToUse', value)}
            placeholder='Apply lightly to pulse points such as wrists, neck and behind the ears. Avoid rubbing after application.'
          />
          <Textarea
            label='Storage & Precautions'
            value={form.storagePrecautions}
            onChange={(value) => setField('storagePrecautions', value)}
            placeholder='For external use only. Avoid contact with eyes and broken skin. Keep away from heat, sparks and open flame. Store in a cool, dry place away from direct sunlight.'
          />
        </div>
      </section>
      )}

      <section className='rounded border border-gray-200 bg-white p-5'>
        <h2 className='mb-4 font-semibold text-gray-950'>Product Information / Legal</h2>
        <div className='grid gap-4 md:grid-cols-2'>
          <Textarea
            label='Ingredients'
            value={form.ingredients}
            onChange={(value) => setField('ingredients', value)}
            placeholder='Alcohol Denatured, Perfume, Aqua, Iso E Super, Octyl Methoxycinnamate, Linalool'
          />
        </div>
      </section>

      <button type='submit' disabled={saving} className='rounded bg-black px-5 py-3 font-semibold text-white disabled:opacity-50'>
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}

function ImagePreviewCard({
  src,
  index,
  isMain,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onRemove,
}) {
  return (
    <div className='overflow-hidden rounded border border-gray-200 bg-white'>
      <div className='relative aspect-square bg-gray-50'>
        <img
          src={src}
          alt={`Product image ${index + 1}`}
          className='h-full w-full object-contain'
        />

        <div className='absolute left-2 top-2 flex items-center gap-1'>
          <span className='rounded bg-black/80 px-2 py-1 text-[10px] font-semibold text-white'>
            {index + 1}
          </span>
          {isMain && (
            <span className='rounded bg-white px-2 py-1 text-[10px] font-semibold text-gray-900 shadow-sm'>
              MAIN
            </span>
          )}
        </div>
      </div>

      <div className='grid grid-cols-3 border-t border-gray-200'>
        <button
          type='button'
          onClick={onMoveLeft}
          disabled={!canMoveLeft}
          className='flex h-9 items-center justify-center border-r border-gray-200 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white'
          title='Move left'
          aria-label='Move image left'
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type='button'
          onClick={onRemove}
          className='flex h-9 items-center justify-center border-r border-gray-200 text-red-600 hover:bg-red-50'
          title='Remove image'
          aria-label='Remove image'
        >
          <Trash2 size={15} />
        </button>

        <button
          type='button'
          onClick={onMoveRight}
          disabled={!canMoveRight}
          className='flex h-9 items-center justify-center text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white'
          title='Move right'
          aria-label='Move image right'
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
  helper = '',
}) {
  return (
    <label className='block text-sm'>
      <span className='block font-medium text-gray-700'>{label}</span>

      {helper && (
        <span className='mb-1.5 mt-0.5 block text-xs leading-4 text-gray-400'>
          {helper}
        </span>
      )}

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onWheel={(event) => {
          if (type === 'number') {
            event.currentTarget.blur();
          }
        }}
        required={required}
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

function Textarea({ label, value, onChange, required = false, placeholder = '' }) {
  return (
    <label className='block text-sm'>
      <span className='mb-1 block font-medium text-gray-700'>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        rows={4}
        className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className='block text-sm'>
      <span className='mb-1 block font-medium text-gray-700'>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'>
        {options.map((option) => (
          <option key={option || 'none'} value={option}>{option || 'None'}</option>
        ))}
      </select>
    </label>
  );
}
