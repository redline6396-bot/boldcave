"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  IdCard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { checkShippingServiceability, fetchMyOrders, updateCurrentUser } from "@/lib/clientApi";
import OrderCard from "@/features/customer/orders/OrderCard";

const emptyAddress = {
  fullName: "",
  email: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  type: "Home",
  isDefault: true,
};

const inputClass =
  "h-11 w-full rounded-[7px] border border-neutral-300 bg-white px-3.5 text-[14px] text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950";
const validSections = new Set(["overview", "orders", "address"]);
const privacyRequestEmail = "contact@boldcave.com";

function privacyMailto(subject, user) {
  const accountLine = user?.phone ? `Account phone: +91 ${user.phone}` : "";
  const emailLine = user?.email ? `Account email: ${user.email}` : "";
  const body = [
    "Hello BOLD CAVE,",
    "",
    "Please help with this privacy/data request.",
    "",
    accountLine,
    emailLine,
    "",
    "Request details:",
  ]
    .filter(Boolean)
    .join("\n");

  return `mailto:${privacyRequestEmail}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

function getDisplayName(user) {
  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "User"
  );
}

function formatOverviewDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatOverviewPrice(value) {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;
}

function normalizeAddressDraft(address = {}) {
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

function validateEmail(value) {
  return (
    !value ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
  );
}

function getAddressFieldErrors(address) {
  const errors = {};

  if (!/^\d{6}$/.test(address.pincode)) {
    errors.pincode = "Enter a valid 6-digit pincode.";
  }

  if (!address.city) {
    errors.city = "City is required.";
  }

  if (!address.state) {
    errors.state = "State is required.";
  }

  if (!address.addressLine) {
    errors.addressLine = "Enter your full delivery address.";
  }

  if (!address.fullName) {
    errors.fullName = "Full name is required.";
  }

  if (!validateEmail(address.email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

function extractAddressLocation(result = {}) {
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

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    loading,
    isAuthenticated,
    openAuth,
    logout,
    refreshUser,
  } = useAuth();

  const [isProfileViewOpen, setIsProfileViewOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddressEditorOpen, setIsAddressEditorOpen] = useState(false);

  const [profileDraft, setProfileDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [profileFieldErrors, setProfileFieldErrors] = useState({});

  const [addressDraft, setAddressDraft] = useState(emptyAddress);
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);
  const [addressFieldErrors, setAddressFieldErrors] = useState({});
  const [addressServiceability, setAddressServiceability] = useState({
    status: "idle",
    message: "",
    pincode: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const sectionParam = String(searchParams.get("section") || "").toLowerCase();
  const activeView = validSections.has(sectionParam) ? sectionParam : "overview";
  const profileRedirect =
    activeView === "overview" ? "/profile" : `/profile?section=${activeView}`;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      openAuth(profileRedirect);
    }
  }, [isAuthenticated, loading, openAuth, profileRedirect]);

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setOrdersLoading(true);
    setOrdersError("");

    try {
      const result = await fetchMyOrders();
      const nextOrders = Array.isArray(result)
        ? result
        : Array.isArray(result?.orders)
          ? result.orders
          : Array.isArray(result?.data?.orders)
            ? result.data.orders
            : Array.isArray(result?.data)
              ? result.data
              : [];

      setOrders(nextOrders);
      setOrdersLoaded(true);
    } catch {
      setOrdersError("We could not load your orders right now.");
      setOrdersLoaded(true);
    } finally {
      setOrdersLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || ordersLoaded) return;
    loadOrders();
  }, [isAuthenticated, loadOrders, ordersLoaded]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileDraft({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
    });

    if (user.addresses?.length) {
      const defaultIndex = Math.max(
        0,
        user.addresses.findIndex((address) => address.isDefault)
      );

      setEditingAddressIndex(defaultIndex);
      setAddressDraft(
        normalizeAddressDraft(user.addresses[defaultIndex])
      );
      return;
    }

    setEditingAddressIndex(null);
    setAddressDraft(emptyAddress);
  }, [user]);

  const addresses = useMemo(() => user?.addresses || [], [user]);
  const totalOrders = ordersLoaded
    ? orders.length
    : Number(user?.totalOrders ?? user?.orderCount ?? 0);
  const latestOrder = orders[0] || null;
  const defaultAddress =
    addresses.find((address) => address.isDefault) || addresses[0] || null;

  const mobileFocusedView =
    activeView !== "overview" || isProfileViewOpen || isEditingProfile;
  const mobileViewTitle =
    activeView === "orders"
      ? "My Orders"
      : activeView === "address"
        ? "My Address"
        : "Profile";

  const resetProfileDraft = () => {
    setProfileDraft({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    });
    setProfileFieldErrors({});
  };

  const handleProfileSave = async () => {
    const nextErrors = {};

    if (!validateEmail(profileDraft.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    setProfileFieldErrors(nextErrors);
    setError("");
    setMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSavingProfile(true);

    try {
      await updateCurrentUser({
        firstName: profileDraft.firstName,
        lastName: profileDraft.lastName,
        email: profileDraft.email,
      });

      await refreshUser();
      setIsEditingProfile(false);
      setIsProfileViewOpen(true);
      setProfileFieldErrors({});
      setMessage("Profile updated.");
    } catch (profileError) {
      setError(
        profileError.message || "Unable to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const clearAddressFieldError = useCallback((field) => {
    setAddressFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const verifyAddressPincode = useCallback(async (addressCandidate) => {
    const candidate = normalizeAddressDraft(addressCandidate);
    const pin = candidate.pincode;

    if (!/^\d{6}$/.test(pin)) {
      const message = "Enter a valid 6-digit pincode.";
      setAddressServiceability({
        status: "invalid",
        message,
        pincode: pin,
      });
      setAddressFieldErrors((current) => ({
        ...current,
        pincode: message,
      }));
      return {
        serviceable: false,
        message,
        city: "",
        state: "",
      };
    }

    setAddressServiceability({
      status: "checking",
      message: "Checking delivery availability...",
      pincode: pin,
    });

    try {
      const result = await checkShippingServiceability({
        pincode: pin,
        cod: false,
      });
      const location = extractAddressLocation(result);

      if (!result?.serviceable) {
        const message =
          result?.message || "We currently do not deliver to this pincode.";

        setAddressServiceability({
          status: "unserviceable",
          message,
          pincode: pin,
        });
        setAddressFieldErrors((current) => ({
          ...current,
          pincode: message,
        }));

        return {
          serviceable: false,
          message,
          ...location,
        };
      }

      setAddressServiceability({
        status: "serviceable",
        message: "Delivery available",
        pincode: pin,
      });

      setAddressFieldErrors((current) => {
        const next = { ...current };
        delete next.pincode;
        if (location.city) delete next.city;
        if (location.state) delete next.state;
        return next;
      });

      setAddressDraft((current) => {
        if (current.pincode !== pin) return current;

        return {
          ...current,
          city: location.city || current.city,
          state: location.state || current.state,
        };
      });

      return {
        ...result,
        serviceable: true,
        ...location,
      };
    } catch (shippingError) {
      const message =
        shippingError?.message ||
        "Unable to verify delivery for this pincode right now.";

      setAddressServiceability({
        status: "error",
        message,
        pincode: pin,
      });
      setAddressFieldErrors((current) => ({
        ...current,
        pincode: message,
      }));

      return {
        serviceable: false,
        message,
        city: "",
        state: "",
      };
    }
  }, []);

  useEffect(() => {
    if (!isAddressEditorOpen) return undefined;

    const pin = String(addressDraft.pincode || "");

    if (pin.length < 6) {
      setAddressServiceability({
        status: "idle",
        message: "",
        pincode: pin,
      });
      return undefined;
    }

    const timer = window.setTimeout(() => {
      verifyAddressPincode({
        ...addressDraft,
        pincode: pin,
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [addressDraft.pincode, isAddressEditorOpen, verifyAddressPincode]);

  const handleAddressSave = async () => {
    const cleanedAddress = normalizeAddressDraft(addressDraft);
    const initialErrors = getAddressFieldErrors(cleanedAddress);

    setAddressFieldErrors(initialErrors);
    setError("");
    setMessage("");

    if (Object.keys(initialErrors).length > 0) {
      return;
    }

    setSavingAddress(true);

    try {
      // Always verify the CURRENT pincode immediately before saving.
      const serviceabilityResult = await verifyAddressPincode(cleanedAddress);

      if (!serviceabilityResult?.serviceable) {
        return;
      }

      const verifiedAddress = normalizeAddressDraft({
        ...cleanedAddress,
        city: serviceabilityResult.city || cleanedAddress.city,
        state: serviceabilityResult.state || cleanedAddress.state,
      });

      const verifiedErrors = getAddressFieldErrors(verifiedAddress);
      if (Object.keys(verifiedErrors).length > 0) {
        setAddressFieldErrors(verifiedErrors);
        return;
      }

      const existingAddresses = addresses.map((address) =>
        normalizeAddressDraft(address)
      );

      const nextAddresses =
        editingAddressIndex === null
          ? [...existingAddresses, verifiedAddress]
          : existingAddresses.map((address, index) =>
              index === editingAddressIndex
                ? verifiedAddress
                : address
            );

      const savedIndex =
        editingAddressIndex ?? nextAddresses.length - 1;

      const normalizedAddresses = nextAddresses.map(
        (address, index) => ({
          ...address,
          isDefault: verifiedAddress.isDefault
            ? index === savedIndex
            : address.isDefault,
        })
      );

      if (
        normalizedAddresses.length &&
        !normalizedAddresses.some(
          (address) => address.isDefault
        )
      ) {
        normalizedAddresses[0].isDefault = true;
      }

      await updateCurrentUser({
        addresses: normalizedAddresses,
      });

      await refreshUser();
      setIsAddressEditorOpen(false);
      setAddressFieldErrors({});
      setAddressServiceability({
        status: "idle",
        message: "",
        pincode: "",
      });
      setMessage("Address saved.");
    } catch (addressSaveError) {
      setError(
        addressSaveError.message || "Unable to save address."
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const openOverview = () => {
    router.push("/profile");
    setIsProfileViewOpen(false);
    setIsEditingProfile(false);
    setError("");
    setMessage("");
  };

  const openProfileView = () => {
    router.push("/profile");
    setIsProfileViewOpen(true);
    setIsEditingProfile(false);
    setError("");
    setMessage("");
  };

  const openOrdersView = () => {
    router.push("/profile?section=orders");
    setIsProfileViewOpen(false);
    setIsEditingProfile(false);
    setError("");
    setMessage("");
  };

  const openAddressView = () => {
    router.push("/profile?section=address");
    setIsProfileViewOpen(false);
    setIsEditingProfile(false);
    setError("");
    setMessage("");
  };

  const handleMobileBack = () => {
    if (activeView === "address" && isAddressEditorOpen) {
      setIsAddressEditorOpen(false);
      setAddressFieldErrors({});
      setAddressServiceability({
        status: "idle",
        message: "",
        pincode: "",
      });
      setError("");
      setMessage("");
      return;
    }

    if (activeView === "overview" && isEditingProfile) {
      resetProfileDraft();
      setIsEditingProfile(false);
      setIsProfileViewOpen(true);
      setError("");
      setMessage("");
      return;
    }

    if (activeView === "overview" && isProfileViewOpen) {
      setIsProfileViewOpen(false);
      setIsEditingProfile(false);
      setError("");
      setMessage("");
      return;
    }

    openOverview();
  };

  const startAddAddress = () => {
    setEditingAddressIndex(null);
    setAddressDraft({
      ...emptyAddress,
      fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      email: user?.email || "",
      isDefault: addresses.length === 0,
    });
    setAddressFieldErrors({});
    setAddressServiceability({
      status: "idle",
      message: "",
      pincode: "",
    });
    setIsAddressEditorOpen(true);
    setError("");
    setMessage("");
  };

  const startEditAddress = (address, index) => {
    const normalized = normalizeAddressDraft(address);
    setEditingAddressIndex(index);
    setAddressDraft(normalized);
    setAddressFieldErrors({});
    setAddressServiceability({
      status: /^\d{6}$/.test(normalized.pincode) ? "idle" : "invalid",
      message: "",
      pincode: normalized.pincode,
    });
    setIsAddressEditorOpen(true);
    setError("");
    setMessage("");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#eeeeee] px-5 py-16 text-center text-neutral-950">
        <p className="text-[13px] font-medium text-neutral-500">
          Loading account...
        </p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#eeeeee] px-5 py-16 text-center text-neutral-950">
        <h1 className="text-[24px] font-semibold">
          Login required
        </h1>

        <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-6 text-neutral-500">
          Verify your phone number to manage your account.
        </p>

        <button
          type="button"
          onClick={() => openAuth(profileRedirect)}
          className="mt-6 h-11 cursor-pointer rounded-[6px] bg-neutral-950 px-7 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Login
        </button>
      </main>
    );
  }

  return (
    <main
      className="bg-[#ececec] px-3 py-5 text-neutral-950 sm:px-4 sm:py-6 md:px-5 md:py-7 lg:min-h-[calc(100dvh-126px)] lg:px-6"
      style={{
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className="mx-auto grid w-full max-w-[440px] items-start gap-4 md:max-w-[1180px] md:grid-cols-[255px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        {/* Desktop/tablet account navigation. Mobile uses a dashboard overview instead. */}
        <aside className="hidden self-start overflow-hidden rounded-[10px] bg-white md:sticky md:top-24 md:block">
          <div className="p-4 lg:p-5">
            <div className="border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={openProfileView}
                    className="group inline-flex cursor-pointer items-center gap-1.5 text-left"
                  >
                    <span className="truncate text-[15px] font-semibold">
                      Hey, {getDisplayName(user)}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={1.6}
                    />
                  </button>

                  <p className="mt-1.5 truncate text-[11px] text-neutral-500">
                    Logged with +91 {user.phone}
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-[14px] font-semibold uppercase text-white">
                  {getDisplayName(user).slice(0, 1)}
                </div>
              </div>

              <div className="mt-4 border-t border-neutral-200 pt-3">
                <button
                  type="button"
                  onClick={openOrdersView}
                  className="flex h-[54px] w-[118px] cursor-pointer flex-col items-center justify-center border border-neutral-200 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
                  aria-label={`View ${totalOrders} total orders`}
                >
                  <span className="text-[17px] font-semibold leading-none">
                    {totalOrders}
                  </span>
                  <span className="mt-1 text-[10px] text-neutral-600">
                    Total Orders
                  </span>
                </button>
              </div>
            </div>

            <p className="mt-6 text-[14px] font-semibold">Account</p>
          </div>

          <nav className="border-t border-neutral-200">
            <SidebarItem
              active={activeView === "overview" && !isEditingProfile}
              icon={UserRound}
              label="Overview"
              description="Account at a glance"
              onClick={openOverview}
            />

            <SidebarItem
              active={activeView === "orders"}
              icon={Package}
              label="My Orders"
              description="Track recent purchases"
              onClick={openOrdersView}
            />

            <SidebarItem
              active={activeView === "address"}
              icon={MapPin}
              label="My Address"
              description="Manage shipping addresses"
              onClick={openAddressView}
            />
          </nav>

          <div className="border-t border-neutral-200 px-5 py-5">
            <button
              type="button"
              onClick={handleLogout}
              className="flex cursor-pointer items-center gap-3 text-[13px] font-medium text-red-600 transition-opacity hover:opacity-65"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />
              Logout
            </button>
          </div>
        </aside>

        <section
          className={[
            "min-w-0 self-start",
            activeView === "overview" &&
            !isProfileViewOpen &&
            !isEditingProfile
              ? "md:rounded-[10px] md:bg-white md:p-6 lg:p-7"
              : "rounded-[10px] bg-white p-4 sm:p-5 md:p-6 lg:p-7",
          ].join(" ")}
        >
          {mobileFocusedView && (
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-neutral-200 pb-4 md:hidden">
              <button
                type="button"
                onClick={handleMobileBack}
                className="inline-flex cursor-pointer items-center gap-2 text-left"
                aria-label={`Back from ${mobileViewTitle}`}
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.65} />
                <span className="text-[20px] font-semibold leading-none">
                  {mobileViewTitle}
                </span>
              </button>

              {activeView === "address" &&
                !isAddressEditorOpen &&
                addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={startAddAddress}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium underline underline-offset-4"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.7} />
                    Add
                  </button>
                )}
            </div>
          )}

          {(message || error) && (
            <div
              className={[
                "mb-5 border px-4 py-3 text-[12px] leading-5",
                error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-neutral-200 bg-neutral-50 text-neutral-700",
              ].join(" ")}
            >
              {error || message}
            </div>
          )}

          {activeView === "orders" ? (
            <OrdersView
              orders={orders}
              loading={ordersLoading}
              error={ordersError}
              onRetry={loadOrders}
            />
          ) : activeView === "address" ? (
            <AddressView
              addresses={addresses}
              isEditorOpen={isAddressEditorOpen}
              editingAddressIndex={editingAddressIndex}
              draft={addressDraft}
              setDraft={setAddressDraft}
              saving={savingAddress}
              fieldErrors={addressFieldErrors}
              serviceability={addressServiceability}
              onClearFieldError={clearAddressFieldError}
              onAdd={startAddAddress}
              onEdit={startEditAddress}
              onSave={handleAddressSave}
              onCancel={() => {
                setIsAddressEditorOpen(false);
                setAddressFieldErrors({});
                setAddressServiceability({
                  status: "idle",
                  message: "",
                  pincode: "",
                });
                setError("");
              }}
            />
          ) : isProfileViewOpen || isEditingProfile ? (
            <ProfileView
              user={user}
              draft={profileDraft}
              setDraft={setProfileDraft}
              editing={isEditingProfile}
              saving={savingProfile}
              fieldErrors={profileFieldErrors}
              setFieldErrors={setProfileFieldErrors}
              onEdit={() => {
                resetProfileDraft();
                setIsProfileViewOpen(true);
                setIsEditingProfile(true);
                setError("");
                setMessage("");
              }}
              onCancel={() => {
                resetProfileDraft();
                setIsEditingProfile(false);
                setIsProfileViewOpen(true);
                setError("");
              }}
              onSave={handleProfileSave}
            />
          ) : (
            <OverviewDashboard
              user={user}
              totalOrders={totalOrders}
              latestOrder={latestOrder}
              ordersLoading={ordersLoading}
              defaultAddress={defaultAddress}
              onEditProfile={openProfileView}
              onOrders={openOrdersView}
              onAddress={openAddressView}
              onLogout={handleLogout}
            />
          )}
        </section>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountContent />
    </Suspense>
  );
}

function SidebarItem({
  active = false,
  icon: Icon,
  label,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex min-h-[62px] w-full cursor-pointer items-center gap-3 border-b border-neutral-200 px-4 text-left transition-colors lg:px-5",
        active ? "bg-[#f7f7f7]" : "bg-white hover:bg-neutral-50",
      ].join(" ")}
    >
      <Icon
        className="h-[19px] w-[19px] shrink-0 text-neutral-900"
        strokeWidth={1.65}
      />

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-none lg:text-[14px]">
          {label}
        </p>
        <p className="mt-1.5 text-[10px] leading-4 text-neutral-500">
          {description}
        </p>
      </div>

      <ChevronRight
        className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.6}
      />
    </button>
  );
}

function OverviewDashboard({
  user,
  totalOrders,
  latestOrder,
  ordersLoading,
  defaultAddress,
  onEditProfile,
  onOrders,
  onAddress,
  onLogout,
}) {
  const firstItem = latestOrder?.items?.[0];
  const latestOrderId =
    latestOrder?._id || latestOrder?.id || latestOrder?.orderNumber;
  const latestOrderAmount = latestOrder?.amounts?.finalAmount;

  return (
    <div className="rounded-[10px] bg-white p-4 sm:p-5 md:rounded-none md:p-0">
      {/* Account summary is useful on mobile; desktop already has it in the left column. */}
      <section className="border border-neutral-200 p-4 md:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onEditProfile}
              className="group inline-flex cursor-pointer items-center gap-1.5 text-left"
            >
              <span className="truncate text-[17px] font-semibold">
                Hey, {getDisplayName(user)}
              </span>
              <ChevronRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.6}
              />
            </button>
            <p className="mt-1.5 truncate text-[11px] text-neutral-500">
              Logged with +91 {user.phone}
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-[14px] font-semibold uppercase text-white">
            {getDisplayName(user).slice(0, 1)}
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-3">
          <button
            type="button"
            onClick={onOrders}
            className="flex h-[58px] w-[126px] cursor-pointer flex-col items-center justify-center border border-neutral-200 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
          >
            <span className="text-[18px] font-semibold leading-none">
              {totalOrders}
            </span>
            <span className="mt-1 text-[10px] text-neutral-600">
              Total Orders
            </span>
          </button>
        </div>
      </section>

      <div className="mt-7 space-y-7 md:mt-0 md:space-y-8">
        <section>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[19px] font-semibold md:text-[22px]">
              My Orders
            </h1>
            <button
              type="button"
              onClick={onOrders}
              className="cursor-pointer text-[11px] font-medium text-neutral-600 underline underline-offset-4 transition-colors hover:text-neutral-950"
            >
              View All
            </button>
          </div>

          <div className="mt-3 border border-neutral-200">
            {ordersLoading ? (
              <div className="flex min-h-[108px] items-center gap-4 p-4">
                <div className="h-16 w-16 animate-pulse bg-neutral-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 animate-pulse bg-neutral-200" />
                  <div className="h-3 w-44 max-w-full animate-pulse bg-neutral-100" />
                </div>
              </div>
            ) : latestOrder ? (
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 p-4">
                <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden bg-neutral-50">
                  {firstItem?.image ? (
                    <img
                      src={firstItem.image}
                      alt={firstItem.name || "Order item"}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Package className="h-7 w-7 text-neutral-400" strokeWidth={1.4} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold uppercase tracking-[0.04em]">
                        {latestOrder.orderNumber || latestOrderId}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {formatOverviewDate(latestOrder.createdAt)}
                      </p>
                    </div>
                    {latestOrderAmount != null && (
                      <span className="shrink-0 text-[13px] font-semibold">
                        {formatOverviewPrice(latestOrderAmount)}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 truncate text-[12px] text-neutral-600">
                    {firstItem?.name || "View your latest order"}
                    {latestOrder.items?.length > 1
                      ? ` +${latestOrder.items.length - 1} more`
                      : ""}
                  </p>

                  <button
                    type="button"
                    onClick={onOrders}
                    className="mt-2 cursor-pointer text-[11px] font-semibold underline underline-offset-4"
                  >
                    View Order
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 p-4">
                <div className="flex h-[72px] w-[72px] items-center justify-center bg-neutral-100">
                  <Package className="h-7 w-7 text-neutral-400" strokeWidth={1.4} />
                </div>
                <div className="min-w-0 self-center">
                  <p className="text-[14px] font-medium">No Past Orders Yet</p>
                  <p className="mt-1 text-[12px] leading-5 text-neutral-500">
                    Start your first order to see it here.
                  </p>
                  <Link
                    href="/collection"
                    className="mt-1 inline-flex cursor-pointer text-[11px] font-semibold underline underline-offset-4"
                  >
                    Shop Now
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[19px] font-semibold md:text-[22px]">
              Saved Addresses
            </h2>
            <button
              type="button"
              onClick={onAddress}
              className="cursor-pointer text-[11px] font-medium text-neutral-600 underline underline-offset-4 transition-colors hover:text-neutral-950"
            >
              Manage
            </button>
          </div>

          <div className="mt-3 border border-neutral-200">
            {defaultAddress ? (
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 p-4">
                <div className="flex h-[72px] w-[72px] items-center justify-center bg-neutral-100">
                  <MapPin className="h-7 w-7 text-neutral-500" strokeWidth={1.45} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">
                    {defaultAddress.fullName || "Saved Address"}
                    {defaultAddress.type ? ` · ${defaultAddress.type}` : ""}
                    {defaultAddress.isDefault ? " · Default" : ""}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-neutral-500">
                    {[defaultAddress.addressLine, defaultAddress.city, defaultAddress.state, defaultAddress.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <button
                    type="button"
                    onClick={onAddress}
                    className="mt-2 cursor-pointer text-[11px] font-semibold underline underline-offset-4"
                  >
                    Manage Address
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 p-4">
                <div className="flex h-[72px] w-[72px] items-center justify-center bg-neutral-100">
                  <MapPin className="h-7 w-7 text-neutral-400" strokeWidth={1.4} />
                </div>
                <div className="min-w-0 self-center">
                  <p className="text-[14px] font-medium">No Address Saved Yet</p>
                  <p className="mt-1 text-[12px] leading-5 text-neutral-500">
                    Add your delivery address to shop faster.
                  </p>
                  <button
                    type="button"
                    onClick={onAddress}
                    className="mt-1 cursor-pointer text-[11px] font-semibold underline underline-offset-4"
                  >
                    Add New Address
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Navigation is secondary on mobile, not the hero of the page. */}
        <section className="border-t border-neutral-200 pt-6 md:hidden">
          <h2 className="text-[15px] font-semibold">Account</h2>

          <div className="mt-3 border-y border-neutral-200">
            <OverviewMenuRow
              icon={Package}
              label="My Orders"
              description="Track your recent purchases"
              onClick={onOrders}
            />
            <OverviewMenuRow
              icon={MapPin}
              label="My Address"
              description="Manage shipping addresses"
              onClick={onAddress}
              last
            />
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="mt-6 flex cursor-pointer items-center gap-3 text-[13px] font-medium text-red-600"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />
            Logout
          </button>
        </section>
      </div>
    </div>
  );
}

function OverviewMenuRow({
  icon: Icon,
  label,
  description,
  onClick,
  last = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-[66px] w-full cursor-pointer items-center gap-3 text-left",
        last ? "" : "border-b border-neutral-200",
      ].join(" ")}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.6} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{label}</p>
        <p className="mt-1 text-[10px] leading-4 text-neutral-500">
          {description}
        </p>
      </div>
      <ChevronRight className="h-[18px] w-[18px]" strokeWidth={1.6} />
    </button>
  );
}

function OrdersView({ orders, loading, error, onRetry }) {
  return (
    <div>
      <div className="hidden items-start justify-between gap-4 md:flex">
        <div>
          <h1 className="text-[22px] font-semibold">My Orders</h1>
          <p className="mt-1 text-[12px] text-neutral-500">
            View and track your recent purchases.
          </p>
        </div>

        {!loading && !error && (
          <span className="pt-1 text-[11px] text-neutral-500">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </span>
        )}
      </div>

      {loading ? (
        <OrdersSkeleton />
      ) : error ? (
        <div className="mt-5 border border-red-100 bg-red-50 px-4 py-4 text-[12px] leading-5 text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      ) : orders.length ? (
        <div className="mt-5 grid gap-3 md:mt-6">
          {orders.map((order) => (
            <OrderCard
              key={order?._id || order?.id || order?.orderId}
              order={order}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[330px] flex-col items-center justify-center border border-neutral-200 bg-white px-6 py-12 text-center sm:min-h-[360px] md:mt-6 md:min-h-[390px]">
          <p className="text-[17px] font-semibold sm:text-[18px]">
            No Past Orders Yet
          </p>
          <p className="mt-3 max-w-[320px] text-[13px] leading-6 text-neutral-600">
            Start your first order to see it here.
          </p>
          <Link
            href="/collection"
            className="mt-5 inline-flex h-12 cursor-pointer items-center justify-center rounded-[7px] bg-neutral-950 px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Explore Products
          </Link>
        </div>
      )}
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="mt-5 space-y-3 md:mt-6">
      {[0, 1, 2].map((item) => (
        <div key={item} className="border border-neutral-200 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-36 animate-pulse bg-neutral-200" />
              <div className="h-3 w-24 animate-pulse bg-neutral-100" />
            </div>
            <div className="h-5 w-20 animate-pulse bg-neutral-100" />
          </div>
          <div className="mt-5 flex items-center gap-4 border-t border-neutral-100 pt-4">
            <div className="h-12 w-12 animate-pulse bg-neutral-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-28 animate-pulse bg-neutral-200" />
              <div className="h-3 w-20 animate-pulse bg-neutral-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


function ProfileView({
  user,
  draft,
  setDraft,
  editing,
  saving,
  fieldErrors = {},
  setFieldErrors,
  onEdit,
  onCancel,
  onSave,
}) {
  const clearProfileError = (field) => {
    setFieldErrors?.((current) => {
      if (!current?.[field]) return current || {};
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  if (editing) {
    const rowClass =
      "grid grid-cols-[26px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[28px_minmax(0,1fr)]";
    const underlineInputClass =
      "w-full border-0 border-b border-neutral-300 bg-transparent px-0 pb-2 pt-1 text-[15px] text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950";

    return (
      <div>
        <div className="flex items-center justify-end gap-4 md:justify-between">
          <h1 className="hidden text-[22px] font-semibold md:block">
            Profile
          </h1>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="hidden cursor-pointer text-[12px] font-medium text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-950 md:inline-flex"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="cursor-pointer text-[13px] font-semibold underline underline-offset-4 transition-opacity hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Updating..." : "Update"}
            </button>
          </div>
        </div>

        <div className="mt-3 w-full md:mt-5">
          <div className={rowClass}>
            <IdCard
              className="mt-5 h-[19px] w-[19px] text-neutral-950"
              strokeWidth={1.65}
            />
            <div>
              <p className="text-[11px] text-neutral-500">First Name</p>
              <input
                value={draft.firstName}
                onChange={(event) => {
                  setDraft({ ...draft, firstName: event.target.value });
                  clearProfileError("firstName");
                }}
                className={underlineInputClass}
                placeholder="Enter first name"
                autoComplete="given-name"
              />
            </div>
          </div>

          <div className={rowClass}>
            <IdCard
              className="mt-5 h-[19px] w-[19px] text-neutral-950"
              strokeWidth={1.65}
            />
            <div>
              <p className="text-[11px] text-neutral-500">Last Name</p>
              <input
                value={draft.lastName}
                onChange={(event) => {
                  setDraft({ ...draft, lastName: event.target.value });
                  clearProfileError("lastName");
                }}
                className={underlineInputClass}
                placeholder="Enter last name"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className={rowClass}>
            <Phone
              className="mt-5 h-[19px] w-[19px] text-neutral-950"
              strokeWidth={1.65}
            />
            <div>
              <p className="text-[11px] text-neutral-500">Phone Number</p>
              <div className="border-b border-neutral-300 pb-2 pt-1 text-[15px] text-neutral-700">
                +91 {user.phone}
              </div>
              <p className="mt-1.5 text-[10px] leading-4 text-neutral-400">
                Verified login number
              </p>
            </div>
          </div>

          <div className={rowClass}>
            <Mail
              className="mt-5 h-[19px] w-[19px] text-neutral-950"
              strokeWidth={1.65}
            />
            <div>
              <p className="text-[11px] text-neutral-500">Email ID</p>
              <input
                type="email"
                value={draft.email}
                onChange={(event) => {
                  setDraft({ ...draft, email: event.target.value });
                  clearProfileError("email");
                }}
                className={[
                  underlineInputClass,
                  fieldErrors.email
                    ? "!border-red-400 focus:!border-red-500"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                placeholder="Enter email address"
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="mt-1.5 text-[11px] text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const rows = [
    { label: "First Name", value: user.firstName || "Not provided", icon: IdCard },
    { label: "Last Name", value: user.lastName || "Not provided", icon: IdCard },
    { label: "Phone Number", value: `+91 ${user.phone}`, icon: Phone },
    { label: "Email ID", value: user.email || "Not provided", icon: Mail },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-semibold sm:text-[24px]">Profile</h1>
        <button
          type="button"
          onClick={onEdit}
          className="cursor-pointer text-[13px] font-semibold underline underline-offset-4 transition-opacity hover:opacity-60"
        >
          Edit
        </button>
      </div>

      <div className="mt-5 w-full md:mt-6">
        {rows.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="grid grid-cols-[26px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[28px_minmax(0,1fr)]"
          >
            <Icon
              className="mt-4 h-[19px] w-[19px] text-neutral-950"
              strokeWidth={1.65}
            />
            <div>
              <p className="text-[11px] text-neutral-500">{label}</p>
              <p className="mt-1.5 text-[14px] leading-5 text-neutral-950 sm:text-[15px]">
                {value}
              </p>
            </div>
          </div>
        ))}

        <section className="mt-4 border-t border-neutral-200 pt-6">
          <h2 className="text-[15px] font-semibold text-neutral-950">
            Privacy &amp; Data
          </h2>
          <p className="mt-2 max-w-[760px] text-[12px] leading-5 text-neutral-500">
            Send privacy requests to BOLD CAVE. Deletion/erasure requests are
            handled subject to order, tax, fraud-prevention and legal retention
            requirements.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              ["REQUEST CORRECTION", "Request for Personal Data Correction"],
              ["REQUEST DATA INFORMATION", "Request for Personal Data Information"],
              [
                "REQUEST ACCOUNT/DATA DELETION",
                "Request for Account and Personal Data Deletion",
              ],
              ["PRIVACY GRIEVANCE", "Privacy Grievance - Bold Cave"],
            ].map(([label, subject]) => {
              const mailtoHref = privacyMailto(subject, user);

              return (
                <a
                  key={label}
                  href={mailtoHref}
                  onClick={(event) => {
                    event.preventDefault();
                    window.location.href = mailtoHref;
                  }}
                  className="inline-flex h-9 cursor-pointer items-center border border-neutral-300 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-950 transition-colors hover:border-neutral-950"
                >
                  {label}
                </a>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function AddressView({
  addresses,
  isEditorOpen,
  editingAddressIndex,
  draft,
  setDraft,
  saving,
  fieldErrors,
  serviceability,
  onClearFieldError,
  onAdd,
  onEdit,
  onSave,
  onCancel,
}) {
  return (
    <div>
      <div className="hidden items-center justify-between gap-4 md:flex">
        <h1 className="text-[22px] font-semibold sm:text-[24px]">
          My Address
        </h1>

        {isEditorOpen ? (
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer text-[12px] font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            Cancel
          </button>
        ) : addresses.length > 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            <Plus className="h-4 w-4" strokeWidth={1.7} />
            Add
          </button>
        ) : null}
      </div>

      {!isEditorOpen ? (
        <AddressList addresses={addresses} onEdit={onEdit} onAdd={onAdd} />
      ) : (
        <div className="mt-4 w-full md:mt-5">
          <AddressFields
            draft={draft}
            setDraft={setDraft}
            errors={fieldErrors}
            serviceability={serviceability}
            onClearError={onClearFieldError}
          />

          <button
            type="button"
            onClick={onSave}
            disabled={saving || serviceability.status === "checking"}
            className="mt-7 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-neutral-950 px-7 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                Saving...
              </>
            ) : serviceability.status === "checking" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                Checking delivery...
              </>
            ) : editingAddressIndex === null ? (
              "Add Address"
            ) : (
              "Save Address"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, error = "", help = "", className = "" }) {
  return (
    <label className={["block", className].filter(Boolean).join(" ")}>
      <span className="text-[11px] font-medium text-neutral-600">
        {label}
      </span>
      <span className="mt-2 block">{children}</span>
      {error ? (
        <span className="mt-1.5 block text-[11px] leading-4 text-red-600">
          {error}
        </span>
      ) : help ? (
        <span className="mt-1.5 block text-[11px] leading-4 text-neutral-500">
          {help}
        </span>
      ) : null}
    </label>
  );
}

function AddressList({ addresses, onEdit, onAdd }) {
  if (!addresses.length) {
    return (
      <div className="mt-5 flex min-h-[330px] flex-col items-center justify-center border border-neutral-200 bg-white px-6 py-12 text-center sm:min-h-[360px] md:mt-6 md:min-h-[390px]">
        <p className="text-[17px] font-semibold sm:text-[18px]">
          No Address Saved Yet
        </p>
        <p className="mt-3 max-w-[320px] text-[13px] leading-6 text-neutral-600">
          Click to add a new delivery address.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-5 inline-flex h-12 cursor-pointer items-center justify-center rounded-[7px] bg-neutral-950 px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Add New Address
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-3 md:mt-6">
      {addresses.map((address, index) => (
        <div
          key={`${address.addressLine}-${address.pincode}-${index}`}
          className="border border-neutral-200 bg-white p-4 sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-[13px] leading-6 text-neutral-700">
              <p className="font-semibold text-neutral-950">
                {address.fullName || "Saved Address"}
                {address.type ? ` · ${address.type}` : ""}
                {address.isDefault ? " · Default" : ""}
              </p>

              <p className="mt-1">{address.addressLine}</p>
              <p>
                {address.city}, {address.state} {address.pincode}
              </p>
              {address.email && <p>{address.email}</p>}
            </div>

            <button
              type="button"
              onClick={() => onEdit(address, index)}
              className="self-start cursor-pointer text-[12px] font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
            >
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AddressFields({
  draft,
  setDraft,
  errors = {},
  serviceability,
  onClearError,
}) {
  const referenceInputClass =
    "h-12 w-full rounded-[7px] border border-neutral-300 bg-white px-4 text-[14px] text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950";

  const fieldClass = (field, extra = "") =>
    [
      referenceInputClass,
      errors[field] ? "!border-red-400 focus:!border-red-500" : "",
      extra,
    ]
      .filter(Boolean)
      .join(" ");

  const updateField = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    onClearError?.(field);
  };

  const handlePincodeChange = (event) => {
    const nextPincode = event.target.value.replace(/\D/g, "").slice(0, 6);

    setDraft((current) => ({
      ...current,
      pincode: nextPincode,
      city: nextPincode === current.pincode ? current.city : "",
      state: nextPincode === current.pincode ? current.state : "",
    }));

    onClearError?.("pincode");
    onClearError?.("city");
    onClearError?.("state");
  };

  const pincodeHelp =
    serviceability?.status === "checking"
      ? "Checking delivery availability..."
      : serviceability?.status === "serviceable"
        ? "Delivery available for this pincode."
        : "";

  const locationAutofilled =
    serviceability?.status === "serviceable" &&
    Boolean(draft.city || draft.state);

  return (
    <div className="space-y-5">
      <Field label="PIN Code*" error={errors.pincode} help={pincodeHelp}>
        <div className="relative">
          <input
            inputMode="numeric"
            autoComplete="postal-code"
            value={draft.pincode}
            onChange={handlePincodeChange}
            className={fieldClass(
              "pincode",
              serviceability?.status === "serviceable" ? "pr-11" : ""
            )}
            placeholder="6 digit pincode"
          />

          {serviceability?.status === "checking" && (
            <Loader2
              className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-500"
              strokeWidth={1.7}
            />
          )}

          {serviceability?.status === "serviceable" && !errors.pincode && (
            <Check
              className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-700"
              strokeWidth={1.9}
            />
          )}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="City*"
          error={errors.city}
          help={locationAutofilled && draft.city ? "Auto-filled from PIN code." : ""}
        >
          <input
            value={draft.city}
            onChange={(event) => updateField("city", event.target.value)}
            className={fieldClass(
              "city",
              locationAutofilled && draft.city ? "bg-neutral-50" : ""
            )}
            placeholder="City"
            autoComplete="address-level2"
          />
        </Field>

        <Field
          label="State*"
          error={errors.state}
          help={locationAutofilled && draft.state ? "Auto-filled from PIN code." : ""}
        >
          <input
            value={draft.state}
            onChange={(event) => updateField("state", event.target.value)}
            className={fieldClass(
              "state",
              locationAutofilled && draft.state ? "bg-neutral-50" : ""
            )}
            placeholder="State"
            autoComplete="address-level1"
          />
        </Field>
      </div>

      <Field label="Complete Address*" error={errors.addressLine}>
        <input
          value={draft.addressLine}
          onChange={(event) => updateField("addressLine", event.target.value)}
          className={fieldClass("addressLine")}
          placeholder="House no., street, area"
          autoComplete="street-address"
        />
      </Field>

      <Field label="Full Name*" error={errors.fullName}>
        <input
          value={draft.fullName}
          onChange={(event) => updateField("fullName", event.target.value)}
          className={fieldClass("fullName")}
          placeholder="Full name"
          autoComplete="name"
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <input
          type="email"
          value={draft.email}
          onChange={(event) => updateField("email", event.target.value)}
          className={fieldClass("email")}
          placeholder="Email address (optional)"
          autoComplete="email"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field label="Address Type">
          <select
            value={draft.type}
            onChange={(event) => updateField("type", event.target.value)}
            className={`${referenceInputClass} cursor-pointer`}
          >
            <option value="Home">Home</option>
            <option value="Work">Work</option>
          </select>
        </Field>

        <label className="flex h-12 cursor-pointer items-center gap-3 text-[12px] font-medium text-neutral-700 sm:px-1">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                isDefault: event.target.checked,
              }))
            }
            className="h-4 w-4 cursor-pointer accent-neutral-950"
          />
          Default Address
        </label>
      </div>
    </div>
  );
}
