'use client';

import React, { useState, useContext, useEffect } from 'react';
import { assets } from '@/assets/assets';
import axios from 'axios';
import { NotificationContext } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';

const Add = () => {
  // ===== IMAGE STATES =====
  const [images, setImages] = useState([false, false, false, false, false, false]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // ===== PRODUCT BASIC INFO =====
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [sku, setSku] = useState("");

  // ===== VARIANT SYSTEM (REQUIRED) =====
  const [variants, setVariants] = useState([]);
  const [variantInput, setVariantInput] = useState({
    weight: "",
    sellingPrice: "",
    costPrice: "",
    originalPrice: "",
    stockQty: 0
  });

  // ===== PRODUCT ATTRIBUTES =====
  const [bestseller, setBestseller] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [tags, setTags] = useState("");
  const [draft, setDraft] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState(null);
  const [token, setToken] = useState(null);

  // ===== CONTEXT & CONSTANTS =====
  const { success, error: showError } = useContext(NotificationContext);
  const router = useRouter();
  const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB per image
  const MAX_TOTAL_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB combined
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // ===== COLORS =====
  const COLOR_PRIMARY = '#2F6B3F';
  const COLOR_ACCENT = '#D6524A';
  const COLOR_BORDER = '#E6E1D8';
  const COLOR_LIGHT_BG = '#F8F6F2';
  const COLOR_GRAY_BG = '#FAFAF8';

  const predefinedCategories = [
    "Atta",
    "Grains",
    "Millets",
    "Pulses",
    "Healthy Flours",
    "Organic",
    "Diet"
  ];

  // Get token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
    } else {
      setToken(storedToken);
    }
  }, [router]);

  // Drag and drop handlers for image reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedImage);
    setImages(newImages);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleImageUpload = (index, file) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      showError(`Please upload images under 3MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      return;
    }
    const newImages = [...images];
    newImages[index] = file;
    setImages(newImages);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages[index] = false;
    setImages(newImages);
  };

  // ===== CATEGORY HANDLERS =====
  const toggleCategory = (category) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  // ===== VARIANT MANAGEMENT =====
  const addVariant = () => {
    const trimmedWeight = variantInput.weight.trim();
    
    // Validation
    if (!trimmedWeight) {
      showError('Weight/Size is required');
      return;
    }
    
    if (!variantInput.sellingPrice || Number(variantInput.sellingPrice) <= 0) {
      showError('Selling Price must be greater than 0');
      return;
    }
    
    if (typeof variantInput.costPrice !== 'string' || variantInput.costPrice === '' || Number(variantInput.costPrice) < 0) {
      showError('Making Price must be greater than or equal to 0');
      return;
    }
    
    // Check for duplicate weight (case-insensitive)
    const weightExists = variants.some(
      (v) => v.weight.trim().toLowerCase() === trimmedWeight.toLowerCase()
    );
    
    if (weightExists) {
      showError('A variant with this weight already exists');
      return;
    }
    
    // Add variant
    const newVariant = {
      weight: trimmedWeight,
      sellingPrice: Number(variantInput.sellingPrice),
      costPrice: Number(variantInput.costPrice),
      originalPrice: variantInput.originalPrice ? Number(variantInput.originalPrice) : null,
      stockQty: Number(variantInput.stockQty) || 0
    };
    
    setVariants([...variants, newVariant]);
    setVariantInput({
      weight: "",
      sellingPrice: "",
      costPrice: "",
      originalPrice: "",
      stockQty: 0
    });
  };

  const removeVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // ===== FORM SUBMISSION =====
  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // Validation
    if (!name || !description) {
      showError('Please fill all required fields (name, description)');
      return;
    }

    if (categories.length === 0) {
      showError('Please select at least one category');
      return;
    }

    if (variants.length === 0) {
      showError('Please add at least one variant');
      return;
    }

    // Check total image size
    const files = images.filter(Boolean);
    if (files.length === 0) {
      showError('Please upload at least one image');
      return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_IMAGE_SIZE) {
      showError('Total image size is too large. Please keep all images under 4MB combined.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();

      // Add basic product info
      formData.append("name", name);
      formData.append("description", description);
      formData.append("categories", JSON.stringify(categories));
      if (sku.trim()) {
        formData.append("sku", sku.trim());
      }
      formData.append("bestseller", bestseller);
      formData.append("featured", featured);
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      formData.append("tags", JSON.stringify(tagArray));
      formData.append("draft", draft);
      formData.append("variants", JSON.stringify(variants));

      // Add images in the selected order
      images.forEach((img, index) => {
        if (img) formData.append(`image${index + 1}`, img);
      });

      const response = await axios.post(
        `${backendUrl}/api/product/add`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        success('Product added successfully');
        setLastAddedProduct({
          name,
          description,
          categories: categories
        });
        resetForm();
      } else {
        showError(response.data.message || 'Unable to add product');
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Unable to add product. Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== ADD PRODUCT MULTIPLE TIMES =====
  const addProductMultipleTimes = async (count) => {
    // Validation
    if (!name || !description) {
      showError('Please fill all required fields (name, description)');
      return;
    }

    if (categories.length === 0) {
      showError('Please select at least one category');
      return;
    }

    // If no variants, create default test variants with proper margins
    let variantsToUse = variants.length > 0 ? variants : [
      {
        weight: '500g',
        sellingPrice: 249,
        costPrice: 150,
        originalPrice: null,
        stockQty: 20
      },
      {
        weight: '1kg',
        sellingPrice: 449,
        costPrice: 280,
        originalPrice: null,
        stockQty: 15
      }
    ];

    if (variantsToUse.length === 0) {
      showError('Please add at least one variant');
      return;
    }

    // Check total image size
    const files = images.filter(Boolean);
    if (files.length === 0) {
      showError('Please upload at least one image');
      return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_IMAGE_SIZE) {
      showError('Total image size is too large. Please keep all images under 4MB combined.');
      return;
    }
    
    setIsLoading(true);
    let successCount = 0;
    let failureCount = 0;

    try {
      for (let i = 0; i < count; i++) {
        const formData = new FormData();

        // Add basic product info
        formData.append("name", name);
        formData.append("description", description);
        formData.append("categories", JSON.stringify(categories));
        if (sku.trim()) {
          formData.append("sku", sku.trim());
        }
        formData.append("bestseller", bestseller);
        formData.append("featured", featured);
        const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        formData.append("tags", JSON.stringify(tagArray));
        formData.append("draft", draft);
        formData.append("variants", JSON.stringify(variantsToUse));

        // Add images in the selected order
        images.forEach((img, index) => {
          if (img) formData.append(`image${index + 1}`, img);
        });

        try {
          const response = await axios.post(
            `${backendUrl}/api/product/add`,
            formData,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (response.data.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          failureCount++;
        }
      }

      if (successCount > 0) {
        const variantMsg = variants.length === 0 ? ' (with default test variants showing discounts)' : '';
        success(`Successfully added ${successCount} product${successCount !== 1 ? 's' : ''}${variantMsg}`);
        if (failureCount > 0) {
          showError(`Failed to add ${failureCount} product${failureCount !== 1 ? 's' : ''}`);
        }
        setLastAddedProduct({
          name,
          description,
          categories: categories
        });
        resetForm();
      } else {
        showError('Unable to add products. Please try again');
      }
    } catch (error) {
      showError('Error adding multiple products. Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== FORM RESET =====
  const resetForm = (keepProductDetails = false) => {
    setImages([false, false, false, false]);
    setVariants([]);
    setVariantInput({
      weight: "",
      sellingPrice: "",
      costPrice: "",
      originalPrice: "",
      stockQty: 0
    });
    
    if (!keepProductDetails) {
      setName('');
      setDescription('');
      setCategories([]);
      setSku('');
      setBestseller(false);
      setFeatured(false);
      setTags('');
      setDraft(false);
      setLastAddedProduct(null);
    }
  };

  // ===== ADD ANOTHER SAME PRODUCT =====
  const addAnother = () => {
    resetForm(true);
  };

  // Calculate discount percentage
  const calculateDiscount = (selling, original) => {
    if (!original || original === 0) return 0;
    return Math.round(((original - selling) / original) * 100);
  };

  if (!token) {
    return null;
  }

  return (
    <div className='min-h-screen p-8' style={{ backgroundColor: '#F5F5F5' }}>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold mb-8' style={{ color: COLOR_PRIMARY }}>Add New Product</h1>

        <form onSubmit={onSubmitHandler} className='space-y-6'>

          {/* ===== IMAGE UPLOAD ===== */}
          <div className='bg-white rounded-lg p-6 border' style={{ borderColor: COLOR_BORDER }}>
            <h2 className='text-xl font-bold mb-6' style={{ color: COLOR_PRIMARY }}>Product Images</h2>
            <p className='text-sm mb-4' style={{ color: '#666' }}>Drag to reorder images. Click to upload new image.</p>
            
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
              {images.map((img, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative cursor-move group transition-all ${draggedIndex === index ? 'opacity-50' : ''}`}
                >
                  <label className='block relative cursor-pointer'>
                    <div className='w-full aspect-square border-2 rounded-lg flex items-center justify-center overflow-hidden transition-all' 
                         style={{ borderColor: COLOR_BORDER, borderStyle: 'dashed' }}>
                      {img ? (
                        <>
                          <img src={URL.createObjectURL(img)} alt={`Product ${index + 1}`} className='w-full h-full object-cover' />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              removeImage(index);
                            }}
                            className='absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                            style={{ fontSize: '12px', fontWeight: 'bold' }}
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <img src={assets.upload_area} alt="Upload" className='w-12 h-12' />
                      )}
                    </div>
                    <input 
                      key={img ? `img-${index}-${Math.random()}` : `empty-${index}`}
                      type="file" 
                      accept='image/*'
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(index, file);
                          // Reset input value so same file can be selected again
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* ===== BASIC INFORMATION ===== */}
          <div className='bg-white rounded-lg p-6 border' style={{ borderColor: COLOR_BORDER }}>
            <h2 className='text-xl font-bold mb-6' style={{ color: COLOR_PRIMARY }}>Basic Information</h2>
            
            <div className='space-y-5'>
              {/* Product Name */}
              <div>
                <label className='block text-sm font-semibold mb-2' style={{ color: '#1A1A1A' }}>Product Name *</label>
                <input 
                  onChange={(e) => setName(e.target.value)} 
                  value={name} 
                  className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all' 
                  style={{ borderColor: COLOR_BORDER, '--tw-ring-color': COLOR_PRIMARY }}
                  type="text" 
                  placeholder='e.g., Fresh Tomatoes' 
                  required 
                />
              </div>

              {/* Description */}
              <div>
                <label className='block text-sm font-semibold mb-2' style={{ color: '#1A1A1A' }}>Product Description *</label>
                <textarea 
                  onChange={(e) => setDescription(e.target.value)} 
                  value={description} 
                  className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none' 
                  style={{ borderColor: COLOR_BORDER, '--tw-ring-color': COLOR_PRIMARY }}
                  placeholder='Describe your product features, benefits, and details...' 
                  rows="5"
                  required 
                />
              </div>
            </div>
          </div>

          {/* ===== CATEGORIES & SKU ===== */}
          <div className='bg-white rounded-lg p-6 border' style={{ borderColor: COLOR_BORDER }}>
            <h2 className='text-xl font-bold mb-6' style={{ color: COLOR_PRIMARY }}>Categories & SKU</h2>
            
            {/* Categories Multi-Select Checkboxes */}
            <div className='mb-8'>
              <label className='block text-sm font-semibold mb-4' style={{ color: '#1A1A1A' }}>Categories * (Select at least one)</label>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
                {predefinedCategories.map((cat) => (
                  <div key={cat} className='flex items-center gap-3'>
                    <input 
                      type="checkbox"
                      id={cat}
                      checked={categories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className='w-4 h-4 cursor-pointer rounded'
                      style={{ accentColor: COLOR_PRIMARY }}
                    />
                    <label htmlFor={cat} className='cursor-pointer text-sm' style={{ color: '#1A1A1A' }}>
                      {cat}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* SKU Field */}
            <div>
              <label className='block text-sm font-semibold mb-2' style={{ color: '#1A1A1A' }}>SKU (Optional)</label>
              <input 
                onChange={(e) => setSku(e.target.value)} 
                value={sku} 
                className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all' 
                style={{ borderColor: COLOR_BORDER, '--tw-ring-color': COLOR_PRIMARY }}
                type="text" 
                placeholder='e.g., PROD001 (Leave empty for auto-generation)' 
              />
              <p className='text-xs mt-2' style={{ color: '#999' }}>If empty, SKU will be auto-generated from product name + timestamp</p>
            </div>

            {/* Featured Toggle */}
            <div className='flex gap-3 items-center mt-4'>
              <label className='flex gap-2 items-center cursor-pointer'>
                <input 
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  type='checkbox'
                  className='w-4 h-4 rounded'
                  style={{ accentColor: COLOR_PRIMARY }}
                />
                <span className='text-sm font-semibold' style={{ color: '#1A1A1A' }}>Mark as Featured Product</span>
              </label>
            </div>

            {/* Draft Toggle */}
            <div className='flex gap-3 items-center mt-2'>
              <label className='flex gap-2 items-center cursor-pointer'>
                <input 
                  checked={draft}
                  onChange={(e) => setDraft(e.target.checked)}
                  type='checkbox'
                  className='w-4 h-4 rounded'
                  style={{ accentColor: COLOR_PRIMARY }}
                />
                <span className='text-sm font-semibold' style={{ color: '#1A1A1A' }}>Save as Draft</span>
              </label>
              <span className='text-xs px-2 py-1 rounded' style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}>Draft products won't be visible on frontend</span>
            </div>

            {/* Tags Input */}
            <div className='mt-4'>
              <label className='block text-sm font-semibold mb-2' style={{ color: '#1A1A1A' }}>Tags</label>
              <input 
                onChange={(e) => setTags(e.target.value)} 
                value={tags} 
                className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all' 
                style={{ borderColor: COLOR_BORDER, '--tw-ring-color': COLOR_PRIMARY }}
                type="text" 
                placeholder='e.g., organic, bestseller, sale (comma separated)' 
              />
              <p className='text-xs mt-2' style={{ color: '#999' }}>Enter tags separated by commas. Tags help with filtering and search.</p>
            </div>
          </div>

          {/* ===== PRODUCT VARIANTS (REQUIRED) ===== */}
          <div className='bg-white rounded-lg p-6 border' style={{ borderColor: COLOR_BORDER }}>
            <h2 className='text-xl font-bold mb-2' style={{ color: COLOR_PRIMARY }}>Product Variants *</h2>
            <p className='text-sm mb-6' style={{ color: '#666' }}>Add at least one variant with weight, selling price, and making price.</p>
            
            {/* Variant Input Form */}
            <div className='p-4 rounded-lg mb-6 space-y-4' style={{ backgroundColor: COLOR_GRAY_BG }}>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {/* Weight */}
                <div>
                  <label className='block text-xs font-semibold mb-2' style={{ color: '#666' }}>Weight/Size *</label>
                  <input 
                    value={variantInput.weight}
                    onChange={(e) => setVariantInput({...variantInput, weight: e.target.value})}
                    placeholder='e.g., 200g, 500ml, 1kg'
                    className='w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 transition-all'
                    style={{ borderColor: COLOR_BORDER, '--tw-ring-color': COLOR_PRIMARY }}
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className='block text-xs font-semibold mb-2' style={{ color: '#666' }}>Selling Price (₹) *</label>
                  <input 
                    value={variantInput.sellingPrice}
                    onChange={(e) => setVariantInput({...variantInput, sellingPrice: e.target.value})}
                    placeholder='e.g., 249'
                    type='number'
                    step='1'
                    min='0'
                    className='w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 transition-all'
                    style={{ borderColor: COLOR_BORDER, '--tw-ring-color': COLOR_PRIMARY }}
                  />
                </div>

                {/* Making Price (Production/Manufacturing Cost) */}
                <div>
                  <label className='block text-xs font-semibold mb-2' style={{ color: '#666' }}>
                    Making Price (₹) 
                    <span style={{ color: '#D6524A', marginLeft: '4px' }}>— Your production cost, for calculating discount & profit</span>
                  </label>
                  <input 
                    value={variantInput.costPrice}
                    onChange={(e) => setVariantInput({...variantInput, costPrice: e.target.value})}
                    placeholder='e.g., 150 - What it costs you to make/source this product'
                    type='number'
                    step='1'
                    min='0'
                    className='w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 transition-all'
                    style={{ borderColor: COLOR_BORDER, '--tw-ring-color': COLOR_PRIMARY }}
                  />
                </div>

                {/* Original Price (For Discount Calculation) */}
                <div>
                  <label className='block text-xs font-semibold mb-2' style={{ color: '#666' }}>
                    Original Price (₹) 
                    <span style={{ color: '#2F6B3F', marginLeft: '4px' }}>— For showing discount %</span>
                  </label>
                  <input 
                    value={variantInput.originalPrice}
                    onChange={(e) => setVariantInput({...variantInput, originalPrice: e.target.value})}
                    placeholder='e.g., 349 - Leave empty for no discount'
                    type='number'
                    step='1'
                    min='0'
                    className='w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 transition-all'
                    style={{ borderColor: COLOR_BORDER, '--tw-ring-color': COLOR_PRIMARY }}
                  />
                  <p className='text-xs mt-1' style={{ color: '#999' }}>
                    Set a higher price to show discount. E.g., Selling: 249, Original: 349 = 29% off
                  </p>
                </div>
              </div>

              {/* Stock Quantity */}
              <div>
                <label className='block text-xs font-semibold mb-2' style={{ color: '#666' }}>Stock Quantity *</label>
                <input 
                  value={variantInput.stockQty}
                  onChange={(e) => setVariantInput({...variantInput, stockQty: e.target.value})}
                  type='number'
                  min='0'
                  placeholder='e.g., 10'
                  className='w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 transition-all'
                  style={{ borderColor: COLOR_BORDER, '--tw-ring-color': COLOR_PRIMARY }}
                />
              </div>

              {/* Add Variant Button */}
              <button 
                type="button"
                onClick={addVariant}
                className='w-full px-4 py-2 text-white rounded font-semibold hover:opacity-90 transition-opacity text-sm'
                style={{ backgroundColor: COLOR_PRIMARY }}
              >
                + Add Variant
              </button>
            </div>

            {/* Display added variants */}
            {variants.length > 0 && (
              <div className='space-y-3 mb-6'>
                <p className='text-sm font-semibold' style={{ color: COLOR_PRIMARY }}>Added Variants ({variants.length})</p>
                {variants.map((variant, idx) => {
                  const discount = calculateDiscount(variant.sellingPrice, variant.originalPrice);
                  
                  return (
                    <div key={idx} className='flex items-center justify-between p-4 rounded border' style={{ backgroundColor: COLOR_LIGHT_BG, borderColor: COLOR_BORDER }}>
                      <div className='flex-1'>
                        <div className='flex gap-3 items-center mb-2'>
                          <span className='font-semibold text-sm' style={{ color: '#1A1A1A' }}>{variant.weight}</span>
                          <span className='text-xs px-2 py-1 rounded font-semibold' style={{ backgroundColor: variant.stockQty > 0 ? '#E8F5E9' : '#FFEBEE', color: variant.stockQty > 0 ? COLOR_PRIMARY : COLOR_ACCENT }}>
                            {variant.stockQty > 0 ? 'In Stock' : 'Out of Stock'}
                          </span>
                          {variant.originalPrice && calculateDiscount(variant.sellingPrice, variant.originalPrice) > 0 && (
                            <span className='text-xs px-2 py-1 rounded font-bold text-white' style={{ backgroundColor: COLOR_ACCENT }}>
                              -{calculateDiscount(variant.sellingPrice, variant.originalPrice)}%
                            </span>
                          )}
                        </div>
                        <div className='text-xs space-y-1' style={{ color: '#666' }}>
                          <div>
                            Selling: <span className='font-semibold text-sm' style={{ color: COLOR_PRIMARY }}>₹{variant.sellingPrice}</span>
                            {variant.originalPrice && (
                              <>
                                <span className='mx-2' style={{ color: '#999' }}>→</span>
                                Original: <span className='line-through' style={{ color: '#999' }}>₹{variant.originalPrice}</span>
                              </>
                            )}
                          </div>
                          <div>Making: <span className='font-semibold'>₹{variant.costPrice}</span> | Stock: {variant.stockQty}</div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className='text-2xl font-bold hover:opacity-70 transition-opacity ml-4' 
                        style={{ color: COLOR_ACCENT }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Validation message */}
            {variants.length === 0 && (
              <p className='text-sm' style={{ color: COLOR_ACCENT }}>* At least one variant is required</p>
            )}
          </div>

          {/* ===== PRODUCT ATTRIBUTES ===== */}
          <div className='bg-white rounded-lg p-6 border' style={{ borderColor: COLOR_BORDER }}>
            <h2 className='text-xl font-bold mb-6' style={{ color: COLOR_PRIMARY }}>Product Attributes</h2>
            
            {/* Bestseller checkbox */}
            <div className='flex gap-3 items-center'>
              <input 
                onChange={() => setBestseller(prev => !prev)} 
                checked={bestseller} 
                type="checkbox" 
                id='bestseller' 
                className='w-5 h-5 cursor-pointer'
                style={{ accentColor: COLOR_PRIMARY }}
              />
              <label className='cursor-pointer font-semibold' style={{ color: '#1A1A1A' }} htmlFor="bestseller">Add to Bestseller</label>
            </div>
          </div>

          {/* ===== ACTION BUTTONS ===== */}
          <div className='flex flex-wrap gap-3 pt-4'>
            <button 
              type="submit"
              disabled={isLoading}
              className='px-10 py-3 text-white font-bold rounded-lg transition-opacity text-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
              style={{ backgroundColor: COLOR_PRIMARY }}
            >
              {isLoading ? (
                <>
                  <div className='w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin'></div>
                  <span>Adding...</span>
                </>
              ) : (
                'Add Product'
              )}
            </button>
            
            <button 
              type="button"
              onClick={() => addProductMultipleTimes(5)}
              disabled={isLoading}
              className='px-10 py-3 text-white font-bold rounded-lg transition-opacity text-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
              style={{ backgroundColor: '#E67E22' }}
              title={variants.length > 0 ? "Add 5 copies with your variants" : "Add 5 copies with default test variants (500g @ ₹249, 1kg @ ₹449) showing discounts"}
            >
              {isLoading ? (
                <>
                  <div className='w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin'></div>
                  <span>Adding...</span>
                </>
              ) : (
                '⚡ Add 5 Test Products'
              )}
            </button>
            
            {lastAddedProduct && (
              <button 
                type="button"
                onClick={addAnother}
                disabled={isLoading}
                className='px-10 py-3 text-white font-bold rounded-lg transition-opacity text-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
                style={{ backgroundColor: COLOR_ACCENT }}
                title="Add another product with the same details but different variants/images"
              >
                + Add Another
              </button>
            )}
            
            <button 
              type="reset"
              disabled={isLoading}
              onClick={() => resetForm(false)}
              className='px-10 py-3 font-bold rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
              style={{ borderColor: COLOR_BORDER, color: '#666' }}
            >
              Clear All
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Add;
