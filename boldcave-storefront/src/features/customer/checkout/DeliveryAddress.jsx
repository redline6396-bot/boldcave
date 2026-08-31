"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react";
import CheckoutSheet from "@/features/customer/checkout/CheckoutSheet";

export const emptyAddress = {
  fullName: "",
  email: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  type: "Home",
  isDefault: false,
};

export function normalizeAddress(address = {}) {
  return {
    fullName: String(address.fullName || "").trim(),
    email: String(address.email || "").trim(),
    addressLine: String(address.addressLine || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim(),
    pincode: String(address.pincode || "")
      .replace(/\D/g, "")
      .slice(0, 6),
    type: address.type === "Work" ? "Work" : "Home",
    isDefault: Boolean(address.isDefault),
  };
}

export function validateCheckoutAddress(address = {}) {
  const normalized = normalizeAddress(address);

  if (!/^\d{6}$/.test(normalized.pincode)) {
    return "Enter a valid 6 digit pincode.";
  }

  if (!normalized.city || !normalized.state) {
    return "City and state are required.";
  }

  if (!normalized.addressLine) {
    return "Full address is required.";
  }

  if (!normalized.fullName) {
    return "Full name is required.";
  }

  if (
    normalized.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
  ) {
    return "Enter a valid email address.";
  }

  return "";
}

export default function DeliveryAddress({
  active,
  user,
  phone,
  address,
  setAddress,
  setSelectedAddressIndex,
  serviceability,
  onCheckServiceability,
  onPersistAddress,
}) {
  const savedAddresses = useMemo(() => user?.addresses || [], [user]);
  const [sheet, setSheet] = useState(null);
  const [editorDraft, setEditorDraft] = useState(emptyAddress);
  const [editingIndex, setEditingIndex] = useState(null);
  const [localError, setLocalError] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoPromptHandled, setAutoPromptHandled] = useState(false);

  useEffect(() => {
    if (
      active &&
      !autoPromptHandled &&
      savedAddresses.length === 0 &&
      !address?.addressLine &&
      sheet === null
    ) {
      setEditingIndex(null);
      setEditorDraft(
        normalizeAddress({
          ...emptyAddress,
          fullName: [user?.firstName, user?.lastName]
            .filter(Boolean)
            .join(" "),
          email: user?.email || "",
          isDefault: true,
        })
      );
      setAutoPromptHandled(true);
      setSheet("pincode");
    }
  }, [
    active,
    address?.addressLine,
    autoPromptHandled,
    savedAddresses.length,
    sheet,
    user?.email,
    user?.firstName,
    user?.lastName,
  ]);


  const openNewAddress = () => {
    setEditingIndex(null);
    setEditorDraft(
      normalizeAddress({
        ...emptyAddress,
        fullName: [user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" "),
        email: user?.email || "",
        isDefault: savedAddresses.length === 0,
      })
    );
    setLocalError("");
    setSheet("pincode");
  };

  const openEditAddress = (savedAddress, index) => {
    setEditingIndex(index);
    setEditorDraft(normalizeAddress(savedAddress));
    setLocalError("");
    setSheet("editor");
  };

  const chooseAddress = async (savedAddress, index) => {
    const normalized = normalizeAddress(savedAddress);
    const result = await onCheckServiceability(normalized);

    if (!result?.serviceable) {
      setLocalError(
        result?.message || "This address is not serviceable right now."
      );
      return;
    }

    const next = {
      ...normalized,
      city: result.city || normalized.city,
      state: result.state || normalized.state,
    };

    setAddress(next);
    setSelectedAddressIndex(index);
    setLocalError("");
    setSheet(null);
  };

  const handlePincodeContinue = async () => {
    const pin = String(editorDraft.pincode || "");

    if (!/^\d{6}$/.test(pin)) {
      setLocalError("Enter a valid 6 digit pincode.");
      return;
    }

    setSaving(true);
    setLocalError("");

    try {
      const result = await onCheckServiceability(editorDraft);

      if (!result?.serviceable) {
        setLocalError(
          result?.message ||
            "This pincode is not serviceable right now."
        );
        return;
      }

      setEditorDraft((current) => ({
        ...current,
        city: result.city || current.city,
        state: result.state || current.state,
      }));

      setSheet("editor");
    } catch (checkError) {
      setLocalError(
        checkError.message || "Unable to verify this pincode right now."
      );
    } finally {
      setSaving(false);
    }
  };

  const verifyEditorPincode = async (pin) => {
    if (!/^\d{6}$/.test(pin)) {
      return;
    }

    setLocalError("");

    try {
      const result = await onCheckServiceability({
        ...editorDraft,
        pincode: pin,
        city: "",
        state: "",
      });

      if (!result?.serviceable) {
        setLocalError(
          result?.message ||
            "This pincode is not serviceable right now."
        );
        return;
      }

      setEditorDraft((current) => {
        if (current.pincode !== pin) {
          return current;
        }

        return {
          ...current,
          city: result.city || "",
          state: result.state || "",
        };
      });
    } catch (checkError) {
      setLocalError(
        checkError.message || "Unable to verify this pincode right now."
      );
    }
  };

  const handleEditorContinue = async () => {
    const pin = String(editorDraft.pincode || "");

    if (!/^\d{6}$/.test(pin)) {
      setLocalError("Enter a valid 6 digit pincode.");
      return;
    }

    setSaving(true);
    setLocalError("");

    try {
      const alreadyServiceable =
        serviceability.status === "serviceable" &&
        serviceability.pincode === pin;

      const result = alreadyServiceable
        ? {
            serviceable: true,
            city: editorDraft.city,
            state: editorDraft.state,
          }
        : await onCheckServiceability(editorDraft);

      if (!result?.serviceable) {
        setLocalError(
          result?.message ||
            "This pincode is not serviceable right now."
        );
        return;
      }

      const verifiedDraft = normalizeAddress({
        ...editorDraft,
        city: result.city || editorDraft.city,
        state: result.state || editorDraft.state,
      });

      setEditorDraft(verifiedDraft);

      const basicError = validateCheckoutAddress(verifiedDraft);
      if (basicError) {
        setLocalError(basicError);
        return;
      }

      const persistedIndex = await onPersistAddress(
        verifiedDraft,
        editingIndex
      );

      setAddress(verifiedDraft);
      setSelectedAddressIndex(
        persistedIndex ?? editingIndex ?? "new"
      );
      setSheet(null);
    } catch (saveError) {
      setLocalError(
        saveError.message || "Unable to save this address right now."
      );
    } finally {
      setSaving(false);
    }
  };

  const hasSelectedAddress =
    Boolean(address?.addressLine) &&
    /^\d{6}$/.test(String(address?.pincode || ""));

  return (
    <>
      <section>
        <p className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.025em] text-[#384555]">
          Delivery details
        </p>

        {hasSelectedAddress ? (
          <div className="rounded-[14px] border border-[#d8dee5] bg-white p-4">
            <div className="flex items-start gap-3">
              <MapPin
                className="mt-0.5 h-[22px] w-[22px] shrink-0 text-[#304b67]"
                strokeWidth={1.7}
              />

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#111b28]">
                  Deliver To {address.fullName || "Customer"}
                </p>

                <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#263443]">
                  {address.addressLine}, {address.city}, {address.state},{" "}
                  {address.pincode}
                </p>

                <p className="mt-0.5 text-[11px] leading-5 text-[#4d5b69]">
                  +91 {phone}
                  {address.email ? `  |  ${address.email}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLocalError("");
                  setSheet("select");
                }}
                className="shrink-0 rounded-[8px] border border-[#9da7b2] px-3 py-2 text-[12px] font-medium cursor-pointer"
              >
                Change
              </button>
            </div>

          </div>
        ) : (
          <button
            type="button"
            onClick={openNewAddress}
            className="flex w-full items-center justify-between rounded-[14px] border border-[#d8dee5] bg-white px-4 py-4 text-left cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <MapPin
                className="h-[22px] w-[22px] text-[#304b67]"
                strokeWidth={1.7}
              />
              <span className="text-[14px] font-medium">
                Add Delivery Address
              </span>
            </span>

            <Plus className="h-5 w-5" strokeWidth={1.7} />
          </button>
        )}
      </section>

      {sheet === "select" && (
        <SheetShell onClose={() => setSheet(null)}>
          <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4 sm:px-5">
            <h3 className="text-[14px] font-medium">
              Select Delivery Address
            </h3>

            <button
              type="button"
              onClick={openNewAddress}
              className="rounded-[8px] border border-[#8f99a4] px-3 py-2 text-[12px] font-medium cursor-pointer"
            >
              + Add New Address
            </button>
          </div>

          {localError && (
            <p className="mx-4 mb-2 rounded-[8px] bg-red-50 px-3 py-2 text-[11px] text-red-600 sm:mx-5">
              {localError}
            </p>
          )}

          <div className="max-h-[56vh] overflow-y-auto px-4 pb-5 sm:px-5">
            {savedAddresses.length ? (
              <div className="grid gap-3">
                {savedAddresses.map((savedAddress, index) => (
                  <div
                    key={`${savedAddress.addressLine}-${savedAddress.pincode}-${index}`}
                    className="rounded-[13px] border border-[#b7c0ca] bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold">
                          {savedAddress.fullName || "Saved Address"}{" "}
                          <span className="rounded-[4px] bg-[#edf2f6] px-1.5 py-0.5 text-[10px] font-normal text-[#425466]">
                            {savedAddress.type || "Home"}
                          </span>
                        </p>

                        <p className="mt-1 text-[12px] leading-4 text-[#263443]">
                          {savedAddress.addressLine}, {savedAddress.city},{" "}
                          {savedAddress.state}, {savedAddress.pincode}
                        </p>

                        {savedAddress.email && (
                          <p className="mt-0.5 text-[11px] text-[#5c6875]">
                            {savedAddress.email}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openEditAddress(savedAddress, index)
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center cursor-pointer"
                        aria-label="Edit address"
                      >
                        <Pencil
                          className="h-[17px] w-[17px]"
                          strokeWidth={1.7}
                        />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        chooseAddress(savedAddress, index)
                      }
                      className="mt-3 h-10 w-full cursor-pointer rounded-[8px] bg-black text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Deliver Here
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[12px] bg-[#f7f8f9] px-4 py-6 text-center text-[12px] text-[#66717e]">
                No saved addresses yet.
              </div>
            )}
          </div>
        </SheetShell>
      )}

      {sheet === "pincode" && (
        <SheetShell
          onClose={() => {
            if (savedAddresses.length) {
              setSheet("select");
            } else {
              setSheet(null);
            }
          }}
          compact
          hideClose
        >
          <div className="flex items-center gap-2 px-4 pb-2 pt-5 sm:px-5">
            <button
              type="button"
              onClick={() =>
                savedAddresses.length
                  ? setSheet("select")
                  : setSheet(null)
              }
              className="flex h-8 w-8 cursor-pointer items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.7} />
            </button>

            <h3 className="text-[14px] font-medium">
              Add Delivery Address
            </h3>
          </div>

          <div className="px-4 pb-4 sm:px-5">
            {localError && (
              <div className="mb-3 rounded-[9px] bg-red-50 px-3 py-2 text-[10px] leading-4 text-red-600">
                {localError}
              </div>
            )}

            <p className="mb-2 text-[12px] font-medium">
              Shipping Address
            </p>

            <FloatingInput
              label="Pincode *"
              value={editorDraft.pincode}
              inputMode="numeric"
              error={
                localError === "Enter a valid 6 digit pincode."
                  ? localError
                  : ""
              }
              autoFocus
              onChange={(value) => {
                const pin = value.replace(/\D/g, "").slice(0, 6);
                setEditorDraft((current) => ({
                  ...current,
                  pincode: pin,
                  city: "",
                  state: "",
                }));
                setLocalError("");
              }}
            />

            <button
              type="button"
              onClick={handlePincodeContinue}
              disabled={
                saving ||
                serviceability.status === "checking" ||
                !/^\d{6}$/.test(editorDraft.pincode)
              }
              className="mt-4 h-10 w-full cursor-pointer rounded-[8px] bg-black text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#b5b5b5]"
            >
              {saving || serviceability.status === "checking"
                ? "Checking pincode..."
                : "Continue"}
            </button>
          </div>
        </SheetShell>
      )}

      {sheet === "editor" && (
        <SheetShell
          onClose={() => {
            if (savedAddresses.length) {
              setSheet("select");
            } else {
              setSheet(null);
            }
          }}
          tall
        >
          <div className="flex items-center gap-2 px-4 pb-2 pt-4 sm:px-5">
            <button
              type="button"
              onClick={() =>
                savedAddresses.length
                  ? setSheet("select")
                  : setSheet(null)
              }
              className="flex h-8 w-8 items-center justify-center cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft
                className="h-5 w-5"
                strokeWidth={1.7}
              />
            </button>

            <h3 className="text-[14px] font-medium">
              {editingIndex === null
                ? "Add Delivery Address"
                : "Edit Address"}
            </h3>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4 sm:px-5">
            {localError &&
              ![
                "Full address is required.",
                "Full name is required.",
                "City and state are required.",
                "Enter a valid 6 digit pincode.",
                "Enter a valid email address.",
              ].includes(localError) && (
                <div className="mb-2 rounded-[6px] border-l-2 border-red-400 bg-red-50 px-2.5 py-1.5 text-[10px] leading-4 text-red-600">
                  {localError}
                </div>
              )}

            <p className="mb-2.5 text-[12px] font-medium">
              Shipping Address
            </p>

            <FloatingInput
              label="Pincode *"
              value={editorDraft.pincode}
              inputMode="numeric"
              onChange={(value) => {
                const pin = value
                  .replace(/\D/g, "")
                  .slice(0, 6);

                setEditorDraft((current) => ({
                  ...current,
                  pincode: pin,
                  city: pin === current.pincode ? current.city : "",
                  state: pin === current.pincode ? current.state : "",
                }));
                setLocalError("");

                if (/^\d{6}$/.test(pin)) {
                  window.requestAnimationFrame(() => {
                    verifyEditorPincode(pin);
                  });
                }
              }}
            />

            {serviceability.status === "checking" &&
              serviceability.pincode === editorDraft.pincode && (
                <p className="mt-1.5 px-1 text-[10px] text-[#7a8490]">
                  Verifying pincode...
                </p>
              )}

            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <FloatingInput
                label="City *"
                value={editorDraft.city}
                error={
                  localError === "City and state are required."
                    ? "City is required."
                    : ""
                }
                disabled={serviceability.status === "checking"}
                onChange={(value) => {
                  setEditorDraft((current) => ({
                    ...current,
                    city: value,
                  }));
                  setLocalError("");
                }}
              />

              <FloatingInput
                label="State *"
                value={editorDraft.state}
                error={
                  localError === "City and state are required."
                    ? "State is required."
                    : ""
                }
                disabled={serviceability.status === "checking"}
                onChange={(value) => {
                  setEditorDraft((current) => ({
                    ...current,
                    state: value,
                  }));
                  setLocalError("");
                }}
              />
            </div>

            <div className="mt-2.5">
              <FloatingInput
                label="Full Address (House no., Area,etc) *"
                value={editorDraft.addressLine}
                error={
                  localError === "Full address is required."
                    ? localError
                    : ""
                }
                onChange={(value) => {
                  setEditorDraft((current) => ({
                    ...current,
                    addressLine: value,
                  }));
                  setLocalError("");
                }}
              />
            </div>

            <p className="mb-2 mt-4 text-[12px] font-medium">
              Customer Information
            </p>

            <FloatingInput
              label="Full Name *"
              value={editorDraft.fullName}
              error={
                localError === "Full name is required."
                  ? localError
                  : ""
              }
              onChange={(value) => {
                setEditorDraft((current) => ({
                  ...current,
                  fullName: value,
                }));
                setLocalError("");
              }}
            />

            <div className="mt-2.5">
              <FloatingInput
                label="Email Address"
                type="email"
                value={editorDraft.email}
                error={
                  localError === "Enter a valid email address."
                    ? localError
                    : ""
                }
                onChange={(value) => {
                  setEditorDraft((current) => ({
                    ...current,
                    email: value,
                  }));
                  setLocalError("");
                }}
              />
            </div>

            <p className="mb-2 mt-4 text-[12px] font-medium">
              Save Address As
            </p>

            <div className="flex gap-2.5">
              {["Home", "Work"].map((type) => {
                const activeType = editorDraft.type === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setEditorDraft((current) => ({
                        ...current,
                        type,
                      }))
                    }
                    className={[
                      "flex h-10 min-w-[108px] cursor-pointer items-center justify-between rounded-[10px] border px-3 text-[12px]",
                      activeType
                        ? "border-[#111b28] text-[#111b28]"
                        : "border-[#c7ced6] text-[#7a8490]",
                    ].join(" ")}
                  >
                    {type}
                    <span
                      className={[
                        "flex h-[19px] w-[19px] items-center justify-center rounded-full border",
                        activeType
                          ? "border-[#111b28]"
                          : "border-[#8e98a3]",
                      ].join(" ")}
                    >
                      {activeType && (
                        <span className="h-[9px] w-[9px] rounded-full bg-[#111b28]" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 border-t border-[#e1e5e9] bg-white px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={handleEditorContinue}
              disabled={
                saving ||
                serviceability.status === "checking" ||
                !/^\d{6}$/.test(editorDraft.pincode)
              }
              className="h-10 w-full cursor-pointer rounded-[8px] bg-black text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#b5b5b5]"
            >
              {saving
                ? "Saving..."
                : serviceability.status === "checking"
                  ? "Checking pincode..."
                  : "Continue"}
            </button>
          </div>
        </SheetShell>
      )}
    </>
  );
}

function SheetShell({
  children,
  onClose,
  tall = false,
  compact = false,
  hideClose = false,
}) {
  const desktopHeight = compact ? 205 : tall ? 620 : 370;
  const desktopMaxHeight = compact ? "42vh" : tall ? "82vh" : "64vh";

  return (
    <CheckoutSheet
      onClose={onClose}
      zIndex={250}
      desktopHeight={desktopHeight}
      desktopMaxHeight={desktopMaxHeight}
      ariaLabel="Close address sheet"
      showClose={!hideClose}
    >
      {children}
    </CheckoutSheet>
  );
}


function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  disabled = false,
  autoFocus = false,
  error = "",
}) {
  return (
    <label className="block">
      <span className="relative block">
        <span className="pointer-events-none absolute -top-[5px] left-3 z-10 max-w-[calc(100%-24px)] truncate bg-white px-1 text-[10px] text-[#707b87]">
          {label}
        </span>

        <input
          type={type}
          inputMode={inputMode}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          className={[
            "h-[48px] w-full cursor-text caret-black rounded-[11px] border bg-white px-3.5 text-[16px] font-normal text-[#050505] outline-none transition-colors placeholder:text-[#8d98a4] disabled:cursor-not-allowed disabled:bg-[#fafafa] disabled:text-[#050505] disabled:opacity-100 sm:text-[13px] sm:font-medium",
            error
              ? "border-red-400 focus:border-red-500"
              : "border-[#cbd2d9] focus:border-[#111b28]",
          ].join(" ")}
        />
      </span>

      {error && (
        <span className="mt-1 block px-1 text-[10px] leading-4 text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
