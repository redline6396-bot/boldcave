"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import PhoneOtpForm from "@/features/customer/auth/PhoneOtpForm";

export default function AuthModal() {
  const { isAuthOpen, closeAuth, redirectAfterAuth } = useAuth();

  useEffect(() => {
    if (!isAuthOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeAuth();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeAuth, isAuthOpen]);

  if (!isAuthOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close login overlay"
        onClick={closeAuth}
        className="fixed inset-0 z-[140] cursor-pointer bg-black/55"
      />

      <div className="fixed left-1/2 top-1/2 z-[141] flex w-[calc(100%_-_20px)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 justify-center">
        <PhoneOtpForm
          title="Login here!"
          subtitle="Use your verified phone number to continue."
          redirectTo={redirectAfterAuth}
          onClose={closeAuth}
        />
      </div>
    </>
  );
}