'use client';

import axios from 'axios';
import { useState, useContext } from 'react';
import { NotificationContext } from '@/context/NotificationContext';
import { useRouter } from 'next/navigation';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { error: showError } = useContext(NotificationContext);
  const router = useRouter();

  const onSubmitHandler = async (e) => {
    try {
      e.preventDefault();
      setIsLoading(true);
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.post(`${backendUrl}/api/user/admin`, { email, password });
      
      if (response.data.success) {
        // Store token in localStorage
        localStorage.setItem('token', response.data.token);
        // Redirect to admin
        router.push('/admin');
      } else {
        showError(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.log(error);
      showError(error.response?.data?.message || 'Unable to login. Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center w-full'>
      <div className='bg-white shadow-md rounded-lg px-8 py-6 max-w-md'>
        <h1 className='text-2xl font-bold mb-4'>Admin Panel</h1>
        <form onSubmit={onSubmitHandler}>
          <div className='mb-3 min-w-72'>
            <p className='text-sm font-medium text-gray-700 mb-2'>Email Address</p>
            <input 
              onChange={(e) => setEmail(e.target.value)} 
              value={email} 
              className='rounded-md w-full px-3 py-2 border border-gray-300 outline-none' 
              type="email" 
              placeholder='your@email.com' 
              required 
              disabled={isLoading}
            />
          </div>
          <div className='mb-3 min-w-72'>
            <p className='text-sm font-medium text-gray-700 mb-2'>Password</p>
            <input 
              onChange={(e) => setPassword(e.target.value)} 
              value={password} 
              className='rounded-md w-full px-3 py-2 border border-gray-300 outline-none' 
              type="password" 
              placeholder='Enter your password' 
              required 
              disabled={isLoading}
            />
          </div>
          <button 
            className='mt-2 w-full py-2 px-4 rounded-md text-white bg-black disabled:opacity-50 disabled:cursor-not-allowed' 
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
