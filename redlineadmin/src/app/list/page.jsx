'use client';

import React from 'react'
import axios from 'axios'
import { NotificationContext } from '@/context/NotificationContext'
import { useState, useEffect, useContext } from 'react'
import { Trash2, ChevronDown, ChevronUp, Edit2, Lock } from 'lucide-react'
import Link from 'next/link'

const List = () => {
  const COLOR_PRIMARY = '#2F6B3F';
  const COLOR_ACCENT = '#D6524A';
  const currency = '₹';
  
  const [token, setToken] = useState(null);
  const [list, setList] = useState([])
  const [expandedItems, setExpandedItems] = useState({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [selectedProducts, setSelectedProducts] = useState(new Set())
  const [isBulkDelete, setIsBulkDelete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [unlockProduct, setUnlockProduct] = useState(null)
  const [unlockQuantity, setUnlockQuantity] = useState(10)
  const { error: showError, success } = useContext(NotificationContext);
  
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);
  
  // Helper functions
  const hasLowStock = (product) => {
    return product.variants?.some(v => v.stockQty < 5) || false;
  };

  const getTotalStock = (product) => {
    return product.variants?.reduce((sum, v) => sum + (v.stockQty || 0), 0) || 0;
  };
  
  const fetchList = async()=>{
    try{
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.get(`${backendUrl}/api/product/list`)
      if(response.data.success){
        setList(response.data.products)
      }
      else{
        showError(response.data.message || 'Unable to load products')
      }
    }
    catch (error){
      console.error(error)
      showError('Unable to load products')
    }
  }

  useEffect(()=>{
    fetchList()
  }, []) 

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const removeProduct = async (id) => {
    setProductToDelete(id)
    setIsBulkDelete(false)
    setShowDeleteModal(true)
  };

  const markOutOfStock = async (product) => {
    setIsLoading(true);
    try {
      if (!token) {
        showError('Authentication token not found');
        return;
      }

      // Set all variants to 0 stock
      const updatedVariants = product.variants.map(v => ({
        ...v,
        stockQty: 0
      }));

      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("description", product.description);
      formData.append("categories", JSON.stringify(product.categories));
      formData.append("sku", product.sku || "");
      formData.append("bestseller", product.bestseller);
      formData.append("featured", product.featured);
      formData.append("tags", JSON.stringify(product.tags || []));
      formData.append("status", product.status || 'published');
      formData.append("variants", JSON.stringify(updatedVariants));

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.put(
        `${backendUrl}/api/product/update/${product._id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        success(`${product.name} marked as out of stock`);
        await fetchList();
      } else {
        showError(response.data.message || 'Unable to update product');
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Unable to mark out of stock');
    } finally {
      setIsLoading(false);
    }
  };
  const unlockStock = async (product, quantity) => {
    setIsLoading(true);
    try {
      if (!token) {
        showError('Authentication token not found');
        return;
      }

      // Restore stock to all variants with the specified quantity
      const updatedVariants = product.variants.map(v => ({
        ...v,
        stockQty: quantity
      }));

      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("description", product.description);
      formData.append("categories", JSON.stringify(product.categories));
      formData.append("sku", product.sku || "");
      formData.append("bestseller", product.bestseller);
      formData.append("featured", product.featured);
      formData.append("tags", JSON.stringify(product.tags || []));
      formData.append("status", product.status || 'published');
      formData.append("variants", JSON.stringify(updatedVariants));

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.put(
        `${backendUrl}/api/product/update/${product._id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        success(`${product.name} unlocked with ${quantity} stock per variant`);
        setShowUnlockModal(false);
        setUnlockProduct(null);
        setUnlockQuantity(10);
        await fetchList();
      } else {
        showError(response.data.message || 'Unable to unlock product');
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Unable to unlock stock');
    } finally {
      setIsLoading(false);
    }
  };
  const toggleSelectProduct = (id) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedProducts(newSelected)
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === list.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(list.map(item => item._id)))
    }
  };

  const removeBulkProducts = () => {
    if (selectedProducts.size === 0) {
      showError('Please select at least one product')
      return
    }
    setProductToDelete(selectedProducts)
    setIsBulkDelete(true)
    setShowDeleteModal(true)
  };

  const confirmDelete = async (toDelete) => {
    setIsLoading(true);
    try {
      if (!token) {
        showError('Authentication token not found');
        setShowDeleteModal(false);
        return;
      }
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const deleteIds = isBulkDelete ? Array.from(toDelete) : [toDelete];
      let successCount = 0;
      let failureCount = 0;

      for (const id of deleteIds) {
        try {
          const response = await axios.post(
            `${backendUrl}/api/product/remove`,
            { id },
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
        const msg = isBulkDelete 
          ? `${successCount} product${successCount !== 1 ? 's' : ''} removed successfully`
          : 'Product removed successfully';
        success(msg);
        setSelectedProducts(new Set());
      }

      if (failureCount > 0) {
        showError(`Failed to remove ${failureCount} product${failureCount !== 1 ? 's' : ''}`);
      }

      setShowDeleteModal(false);
      setProductToDelete(null);
      setIsBulkDelete(false);
      await fetchList();
    } catch (error) {
      console.error(error);
      showError(error.response?.data?.message || 'Unable to remove product');
    } finally {
      setIsLoading(false);
    }
  };

  const removeAllProducts = async () => {
    if (!window.confirm('Are you absolutely sure you want to remove ALL products? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      if (!token) {
        showError('Authentication token not found');
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      let successCount = 0;
      let failureCount = 0;

      for (const product of list) {
        try {
          await axios.post(
            `${backendUrl}/api/product/remove`,
            { id: product._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          successCount++;
        } catch (error) {
          failureCount++;
        }
      }
      
      if (successCount > 0) {
        success(`${successCount} product${successCount !== 1 ? 's' : ''} removed successfully`);
      }
      if (failureCount > 0) {
        showError(`Failed to remove ${failureCount} product${failureCount !== 1 ? 's' : ''}`);
      }

      await fetchList();
    } catch (error) {
      console.error(error);
      showError(error.response?.data?.message || 'Error removing products');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className='w-full' style={{ backgroundColor: '#FAFAF8' }}>
      {/* Header with Bulk Delete Button */}
      <div className='mb-8 flex items-center justify-between flex-wrap gap-4'>
        <div>
          <h1 className='text-3xl font-bold' style={{ color: '#1A1A1A' }}>All Products</h1>
          <p className='text-base mt-2' style={{ color: '#666' }}>Manage your product inventory and pricing</p>
        </div>
        <div className='flex items-center gap-3'>
          {selectedProducts.size > 0 && (
            <button
              onClick={removeBulkProducts}
              disabled={isLoading}
              className='px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition text-white disabled:opacity-60 disabled:cursor-not-allowed'
              style={{ backgroundColor: '#D6524A' }}
              title={`Delete ${selectedProducts.size} selected product${selectedProducts.size !== 1 ? 's' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Delete Selected ({selectedProducts.size})
                </>
              )}
            </button>
          )}
          {list.length > 0 && (
            <button
              onClick={removeAllProducts}
              disabled={isLoading}
              className='px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition text-white disabled:opacity-60 disabled:cursor-not-allowed'
              style={{ backgroundColor: '#666' }}
              title="Remove all products"
            >
              {isLoading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Remove All
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Table for Desktop */}
      <div className='hidden lg:block bg-white rounded-lg overflow-hidden border' style={{ borderColor: '#E6E1D8' }}>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr style={{ backgroundColor: '#F8F6F2', borderBottom: '2px solid #E6E1D8' }}>
                <th className='px-6 py-4 text-left'>
                  <input
                    type='checkbox'
                    checked={list.length > 0 && selectedProducts.size === list.length}
                    onChange={toggleSelectAll}
                    className='w-4 h-4 cursor-pointer rounded'
                    style={{ accentColor: '#2F6B3F' }}
                    title="Select all products"
                  />
                </th>
                <th className='px-6 py-4 text-left font-semibold text-sm' style={{ color: '#1A1A1A' }}>Image</th>
                <th className='px-6 py-4 text-left font-semibold text-sm' style={{ color: '#1A1A1A' }}>Product Name</th>
                <th className='px-6 py-4 text-left font-semibold text-sm' style={{ color: '#1A1A1A' }}>Category</th>
                <th className='px-6 py-4 text-left font-semibold text-sm' style={{ color: '#1A1A1A' }}>Selling Price</th>
                <th className='px-6 py-4 text-left font-semibold text-sm' style={{ color: '#1A1A1A' }}>Variants</th>
                <th className='px-6 py-4 text-left font-semibold text-sm' style={{ color: '#1A1A1A' }}>Stock</th>
                <th className='px-6 py-4 text-left font-semibold text-sm' style={{ color: '#1A1A1A' }}>Status</th>
                <th className='px-6 py-4 text-center font-semibold text-sm' style={{ color: '#1A1A1A' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item, index) => (
                <tr key={index} className='border-t transition hover:bg-gray-50' style={{ borderColor: '#E6E1D8', backgroundColor: selectedProducts.has(item._id) ? '#E8F5E9' : '#fff' }}>
                  <td className='px-6 py-4'>
                    <input
                      type='checkbox'
                      checked={selectedProducts.has(item._id)}
                      onChange={() => toggleSelectProduct(item._id)}
                      className='w-4 h-4 cursor-pointer rounded'
                      style={{ accentColor: '#2F6B3F' }}
                    />
                  </td>
                  <td className='px-6 py-4'>
                    <img 
                      className='w-16 h-16 object-cover rounded-lg' 
                      src={item.images?.[0]?.url || 'https://via.placeholder.com/64'} 
                      alt={item.name}
                      onError={(e) => e.target.src = 'https://via.placeholder.com/64'}
                    />
                  </td>
                  <td className='px-6 py-4'>
                    <p className='font-semibold text-sm' style={{ color: '#1A1A1A' }}>{item.name}</p>
                  </td>
                  <td className='px-6 py-4'>
                    <span className='px-3 py-1 rounded-full text-xs font-medium' 
                      style={{ backgroundColor: '#E8F5E9', color: '#2F6B3F' }}>
                      {item.category}
                    </span>
                  </td>
                  <td className='px-6 py-4'>
                    <p className='font-semibold text-sm' style={{ color: '#2F6B3F' }}>
                      {currency}{item.variants?.[0]?.sellingPrice || 'N/A'}
                    </p>
                    <p className='text-xs mt-1' style={{ color: '#999' }}>
                      Making: {currency}{item.variants?.[0]?.costPrice || 'N/A'}
                    </p>
                  </td>
                  <td className='px-6 py-4'>
                    <p className='text-sm font-medium' style={{ color: '#1A1A1A' }}>
                      {item.variants?.length || 0} variants
                    </p>
                    <p className='text-xs mt-1' style={{ color: '#999' }}>
                      {item.variants?.map(v => v.weight).join(', ') || '-'}
                    </p>
                  </td>
                  <td className='px-6 py-4'>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      (item.variants?.[0]?.stockQty || 0) > 0 ? 'text-green-700' : 'text-red-700'
                    }`} style={{ 
                      backgroundColor: (item.variants?.[0]?.stockQty || 0) > 0 ? '#E8F5E9' : '#FFEBEE'
                    }}>
                      {(item.variants?.[0]?.stockQty || 0) > 0 ? 'In Stock' : 'Out'}
                    </span>
                  </td>
                  <td className='px-6 py-4'>
                    <div className='flex gap-2 flex-wrap'>
                      {item.status === 'draft' && (
                        <span className='px-2 py-1 rounded text-xs font-semibold' style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}>
                          Draft
                        </span>
                      )}
                      {item.featured && (
                        <span className='px-2 py-1 rounded text-xs font-semibold text-white' style={{ backgroundColor: '#FFB84D' }}>
                          Featured
                        </span>
                      )}
                      {hasLowStock(item) && (
                        <span className='px-2 py-1 rounded text-xs font-semibold' style={{ backgroundColor: '#FFEBEE', color: '#D6524A' }}>
                          Low Stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td className='px-6 py-4 text-center'>
                    <div className='flex items-center justify-center gap-2'>
                      <Link
                        href={`/edit/${item._id}`}
                        className='inline-flex items-center justify-center w-10 h-10 rounded-lg transition hover:bg-blue-50'
                        style={{ color: '#2F6B3F' }}
                        title="Edit product"
                      >
                        <Edit2 size={18} />
                      </Link>
                      <button
                        onClick={() => {
                          if ((item.variants?.[0]?.stockQty || 0) === 0) {
                            setUnlockProduct(item);
                            setShowUnlockModal(true);
                          } else {
                            markOutOfStock(item);
                          }
                        }}
                        disabled={isLoading}
                        className='inline-flex items-center justify-center w-10 h-10 rounded-lg transition hover:bg-yellow-50 disabled:opacity-60 disabled:cursor-not-allowed'
                        style={{ color: (item.variants?.[0]?.stockQty || 0) === 0 ? '#2F6B3F' : '#FFB84D' }}
                        title={(item.variants?.[0]?.stockQty || 0) === 0 ? 'Unlock stock' : 'Mark out of stock'}
                      >
                        <Lock size={18} />
                      </button>
                      <button
                        onClick={() => removeProduct(item._id)}
                        disabled={isLoading}
                        className='inline-flex items-center justify-center w-10 h-10 rounded-lg transition hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed'
                        style={{ color: '#D6524A' }}
                        title="Delete product"
                      >
                        {isLoading ? (
                          <div className='w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin'></div>
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View for Mobile & Tablet */}
      <div className='lg:hidden space-y-4'>
        {list.map((item, index) => (
          <div key={index} className='bg-white rounded-lg border overflow-hidden transition' style={{ borderColor: '#E6E1D8' }}>
            {/* Card Header */}
            <div 
              className='flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50'
              onClick={() => toggleExpand(item._id)}
              style={{ backgroundColor: '#F8F6F2', borderBottom: expandedItems[item._id] ? '1px solid #E6E1D8' : 'none' }}
            >
              <div className='flex items-center gap-4 flex-1'>
                <img 
                  className='w-14 h-14 object-cover rounded-lg' 
                  src={item.images?.[0]?.url || 'https://via.placeholder.com/56'} 
                  alt={item.name}
                  onError={(e) => e.target.src = 'https://via.placeholder.com/56'}
                />
                <div className='flex-1'>
                  <p className='font-semibold text-sm' style={{ color: '#1A1A1A' }}>{item.name}</p>
                  <span className='inline-block px-2 py-1 rounded text-xs font-medium mt-2' 
                    style={{ backgroundColor: '#E8F5E9', color: '#2F6B3F' }}>
                    {item.category}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                {expandedItems[item._id] ? (
                  <ChevronUp size={20} style={{ color: '#2F6B3F' }} />
                ) : (
                  <ChevronDown size={20} style={{ color: '#999' }} />
                )}
              </div>
            </div>

            {/* Card Body - Main Info */}
            <div className='p-4 border-b' style={{ borderColor: '#E6E1D8' }}>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-xs font-semibold uppercase' style={{ color: '#999' }}>Selling Price</p>
                  <p className='text-lg font-bold mt-1' style={{ color: '#2F6B3F' }}>
                    {currency}{item.variants?.[0]?.sellingPrice || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className='text-xs font-semibold uppercase' style={{ color: '#999' }}>Cost Price</p>
                  <p className='text-lg font-bold mt-1' style={{ color: '#1A1A1A' }}>
                    {currency}{item.variants?.[0]?.costPrice || 'N/A'}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 mt-4'>
                <div>
                  <p className='text-xs font-semibold uppercase' style={{ color: '#999' }}>Variants</p>
                  <p className='text-sm font-medium mt-1' style={{ color: '#1A1A1A' }}>
                    {item.variants?.length || 0} available
                  </p>
                </div>
                <div>
                  <p className='text-xs font-semibold uppercase' style={{ color: '#999' }}>Stock Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mt-1 ${
                    (item.variants?.[0]?.stockQty || 0) > 0 ? 'text-green-700' : 'text-red-700'
                  }`} style={{ 
                    backgroundColor: (item.variants?.[0]?.stockQty || 0) > 0 ? '#E8F5E9' : '#FFEBEE'
                  }}>
                    {(item.variants?.[0]?.stockQty || 0) > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedItems[item._id] && (
              <div className='p-4 bg-white'>
                <h4 className='font-semibold text-sm mb-3' style={{ color: '#1A1A1A' }}>Variant Details</h4>
                <div className='space-y-3'>
                  {item.variants?.map((variant, idx) => (
                    <div key={idx} className='p-3 rounded-lg' style={{ backgroundColor: '#F8F6F2' }}>
                      <div className='flex items-center justify-between mb-2'>
                        <p className='font-semibold text-sm' style={{ color: '#1A1A1A' }}>Weight: {variant.weight}</p>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          (variant.stockQty || 0) > 0 ? 'text-green-700' : 'text-red-700'
                        }`} style={{ 
                          backgroundColor: (variant.stockQty || 0) > 0 ? '#E8F5E9' : '#FFEBEE'
                        }}>
                          {(variant.stockQty || 0) > 0 ? `${variant.stockQty} in stock` : 'Out of stock'}
                        </span>
                      </div>
                      <div className='grid grid-cols-3 gap-2 text-xs'>
                        <div>
                          <p style={{ color: '#999' }}>Selling</p>
                          <p className='font-semibold' style={{ color: '#2F6B3F' }}>
                            {currency}{variant.sellingPrice}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#999' }}>Cost</p>
                          <p className='font-semibold' style={{ color: '#1A1A1A' }}>
                            {currency}{variant.costPrice}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#999' }}>Original</p>
                          <p className='font-semibold' style={{ color: '#1A1A1A' }}>
                            {currency}{variant.originalPrice || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Card Footer - Actions */}
            <div className='px-4 py-3 bg-gray-50 flex items-center justify-between gap-3'>
              <div className='flex gap-2 flex-wrap'>
                {item.status === 'draft' && (
                  <span className='px-2 py-1 rounded text-xs font-semibold' style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}>
                    Draft
                  </span>
                )}
                {item.featured && (
                  <span className='px-2 py-1 rounded text-xs font-semibold text-white' style={{ backgroundColor: '#FFB84D' }}>
                    Featured
                  </span>
                )}
                {hasLowStock(item) && (
                  <span className='px-2 py-1 rounded text-xs font-semibold' style={{ backgroundColor: '#FFEBEE', color: '#D6524A' }}>
                    Low Stock
                  </span>
                )}
              </div>
              <div className='flex items-center justify-end gap-2'>
                <Link
                  href={`/edit/${item._id}`}
                  className='px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition text-white'
                  style={{ backgroundColor: '#2F6B3F' }}
                >
                  <Edit2 size={16} />
                  Edit
                </Link>
                <button
                  onClick={() => {
                    if ((item.variants?.[0]?.stockQty || 0) === 0) {
                      setUnlockProduct(item);
                      setShowUnlockModal(true);
                    } else {
                      markOutOfStock(item);
                    }
                  }}
                  disabled={isLoading}
                  className='px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition text-white disabled:opacity-60 disabled:cursor-not-allowed'
                  style={{ backgroundColor: (item.variants?.[0]?.stockQty || 0) === 0 ? '#2F6B3F' : '#FFB84D' }}
                >
                  <Lock size={16} />
                  {(item.variants?.[0]?.stockQty || 0) === 0 ? 'Unlock Stock' : 'Out of Stock'}
                </button>
                <button
                  onClick={() => removeProduct(item._id)}
                  disabled={isLoading}
                  className='px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition text-white disabled:opacity-60 disabled:cursor-not-allowed'
                  style={{ backgroundColor: '#D6524A' }}
                >
                  {isLoading ? (
                    <>
                      <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    {showDeleteModal && (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden'>
          {/* Modal Header */}
          <div className='p-6 border-b' style={{ borderColor: '#E6E1D8' }}>
            <h2 className='text-xl font-bold' style={{ color: '#1A1A1A' }}>
              {isBulkDelete ? `Remove Bulk Products` : 'Remove Product'}
            </h2>
          </div>

          {/* Modal Body */}
          <div className='p-6'>
            <p style={{ color: '#666' }} className='text-base mb-4'>
              {isBulkDelete
                ? `Are you sure you want to remove ${productToDelete?.size || 0} product${productToDelete?.size !== 1 ? 's' : ''}? This action cannot be undone.`
                : 'Are you sure you want to remove this product? This action cannot be undone.'
              }
            </p>
            {isBulkDelete ? (
              <div className='p-4 rounded-lg border space-y-2 max-h-48 overflow-y-auto' style={{ backgroundColor: '#F8F6F2', borderColor: '#E6E1D8' }}>
                {list.filter(item => productToDelete.has(item._id)).map((item, idx) => (
                  <p key={idx} className='text-sm font-semibold' style={{ color: '#1A1A1A' }}>
                    {idx + 1}. {item.name}
                  </p>
                ))}
              </div>
            ) : (
              productToDelete && (
                <div className='p-4 rounded-lg border' style={{ backgroundColor: '#F8F6F2', borderColor: '#E6E1D8' }}>
                  <p className='text-sm font-semibold' style={{ color: '#1A1A1A' }}>
                    {list.find(item => item._id === productToDelete)?.name || 'Product'}
                  </p>
                </div>
              )
            )}
          </div>

          {/* Modal Footer */}
          <div className='px-6 py-4 bg-gray-50 flex items-center justify-end gap-3'>
            <button
              onClick={() => {
                setShowDeleteModal(false)
                setProductToDelete(null)
                setIsBulkDelete(false)
              }}
              disabled={isLoading}
              className='px-6 py-2 rounded-lg font-semibold transition border-2 disabled:opacity-60 disabled:cursor-not-allowed'
              style={{ borderColor: '#2F6B3F', color: '#2F6B3F', backgroundColor: '#FFF' }}
            >
              Cancel
            </button>
            <button
              onClick={() => confirmDelete(productToDelete)}
              disabled={isLoading}
              className='px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition text-white disabled:opacity-60 disabled:cursor-not-allowed'
              style={{ backgroundColor: '#D6524A' }}
            >
              {isLoading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  {isBulkDelete ? 'Remove All' : 'Remove'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Unlock Stock Modal */}
    {showUnlockModal && (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
        <div className='bg-white rounded-lg shadow-xl max-w-sm w-full'>
          {/* Header */}
          <div className='p-6 border-b'>
            <h2 className='text-xl font-bold'>Restore Stock</h2>
            <p className='text-sm text-gray-600 mt-1'>
              {unlockProduct?.name}
            </p>
          </div>

          {/* Content */}
          <div className='p-6'>
            <label className='block text-sm font-semibold mb-3'>
              Stock Quantity per Variant
            </label>
            <input
              type='number'
              value={unlockQuantity}
              onChange={(e) => setUnlockQuantity(Number(e.target.value))}
              min='1'
              max='1000'
              className='w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition'
              style={{ borderColor: '#E0E0E0', '--tw-ring-color': COLOR_PRIMARY }}
            />
            <p className='text-xs text-gray-600 mt-3'>
              This quantity will be set for all {unlockProduct?.variants?.length || 0} variants
            </p>
          </div>

          {/* Footer */}
          <div className='px-6 py-4 bg-gray-50 flex items-center justify-end gap-3'>
            <button
              onClick={() => {
                setShowUnlockModal(false)
                setUnlockProduct(null)
                setUnlockQuantity(10)
              }}
              disabled={isLoading}
              className='px-6 py-2 rounded-lg font-semibold transition border-2 disabled:opacity-60 disabled:cursor-not-allowed'
              style={{ borderColor: COLOR_PRIMARY, color: COLOR_PRIMARY, backgroundColor: '#FFF' }}
            >
              Cancel
            </button>
            <button
              onClick={() => unlockStock(unlockProduct, unlockQuantity)}
              disabled={isLoading || unlockQuantity < 1}
              className='px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition text-white disabled:opacity-60 disabled:cursor-not-allowed'
              style={{ backgroundColor: COLOR_PRIMARY }}
            >
              {isLoading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  <span>Restoring...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Unlock {unlockQuantity}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
export default List;
