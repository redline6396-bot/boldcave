'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Edit2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { NotificationContext } from '@/context/NotificationContext';
import { api, formatDate, getErrorMessage, getId, money } from '@/lib/api';

const getImageUrl = (image) => image?.url || image || '';

const getProductThumbnail = (product) =>
  getImageUrl(product.images?.[0]) ||
  getImageUrl((product.variants || []).find((variant) => variant.images?.[0])?.images?.[0]) ||
  getImageUrl((product.variants || []).find((variant) => variant.image)?.image);

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [audience, setAudience] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState('');
  const [savingFeaturedOrder, setSavingFeaturedOrder] = useState(false);
  const { success, error: showError } = useContext(NotificationContext);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/products');
      setProducts(response.data.data.products || []);
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load products');
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      const audienceTags = product.audienceTags || [];
      const matchesSearch = !needle || [product.name, product.slug, ...audienceTags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      const matchesAudience = !audience || audienceTags.includes(audience);
      const matchesStatus = !status || product.status === status;
      return matchesSearch && matchesAudience && matchesStatus;
    });
  }, [products, search, audience, status]);

  const featuredProducts = useMemo(
    () =>
      products
        .filter((product) => product.featured === true)
        .sort((left, right) => {
          const leftOrder = Number(left.featuredOrder) || Number.MAX_SAFE_INTEGER;
          const rightOrder = Number(right.featuredOrder) || Number.MAX_SAFE_INTEGER;
          return leftOrder - rightOrder || String(left.name || '').localeCompare(String(right.name || ''));
        }),
    [products]
  );

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    const id = getId(product);
    try {
      setBusyId(id);
      await api.delete(`/api/admin/products/${id}`);
      setProducts((current) => current.filter((entry) => getId(entry) !== id));
      success('Product deleted');
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to delete product'));
    } finally {
      setBusyId('');
    }
  };

  const toggleStatus = async (product) => {
    const id = getId(product);
    const nextStatus = product.status === 'published' ? 'draft' : 'published';
    try {
      setBusyId(id);
      const response = await api.patch(`/api/admin/products/${id}`, {
        ...product,
        status: nextStatus,
      });
      setProducts((current) => current.map((entry) => (getId(entry) === id ? response.data.data.product : entry)));
      success(`Product moved to ${nextStatus}`);
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to update product'));
    } finally {
      setBusyId('');
    }
  };

  const moveFeaturedProduct = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= featuredProducts.length) return;

    const nextFeatured = [...featuredProducts];
    [nextFeatured[index], nextFeatured[targetIndex]] = [nextFeatured[targetIndex], nextFeatured[index]];
    const orderById = new Map(nextFeatured.map((product, itemIndex) => [getId(product), itemIndex + 1]));

    setProducts((current) =>
      current.map((product) =>
        orderById.has(getId(product))
          ? { ...product, featuredOrder: orderById.get(getId(product)) }
          : product
      )
    );
  };

  const saveFeaturedOrder = async () => {
    try {
      setSavingFeaturedOrder(true);
      await api.patch('/api/admin/products/featured-order', {
        productIds: featuredProducts.map((product) => getId(product)),
      });
      success('Homepage featured order saved');
      await loadProducts();
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to save featured order'));
    } finally {
      setSavingFeaturedOrder(false);
    }
  };

  return (
    <div className='space-y-6'>
      <header className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-gray-950'>Products</h1>
          <p className='mt-1 text-sm text-gray-500'>Admin product data from `/api/admin/products`.</p>
        </div>
        <Link href='/add' className='inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-sm font-semibold text-white'>
          <Plus size={16} />
          Add Product
        </Link>
      </header>

      <section className='rounded border border-gray-200 bg-white p-4'>
        <div className='grid gap-3 md:grid-cols-[1fr_180px_180px]'>
          <label className='relative block'>
            <Search className='absolute left-3 top-2.5 text-gray-400' size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search products'
              className='w-full rounded border border-gray-300 py-2 pl-10 pr-3 outline-none focus:border-black'
            />
          </label>
          <select value={audience} onChange={(event) => setAudience(event.target.value)} className='rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'>
            <option value=''>All Audiences</option>
            <option value='Men'>Men</option>
            <option value='Women'>Women</option>
            <option value='Unisex'>Unisex</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className='rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'>
            <option value=''>All Statuses</option>
            <option value='published'>Published</option>
            <option value='draft'>Draft</option>
          </select>
        </div>
      </section>

      <section className='rounded border border-gray-200 bg-white p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-gray-950'>Homepage Featured</h2>
            <p className='mt-1 text-sm text-gray-500'>All products marked Featured appear here. Use this order to control storefront placement.</p>
          </div>
          <button
            type='button'
            onClick={saveFeaturedOrder}
            disabled={savingFeaturedOrder || featuredProducts.length === 0}
            className='inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
          >
            <Save size={16} />
            {savingFeaturedOrder ? 'Saving...' : 'Save Order'}
          </button>
        </div>

        <div className='mt-4 divide-y divide-gray-100 rounded border border-gray-200'>
          {featuredProducts.length === 0 ? (
            <p className='p-4 text-sm text-gray-500'>No featured products yet.</p>
          ) : (
            featuredProducts.map((product, index) => {
              const id = getId(product);
              const thumbnail = getProductThumbnail(product);

              return (
                <div key={`featured-${id}`} className='grid gap-3 p-3 sm:grid-cols-[56px_1fr_110px_96px] sm:items-center'>
                  <div className='h-14 w-14 overflow-hidden rounded bg-gray-100'>
                    {thumbnail ? <img src={thumbnail} alt={product.name} className='h-full w-full object-cover' /> : null}
                  </div>
                  <div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='font-semibold text-gray-950'>{product.name}</p>
                      <span className={`rounded px-2 py-1 text-[10px] font-semibold ${product.productType === 'combo' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                        {product.productType === 'combo' ? 'COMBO' : 'PRODUCT'}
                      </span>
                    </div>
                    <p className='mt-1 text-xs text-gray-500'>{product.slug}</p>
                  </div>
                  <p className='text-sm font-semibold text-gray-700'>Position {index + 1}</p>
                  <div className='flex gap-2 sm:justify-end'>
                    <button
                      type='button'
                      onClick={() => moveFeaturedProduct(index, -1)}
                      disabled={index === 0}
                      className='rounded border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300'
                      title='Move up'
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type='button'
                      onClick={() => moveFeaturedProduct(index, 1)}
                      disabled={index === featuredProducts.length - 1}
                      className='rounded border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300'
                      title='Move down'
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {loading ? (
        <StateMessage message='Loading products...' />
      ) : error ? (
        <StateMessage tone='error' message={error} onRetry={loadProducts} />
      ) : visibleProducts.length === 0 ? (
        <StateMessage message='No products found.' />
      ) : (
        <section className='overflow-hidden rounded border border-gray-200 bg-white'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[1040px] text-left text-sm'>
              <thead className='border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500'>
                <tr>
                  <th className='px-4 py-3'>Product</th>
                  <th className='px-4 py-3'>Type</th>
                  <th className='px-4 py-3'>Audience</th>
                  <th className='px-4 py-3'>Variants</th>
                  <th className='px-4 py-3'>Stock</th>
                  <th className='px-4 py-3'>Status</th>
                  <th className='px-4 py-3'>Created</th>
                  <th className='px-4 py-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {visibleProducts.map((product) => {
                  const id = getId(product);
                  const isCombo = product.productType === 'combo';
                  const totalStock = isCombo
                    ? Number(product.comboAvailability ?? product.variants?.[0]?.stock ?? 0)
                    : (product.variants || []).reduce((total, variant) => total + Number(variant.stock || 0), 0);
                  return (
                    <tr key={id}>
                      <td className='px-4 py-4'>
                        <div className='flex items-center gap-3'>
                          <div className='h-14 w-14 overflow-hidden rounded bg-gray-100'>
                            {getProductThumbnail(product) ? (
                              <img src={getProductThumbnail(product)} alt={product.name} className='h-full w-full object-cover' />
                            ) : null}
                          </div>
                          <div>
                            <p className='font-semibold text-gray-950'>{product.name}</p>
                            <p className='text-xs text-gray-500'>{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className='px-4 py-4'>
                        <span className={`rounded px-2 py-1 text-xs font-semibold ${isCombo ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                          {isCombo ? 'COMBO' : 'PRODUCT'}
                        </span>
                      </td>
                      <td className='px-4 py-4'>{(product.audienceTags || []).join(', ') || '-'}</td>
                      <td className='px-4 py-4'>
                        <div className='space-y-1'>
                          {isCombo ? (
                            <p className='text-xs text-gray-600'>
                              {(product.comboItems || []).map((item) => `${item.name || 'Product'} ${item.size || item.variantId} x ${item.quantity}`).join(', ') || 'Fixed combo'}
                            </p>
                          ) : (product.variants || []).map((variant) => (
                            <p key={variant.size} className='text-xs text-gray-600'>
                              {variant.size}: {money(variant.sellingPrice)} / MRP {money(variant.mrp)} / CP {money(variant.costPrice)}
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className='px-4 py-4'>
                        <span className={`rounded px-2 py-1 text-xs font-semibold ${totalStock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                          {totalStock}
                        </span>
                      </td>
                      <td className='px-4 py-4'>
                        <button
                          onClick={() => toggleStatus(product)}
                          disabled={busyId === id}
                          className={`rounded px-2 py-1 text-xs font-semibold ${product.status === 'published' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {product.status}
                        </button>
                      </td>
                      <td className='px-4 py-4 text-gray-500'>{formatDate(product.createdAt)}</td>
                      <td className='px-4 py-4'>
                        <div className='flex justify-end gap-2'>
                          <Link href={`/edit/${id}`} className='rounded border border-gray-300 p-2 text-gray-700 hover:bg-gray-50' title='Edit product'>
                            <Edit2 size={16} />
                          </Link>
                          <button onClick={() => deleteProduct(product)} disabled={busyId === id} className='rounded border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50' title='Delete product'>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

function StateMessage({ message, tone = 'default', onRetry }) {
  return (
    <div className={`rounded border bg-white p-6 text-sm ${tone === 'error' ? 'border-red-200 text-red-700' : 'border-gray-200 text-gray-500'}`}>
      <p>{message}</p>
      {onRetry && <button onClick={onRetry} className='mt-3 rounded border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50'>Retry</button>}
    </div>
  );
}

export default ProductList;
