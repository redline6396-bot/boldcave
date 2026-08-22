'use client';

import { useContext, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductForm from '@/components/ProductForm';
import { NotificationContext } from '@/context/NotificationContext';
import { api, getErrorMessage } from '@/lib/api';

const EditProduct = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { success, error: showError } = useContext(NotificationContext);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/api/admin/products/${productId}`);
        setProduct(response.data.data.product);
      } catch (error) {
        const message = getErrorMessage(error, 'Unable to load product');
        setError(message);
        showError(message);
      } finally {
        setLoading(false);
      }
    };

    if (productId) loadProduct();
  }, [productId, showError]);

  const updateProduct = async (payload) => {
    try {
      await api.patch(`/api/admin/products/${productId}`, payload);
      success('Product updated');
      router.push('/list');
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to update product'));
      throw new Error(getErrorMessage(error, 'Unable to update product'));
    }
  };

  if (loading) return <StateMessage message='Loading product...' />;
  if (error) return <StateMessage tone='error' message={error} />;
  if (!product) return <StateMessage message='Product not found' />;

  return (
    <div className='max-w-6xl space-y-6'>
      <header>
        <h1 className='text-3xl font-bold text-gray-950'>
          Edit {product.productType === 'combo' ? 'Combo' : 'Product'}
        </h1>
        <p className='mt-1 text-sm text-gray-500'>{product.name}</p>
      </header>
      <ProductForm product={product} submitLabel='Save Changes' onSubmit={updateProduct} />
    </div>
  );
};

function StateMessage({ message, tone = 'default' }) {
  return (
    <div className={`rounded border bg-white p-6 text-sm ${tone === 'error' ? 'border-red-200 text-red-700' : 'border-gray-200 text-gray-500'}`}>
      {message}
    </div>
  );
}

export default EditProduct;
