'use client';

import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationContext } from '@/context/NotificationContext';
import { api, getErrorMessage } from '@/lib/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { error: showError, success } = useContext(NotificationContext);
  const router = useRouter();

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/api/admin/auth/login', { email, password });
      localStorage.setItem('token', response.data.data?.token || 'session');
      success('Welcome back');
      router.push('/admin');
    } catch (error) {
      showError(getErrorMessage(error, 'Unable to login. Please try again'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen w-full items-center justify-center bg-gray-50 px-4'>
      <div className='w-full max-w-md rounded border border-gray-200 bg-white px-8 py-7 shadow-sm'>
        <h1 className='mb-1 text-2xl font-bold text-gray-950'>REDLINE Admin</h1>
        <p className='mb-6 text-sm text-gray-500'>Sign in to manage store operations.</p>
        <form onSubmit={onSubmitHandler} className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>Email Address</label>
            <input
              onChange={(event) => setEmail(event.target.value)}
              value={email}
              className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'
              type='email'
              placeholder='admin@example.com'
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>Password</label>
            <input
              onChange={(event) => setPassword(event.target.value)}
              value={password}
              className='w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-black'
              type='password'
              placeholder='Enter your password'
              required
              disabled={isLoading}
            />
          </div>
          <button
            className='w-full rounded bg-black px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'
            type='submit'
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
