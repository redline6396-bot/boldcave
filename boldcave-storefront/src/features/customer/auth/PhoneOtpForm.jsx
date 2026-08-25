"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, X } from "lucide-react";
import { sendLoginOtp, verifyLoginOtp } from "@/lib/clientApi";
import { useAuth } from "@/context/AuthContext";

const RESEND_SECONDS = 30;
const OTP_LENGTH = 6;

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);

  return "";
};

const isValidPhone = (value) => /^[6-9]\d{9}$/.test(normalizePhone(value));

export default function PhoneOtpForm({
  title = "Login here!",
  subtitle = "Use your verified phone number to continue.",
  redirectTo = "",
  onDone,
  onClose,
  compactMobile = false,
  keyboardOpen = false,
}) {
  const { completeAuth } = useAuth();

  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState(
    Array.from({ length: OTP_LENGTH }, () => "")
  );
  const [message, setMessage] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [offersOptIn, setOffersOptIn] = useState(true);

  const phoneRef = useRef(null);
  const otpRefs = useRef([]);
  const authCardRef = useRef(null);
  const formSectionRef = useRef(null);

  const cleanPhone = normalizePhone(phone);
  const otp = otpDigits.join("");
  const phoneReady = isValidPhone(cleanPhone);
  const otpReady = otp.length === OTP_LENGTH;
  const brandSectionClass = compactMobile
    ? "relative flex min-h-[190px] flex-col justify-center bg-[#171717] px-6 py-4 text-white sm:min-h-[205px] sm:px-8 sm:py-4 md:min-h-[330px] md:px-8 md:py-7"
    : "relative flex min-h-[210px] flex-col justify-center bg-[#171717] px-6 py-5 text-white sm:min-h-[225px] sm:px-8 md:min-h-[330px] md:px-8 md:py-7";
  const brandMessageClass = compactMobile
    ? "mt-2.5 max-w-[215px] text-center text-[16px] font-medium leading-[1.3] sm:max-w-[260px] md:mt-4 md:text-[17px]"
    : "mt-3 max-w-[215px] text-center text-[16px] font-medium leading-[1.3] sm:max-w-[260px] md:mt-4 md:text-[17px]";
  const formSectionClass = compactMobile
    ? "relative flex min-h-[252px] items-center bg-white px-5 py-5 sm:min-h-[258px] sm:px-7 sm:py-5 md:min-h-[330px] md:px-8 md:py-6"
    : "relative flex min-h-[278px] items-center bg-white px-5 py-6 sm:px-7 sm:py-6 md:min-h-[330px] md:px-8 md:py-6";
  const phoneInputWrapClass = compactMobile
    ? "mt-4 flex h-[44px] min-w-0 overflow-hidden rounded-[8px] border border-neutral-300 bg-white transition-[border-color,box-shadow] focus-within:border-neutral-950 focus-within:shadow-[0_0_0_2px_rgba(0,0,0,0.06)] md:mt-[18px]"
    : "mt-[18px] flex h-[44px] min-w-0 overflow-hidden rounded-[8px] border border-neutral-300 bg-white transition-[border-color,box-shadow] focus-within:border-neutral-950 focus-within:shadow-[0_0_0_2px_rgba(0,0,0,0.06)]";
  const submitButtonClass = compactMobile
    ? "mt-2.5 h-[40px] w-full cursor-pointer rounded-[8px] border border-neutral-950 bg-neutral-950 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300 disabled:text-white disabled:opacity-100 md:mt-3"
    : "mt-3 h-[40px] w-full cursor-pointer rounded-[8px] border border-neutral-950 bg-neutral-950 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300 disabled:text-white disabled:opacity-100";
  const consentClass = compactMobile
    ? "mt-2.5 flex cursor-pointer items-center gap-2 text-left md:mt-3"
    : "mt-3 flex cursor-pointer items-center gap-2 text-left";
  const otpInputsClass = compactMobile
    ? "mt-4 flex justify-center gap-1.5 sm:gap-2 md:mt-5"
    : "mt-5 flex justify-center gap-1.5 sm:gap-2";
  const otpButtonClass = compactMobile
    ? "mt-4 h-[40px] w-full cursor-pointer rounded-[8px] border border-neutral-950 bg-neutral-950 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300 disabled:text-white disabled:opacity-100 md:mt-[18px]"
    : "mt-[18px] h-[40px] w-full cursor-pointer rounded-[8px] border border-neutral-950 bg-neutral-950 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300 disabled:text-white disabled:opacity-100";

  useEffect(() => {
    if (!compactMobile) {
      return undefined;
    }

    const card = authCardRef.current;

    if (!card) {
      return undefined;
    }

    if (!keyboardOpen) {
      card.scrollTo({ top: 0, behavior: "auto" });
      return undefined;
    }

    let timeoutId;
    let frameId;

    const bringFormIntoView = () => {
      frameId = window.requestAnimationFrame(() => {
        const currentCard = authCardRef.current;
        const formSection = formSectionRef.current;

        if (!currentCard || !formSection) {
          return;
        }

        const visibleBrandHeight = step === "otp" ? 88 : 112;
        const targetTop = Math.max(
          0,
          formSection.offsetTop - visibleBrandHeight
        );

        currentCard.scrollTo({
          top: targetTop,
          behavior: "auto",
        });
      });
    };

    bringFormIntoView();
    timeoutId = window.setTimeout(bringFormIntoView, 120);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [compactMobile, keyboardOpen, step]);

  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step, resendIn]);

  useEffect(() => {
    if (step !== "otp") {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      otpRefs.current[0]?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const resetOtp = () => {
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));

    window.requestAnimationFrame(() => {
      otpRefs.current[0]?.focus();
    });
  };

  const handleSendOtp = async (event) => {
    event?.preventDefault?.();

    if (!phoneReady) {
      setError("Enter a valid 10 digit Indian mobile number.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setDemoOtp("");

    try {
      const result = await sendLoginOtp(cleanPhone);
      setPhone(result.phone || cleanPhone);
      setDemoOtp(result.demoOtp || "");
      setResendIn(RESEND_SECONDS);
      setStep("otp");
      resetOtp();
    } catch (sendError) {
      setError(sendError.message || "Unable to send OTP right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading || resendIn > 0) return;

    setLoading(true);
    setError("");
    setMessage("");
    setDemoOtp("");

    try {
      const result = await sendLoginOtp(cleanPhone);
      setPhone(result.phone || cleanPhone);
      setDemoOtp(result.demoOtp || "");
      setResendIn(RESEND_SECONDS);
      resetOtp();
      setMessage("A new OTP has been sent.");
    } catch (sendError) {
      setError(sendError.message || "Unable to resend OTP right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (!otpReady) {
      setError("Enter the complete OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await verifyLoginOtp({ phone: cleanPhone, otp });
      await completeAuth(redirectTo);
      onDone?.();
    } catch (verifyError) {
      setError(verifyError.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const editPhone = () => {
    setStep("phone");
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    setError("");
    setMessage("");
    setDemoOtp("");
    setResendIn(RESEND_SECONDS);
  };

  const updateOtpDigit = (index, rawValue) => {
    const digit = String(rawValue || "").replace(/\D/g, "").slice(-1);

    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    event.preventDefault();

    const next = Array.from(
      { length: OTP_LENGTH },
      (_, index) => pasted[index] || ""
    );
    setOtpDigits(next);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
    window.setTimeout(() => otpRefs.current[focusIndex]?.focus(), 0);
  };

  return (
    <div
      ref={authCardRef}
      className="auth-card relative isolate grid w-full max-w-[760px] overflow-hidden rounded-[16px] bg-[#171717] shadow-[0_18px_55px_rgba(0,0,0,0.26)] md:grid-cols-[44%_56%]"
      style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close login"
          className="absolute right-2.5 top-2.5 z-20 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-950 shadow-[0_1px_5px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-opacity duration-150 hover:opacity-80"
        >
          <X className="h-4 w-4" strokeWidth={1.7} />
        </button>
      )}

      <section className={brandSectionClass}>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[58px] min-w-[84px] items-center justify-center md:h-[66px]">
            <img
              src="/images/brand/bold-cave-icon.png"
              alt="Bold Cave"
              className="h-[58px] w-[84px] object-contain md:h-[66px]"
            />
          </div>

          <p className={brandMessageClass}>
            Login now to access your account.
          </p>

        </div>
      </section>

      <section ref={formSectionRef} className={formSectionClass}>
        <div className="mx-auto w-full max-w-[320px]">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp}>
              <div className="text-center">
                <h1 className="text-[22px] font-medium tracking-[-0.025em] text-neutral-950 md:text-[23px]">
                  {title}
                </h1>
                <p className="mx-auto mt-1.5 max-w-[285px] text-[11.5px] leading-[17px] text-neutral-500">
                  {subtitle}
                </p>
              </div>

              <div className={phoneInputWrapClass}>
                <span className="flex h-full shrink-0 items-center border-r border-neutral-300 px-3 text-[16px] font-medium text-neutral-800 md:text-[14px]">
                  +91
                </span>
                <input
                  ref={phoneRef}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(event) => {
                    const next = String(event.target.value || "")
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setPhone(next);
                    if (error) setError("");
                  }}
                  placeholder="Enter Mobile Number"
                  className="h-full min-w-0 flex-1 bg-white px-3.5 text-[16px] text-neutral-950 outline-none placeholder:text-neutral-400 md:text-[14px]"
                />
              </div>

              <p className="mt-2 text-[10.5px] leading-4 text-neutral-500">
                We use your phone number for OTP authentication and account
                access.{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-neutral-700 underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
              </p>

              <button
                type="submit"
                disabled={loading || !phoneReady}
                className={submitButtonClass}
              >
                {loading ? "Sending..." : "Submit"}
              </button>

              <label className={consentClass}>
                <input
                  type="checkbox"
                  checked={offersOptIn}
                  onChange={(event) => setOffersOptIn(event.target.checked)}
                  className="h-[15px] w-[15px] shrink-0 cursor-pointer accent-black"
                />
                <span className="text-[11px] leading-4 text-neutral-600">
                  Send me optional offers &amp; updates
                </span>
              </label>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="text-center">
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-950 md:text-[23px]">
                  OTP Verification
                </h1>

                <div className="mt-2 flex flex-wrap items-center justify-center gap-1 text-[12px] leading-[18px] text-neutral-600">
                  <span>Verification code sent to +91 {cleanPhone}</span>
                  <button
                    type="button"
                    onClick={editPhone}
                    aria-label="Edit phone number"
                    className="inline-flex h-6 w-6 cursor-pointer items-center justify-center text-neutral-700 transition-opacity hover:opacity-60"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
                  </button>
                </div>
              </div>

              <div
                className={otpInputsClass}
                onPaste={handleOtpPaste}
              >
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(node) => {
                      otpRefs.current[index] = node;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={digit}
                    onChange={(event) =>
                      updateOtpDigit(index, event.target.value)
                    }
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    aria-label={`OTP digit ${index + 1}`}
                    className="h-[44px] w-[44px] rounded-[8px] border border-neutral-300 bg-white text-center text-[18px] font-medium text-neutral-950 outline-none transition-[border-color,box-shadow] focus:border-neutral-950 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] sm:h-[48px] sm:w-[48px]"
                  />
                ))}
              </div>

              <div className="mt-2.5 text-center">
                {resendIn > 0 ? (
                  <p className="text-[12px] text-neutral-600">
                    Resend OTP in {resendIn} Sec
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="cursor-pointer text-[12px] font-medium text-neutral-950 underline underline-offset-4 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !otpReady}
                className={otpButtonClass}
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>
          )}

          {message && (
            <p className="mt-3 text-center text-[11px] leading-4 text-neutral-600">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-3 text-center text-[11px] leading-4 text-red-600">
              {error}
            </p>
          )}

          {demoOtp && (
            <p className="mt-2.5 text-center text-[10px] text-neutral-400">
              Demo OTP: {demoOtp}
            </p>
          )}
        </div>
      </section>

      <style jsx>{`
        .auth-card {
          max-height: var(--auth-visual-max-height, calc(100dvh - 28px));
          border: 0;
          outline: 0;
          scrollbar-width: none;
        }

        .auth-card::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 767px) {
          .auth-card {
            width: 100%;
            overflow-y: auto;
          }
        }

        @media (max-width: 420px) {
          .auth-card {
            border-radius: 14px;
          }
        }
      `}</style>
    </div>
  );
}
