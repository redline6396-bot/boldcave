'use client';

import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { NotificationContext } from '@/context/NotificationContext';
import { useParams, useRouter } from 'next/navigation';

const Edit = () => {
  const params = useParams();
  const productId = params?.id;
  const [token, setToken] = useState(null);
  const router = useRouter();
  
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categories: [],
    sku: '',
    variants: [],
    bestseller: false,
    featured: false,
    tags: ''
  });

  const { error: showError, success } = useContext(NotificationContext);
  const COLOR_PRIMARY = '#2F6B3F';

  const predefinedCategories = [
    "Atta",
    "Grains",
    "Millets",
    "Pulses",
    "Healthy Flours",
    "Organic",
    "Diet"
  ];

  const toggleCategory = (category) => {
    if (formData.categories.includes(category)) {
      setFormData({
        ...formData,
        categories: formData.categories.filter(c => c !== category)
      });
    } else {
      setFormData({
        ...formData,
        categories: [...formData.categories, category]
      });
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId || !token) return;

      try {
        setIsLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const response = await axios.get(`${backendUrl}/api/product/single?id=${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const prod = response.data.product;
          setProduct(prod);
          setFormData({
            name: prod.name,
            description: prod.description,
            categories: prod.categories || [],
            sku: prod.sku || '',
            variants: prod.variants || [],
            bestseller: prod.bestseller || false,
            featured: prod.featured || false,
            tags: prod.tags?.join(', ') || ''
          });
        } else {
          showError('Product not found');
          router.push('/list');
        }
      } catch (error) {
        showError('Failed to fetch product');
        router.push('/list');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!productId || !token) {
      showError('Product ID or token is missing');
      return;
    }

    setIsSaving(true);
    
    try {
      const submitData = {
        name: formData.name,
        description: formData.description,
        categories: formData.categories,
        sku: formData.sku,
        variants: formData.variants,
        bestseller: formData.bestseller,
        featured: formData.featured,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.put(
        `${backendUrl}/api/product/update/${productId}`,
        submitData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        success('Product updated successfully');
        setTimeout(() => router.push('/list'), 1000);
      } else {
        showError(response.data.message || 'Failed to update product');
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className='p-8 text-center'>Loading product...</div>;
  }

  if (!product) {
    return <div className='p-8 text-center'>Product not found</div>;
  }

  return (
    <div className='min-h-screen p-8' style={{ backgroundColor: '#F5F5F5' }}>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold mb-8' style={{ color: COLOR_PRIMARY }}>Edit Product</h1>

        <form onSubmit={handleSubmit} className='space-y-6'>

          {/* BASIC INFORMATION */}
          <div className='bg-white rounded-lg p-6 border'>
            <h2 className='text-xl font-bold mb-6' style={{ color: COLOR_PRIMARY }}>Basic Information</h2>
            
            <div className='space-y-5'>
              <div>
                <label className='block text-sm font-semibold mb-2'>Product Name</label>
                <input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className='w-full px-4 py-3 border rounded-lg focus:outline-none'
                  type="text"
                  required 
                />
              </div>

              <div>
                <label className='block text-sm font-semibold mb-2'>Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className='w-full px-4 py-3 border rounded-lg focus:outline-none resize-none'
                  rows="5"
                  required 
                />
              </div>
            </div>
          </div>

          {/* CATEGORIES */}
          <div className='bg-white rounded-lg p-6 border'>
            <h2 className='text-xl font-bold mb-6' style={{ color: COLOR_PRIMARY }}>Categories</h2>
            
            <div>
              <label className='block text-sm font-semibold mb-4'>Select Categories * (at least one)</label>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
                {predefinedCategories.map((cat) => (
                  <div key={cat} className='flex items-center gap-3'>
                    <input 
                      type="checkbox"
                      id={cat}
                      checked={formData.categories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className='w-4 h-4 cursor-pointer rounded'
                      style={{ accentColor: COLOR_PRIMARY }}
                    />
                    <label htmlFor={cat} className='cursor-pointer text-sm'>{cat}</label>
                  </div>
                ))}
              </div>
              {formData.categories.length > 0 && (
                <div className='mt-4'>
                  <p className='text-sm font-semibold mb-2'>Selected: {formData.categories.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* VARIANTS */}
          <div className='bg-white rounded-lg p-6 border'>
            <h2 className='text-xl font-bold mb-6' style={{ color: COLOR_PRIMARY }}>Variants</h2>
            
            <div className='space-y-3'>
              {formData.variants.map((variant, idx) => (
                <div key={idx} className='p-4 rounded border' style={{ backgroundColor: '#F8F6F2' }}>
                  <div className='font-semibold'>{variant.weight}</div>
                  <div className='text-sm' style={{ color: '#666' }}>
                    Selling: ₹{variant.sellingPrice} | Making: ₹{variant.costPrice} | Stock: {variant.stockQty}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ATTRIBUTES */}
          <div className='bg-white rounded-lg p-6 border'>
            <h2 className='text-xl font-bold mb-6' style={{ color: COLOR_PRIMARY }}>Attributes</h2>
            
            <div className='space-y-4'>
              <div className='flex gap-3'>
                <input 
                  checked={formData.bestseller}
                  onChange={(e) => setFormData({...formData, bestseller: e.target.checked})}
                  type='checkbox'
                  id='bestseller'
                  className='w-4 h-4'
                />
                <label className='text-sm font-semibold cursor-pointer' htmlFor='bestseller'>Add to Bestseller</label>
              </div>

              <div className='flex gap-3'>
                <input 
                  checked={formData.featured}
                  onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                  type='checkbox'
                  id='featured'
                  className='w-4 h-4'
                />
                <label className='text-sm font-semibold cursor-pointer' htmlFor='featured'>Mark as Featured</label>
              </div>
            </div>

            <div className='mt-4'>
              <label className='block text-sm font-semibold mb-2'>Tags</label>
              <input 
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className='w-full px-4 py-3 border rounded-lg focus:outline-none'
                type="text"
                placeholder='comma separated'
              />
            </div>
          </div>

          {/* BUTTONS */}
          <div className='flex gap-3'>
            <button 
              type='submit'
              disabled={isSaving}
              className='px-10 py-3 text-white font-bold rounded-lg'
              style={{ backgroundColor: COLOR_PRIMARY }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Edit;
