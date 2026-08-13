'use client';

import { createContext, useState, useEffect } from 'react';

export const DeliveryContext = createContext();

export default function DeliveryContextProvider({ children }) {
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [codAvailable, setCodAvailable] = useState(true);
  const [isServiceable, setIsServiceable] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('deliveryPincode');
    const savedCity = localStorage.getItem('deliveryCity');
    const savedDelivery = localStorage.getItem('estimatedDelivery');
    const savedCod = localStorage.getItem('codAvailable');

    if (saved) {
      setDeliveryPincode(saved);
      setDeliveryCity(savedCity || 'Saved Location');
      setEstimatedDelivery(savedDelivery || calculateEstimatedDelivery());
      setCodAvailable(savedCod !== 'false');
      setIsServiceable(true);
    }
  }, []);

  // Calculate estimated delivery (placeholder for backend integration)
  const calculateEstimatedDelivery = () => {
    const today = new Date();
    const delivery = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return delivery.toLocaleDateString('en-IN', options);
  };

  // Check if pincode is serviceable (placeholder for courier API)
  const checkServiceability = async (pincode) => {
    setLoading(true);
    try {
      const result = await checkDeliveryServiceability(pincode);
      setIsServiceable(result.serviceable);
      
      if (result.serviceable) {
        setDeliveryPincode(pincode);
        setDeliveryCity(result.city || 'Location');
        setEstimatedDelivery(calculateEstimatedDelivery());
        setCodAvailable(result.codAvailable !== false);

        localStorage.setItem('deliveryPincode', pincode);
        localStorage.setItem('deliveryCity', result.city || 'Location');
        localStorage.setItem('estimatedDelivery', calculateEstimatedDelivery());
        localStorage.setItem('codAvailable', result.codAvailable !== false);
      }

      return result;
    } finally {
      setLoading(false);
    }
  };

  // Backend-ready serviceability check function
  const checkDeliveryServiceability = async (pincode) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Placeholder - replace with actual backend API call:
    /*
    const response = await fetch('/api/delivery/check-serviceability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pincode, source: 'warehouse' }),
    });
    const data = await response.json();
    
    if (!data.success) throw new Error(data.message);
    
    return {
      serviceable: data.serviceable,
      city: data.city,
      state: data.state,
      codAvailable: data.codAvailable,
      estimatedDays: data.estimatedDays,
      courier: data.courierPartner, // e.g., "XpressBees"
    };
    */

    // Mock response - ALL pincodes serviceable for now
    return {
      serviceable: true,
      city: 'Location',
      state: 'Unknown',
      codAvailable: true,
      estimatedDays: 3,
      courier: 'express',
    };
  };

  // Clear delivery selection
  const clearDelivery = () => {
    setDeliveryPincode('');
    setDeliveryCity('');
    setEstimatedDelivery('');
    setCodAvailable(true);
    setIsServiceable(null);
    localStorage.removeItem('deliveryPincode');
    localStorage.removeItem('deliveryCity');
    localStorage.removeItem('estimatedDelivery');
    localStorage.removeItem('codAvailable');
  };

  const value = {
    deliveryPincode,
    deliveryCity,
    estimatedDelivery,
    codAvailable,
    isServiceable,
    loading,
    checkServiceability,
    clearDelivery,
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
}
