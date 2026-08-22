'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/ProductForm';
import { NotificationContext } from '@/context/NotificationContext';
import { api, getErrorMessage } from '@/lib/api';

const AddProduct = () => {
  const router = useRouter();
  const { success, error: showError } = useContext(NotificationContext);

  const createProduct = async (payload) => {
    try {
      const response = await api.post('/api/admin/products', payload);
      success('Product created');
      router.push(`/edit/${response.data.data.product._id}`);
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to create product'));
      throw new Error(getErrorMessage(error, 'Unable to create product'));
    }
  };

  return (
    <div className='max-w-6xl space-y-6'>
      <header>
        <h1 className='text-3xl font-bold text-gray-950'>Add Product</h1>
        <p className='mt-1 text-sm text-gray-500'>Create a perfume product in MongoDB through the new API.</p>
      </header>
      <ProductForm submitLabel='Create Product' onSubmit={createProduct} />
    </div>
  );
};

export default AddProduct;
