"use client";

import { Banknote, CreditCard } from "lucide-react";

export default function PaymentMethod({
  value,
  onChange,
  codAvailable,
  serviceable,
  disabled = false,
  prepaidDiscountSettings,
}) {
  const codDisabled =
    disabled || serviceable === false || codAvailable === false;
  const onlineDisabled = disabled || serviceable === false;
  const prepaidOfferText = getPrepaidOfferText(prepaidDiscountSettings);

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
          onClick={() => onChange("cod")}
          disabled={codDisabled}
        />
      </div>
    </section>
  );
}

function getPrepaidOfferText(settings = {}) {
  if (settings?.enabled === false || Number(settings?.discountValue || 0) <= 0) {
    return "Pay securely online";
  }

  if (settings.discountType === "fixed") {
    return `Save Rs ${Number(settings.discountValue || 0).toLocaleString("en-IN")} with online payment`;
  }

  return `Save ${Number(settings.discountValue || 0).toLocaleString("en-IN")}% with online payment`;
}

function PaymentOption({
  active,
  icon: Icon,
  title,
  text,
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
