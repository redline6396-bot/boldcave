"use client";

import { Banknote, CreditCard } from "lucide-react";

const money = (value) =>
  `₹${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits:
      Math.round((Number(value) || 0) * 100) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;

export default function PaymentMethod({
  value,
  onChange,
  codAvailable,
  serviceable,
  disabled = false,
  prepaidDiscountSettings,
  onlineAmount = 0,
  codAmount = 0,
  prepaidSavings = 0,
}) {
  const codDisabled =
    disabled || serviceable === false || codAvailable === false;
  const onlineDisabled = disabled || serviceable === false;
  const onlineSavings = Math.max(0, Number(prepaidSavings) || 0);
  const prepaidOfferText = getPrepaidOfferText({
    settings: prepaidDiscountSettings,
    savings: onlineSavings,
  });

  return (
    <section>
      <p className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.025em] text-[#384555]">
        Payment options
      </p>

      <div className="grid gap-2.5">
        <PaymentOption
          active={value === "razorpay"}
          icon={CreditCard}
          title="Pay Online"
          text={prepaidOfferText}
          amount={onlineAmount}
          onClick={() => onChange("razorpay")}
          disabled={onlineDisabled}
        />

        <PaymentOption
          active={value === "cod"}
          icon={Banknote}
          title="Cash on Delivery"
          text={
            codAvailable === false
              ? "COD is unavailable for this pincode"
              : "Pay when your order arrives"
          }
          amount={codAmount}
          onClick={() => onChange("cod")}
          disabled={codDisabled}
        />
      </div>
    </section>
  );
}

function getPrepaidOfferText({ settings = {}, savings = 0 } = {}) {
  if (settings?.enabled === false || Number(settings?.discountValue || 0) <= 0) {
    return "Pay securely online";
  }

  if (savings > 0) {
    const percent =
      settings.discountType === "percentage"
        ? ` (${Number(settings.discountValue || 0).toLocaleString("en-IN")}%)`
        : "";
    return `Save ${money(savings)}${percent} with online payment`;
  }

  return "Pay securely online";
}

function PaymentOption({
  active,
  icon: Icon,
  title,
  text,
  amount,
  onClick,
  disabled,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex w-full items-center gap-3 rounded-[13px] border px-4 py-3 text-left",
        active
          ? "border-[#182231] bg-[#f8fafb]"
          : "border-[#d8dee5] bg-white",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      ].join(" ")}
    >
      <Icon
        className="h-[22px] w-[22px] shrink-0 text-[#304b67]"
        strokeWidth={1.6}
      />

      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-[#111b28]">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-[#707b87]">
          {text}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-[13px] font-semibold text-[#111b28] sm:text-[14px]">
          {money(amount)}
        </span>
      </span>

      <span
        className={[
          "flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border",
          active ? "border-[#111b28]" : "border-[#9ca5af]",
        ].join(" ")}
      >
        {active && (
          <span className="h-[9px] w-[9px] rounded-full bg-[#111b28]" />
        )}
      </span>
    </button>
  );
}
