"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchStoreSettings } from "@/lib/clientApi";
import { DEFAULT_PREPAID_DISCOUNT_SETTINGS } from "@/lib/orders/paymentDiscounts";

const StoreSettingsContext = createContext(null);

export function StoreSettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    acceptingOrders: true,
    prepaidDiscount: DEFAULT_PREPAID_DISCOUNT_SETTINGS,
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);

  const refreshStoreSettings = useCallback(async () => {
    try {
      const nextSettings = await fetchStoreSettings();
      const normalizedSettings = {
        acceptingOrders: nextSettings?.acceptingOrders !== false,
        prepaidDiscount:
          nextSettings?.prepaidDiscount || DEFAULT_PREPAID_DISCOUNT_SETTINGS,
        updatedAt: nextSettings?.updatedAt || null,
      };
      setSettings(normalizedSettings);
      return normalizedSettings;
    } catch {
      setSettings((current) => current);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStoreSettings();

    const handleFocus = () => refreshStoreSettings();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshStoreSettings();
      }
    };
    const intervalId = window.setInterval(refreshStoreSettings, 30000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshStoreSettings]);

  const value = useMemo(
    () => ({
      ...settings,
      loading,
      refreshStoreSettings,
    }),
    [loading, refreshStoreSettings, settings]
  );

  return (
    <StoreSettingsContext.Provider value={value}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);

  if (!context) {
    throw new Error("useStoreSettings must be used within StoreSettingsProvider");
  }

  return context;
}
