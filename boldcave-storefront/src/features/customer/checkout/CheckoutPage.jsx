"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  LockKeyhole,
  Loader2,
  Pencil,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useCoupon } from "@/context/CouponContext";
import { useStoreSettings } from "@/context/StoreSettingsContext";
import {
  checkShippingServiceability,
  createRazorpayCheckout,
  placeCodOrder,
  sendLoginOtp,
  updateCurrentUser,
  verifyLoginOtp,
  verifyPhoneOtp,
  verifyRazorpayCheckout,
} from "@/lib/clientApi";
import {
  calculateDiscountBreakdown,
} from "@/lib/orders/paymentDiscounts";
import CouponSection from "@/features/customer/checkout/CouponSection";
import DeliveryAddress, {
  emptyAddress,
  normalizeAddress,
  validateCheckoutAddress,
} from "@/features/customer/checkout/DeliveryAddress";
import OrderSummary from "@/features/customer/checkout/OrderSummary";
import PaymentMethod from "@/features/customer/checkout/PaymentMethod";
import CheckoutSheet from "@/features/customer/checkout/CheckoutSheet";

const RAZORPAY_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const DEMO_PINCODES = {
  "110017": { city: "SOUTH DELHI", state: "DELHI" },
  "251001": { city: "MUZAFFARNAGAR", state: "UTTAR PRADESH" },
  "122001": { city: "GURUGRAM", state: "HARYANA" },
  "400001": { city: "MUMBAI", state: "MAHARASHTRA" },
  "560001": { city: "BENGALURU", state: "KARNATAKA" },
};

const money = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits:
      Math.round((Number(value) || 0) * 100) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");

  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);

  return "";
};

const isValidPhone = (value) =>
  /^[6-9]\d{9}$/.test(normalizePhone(value));

const cartPayload = (cart) =>
  cart.map(({ productId, size, quantity }) => ({
    productId,
    size,
    quantity,
  }));

function loadRazorpayScript() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Razorpay can only be opened in the browser.")
    );
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", resolve, {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () =>
          reject(
            new Error("Unable to load Razorpay. Please retry.")
          ),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Unable to load Razorpay. Please retry."));
    document.body.appendChild(script);
  });
}

function getCheckoutErrorMessage(error) {
  if (error?.code === "STOCK_CHANGED") {
    return "Some cart items changed. Review the updated cart and try again.";
  }

  return (
    error?.message || "Unable to complete checkout. Please retry."
  );
}

function extractLocation(result = {}) {
  return {
    city:
      result.city ||
      result.location?.city ||
      result.destination?.city ||
      result.data?.city ||
      "",
    state:
      result.state ||
      result.location?.state ||
      result.destination?.state ||
      result.data?.state ||
      "",
  };
}

