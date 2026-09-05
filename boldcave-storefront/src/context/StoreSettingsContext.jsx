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
const SETTINGS_STALE_AFTER_MS = 5 * 60 * 1000;

const normalizeStoreSettings = (settings) => ({
  acceptingOrders: settings?.acceptingOrders !== false,
  comingSoonMode: settings?.comingSoonMode === true,
  prepaidDiscount:
    settings?.prepaidDiscount || DEFAULT_PREPAID_DISCOUNT_SETTINGS,
  updatedAt: settings?.updatedAt || null,
});

export function StoreSettingsProvider({ children, initialSettings = null }) {
  const [settings, setSettings] = useState(() =>
    normalizeStoreSettings(initialSettings)
  );
  const [loading, setLoading] = useState(!initialSettings);
  const [lastFetchedAt, setLastFetchedAt] = useState(() =>
    initialSettings ? Date.now() : 0
  );

  const refreshStoreSettings = useCallback(async ({ force = false } = {}) => {
    if (!force && Date.now() - lastFetchedAt < SETTINGS_STALE_AFTER_MS) {
      return settings;
    }

    try {
      const nextSettings = await fetchStoreSettings();
      const normalizedSettings = normalizeStoreSettings(nextSettings);
      setSettings(normalizedSettings);
      setLastFetchedAt(Date.now());
      return normalizedSettings;
    } catch {
      setSettings((current) => current);
      return null;
    } finally {
      setLoading(false);
    }
  }, [lastFetchedAt, settings]);

  useEffect(() => {
    if (!initialSettings) {
      refreshStoreSettings({ force: true });
    }

    const refreshIfStale = () => refreshStoreSettings();
    const handleFocus = () => refreshIfStale();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfStale();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialSettings, refreshStoreSettings]);

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
