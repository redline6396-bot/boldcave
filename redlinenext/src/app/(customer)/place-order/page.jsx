"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShopContext } from "@/context/ShopContext";
import { NotificationContext } from "@/context/NotificationContext";
import { sampleProducts } from "@/assets/sampleProducts";
import axios from "axios";
import {
  ArrowLeft,
  Lock,
  MapPin,
  Mail,
  Phone,
  User,
  Home,
  Truck,
  PackageCheck,
  BadgeIndianRupee,
  CheckCircle,
} from "lucide-react";

const FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png";

export default function PlaceOrderPage() {
  const router = useRouter();

  const {
    backendUrl,
    token,
    cartItems,
    setCartItems,
    delivery_fee,
    products = [],
    appliedCoupon,
    couponDiscount,
    setAppliedCoupon,
    setCouponDiscount,
  } = useContext(ShopContext);

  const { error: showError, success: showSuccess } =
    useContext(NotificationContext);

  const [method, setMethod] = useState("cod");
  const [cartData, setCartData] = useState([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "India",
    phone: "",
  });

  useEffect(() => {
    const tempData = [];

    Object.keys(cartItems || {}).forEach((itemId) => {
      const value = cartItems[itemId];
      if (!value) return;

      let product =
        products.find(
          (product) =>
            String(product._id) === String(itemId) ||
            String(product.id) === String(itemId)
        ) ||
        sampleProducts.find(
          (product) =>
            String(product._id) === String(itemId) ||
            String(product.id) === String(itemId)
        );

      if (!product) {
        product = {
          _id: itemId,
          id: itemId,
          name: `Product ${itemId}`,
          price: 0,
          image: FALLBACK_IMAGE,
        };
      }

      if (typeof value === "object" && value !== null) {
        Object.entries(value).forEach(([variantWeight, quantity]) => {
          if (Number(quantity) > 0) {
            tempData.push({
              id: itemId,
              variantWeight,
              quantity: Number(quantity),
              product,
            });
          }
        });
      } else if (Number(value) > 0) {
        tempData.push({
          id: itemId,
          quantity: Number(value),
          product,
        });
      }
    });

    setCartData(tempData);
  }, [cartItems, products]);

  const getVariant = (item) => {
    if (item.variantWeight && item.product?.variants) {
      return item.product.variants.find(
        (variant) => variant.weight === item.variantWeight
      );
    }

    if (item.product?.variants?.length > 0) {
      return item.product.variants[0];
    }

    return null;
  };

  const getItemPrice = (item) => {
    const variant = getVariant(item);

    return Number(
      variant?.sellingPrice ||
        item.product?.sellingPrice ||
        item.product?.price ||
        0
    );
  };

  const getItemImage = (product) => {
    if (product?.image) return product.image;

    if (Array.isArray(product?.images) && product.images.length > 0) {
      const firstImage = product.images[0];

      if (typeof firstImage === "string") return firstImage;
      if (firstImage?.url) return firstImage.url;
    }

    return FALLBACK_IMAGE;
  };

  const subtotal = useMemo(() => {
    return cartData.reduce((sum, item) => {
      return sum + getItemPrice(item) * item.quantity;
    }, 0);
  }, [cartData]);

  const shipping = subtotal > 499 ? 0 : Number(delivery_fee || 0);
  const discountAmount =
    couponDiscount > 0 ? Math.min(Number(couponDiscount), subtotal) : 0;
  const total = Math.max(0, subtotal + shipping - discountAmount);

  const onChangeHandler = (event) => {
    const { name, value } = event.target;

    setFormData((data) => ({
      ...data,
      [name]: value,
    }));
  };

  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.street.trim() &&
    formData.city.trim() &&
    formData.state.trim() &&
    formData.zipcode.trim() &&
    formData.country.trim() &&
    formData.phone.trim();

  const buildOrderItems = () => {
    return cartData.map((item) => {
      const image = getItemImage(item.product);
      const variant = getVariant(item);

      const orderItem = {
        productId: item.product?._id || item.product?.id || item.id,
        name: item.product?.name || `Product ${item.id}`,
        quantity: item.quantity,
        image,
      };

      if (variant) {
        orderItem.variant = {
          weight: item.variantWeight || variant.weight,
          price: variant.sellingPrice,
        };
      }

      return orderItem;
    });
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    if (cartData.length === 0) {
      showError?.("Your cart is empty");
      router.push("/cart");
      return;
    }

    if (!isFormValid) {
      showError?.("Please fill all required delivery details");
      return;
    }

    if (method !== "cod") {
      showError?.("Only Cash on Delivery is available right now");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderData = {
        address: formData,
        items: buildOrderItems(),
        amount: total,
        couponCode: appliedCoupon || null,
        discountAmount,
      };

      const response = await axios.post(
        `${backendUrl}/api/order/place`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        showSuccess?.("Your order has been placed successfully");
        setCartItems({});
        setAppliedCoupon(null);
        setCouponDiscount(0);
        router.push("/orders");
      } else {
        showError?.(response.data.message || "Unable to place order");
      }
    } catch (error) {
      console.error(error);
      showError?.(error?.message || "Unable to place order");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbf8f1] font-body text-[#332519]">
      {/* Header */}
      <section className="border-b border-[#e8dfd1] bg-[#fffdf8]">
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-7 md:px-8 lg:px-12">
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#405526] transition-opacity hover:opacity-70"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Back to Cart
          </button>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#405526]">
                Checkout
              </p>

              <h1 className="mt-3 font-display text-[42px] font-medium leading-none tracking-[-0.045em] text-[#332519] sm:text-[56px]">
                Place Order
              </h1>
            </div>

            <p className="max-w-[360px] text-sm leading-6 text-[#5f5648] sm:text-right">
              Confirm your delivery details and complete your order securely.
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={onSubmitHandler}
        className="mx-auto max-w-[1440px] px-5 py-7 sm:px-7 md:px-8 lg:px-12 lg:py-10"
      >
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Left */}
          <div className="min-w-0 space-y-5">
            {/* Delivery */}
            <section className="rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] p-5 shadow-[0_14px_40px_rgba(58,45,29,0.04)] sm:p-7">
              <SectionHeader
                icon={MapPin}
                eyebrow="Step 1"
                title="Delivery Information"
                text="Add the address where your Green Valley order should be delivered."
              />

              <div className="mt-7 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="First Name" required icon={User}>
                    <input
                      required
                      name="firstName"
                      value={formData.firstName}
                      onChange={onChangeHandler}
                      className={inputClass}
                      type="text"
                      placeholder="First name"
                    />
                  </Field>

                  <Field label="Last Name" required icon={User}>
                    <input
                      required
                      name="lastName"
                      value={formData.lastName}
                      onChange={onChangeHandler}
                      className={inputClass}
                      type="text"
                      placeholder="Last name"
                    />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Email Address" required icon={Mail}>
                    <input
                      required
                      name="email"
                      value={formData.email}
                      onChange={onChangeHandler}
                      className={inputClass}
                      type="email"
                      placeholder="your@email.com"
                    />
                  </Field>

                  <Field label="Phone Number" required icon={Phone}>
                    <input
                      required
                      name="phone"
                      value={formData.phone}
                      onChange={onChangeHandler}
                      className={inputClass}
                      type="tel"
                      placeholder="10-digit mobile number"
                    />
                  </Field>
                </div>

                <Field label="Street Address" required icon={Home}>
                  <input
                    required
                    name="street"
                    value={formData.street}
                    onChange={onChangeHandler}
                    className={inputClass}
                    type="text"
                    placeholder="House number, street, area"
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="City" required>
                    <input
                      required
                      name="city"
                      value={formData.city}
                      onChange={onChangeHandler}
                      className={inputClass}
                      type="text"
                      placeholder="City"
                    />
                  </Field>

                  <Field label="State" required>
                    <input
                      required
                      name="state"
                      value={formData.state}
                      onChange={onChangeHandler}
                      className={inputClass}
                      type="text"
                      placeholder="State"
                    />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Zipcode" required>
                    <input
                      required
                      name="zipcode"
                      value={formData.zipcode}
                      onChange={onChangeHandler}
                      className={inputClass}
                      type="text"
                      placeholder="Pincode"
                    />
                  </Field>

                  <Field label="Country" required>
                    <input
                      required
                      name="country"
                      value={formData.country}
                      onChange={onChangeHandler}
                      className={inputClass}
                      type="text"
                      placeholder="Country"
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] p-5 shadow-[0_14px_40px_rgba(58,45,29,0.04)] sm:p-7">
              <SectionHeader
                icon={BadgeIndianRupee}
                eyebrow="Step 2"
                title="Payment Method"
                text="Online payment is not active yet. Cash on Delivery is available."
              />

              <div className="mt-7 grid gap-3">
                <PaymentOption
                  active={method === "cod"}
                  title="Cash on Delivery"
                  text="Pay when your order reaches your doorstep."
                  onClick={() => setMethod("cod")}
                />

                <PaymentOption
                  disabled
                  active={method === "card"}
                  title="Card / UPI / Net Banking"
                  text="Coming soon. Online payments are not enabled yet."
                  onClick={() => showError?.("Online payment is coming soon")}
                />
              </div>
            </section>
          </div>

          {/* Right Summary */}
          <aside className="min-w-0">
            <div className="sticky top-24 overflow-hidden rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] shadow-[0_14px_40px_rgba(58,45,29,0.05)]">
              <div className="border-b border-[#e8dfd1] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#405526]">
                  Order Summary
                </p>

                <h2 className="mt-2 font-display text-[30px] font-medium tracking-[-0.035em] text-[#332519]">
                  Review Order
                </h2>

                <p className="mt-1 text-[12px] text-[#6f6658]">
                  {cartData.length} item{cartData.length !== 1 ? "s" : ""} in
                  your order
                </p>
              </div>

              <div className="max-h-[280px] overflow-y-auto border-b border-[#eee6d9] p-5">
                {cartData.length > 0 ? (
                  <div className="space-y-3">
                    {cartData.map((item) => {
                      const price = getItemPrice(item);
                      const image = getItemImage(item.product);

                      return (
                        <div
                          key={`${item.id}-${item.variantWeight || "default"}`}
                          className="flex gap-3"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-[#fbf7ef] p-1.5">
                            <img
                              src={image}
                              alt={item.product.name}
                              className="h-full w-full object-contain"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = FALLBACK_IMAGE;
                              }}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-[13px] font-semibold text-[#332519]">
                              {item.product.name}
                            </p>

                            <p className="mt-0.5 text-[12px] text-[#7a756b]">
                              {item.variantWeight
                                ? `${item.variantWeight} × ${item.quantity}`
                                : `Qty × ${item.quantity}`}
                            </p>
                          </div>

                          <p className="shrink-0 text-[13px] font-semibold text-[#332519]">
                            ₹{(price * item.quantity).toFixed(0)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[#5f5648]">Your cart is empty.</p>
                )}
              </div>

              <div className="p-5">
                <div className="space-y-3 border-b border-[#eee6d9] pb-5">
                  <SummaryRow label="Subtotal" value={`₹${subtotal.toFixed(0)}`} />
                  <SummaryRow
                    label="Delivery"
                    value={shipping === 0 ? "Free" : `₹${shipping}`}
                  />

                  {discountAmount > 0 && (
                    <SummaryRow
                      label={
                        appliedCoupon
                          ? `Coupon (${appliedCoupon})`
                          : "Coupon Discount"
                      }
                      value={`−₹${discountAmount.toFixed(0)}`}
                      positive
                    />
                  )}
                </div>

                <div className="pt-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#332519]">
                        Total
                      </p>
                      <p className="mt-1 text-[12px] text-[#6f6658]">
                        Inclusive of delivery and discounts
                      </p>
                    </div>

                    <p className="font-display text-[34px] font-semibold leading-none tracking-[-0.04em] text-[#332519]">
                      ₹{total.toFixed(0)}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isPlacingOrder ||
                      !isFormValid ||
                      cartData.length === 0 ||
                      method !== "cod"
                    }
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-[#405526] text-sm font-semibold text-white transition-colors hover:bg-[#30421e] disabled:cursor-not-allowed disabled:bg-[#d7d0c4]"
                  >
                    {isPlacingOrder ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" strokeWidth={1.8} />
                        Place Order
                      </>
                    )}
                  </button>

                  <div className="mt-5 space-y-3 border-t border-[#eee6d9] pt-5 text-[12px] text-[#5f5648]">
                    <MiniAssurance
                      icon={Lock}
                      text="Your checkout details are handled securely"
                    />
                    <MiniAssurance
                      icon={Truck}
                      text={
                        shipping === 0
                          ? "You qualify for free delivery"
                          : "Delivery fee added at checkout"
                      }
                    />
                    <MiniAssurance
                      icon={PackageCheck}
                      text="Order will be packed carefully before dispatch"
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}

const inputClass =
  "w-full rounded-[8px] border border-[#ded4c3] bg-[#fffdf8] px-4 py-3 text-[14px] text-[#332519] outline-none transition-colors placeholder:text-[#9a9183] focus:border-[#405526]";

function SectionHeader({ icon: Icon, eyebrow, title, text }) {
  return (
    <div className="flex items-start gap-4 border-b border-[#eee6d9] pb-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4eddf] text-[#405526]">
        <Icon className="h-5 w-5" strokeWidth={1.6} />
      </span>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#405526]">
          {eyebrow}
        </p>

        <h2 className="mt-2 font-display text-[30px] font-medium leading-none tracking-[-0.035em] text-[#332519] sm:text-[36px]">
          {title}
        </h2>

        <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-[#5f5648]">
          {text}
        </p>
      </div>
    </div>
  );
}

function Field({ label, required = false, icon: Icon, children }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#332519]">
        {Icon && (
          <Icon className="h-4 w-4 text-[#405526]" strokeWidth={1.6} />
        )}
        {label}
        {required && <span className="text-[#c9504a]">*</span>}
      </label>

      {children}
    </div>
  );
}

function PaymentOption({ active, disabled = false, title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-start gap-4 rounded-[12px] border p-4 text-left transition-colors ${
        active
          ? "border-[#405526] bg-[#f4eddf]"
          : "border-[#e8dfd1] bg-[#fffdf8] hover:border-[#c9b99c]"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          active ? "border-[#405526]" : "border-[#cfc2ab]"
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-[#405526]" />}
      </span>

      <span>
        <span className="block text-[14px] font-semibold text-[#332519]">
          {title}
        </span>
        <span className="mt-1 block text-[12px] leading-5 text-[#6f6658]">
          {text}
        </span>
      </span>
    </button>
  );
}

function SummaryRow({ label, value, positive = false }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[#6f6658]">{label}</span>
      <span
        className={`font-semibold ${
          positive ? "text-[#405526]" : "text-[#332519]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function MiniAssurance({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-[#405526]" strokeWidth={1.7} />
      <span>{text}</span>
    </div>
  );
}