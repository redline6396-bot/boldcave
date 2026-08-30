"use client";

import { X } from "lucide-react";

export default function CheckoutSheet({
  children,
  onClose,
  zIndex = 260,
  desktopHeight = "auto",
  desktopMaxHeight = "78vh",
  mobileFullPage = false,
  ariaLabel = "Close sheet",
  showClose = true,
}) {
  const resolvedHeight =
    typeof desktopHeight === "number"
      ? `${desktopHeight}px`
      : desktopHeight;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center overflow-x-hidden bg-black/55"
      style={{ zIndex }}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
        aria-label={ariaLabel}
      />

      {/* IMPORTANT:
          panel itself is overflow-visible so the seam X can actually be seen
          and clicked. The inner frame owns the clipping/rounding. */}
      <section
        className={[
          "checkout-sheet-panel relative z-10 w-full max-w-[100dvw] overflow-visible",
          mobileFullPage ? "checkout-sheet-mobile-full" : "",
        ].join(" ")}
        style={{
          "--sheet-desktop-height": resolvedHeight,
          "--sheet-desktop-max-height": desktopMaxHeight,
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div
          className={[
            "checkout-sheet-frame flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-white text-[#111b28]",
            mobileFullPage ? "" : "rounded-t-[18px]",
          ].join(" ")}
        >
          {children}
        </div>

        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="checkout-sheet-close absolute z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/90 shadow-[0_4px_14px_rgba(0,0,0,0.10)] backdrop-blur-[2px]"
            aria-label={ariaLabel}
          >
            <X className="h-5 w-5 text-black/80" strokeWidth={1.6} />
          </button>
        )}
      </section>

      <style jsx>{`
        .checkout-sheet-panel {
          max-height: 90svh;
          animation: sheetUpMobile 220ms ease-out;
        }

        .checkout-sheet-mobile-full {
          height: 100svh;
          max-height: 100svh;
        }

        .checkout-sheet-mobile-full .checkout-sheet-frame {
          border-radius: 0;
        }

        .checkout-sheet-close {
          left: 50%;
          top: 0;
          transform: translate(-50%, calc(-100% - 12px));
          pointer-events: auto;
        }

        .checkout-sheet-mobile-full .checkout-sheet-close {
          left: auto;
          right: 14px;
          top: 14px;
          transform: none;
        }

        @keyframes sheetUpMobile {
          from {
            opacity: 0.96;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (min-width: 640px) {
          .checkout-sheet-panel {
            position: fixed;
            left: 50%;
            bottom: calc(50% - min(380px, 45svh));
            width: 450px;
            height: var(--sheet-desktop-height);
            max-height: var(--sheet-desktop-max-height);
            transform: translateX(-50%);
            animation: sheetUpDesktop 220ms ease-out;
          }

          .checkout-sheet-frame {
            border-radius: 18px;
            box-shadow: 0 14px 45px rgba(0, 0, 0, 0.22);
          }

          .checkout-sheet-mobile-full {
            height: var(--sheet-desktop-height);
            max-height: var(--sheet-desktop-max-height);
          }

          .checkout-sheet-mobile-full .checkout-sheet-frame {
            border-radius: 18px;
          }

          .checkout-sheet-mobile-full .checkout-sheet-close {
            left: 50%;
            right: auto;
            top: 0;
            transform: translate(-50%, calc(-100% - 12px));
          }

          @keyframes sheetUpDesktop {
            from {
              opacity: 0.96;
              transform: translate(-50%, 28px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }
        }
      `}</style>
    </div>
  );
}
