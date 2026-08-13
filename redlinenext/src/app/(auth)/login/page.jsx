'use client';

import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { NotificationContext } from '@/context/NotificationContext';
import { ShopContext } from '@/context/ShopContext';
import { handleGoogleLogin } from '@/Config';
import { Mail, Lock, Check, X, ArrowLeft } from 'lucide-react';

const LoginPage = () => {
  const router = useRouter();
  const { token, setToken, backendUrl, cartItems } = useContext(ShopContext);
  const { success, error: showError } = useContext(NotificationContext);
  const [email, setEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [error, setError] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [resending, setResending] = useState(false);

  // Magic Link Logic
  const handleMagicLinkSubmit = async (e) => {
    e.preventDefault();
    setSendingLink(true);
    setError('');
    const redirectPath = localStorage.getItem('lastVisitedPath') || '/';

    try {
      const res = await axios.post(`${backendUrl}/api/user/send-login-link`, {
        email,
        redirectPath,
        cartItems,
      });

      if (res.data.success) {
        window.localStorage.setItem('emailForSignIn', email);
        setLinkSent(true);
        setSentEmail(email);
        setEmail('');
        success('Secure sign-in link sent');
      } else {
        showError(res.data.message || 'Unable to send sign-in link');
      }
    } catch (err) {
      console.error(err);
      showError('Failed to send login link. Please try again.');
    } finally {
      setSendingLink(false);
    }
  };

  // Google Login
  const handleGoogleClick = async () => {
    try {
      const idToken = await handleGoogleLogin(setError);
      setToken(idToken);
      localStorage.setItem('token', idToken);
      success('You have been logged in successfully!');
    } catch (err) {
      console.error('Google login error:', err);
      showError('Google sign-in failed. Please try again.');
    }
  };

  // Resend Sign-In Link
  const handleResendLink = async () => {
    setResending(true);
    setError('');
    const redirectPath = localStorage.getItem('lastVisitedPath') || '/';

    try {
      const res = await axios.post(`${backendUrl}/api/user/send-login-link`, {
        email: sentEmail,
        redirectPath,
        cartItems,
      });

      if (res.data.success) {
        success('Sign-in link resent successfully');
      } else {
        showError(res.data.message || 'Unable to resend link');
      }
    } catch (err) {
      console.error(err);
      showError('Failed to resend link. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Auto-Redirect if logged in
  useEffect(() => {
    if (token) {
      const redirectPath = localStorage.getItem('lastVisitedPath') || localStorage.getItem('redirectAfterLogin');
      const loginPaths = ['/login', '/newlogin', '/finish-login'];
      const target = redirectPath && !loginPaths.includes(redirectPath) ? redirectPath : '/';
      localStorage.removeItem('redirectAfterLogin');
      router.push(target);
    }
  }, [token, router]);

  return (
    <div style={{ backgroundColor: '#FAFAF8' }} className='min-h-screen flex items-center justify-center py-12'>
      <div className='w-full max-w-md px-4'>
        {/* Login Card */}
        <div className='bg-white rounded-lg p-8 border' style={{ borderColor: '#E6E1D8' }}>
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs font-medium tracking-wide mb-6 hover:opacity-70 transition-opacity"
            style={{ color: '#2F6B3F' }}
          >
            <ArrowLeft className="w-4 h-4" />
            BACK
          </button>

          {/* Logo/Header */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold mb-2' style={{ color: '#1A1A1A' }}>Sign In</h1>
            <p style={{ color: '#666' }}>Enter your email to continue</p>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className='mb-6 p-4 rounded-lg border-2' style={{ borderColor: '#D6524A', backgroundColor: '#FFEBEE' }}>
              <p style={{ color: '#D6524A' }} className='text-sm font-medium'>{error}</p>
            </div>
          )}

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            className='w-full py-3 rounded-lg font-semibold border-2 transition mb-6 flex items-center justify-center gap-3'
            style={{ borderColor: '#E6E1D8', color: '#1A1A1A' }}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className='w-5 h-5'
            />
            Continue with Google
          </button>

          {/* Divider */}
          <div className='flex items-center gap-3 mb-6'>
            <div className='flex-1 h-px' style={{ backgroundColor: '#E6E1D8' }}></div>
            <span className='text-sm' style={{ color: '#999' }}>or</span>
            <div className='flex-1 h-px' style={{ backgroundColor: '#E6E1D8' }}></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleMagicLinkSubmit}>
            <div className='mb-6'>
              <label className='block text-sm font-semibold mb-2' style={{ color: '#1A1A1A' }}>
                Email Address
              </label>
              <p className='text-xs mb-3' style={{ color: '#999' }}>
                We'll send you a secure sign-in link
              </p>
              <div className='relative'>
                <Mail size={18} className='absolute left-4 top-3.5' style={{ color: '#999' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={linkSent}
                  className='w-full py-3 px-4 pl-12 rounded-lg border-2 font-medium focus:outline-none transition'
                  style={{
                    borderColor: '#E6E1D8',
                    backgroundColor: linkSent ? '#F8F6F2' : '#FFF',
                    color: '#1A1A1A'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2F6B3F'}
                  onBlur={(e) => e.target.style.borderColor = '#E6E1D8'}
                />
                {linkSent && (
                  <button
                    type="button"
                    onClick={handleResendLink}
                    disabled={resending}
                    className='absolute right-4 top-3 text-sm font-semibold transition'
                    style={{ color: '#2F6B3F' }}
                  >
                    {resending ? 'Resending...' : 'Resend'}
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className='w-full py-3 rounded-lg font-bold text-white transition disabled:opacity-50'
              style={{ backgroundColor: '#2F6B3F' }}
              disabled={sendingLink || linkSent}
            >
              {sendingLink ? 'Sending...' : 'Continue'}
            </button>
          </form>

          {/* Success Message */}
          {linkSent && (
            <div className='mt-6 p-4 rounded-lg' style={{ backgroundColor: '#E8F5E9', borderLeft: '4px solid #2F6B3F' }}>
              <div className='flex gap-3 items-start'>
                <Check size={20} style={{ color: '#2F6B3F', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p className='font-semibold mb-1' style={{ color: '#2F6B3F' }}>Link sent!</p>
                  <p className='text-sm' style={{ color: '#666' }}>
                    Check <strong>{sentEmail}</strong> for your secure sign-in link
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkSent(false)}
                  className='transition'
                  style={{ color: '#999' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          <p className='text-xs text-center mt-6' style={{ color: '#999' }}>
            By continuing, you agree to our{' '}
            <button className='font-semibold transition hover:underline' style={{ color: '#2F6B3F', background: 'none', border: 'none', cursor: 'pointer' }}>
              Terms & Conditions
            </button>
            {' '}and{' '}
            <button className='font-semibold transition hover:underline' style={{ color: '#2F6B3F', background: 'none', border: 'none', cursor: 'pointer' }}>
              Privacy Policy
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
