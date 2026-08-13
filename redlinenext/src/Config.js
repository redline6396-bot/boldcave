'use client';

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailLink,
  isSignInWithEmailLink
} from 'firebase/auth';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPA3GSuCJMTRbHNK4FHYiP8OZGPS5k-YQ",
  authDomain: "greenvalleynaturals-ff19d.firebaseapp.com",
  projectId: "greenvalleynaturals-ff19d",
  storageBucket: "greenvalleynaturals-ff19d.firebasestorage.app",
  messagingSenderId: "401824913157",
  appId: "1:401824913157:web:e6fdee659d8fede67e896c",
  measurementId: "G-C67DL6E2CZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Provider with Account Selection
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Microsoft Provider with Account Selection
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.addScope('profile');
microsoftProvider.addScope('email');
microsoftProvider.setCustomParameters({
  prompt: 'select_account'
});

// Apple Provider with Account Selection
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');
appleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Generic Social Login (returns token)
export const socialLogin = async (provider) => {
  try {
    console.log('Opening popup for provider:', provider.providerId);
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const idToken = await user.getIdToken();
    console.log('Got token:', idToken);
    return idToken;
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.warn('User closed the popup');
    } else {
      console.error('Social login error:', error);
    }
    throw error;
  }
};

// Google Login Handler
export const handleGoogleLogin = async (setError) => {
  try {
    console.log('Google login started');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    console.log('Google login successful:', user.email);
    if (setError) setError('');
    return idToken;
  } catch (err) {
    console.error('Google Login Error:', err);
    const errorMessage = err.code === 'auth/popup-closed-by-user' 
      ? 'Login cancelled' 
      : 'Google Sign-In failed. ' + err.message;
    if (setError) setError(errorMessage);
    throw err;
  }
};

// Microsoft Login Handler
export const handleMicrosoftLogin = async (setError) => {
  try {
    console.log('Microsoft login started');
    const result = await signInWithPopup(auth, microsoftProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    console.log('Microsoft login successful:', user.email);
    if (setError) setError('');
    return idToken;
  } catch (err) {
    console.error('Microsoft Login Error:', err);
    const errorMessage = err.code === 'auth/popup-closed-by-user' 
      ? 'Login cancelled' 
      : 'Microsoft Sign-In failed. ' + err.message;
    if (setError) setError(errorMessage);
    throw err;
  }
};

// Apple Login Handler
export const handleAppleLogin = async (setError) => {
  try {
    console.log('Apple login started');
    const result = await signInWithPopup(auth, appleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    console.log('Apple login successful:', user.email);
    if (setError) setError('');
    return idToken;
  } catch (err) {
    console.error('Apple Login Error:', err);
    const errorMessage = err.code === 'auth/popup-closed-by-user' 
      ? 'Login cancelled' 
      : 'Apple Sign-In failed. ' + err.message;
    if (setError) setError(errorMessage);
    throw err;
  }
};

// Exports
export {
  auth,
  googleProvider,
  microsoftProvider,
  appleProvider,
  isSignInWithEmailLink,
  signInWithEmailLink
};
