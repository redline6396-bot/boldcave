'use client';

import React, { useEffect, useContext } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShopContext } from '@/context/ShopContext';
import { NotificationContext } from '@/context/NotificationContext';

const FinishLoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken, backendUrl, setCartItems } = useContext(ShopContext);
  const { success, error: showError } = useContext(NotificationContext);

  useEffect(() => {
    const completeLogin = async () => {
      const url = window.location.href;
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get('redirect');
      if (redirectParam) {
        localStorage.setItem('redirectAfterLogin', redirectParam);
      }

      // Check if this is a valid magic link (in real app, validate with backend)
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please enter your email to confirm');
        if (!email) {
          showError('Email is required to complete login.');
          router.push('/newlogin');
          return;
        }
      }

      try {
        // In a real implementation, you'd validate the magic link with your backend
        // For now, we'll simulate successful login
        const idToken = 'mock_token_' + Date.now(); // Mock token

        window.localStorage.removeItem('emailForSignIn');

        // Mark as fresh magic login
        localStorage.setItem('freshMagicLogin', '1');
        setToken(idToken);
        localStorage.setItem('token', idToken);

        // Try to merge pending cart
        try {
          const mergeRes = await axios.post(
            `${backendUrl}/api/cart/merge-pending`,
            { email },
            { headers: { Authorization: `Bearer ${idToken}` } }
          );
          if (mergeRes.data?.success && mergeRes.data?.cartData) {
            setCartItems(mergeRes.data.cartData);
          }
        } catch (mergeErr) {
          console.log('Merge pending cart failed:', mergeErr?.response?.data || mergeErr.message);
        }

        success('You are now logged in!');
        
        const redirectPath = localStorage.getItem('redirectAfterLogin') || localStorage.getItem('lastVisitedPath') || '/';
        localStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      } catch (error) {
        console.error('FinishLogin error:', error);
        showError('This login link has expired. Please request a new one.');
        router.push('/newlogin');
      }
    };

    completeLogin();
  }, [router, setToken]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900" />
      <p className="mt-4 text-xl font-semibold">Verifying your secure link...</p>
      <p className="text-gray-500 text-sm">You will be redirected in a moment.</p>
    </div>
  );
};

export default FinishLoginPage;
