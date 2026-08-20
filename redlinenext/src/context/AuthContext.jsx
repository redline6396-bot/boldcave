"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, logoutCurrentUser } from "@/lib/clientApi";

const AuthContext = createContext(undefined);

function normalizeRedirectTarget(value) {
  const target = String(value || "").trim();

  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return "";
  }

  return target;
}

export default function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [redirectAfterAuth, setRedirectAfterAuth] = useState("");

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      return currentUser;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser().catch(() => {
      setUser(null);
      setLoading(false);
    });
  }, [refreshUser]);

  const openAuth = useCallback((redirectTo = "") => {
    setRedirectAfterAuth(normalizeRedirectTarget(redirectTo));
    setIsAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setIsAuthOpen(false);
    setRedirectAfterAuth("");
  }, []);

  const completeAuth = useCallback(
    async (redirectTo) => {
      const currentUser = await refreshUser();
      setIsAuthOpen(false);

      const target = normalizeRedirectTarget(redirectTo || redirectAfterAuth);
      setRedirectAfterAuth("");

      if (target) {
        router.push(target);
      }

      return currentUser;
    },
    [redirectAfterAuth, refreshUser, router]
  );

  const logout = useCallback(async () => {
    await logoutCurrentUser();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAuthOpen,
      redirectAfterAuth,
      refreshUser,
      openAuth,
      closeAuth,
      completeAuth,
      logout,
    }),
    [
      closeAuth,
      completeAuth,
      isAuthOpen,
      loading,
      logout,
      openAuth,
      redirectAfterAuth,
      refreshUser,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