export default function CheckoutPage({ onClose, onSuccess } = {}) {
  const router = useRouter();
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    refreshUser,
  } = useAuth();

  const {
    cart,
    clearCart,
    getCartItems,
    getCartTotal,
    removeFromCart,
    updateQuantity,
  } = useCart();

  const { appliedCoupon, discount, removeCoupon, revalidateCoupon } = useCoupon();
  const {
    acceptingOrders,
    prepaidDiscount: prepaidDiscountSettings,
    loading: storeSettingsLoading,
    refreshStoreSettings,
  } = useStoreSettings();

  const [address, setAddress] = useState(emptyAddress);
  const [selectedAddressIndex, setSelectedAddressIndex] =
    useState("new");
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  const [serviceability, setServiceability] = useState({
    status: "idle",
    message: "",
    code: "",
    result: null,
    pincode: "",
  });

  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] =
    useState("");

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState(
    Array.from({ length: OTP_LENGTH }, () => "")
  );
  const [otpDemoCode, setOtpDemoCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const otpRefs = useRef([]);
  const checkoutPhoneRef = useRef(null);
  const checkoutPhoneInitializedRef = useRef(false);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatesOptIn, setUpdatesOptIn] = useState(true);

  const items = getCartItems();
  const subtotal = getCartTotal();
  const discountBreakdown = calculateDiscountBreakdown({
    subtotal,
    couponDiscount: Math.max(0, Number(discount) || 0),
    shipping: 0,
    paymentMethod,
    prepaidDiscountSettings,
  });
  const couponDiscount = discountBreakdown.couponDiscount;
  const prepaidDiscount = discountBreakdown.prepaidDiscount;
  const total = discountBreakdown.finalAmount;
  const couponCode = appliedCoupon?.code || "";

  const itemCount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const mrpTotal = items.reduce((sum, item) => {
    const mrp = Number(
      item.variant?.mrp ?? item.variant?.sellingPrice ?? 0
    );
    return sum + mrp * Number(item.quantity || 0);
  }, 0);

  const totalSaved = Math.max(0, mrpTotal - total);
  const hasUnresolvedCart = cart.length > 0 && items.length === 0;
  const isEmpty = !hasUnresolvedCart && items.length === 0;

  const normalizedAddress = useMemo(
    () => normalizeAddress(address),
    [address]
  );

  const addressError = useMemo(
    () => validateCheckoutAddress(normalizedAddress),
    [normalizedAddress]
  );

  const codAvailable =
    serviceability.status === "serviceable"
      ? serviceability.result?.couriers?.some(
          (courier) => courier.cod
        ) !== false
      : null;

  const isSameAccountPhone =
    isAuthenticated &&
    Boolean(user?.phone) &&
    normalizePhone(checkoutPhone) === normalizePhone(user.phone);

  useEffect(() => {
    if (!appliedCoupon?.code) return;
    revalidateCoupon({ paymentMethod });
  }, [
    appliedCoupon?.code,
    paymentMethod,
    prepaidDiscountSettings?.allowCouponStacking,
    prepaidDiscountSettings?.discountType,
    prepaidDiscountSettings?.discountValue,
    prepaidDiscountSettings?.enabled,
    revalidateCoupon,
    subtotal,
  ]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !user?.phone ||
      phoneTouched ||
      checkoutPhoneInitializedRef.current
    ) {
      return;
    }

    const accountPhone = normalizePhone(user.phone);

    setCheckoutPhone(accountPhone);
    setPhoneVerified(false);
    setPhoneVerificationToken("");
    checkoutPhoneInitializedRef.current = true;
  }, [isAuthenticated, phoneTouched, user?.phone]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const savedAddresses = user.addresses || [];
    const defaultIndex = savedAddresses.findIndex(
      (entry) => entry.isDefault
    );
    const firstIndex = defaultIndex >= 0 ? defaultIndex : 0;

    if (savedAddresses[firstIndex]) {
      setSelectedAddressIndex(firstIndex);
      setAddress(normalizeAddress(savedAddresses[firstIndex]));
      return;
    }

    setSelectedAddressIndex("new");
    setAddress(
      normalizeAddress({
        ...emptyAddress,
        fullName: [user.firstName, user.lastName]
          .filter(Boolean)
          .join(" "),
        email: user.email || "",
        isDefault: true,
      })
    );
  }, [user]);

  useEffect(() => {
    if (!otpOpen || resendIn <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpOpen, resendIn]);

  useEffect(() => {
    if (!otpOpen) return undefined;

    const frame = window.requestAnimationFrame(() => {
      otpRefs.current[0]?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [otpOpen]);

  useEffect(() => {
    if (phoneVerified || otpOpen) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      checkoutPhoneRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [otpOpen, phoneVerified]);

  const resetOtp = useCallback(() => {
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));

    window.requestAnimationFrame(() => {
      otpRefs.current[0]?.focus();
    });
  }, []);

  const reconcileStock = useCallback(
    (details) => {
      const stockItems = details?.items || [];
      let changed = false;

      stockItems.forEach((item) => {
        const productId = String(item.productId || "").trim();
        const size = item.size;
        const availableStock = Number(item.availableStock);

        if (!productId || !size) return;

        if (
          Number.isFinite(availableStock) &&
          availableStock > 0
        ) {
          updateQuantity(productId, size, availableStock);
          changed = true;
          return;
        }

        removeFromCart(productId, size);
        changed = true;
      });

      return changed;
    },
    [removeFromCart, updateQuantity]
  );

  const handleError = useCallback(
    (checkoutError) => {
      if (checkoutError?.code === "STOCK_CHANGED") {
        const changed = reconcileStock(checkoutError.details);
        setError(
          changed
            ? "Stock changed. Your cart was updated; review it and try again."
            : "Stock changed. Review your cart and try again."
        );
        return;
      }

      setError(getCheckoutErrorMessage(checkoutError));
    },
    [reconcileStock]
  );

  const handleCheckServiceability = useCallback(
    async (addressOverride = normalizedAddress) => {
      const candidate = normalizeAddress(addressOverride);
      const pin = candidate.pincode;

      setError("");
      setNotice("");

      if (!/^\d{6}$/.test(pin)) {
        const invalidResult = {
          serviceable: false,
          message: "Enter a valid 6 digit pincode.",
          city: "",
          state: "",
        };

        setServiceability({
          status: "invalid",
          message: invalidResult.message,
          code: "INVALID_PINCODE",
          result: null,
          pincode: pin,
        });

        return invalidResult;
      }

      setServiceability({
        status: "checking",
        message: "Checking delivery...",
        code: "",
        result: null,
        pincode: pin,
      });

      try {
        const result = await checkShippingServiceability({
          pincode: pin,
          cod: false,
          items: getCartItems().map((item) => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
          })),
        });

        const location = extractLocation(result);

        if (result.serviceable) {
          setServiceability({
            status: "serviceable",
            message:
              result.message ||
              "Delivery is available for this pincode.",
            code: result.code || "SERVICEABLE",
            result,
            pincode: pin,
          });

          return {
            serviceable: true,
            message:
              result.message ||
              "Delivery is available for this pincode.",
            ...location,
            raw: result,
          };
        }

        const unavailable = {
          serviceable: false,
          message:
            result.message ||
            "This pincode is not serviceable right now.",
          ...location,
          raw: result,
        };

        setServiceability({
          status: "unserviceable",
          message: unavailable.message,
          code: result.code || "VALID_BUT_UNSERVICEABLE",
          result,
          pincode: pin,
        });

        return unavailable;
      } catch (shippingError) {
        const invalid = shippingError.code === "INVALID_PINCODE";

        if (!invalid) {
          const providerLocation = extractLocation(shippingError.details || {});
          const demoLocation = providerLocation.city || providerLocation.state
            ? providerLocation
            : (DEMO_PINCODES[pin] || {
                city: candidate.city || "",
                state: candidate.state || "",
              });

          const demoResult = {
            serviceable: true,
            message: "Delivery available",
            city: demoLocation.city,
            state: demoLocation.state,
            couriers: [{ cod: true }],
            demo: true,
          };

          setServiceability({
            status: "serviceable",
            message: "Delivery available",
            code: "DEMO_SERVICEABLE",
            result: demoResult,
            pincode: pin,
          });

          return demoResult;
        }

        const providerResult = {
          serviceable: false,
          message: invalid
            ? "Enter a valid 6 digit pincode."
            : "Unable to check delivery right now. Please retry.",
          city: "",
          state: "",
        };

        setServiceability({
          status: invalid ? "invalid" : "error",
          message: providerResult.message,
          code: invalid
            ? "INVALID_PINCODE"
            : shippingError.code || "PROVIDER_ERROR",
          result: null,
          pincode: pin,
        });

        return providerResult;
      }
    },
    [getCartItems, normalizedAddress]
  );

  useEffect(() => {
    if (
      !phoneVerified ||
      !/^\d{6}$/.test(normalizedAddress.pincode) ||
      serviceability.status !== "idle"
    ) {
      return;
    }

    handleCheckServiceability(normalizedAddress);
  }, [
    handleCheckServiceability,
    normalizedAddress,
    phoneVerified,
    serviceability.status,
  ]);

  const handlePersistAddress = useCallback(
    async (nextAddress, editingIndex) => {
      if (!user) {
        throw new Error("Please verify your phone number first.");
      }

      const currentAddresses = user.addresses || [];
      const normalized = {
        ...normalizeAddress(nextAddress),
        isDefault:
          Boolean(nextAddress.isDefault) ||
          currentAddresses.length === 0,
      };

      let nextAddresses;
      let nextIndex;

      if (
        Number.isInteger(editingIndex) &&
        currentAddresses[editingIndex]
      ) {
        nextIndex = editingIndex;
        nextAddresses = currentAddresses.map((entry, index) =>
          index === editingIndex
            ? {
                ...entry,
                ...normalized,
                isDefault: Boolean(
                  normalized.isDefault || entry.isDefault
                ),
              }
            : entry
        );
      } else {
        nextIndex = currentAddresses.length;
        nextAddresses = [...currentAddresses, normalized];
      }

      if (
        nextAddresses.length &&
        !nextAddresses.some((entry) => entry.isDefault)
      ) {
        nextAddresses[0] = {
          ...nextAddresses[0],
          isDefault: true,
        };
      }

      await updateCurrentUser({ addresses: nextAddresses });
      await refreshUser();

      return nextIndex;
    },
    [refreshUser, user]
  );

  const openOtpForPhone = useCallback(async () => {
    const cleanPhone = normalizePhone(checkoutPhone);

    if (!isValidPhone(cleanPhone)) {
      setError("Enter a valid 10 digit Indian mobile number.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    setError("");

    try {
      const result = await sendLoginOtp(cleanPhone);
      setOtpDemoCode(result.demoOtp || "");
      setCheckoutPhone(result.phone || cleanPhone);
      setResendIn(RESEND_SECONDS);
      resetOtp();
      setOtpOpen(true);
    } catch (sendError) {
      setError(sendError.message || "Unable to send OTP right now.");
    } finally {
      setOtpLoading(false);
    }
  }, [checkoutPhone, resetOtp]);

  const handlePhoneContinue = useCallback(async () => {
    const cleanPhone = normalizePhone(checkoutPhone);

    if (!isValidPhone(cleanPhone)) {
      setError("Enter a valid 10 digit Indian mobile number.");
      return;
    }

    if (
      isAuthenticated &&
      user?.phoneVerified &&
      normalizePhone(user?.phone) === cleanPhone
    ) {
      setPhoneVerified(true);
      setPhoneVerificationToken("");
      setError("");
      return;
    }

    await openOtpForPhone();
  }, [
    checkoutPhone,
    isAuthenticated,
    openOtpForPhone,
    user?.phone,
    user?.phoneVerified,
  ]);

  const handleResendOtp = useCallback(async () => {
    if (resendIn > 0 || otpLoading) return;

    setOtpLoading(true);
    setOtpError("");

    try {
      const result = await sendLoginOtp(
        normalizePhone(checkoutPhone)
      );
      setOtpDemoCode(result.demoOtp || "");
      setResendIn(RESEND_SECONDS);
      resetOtp();
    } catch (sendError) {
      setOtpError(
        sendError.message || "Unable to resend OTP right now."
      );
    } finally {
      setOtpLoading(false);
    }
  }, [checkoutPhone, otpLoading, resendIn, resetOtp]);

  const handleVerifyOtp = useCallback(async () => {
    const cleanOtp = otpDigits.join("");
    const cleanPhone = normalizePhone(checkoutPhone);

    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(cleanOtp)) {
      setOtpError("Enter the complete 6 digit OTP.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const alternateLoggedInNumber =
        isAuthenticated &&
        normalizePhone(user?.phone) !== cleanPhone;

      if (alternateLoggedInNumber) {
        const result = await verifyPhoneOtp({
          phone: cleanPhone,
          otp: cleanOtp,
        });
        if (!result.phoneVerificationToken) {
          throw new Error("Checkout phone verification could not be completed.");
        }
        setPhoneVerificationToken(result.phoneVerificationToken);
      } else {
        await verifyLoginOtp({
          phone: cleanPhone,
          otp: cleanOtp,
        });
        await refreshUser();
        setPhoneVerificationToken("");
      }

      setPhoneVerified(true);
      setOtpOpen(false);
      setOtpDemoCode("");
      resetOtp();
    } catch (verifyError) {
      setOtpError(
        verifyError.message || "OTP verification failed."
      );
    } finally {
      setOtpLoading(false);
    }
  }, [
    checkoutPhone,
    isAuthenticated,
    otpDigits,
    refreshUser,
    resetOtp,
    user?.phone,
  ]);

  const updateOtpDigit = (index, rawValue) => {
    const digit = String(rawValue || "")
      .replace(/\D/g, "")
      .slice(-1);

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
    if (event.key === "Enter") {
      event.preventDefault();
      if (!otpLoading) {
        handleVerifyOtp();
      }
      return;
    }

    if (
      event.key === "Backspace" &&
      !otpDigits[index] &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    event.preventDefault();

    setOtpDigits(
      Array.from(
        { length: OTP_LENGTH },
        (_, index) => pasted[index] || ""
      )
    );

    window.requestAnimationFrame(() => {
      otpRefs.current[
        Math.min(pasted.length, OTP_LENGTH) - 1
      ]?.focus();
    });
  };

  const handleCheckoutClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }

    router.back();
  }, [onClose, router]);

  const handleCheckoutBack = useCallback(() => {
    if (otpOpen) {
      setOtpOpen(false);
      setOtpError("");
      setOtpDemoCode("");
      return;
    }

    if (phoneVerified) {
      setPhoneVerified(false);
      setPhoneVerificationToken("");
      setError("");
      setNotice("");
      return;
    }

    setExitConfirmOpen(true);
  }, [otpOpen, phoneVerified]);

  const completeSuccess = useCallback(() => {
    clearCart();
    removeCoupon();
    setPhoneTouched(false);
    setPhoneVerified(false);
    setPhoneVerificationToken("");
    setOtpOpen(false);
    setOtpDemoCode("");

    if (onSuccess) {
      onSuccess();
      return;
    }

    router.push("/orders");
  }, [clearCart, onSuccess, removeCoupon, router]);

  const ensureReady = useCallback(async () => {
    setError("");
    setNotice("");

    if (!isAuthenticated) {
      setError("Verify your phone number to continue.");
      return false;
    }

    if (!phoneVerified) {
      setError("Verify the checkout phone number to continue.");
      return false;
    }

    if (isEmpty || hasUnresolvedCart) {
      setError("Your cart is empty.");
      return false;
    }

    const latestStoreSettings = await refreshStoreSettings();
    if (
      latestStoreSettings?.acceptingOrders === false ||
      acceptingOrders === false
    ) {
      setError("We are currently not accepting orders. Please check back soon.");
      return false;
    }

    if (addressError) {
      setError(addressError);
      return false;
    }

    if (
      serviceability.status !== "serviceable" ||
      serviceability.pincode !== normalizedAddress.pincode
    ) {
      const checked = await handleCheckServiceability(
        normalizedAddress
      );

      if (!checked?.serviceable) {
        setError(
          checked?.message ||
            "This address is not serviceable right now."
        );
        return false;
      }
    }

    if (paymentMethod === "cod" && codAvailable === false) {
      setError(
        "Cash on Delivery is not available for this pincode."
      );
      return false;
    }

    return true;
  }, [
    addressError,
    codAvailable,
    handleCheckServiceability,
    hasUnresolvedCart,
    isAuthenticated,
    isEmpty,
    normalizedAddress,
    paymentMethod,
    phoneVerified,
    acceptingOrders,
    refreshStoreSettings,
    serviceability.pincode,
    serviceability.status,
  ]);

  const handleCodSubmit = useCallback(async () => {
    const ready = await ensureReady();
    if (!ready) return;

    setSubmitting(true);

    try {
      await placeCodOrder({
        items: cartPayload(cart),
        address: normalizedAddress,
        phone: normalizePhone(checkoutPhone),
        phoneVerificationToken,
        couponCode,
      });

      completeSuccess();
    } catch (codError) {
      handleError(codError);
    } finally {
      setSubmitting(false);
    }
  }, [
    cart,
    checkoutPhone,
    completeSuccess,
    couponCode,
    ensureReady,
    handleError,
    normalizedAddress,
    phoneVerificationToken,
  ]);

  const handleRazorpaySubmit = useCallback(async () => {
    const ready = await ensureReady();
    if (!ready) return;

    setSubmitting(true);

    try {
      await loadRazorpayScript();

      const checkout = await createRazorpayCheckout({
        items: cartPayload(cart),
        address: normalizedAddress,
        phone: normalizePhone(checkoutPhone),
        phoneVerificationToken,
        couponCode,
      });

      const razorpay = checkout.razorpay || {};

      if (!razorpay.keyId || !razorpay.orderId) {
        throw new Error(
          "Razorpay checkout could not be initialized."
        );
      }

      const instance = new window.Razorpay({
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency || "INR",
        name: "BRAND",
        description: `Order ${checkout.orderNumber || ""}`.trim(),
        order_id: razorpay.orderId,
        prefill: {
          name: normalizedAddress.fullName,
          email: normalizedAddress.email || user?.email || "",
          contact: normalizePhone(checkoutPhone),
        },
        notes: {
          internalOrderId: checkout.orderId,
          orderNumber: checkout.orderNumber,
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setNotice(
              "Payment was closed. Your cart is still here."
            );
          },
        },
        handler: async (response) => {
          try {
            await verifyRazorpayCheckout({
              orderId: checkout.orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id:
                response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            completeSuccess();
          } catch (verifyError) {
            handleError(verifyError);
            setSubmitting(false);
          }
        },
      });

      instance.on("payment.failed", (response) => {
        setError(
          response?.error?.description ||
            "Payment failed. Please retry."
        );
        setSubmitting(false);
      });

      instance.open();
    } catch (razorpayError) {
      handleError(razorpayError);
      setSubmitting(false);
    }
  }, [
    cart,
    checkoutPhone,
    completeSuccess,
    couponCode,
    ensureReady,
    handleError,
    normalizedAddress,
    phoneVerificationToken,
    user?.email,
  ]);

  const handleFinalSubmit = () => {
    if (submitting) return;

    if (paymentMethod === "cod") {
      handleCodSubmit();
      return;
    }

    handleRazorpaySubmit();
  };

  const finalDisabled =
    submitting ||
    authLoading ||
    !acceptingOrders ||
    !phoneVerified ||
    !isAuthenticated ||
    Boolean(addressError) ||
    serviceability.status === "checking" ||
    (paymentMethod === "cod" && codAvailable === false);

  if (!storeSettingsLoading && !acceptingOrders) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#f6f6f6] px-5">
        <div className="w-full max-w-[430px] rounded-[18px] bg-white p-7 text-center shadow-xl">
          <LockKeyhole className="mx-auto h-8 w-8" strokeWidth={1.5} />
          <h1 className="mt-4 text-[20px] font-semibold">
            Currently Not Accepting Orders
          </h1>
          <p className="mt-2 text-[13px] leading-5 text-[#66717e]">
            You can keep browsing and editing your cart, but new checkout is
            temporarily unavailable.
          </p>
          <Link
            href="/collection"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-black px-6 text-[13px] font-semibold text-white"
          >
            Continue browsing
          </Link>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#f6f6f6] px-5">
        <div className="w-full max-w-[420px] rounded-[18px] bg-white p-7 text-center shadow-xl">
          <ShoppingCart className="mx-auto h-8 w-8" strokeWidth={1.5} />
          <h1 className="mt-4 text-[20px] font-semibold">
            Your cart is empty
          </h1>
          <p className="mt-2 text-[13px] text-[#66717e]">
            Add a fragrance before starting checkout.
          </p>
          <Link
            href="/collection"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-black px-6 text-[13px] font-semibold text-white"
          >
            Shop now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 sm:p-5"
      style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="flex min-h-full items-stretch justify-center sm:items-center">
        <section className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#f7f8f9] text-[#111b28] sm:h-[760px] sm:min-h-0 sm:max-h-[90dvh] sm:max-w-[450px] sm:rounded-[18px] sm:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#e0e4e8] bg-white px-4 sm:px-5">
            <button
              type="button"
              onClick={handleCheckoutBack}
              className="flex cursor-pointer items-center gap-2.5"
            >
              <ChevronLeft
                className="h-5 w-5"
                strokeWidth={1.8}
              />
              <span className="flex h-6 w-[138px] items-center">
                <img
                  src="/images/brand/bold-cave-logo.png"
                  alt="Bold Cave"
                  className="block h-auto w-full brightness-0"
                />
              </span>
            </button>

            <span className="flex items-center gap-1.5 text-[12px] text-[#405064]">
              Secure Payment
              <LockKeyhole
                className="h-3.5 w-3.5"
                strokeWidth={1.7}
              />
            </span>
          </header>

          <div className="checkout-scroll min-h-0 flex-1 overflow-y-auto px-3.5 py-4 sm:px-4">
            {(error || notice) && (
              <div
                className={[
                  "mb-3 rounded-[10px] px-3.5 py-2.5 text-[12px] leading-4",
                  error
                    ? "bg-red-600 text-white"
                    : "bg-[#eef2f5] text-[#42505f]",
                ].join(" ")}
              >
                {error || notice}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSummaryOpen(true)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-[#d8dee5] bg-white px-4 py-3.5 text-left transition-[border-color,background-color] duration-150 hover:border-[#bec7d0] hover:bg-[#fcfcfd]"
            >
              <ShoppingCart
                className="h-[24px] w-[24px] shrink-0 text-[#304b67]"
                strokeWidth={1.6}
              />

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">
                  Order Summary
                </p>
                {totalSaved > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-[#eaf6ed] px-2 py-0.5 text-[10px] font-medium text-[#176b37]">
                    {money(totalSaved)} saved so far
                  </span>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[11px] text-[#65717e]">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  {mrpTotal > total && (
                    <span className="text-[10px] text-[#747f8a] line-through">
                      {money(mrpTotal)}
                    </span>
                  )}
                  <span className="text-[16px] font-medium">
                    {money(total)}
                  </span>
                </div>
              </div>

              <ChevronDown
                className="h-4 w-4 shrink-0"
                strokeWidth={1.7}
              />
            </button>

            {!phoneVerified && (
              <div className="mt-3">
                <CouponSection
                  disabled={hasUnresolvedCart || submitting}
                  paymentMethod={paymentMethod}
                  subtotal={subtotal}
                  showEligibleOffers={false}
                  identityHint="Verify your mobile to view eligible offers"
                />
              </div>
            )}

            {!phoneVerified ? (
              <section className="mt-3 rounded-[14px] border border-[#d8dee5] bg-white p-4">
                <div className="flex items-center gap-2.5">
                  <UserRound
                    className="h-[22px] w-[22px] text-[#304b67]"
                    strokeWidth={1.7}
                  />
                  <h2 className="text-[14px] font-medium">
                    {isAuthenticated
                      ? "Confirm mobile number"
                      : "Login to continue"}
                  </h2>
                </div>

                <label className="relative mt-4 block">
                  <span className="absolute -top-[7px] left-4 z-10 bg-white px-1 text-[10px] text-[#65717e]">
                    Enter Mobile Number
                  </span>

                  <div className="flex h-[52px] overflow-hidden rounded-[13px] border border-[#8f98a3] focus-within:border-[#111b28]">
                    <span className="flex h-full items-center px-3 text-[13px]">
                      +91
                    </span>
                    <span className="my-3 w-px bg-[#d5dae0]" />
                    <input
                      ref={checkoutPhoneRef}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      autoFocus
                      maxLength={10}
                      value={checkoutPhone}
                      onChange={(event) => {
                        const next = String(event.target.value || "")
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setCheckoutPhone(next);
                        setPhoneTouched(true);
                        setPhoneVerified(false);
                        setPhoneVerificationToken("");
                        setError("");
                      }}
                      className="min-w-0 flex-1 bg-white px-3 text-[14px] outline-none"
                    />
                  </div>
                </label>

                <p className="mt-2 text-[10px] leading-4 text-[#6b7580]">
                  We use contact and delivery information for order processing,
                  payment, fulfilment and delivery.{" "}
                  <Link
                    href="/privacy"
                    className="font-medium text-[#263443] underline underline-offset-2"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </section>
            ) : (
              <>
                <div className="mt-3">
                  <DeliveryAddress
                    active={phoneVerified}
                    user={user}
                    phone={normalizePhone(checkoutPhone)}
                    address={address}
                    setAddress={setAddress}
                    setSelectedAddressIndex={
                      setSelectedAddressIndex
                    }
                    serviceability={serviceability}
                    onCheckServiceability={
                      handleCheckServiceability
                    }
                    onPersistAddress={handlePersistAddress}
                  />
                </div>

                <div className="mt-3">
                  <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.025em] text-[#384555]">
                    Offers & rewards
                  </p>
                  <CouponSection
                    disabled={hasUnresolvedCart || submitting}
                    paymentMethod={paymentMethod}
                    subtotal={subtotal}
                    showEligibleOffers={isAuthenticated && phoneVerified}
                  />
                </div>

                {serviceability.status === "serviceable" &&
                  !addressError && (
                    <div className="mt-4">
                      <PaymentMethod
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        codAvailable={codAvailable}
                        serviceable
                        disabled={submitting}
                        prepaidDiscountSettings={prepaidDiscountSettings}
                      />
                    </div>
                  )}
              </>
            )}
          </div>

          <footer className="shrink-0 border-t border-[#e0e4e8] bg-white px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-3">
            <label className="mb-3 flex cursor-pointer items-center gap-2.5 text-[11px] text-[#263443] sm:text-[12px]">
              <input
                type="checkbox"
                checked={updatesOptIn}
                onChange={(event) => setUpdatesOptIn(event.target.checked)}
                className="sr-only"
              />
              <span
                className={[
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                  updatesOptIn
                    ? "border-black bg-black text-white"
                    : "border-[#68727d] bg-white text-transparent",
                ].join(" ")}
              >
                <Check className="h-[12px] w-[12px]" strokeWidth={2.4} />
              </span>
              <span>Send me optional offers &amp; marketing updates</span>
            </label>

            {!phoneVerified ? (
              <button
                type="button"
                onClick={handlePhoneContinue}
                disabled={otpLoading || !isValidPhone(checkoutPhone)}
                className="flex h-[44px] w-full cursor-pointer items-center justify-center rounded-[8px] bg-black text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#aeb0b3]"
              >
                {otpLoading ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      strokeWidth={1.8}
                    />
                    Sending OTP...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={finalDisabled}
                className="flex h-[44px] w-full cursor-pointer items-center justify-center rounded-[8px] bg-black text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#aeb0b3]"
              >
                {submitting ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      strokeWidth={1.8}
                    />
                    Processing...
                  </>
                ) : paymentMethod === "cod" ? (
                  "Place Order"
                ) : (
                  "Continue to Payment"
                )}
              </button>
            )}

            <p className="mt-2 text-center text-[9px] leading-4 text-[#66717e] sm:text-[10px]">
              By proceeding, I agree to the{" "}
              <Link
                href="/privacy"
                className="text-[#263443] underline underline-offset-2"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms"
                className="text-[#263443] underline underline-offset-2"
              >
                T&amp;C
              </Link>
            </p>
          </footer>
        </section>
      </div>

      <OrderSummary
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        items={items}
        subtotal={subtotal}
        discount={couponDiscount}
        prepaidDiscount={prepaidDiscount}
        total={total}
        couponCode={couponCode}
        shipping={0}
      />

      {otpOpen && (
        <OtpSheet
          phone={normalizePhone(checkoutPhone)}
          digits={otpDigits}
          refs={otpRefs}
          onDigitChange={updateOtpDigit}
          onKeyDown={handleOtpKeyDown}
          onPaste={handleOtpPaste}
          onEdit={() => {
            setOtpOpen(false);
            setOtpError("");
            setOtpDemoCode("");
            setPhoneVerified(false);
            setPhoneVerificationToken("");
          }}
          onClose={() => {
            setOtpOpen(false);
            setOtpError("");
            setOtpDemoCode("");
          }}
          resendIn={resendIn}
          onResend={handleResendOtp}
          loading={otpLoading}
          error={otpError}
          demoOtp={otpDemoCode}
          onVerify={handleVerifyOtp}
        />
      )}

      {exitConfirmOpen && (
        <ExitConfirm
          onStay={() => setExitConfirmOpen(false)}
          onLeave={handleCheckoutClose}
        />
      )}

      <style jsx>{`
        .checkout-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .checkout-scroll::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>
    </div>
  );
}

function OtpSheet({
  phone,
  digits,
  refs,
  onDigitChange,
  onKeyDown,
  onPaste,
  onEdit,
  onClose,
  resendIn,
  onResend,
  loading,
  error,
  demoOtp,
  onVerify,
}) {
  return (
    <CheckoutSheet
      onClose={onClose}
      zIndex={270}
      desktopHeight={352}
      desktopMaxHeight="62vh"
      ariaLabel="Close OTP"
    >
      <div className="flex h-full flex-col px-5 pb-5 pt-6 text-center sm:px-8 sm:pb-5 sm:pt-6">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#f2f3f4] text-[#273342]">
          <LockKeyhole className="h-[17px] w-[17px]" strokeWidth={1.7} />
        </div>

        <h2 className="mt-3 text-[18px] font-semibold">
          Verify number securely
        </h2>

        <p className="mt-1 text-[12px] text-[#697582]">
          Enter OTP sent to{" "}
          <span className="font-medium text-[#253342]">
            +91 {phone}
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="ml-1 inline-flex cursor-pointer align-middle"
            aria-label="Edit phone"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
        </p>

        <div
          className="mt-4 flex justify-center gap-2"
          onPaste={onPaste}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(event) =>
                onDigitChange(index, event.target.value)
              }
              onKeyDown={(event) => onKeyDown(index, event)}
              className="h-[46px] w-[41px] rounded-[9px] border border-[#c4ccd5] bg-white text-center text-[17px] font-medium outline-none transition-[border-color,box-shadow] focus:border-[#111b28] focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] sm:h-[48px] sm:w-[42px]"
            />
          ))}
        </div>

        <div className="mt-2.5 text-[11px] text-[#66717e]">
          {resendIn > 0 ? (
            <span>
              Resend OTP in 00:{String(resendIn).padStart(2, "0")}
            </span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={loading}
              className="cursor-pointer font-medium underline underline-offset-4 disabled:opacity-40"
            >
              Resend OTP
            </button>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-[10px] leading-4 text-red-600">
            {error}
          </p>
        )}

        {demoOtp && (
          <p className="mt-1.5 text-[10px] text-[#939ba3]">
            Demo OTP: {demoOtp}
          </p>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={onVerify}
            disabled={
              loading || digits.join("").length !== OTP_LENGTH
            }
            className="h-10 w-full cursor-pointer rounded-[8px] bg-black text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#b4b4b4]"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>
    </CheckoutSheet>
  );
}

function ExitConfirm({ onStay, onLeave }) {
  return (
    <CheckoutSheet
      onClose={onStay}
      zIndex={280}
      desktopHeight="auto"
      desktopMaxHeight="60vh"
      ariaLabel="Stay in checkout"
    >
      <div className="p-4 pb-[max(18px,env(safe-area-inset-bottom))]">
        <h3 className="text-[17px] font-medium">
          Leave checkout?
        </h3>

        <div className="mt-3 rounded-[13px] border border-[#e0e4e8] bg-[#fafafa] p-3">
          <p className="text-[13px] text-[#465362]">
            Are you sure you want to cancel checkout?
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onLeave}
              className="h-11 cursor-pointer rounded-[8px] bg-black text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Yes
            </button>

            <button
              type="button"
              onClick={onStay}
              className="h-11 cursor-pointer rounded-[8px] border border-[#111b28] bg-white text-[13px] font-medium"
            >
              No
            </button>
          </div>
        </div>
      </div>
    </CheckoutSheet>
  );
}
