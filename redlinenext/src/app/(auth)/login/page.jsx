"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PhoneOtpForm from "@/features/customer/auth/PhoneOtpForm";
import { useAuth } from "@/context/AuthContext";

const blockedRedirects = new Set(["/login", "/auth/login"]);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading } = useAuth();
  const requestedRedirect = searchParams.get("redirect") || "";
  const redirectTo =
    requestedRedirect && !blockedRedirects.has(requestedRedirect)
      ? requestedRedirect
      : "/profile";

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, loading, redirectTo, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-12 text-neutral-950">
      <div className="w-full max-w-[430px] border border-neutral-200 bg-white p-6 sm:p-8">
        <Link
          href="/"
          className="mb-8 inline-flex text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-500 transition-colors hover:text-neutral-950"
        >
          Back to home
        </Link>

        <PhoneOtpForm
          title="Login"
          subtitle="Use your phone number to access your Redline account."
          redirectTo={redirectTo}
        />
      </div>
    </main>
  );
}
