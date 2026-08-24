"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import PhoneOtpForm from "@/features/customer/auth/PhoneOtpForm";

const KEYBOARD_VIEWPORT_GAP = 10;
const MOBILE_MODAL_QUERY = "(max-width: 1023px)";

export default function AuthModal() {
  const { isAuthOpen, closeAuth, redirectAfterAuth } = useAuth();
  const [keyboardViewport, setKeyboardViewport] = useState(null);

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

  useEffect(() => {
    if (!isAuthOpen || typeof window === "undefined" || !window.visualViewport) {
      setKeyboardViewport(null);
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_MODAL_QUERY);
    const viewport = window.visualViewport;

    const updateKeyboardViewport = () => {
      if (!mediaQuery.matches) {
        setKeyboardViewport(null);
        return;
      }

      const keyboardOpen = viewport.height < window.innerHeight - 80;

      if (!keyboardOpen) {
        setKeyboardViewport(null);
        return;
      }

      const availableHeight = Math.max(280, viewport.height - KEYBOARD_VIEWPORT_GAP * 2);

      setKeyboardViewport({
        top: viewport.offsetTop + KEYBOARD_VIEWPORT_GAP,
        maxHeight: availableHeight,
      });
    };

    updateKeyboardViewport();
    viewport.addEventListener("resize", updateKeyboardViewport);
    viewport.addEventListener("scroll", updateKeyboardViewport);
    mediaQuery.addEventListener("change", updateKeyboardViewport);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardViewport);
      viewport.removeEventListener("scroll", updateKeyboardViewport);
      mediaQuery.removeEventListener("change", updateKeyboardViewport);
    };
  }, [isAuthOpen]);

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

      <div
        className={[
          "fixed left-1/2 z-[141] flex w-[calc(100%_-_20px)] max-w-[760px] -translate-x-1/2 justify-center",
          keyboardViewport
            ? "items-start overflow-y-auto"
            : "top-1/2 -translate-y-1/2",
        ].join(" ")}
        style={
          keyboardViewport
            ? {
                top: `${keyboardViewport.top}px`,
                maxHeight: `${keyboardViewport.maxHeight}px`,
                "--auth-visual-max-height": `${keyboardViewport.maxHeight}px`,
              }
            : undefined
        }
      >
        <PhoneOtpForm
          title="Login here!"
          subtitle="Use your verified phone number to continue."
          redirectTo={redirectAfterAuth}
          onClose={closeAuth}
          compactMobile
        />
      </div>
    </>
  );
}
