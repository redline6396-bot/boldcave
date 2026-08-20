"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  IdCard,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchMyOrders, updateCurrentUser } from "@/lib/clientApi";
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

function getDisplayName(user) {
  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "User"
  );
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

function validateAddress(address) {
  if (
    !address.fullName ||
    !address.addressLine ||
    !address.city ||
    !address.state
  ) {
    return "Full name, address, city, and state are required.";
  }

  if (!/^\d{6}$/.test(address.pincode)) {
    return "Enter a valid 6 digit pincode.";
  }

  if (!validateEmail(address.email)) {
    return "Address email is invalid.";
  }

  return "";
}

export default function AccountPage() {
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

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddressEditorOpen, setIsAddressEditorOpen] = useState(false);

  const [profileDraft, setProfileDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [addressDraft, setAddressDraft] = useState(emptyAddress);
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);

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

  const resetProfileDraft = () => {
    setProfileDraft({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    });
  };

  const handleProfileSave = async () => {
    if (!validateEmail(profileDraft.email)) {
      setError("Invalid email.");
      setMessage("");
      return;
    }

    setSavingProfile(true);
    setError("");
    setMessage("");

    try {
      await updateCurrentUser({
        firstName: profileDraft.firstName,
        lastName: profileDraft.lastName,
        email: profileDraft.email,
      });

      await refreshUser();
      setIsEditingProfile(false);
      setMessage("Profile updated.");
    } catch (profileError) {
      setError(
        profileError.message || "Unable to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddressSave = async () => {
    const cleanedAddress = normalizeAddressDraft(addressDraft);
    const addressError = validateAddress(cleanedAddress);

    if (addressError) {
      setError(addressError);
      setMessage("");
      return;
    }

    setSavingAddress(true);
    setError("");
    setMessage("");

    try {
      const existingAddresses = addresses.map((address) =>
        normalizeAddressDraft(address)
      );

      const nextAddresses =
        editingAddressIndex === null
          ? [...existingAddresses, cleanedAddress]
          : existingAddresses.map((address, index) =>
              index === editingAddressIndex
                ? cleanedAddress
                : address
            );

      const savedIndex =
        editingAddressIndex ?? nextAddresses.length - 1;

      const normalizedAddresses = nextAddresses.map(
        (address, index) => ({
          ...address,
          isDefault: cleanedAddress.isDefault
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
    setError("");
    setMessage("");
  };

  const openOrdersView = () => {
    router.push("/profile?section=orders");
    setError("");
    setMessage("");
  };

  const openAddressView = () => {
    router.push("/profile?section=address");
    setError("");
    setMessage("");
  };

  const startAddAddress = () => {
    setEditingAddressIndex(null);
    setAddressDraft({
      ...emptyAddress,
      isDefault: addresses.length === 0,
    });
    setIsAddressEditorOpen(true);
    setError("");
    setMessage("");
  };

  const startEditAddress = (address, index) => {
    setEditingAddressIndex(index);
    setAddressDraft(normalizeAddressDraft(address));
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
      className="min-h-screen bg-[#e9e9e9] px-2.5 py-3 text-neutral-950 sm:px-4 sm:py-5 lg:px-6 lg:py-7 xl:px-7 xl:py-8"
      style={{
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className="mx-auto grid max-w-[1360px] items-start gap-4 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="self-start overflow-hidden rounded-[12px] bg-white lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="p-3.5 sm:p-5">
            <div className="rounded-[9px] border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      openOverview();
                      setIsEditingProfile(true);
                    }}
                    className="group inline-flex cursor-pointer items-center gap-2 text-left"
                  >
                    <span className="truncate text-[16px] font-semibold">
                      Hey, {getDisplayName(user)}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      strokeWidth={1.7}
                    />
                  </button>

                  <p className="mt-1.5 truncate text-[12px] text-neutral-500">
                    Logged with +91 {user.phone}
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-[15px] font-semibold uppercase text-white">
                  {getDisplayName(user).slice(0, 1)}
                </div>
              </div>

              <div className="mt-4 border-t border-neutral-200 pt-3">
                <div className="flex h-[58px] w-[126px] flex-col items-center justify-center rounded-[7px] border border-neutral-200">
                  <span className="text-[18px] font-semibold leading-none">
                    {totalOrders}
                  </span>
                  <span className="mt-1 text-[11px] text-neutral-600">
                    Total Orders
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-5 px-1 text-[15px] font-semibold sm:mt-7 sm:text-[16px]">
              Account
            </p>
          </div>

          <nav>
            <SidebarItem
              active={activeView === "overview"}
              icon={UserRound}
              label="Overview"
              description="All details at one place, easy to access"
              onClick={openOverview}
            />

            <SidebarItem
              active={activeView === "orders"}
              icon={Package}
              label="My Orders"
              description="Track your recent purchases"
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

          <div className="px-5 pb-6 pt-7">
            <button
              type="button"
              onClick={handleLogout}
              className="flex cursor-pointer items-center gap-3 text-[14px] font-medium text-red-600 transition-opacity hover:opacity-65"
            >
              <LogOut className="h-[19px] w-[19px]" strokeWidth={1.6} />
              Logout
            </button>
          </div>
        </aside>

        <section className="min-w-0 self-start rounded-[12px] bg-white p-4 sm:p-6 lg:p-7 xl:p-8">
          {(message || error) && (
            <div
              className={[
                "mb-5 rounded-[7px] px-4 py-3 text-[13px]",
                error
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-neutral-200 bg-neutral-50 text-neutral-700",
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
              onAdd={startAddAddress}
              onEdit={startEditAddress}
              onSave={handleAddressSave}
              onCancel={() => {
                setIsAddressEditorOpen(false);
                setError("");
              }}
            />
          ) : (
            <ProfileView
              user={user}
              draft={profileDraft}
              setDraft={setProfileDraft}
              editing={isEditingProfile}
              saving={savingProfile}
              onEdit={() => {
                resetProfileDraft();
                setIsEditingProfile(true);
                setError("");
                setMessage("");
              }}
              onCancel={() => {
                resetProfileDraft();
                setIsEditingProfile(false);
                setError("");
              }}
              onSave={handleProfileSave}
            />
          )}
        </section>
      </div>
    </main>
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
        "group relative flex min-h-[68px] w-full cursor-pointer items-center gap-3 border-t border-neutral-200 border-l-[3px] px-4 text-left transition-colors sm:min-h-[70px] sm:px-5",
        active
          ? "border-l-neutral-950 bg-[#fafafa]"
          : "border-l-transparent bg-white hover:bg-neutral-50",
      ].join(" ")}
    >
      <Icon
        className="h-[20px] w-[20px] shrink-0 text-neutral-900 sm:h-[21px] sm:w-[21px]"
        strokeWidth={1.7}
      />

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium leading-none sm:text-[15px]">
          {label}
        </p>
        <p className="mt-1.5 text-[10px] leading-4 text-neutral-600 sm:text-[11px]">
          {description}
        </p>
      </div>

      <ChevronRight
        className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.7}
      />
    </button>
  );
}

function OrdersView({ orders, loading, error, onRetry }) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-[22px] font-semibold sm:text-[24px]">
            My Orders
          </h1>
          <p className="mt-1.5 text-[12px] text-neutral-500 sm:text-[13px]">
            View and track your recent purchases.
          </p>
        </div>

        {!loading && !error && (
          <span className="shrink-0 text-[12px] text-neutral-500">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </span>
        )}
      </div>

      {loading ? (
        <OrdersSkeleton />
      ) : error ? (
        <div className="mt-7 border border-red-100 bg-red-50 px-4 py-4 text-[13px] leading-5 text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 cursor-pointer text-[11px] font-semibold uppercase tracking-[0.1em] text-red-700 underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      ) : orders.length ? (
        <div className="mt-6 grid gap-3.5 sm:mt-7 sm:gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order?._id || order?.id || order?.orderId}
              order={order}
            />
          ))}
        </div>
      ) : (
        <div className="mt-9">
          <p className="text-[14px] font-semibold uppercase tracking-[0.1em]">
            No Orders Yet
          </p>
          <p className="mt-2 text-[13px] leading-5 text-neutral-500">
            Your orders will appear here after your first purchase.
          </p>
          <Link
            href="/collection"
            className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center border border-neutral-950 bg-neutral-950 px-5 text-[11px] font-semibold uppercase tracking-[0.09em] text-white transition-colors hover:bg-white hover:text-neutral-950"
          >
            Shop Now
          </Link>
        </div>
      )}
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="mt-7 space-y-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="border border-neutral-200 px-5 py-5">
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
  onEdit,
  onCancel,
  onSave,
}) {
  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[22px] font-semibold sm:text-[24px]">
            Profile
          </h1>

          <button
            type="button"
          onClick={onCancel}
          className="cursor-pointer text-[13px] font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            Cancel
          </button>
        </div>

        <div className="mt-8 max-w-[720px]">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First Name">
              <input
                value={draft.firstName}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    firstName: event.target.value,
                  })
                }
                className={inputClass}
                placeholder="First name"
              />
            </Field>

            <Field label="Last Name">
              <input
                value={draft.lastName}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    lastName: event.target.value,
                  })
                }
                className={inputClass}
                placeholder="Last name"
              />
            </Field>

            <Field label="Phone Number">
              <div className="flex h-11 items-center justify-between rounded-[7px] border border-neutral-200 bg-neutral-50 px-3.5">
                <span className="text-[14px] text-neutral-700">
                  +91 {user.phone}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                  Verified
                </span>
              </div>
            </Field>

            <Field label="Email ID">
              <input
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    email: event.target.value,
                  })
                }
                className={inputClass}
                placeholder="Email address"
              />
            </Field>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-neutral-500">
            Phone number is protected because it is used for OTP login.
          </p>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="mt-5 h-11 cursor-pointer rounded-[7px] bg-neutral-950 px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    );
  }

  const rows = [
    {
      label: "First Name",
      value: user.firstName || "Not provided",
      icon: IdCard,
    },
    {
      label: "Last Name",
      value: user.lastName || "Not provided",
      icon: IdCard,
    },
    {
      label: "Phone Number",
      value: `+91 ${user.phone}`,
      icon: Phone,
    },
    {
      label: "Email ID",
      value: user.email || "Not provided",
      icon: Mail,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-semibold sm:text-[24px]">
          Profile
        </h1>

        <button
          type="button"
          onClick={onEdit}
          className="cursor-pointer text-[13px] font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
        >
          Edit
        </button>
      </div>

      <div className="mt-8 max-w-[640px] space-y-6 sm:mt-9 sm:space-y-7">
        {rows.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="grid grid-cols-[24px_minmax(0,1fr)] gap-4"
          >
            <Icon
              className="mt-4 h-[19px] w-[19px] text-neutral-950"
              strokeWidth={1.7}
            />

            <div>
              <p className="text-[11px] text-neutral-500">
                {label}
              </p>
              <p className="mt-1.5 text-[14px] leading-5 text-neutral-950 sm:text-[15px]">
                {value}
              </p>
            </div>
          </div>
        ))}
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
  onAdd,
  onEdit,
  onSave,
  onCancel,
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-semibold sm:text-[24px]">
          My Address
        </h1>

        {!isEditorOpen && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            <Plus className="h-4 w-4" strokeWidth={1.7} />
            Add
          </button>
        )}
      </div>

      {!isEditorOpen ? (
        <AddressList addresses={addresses} onEdit={onEdit} />
      ) : (
        <div className="mt-7 max-w-[760px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">
              {editingAddressIndex === null
                ? "Add New Address"
                : "Edit Address"}
            </h2>

            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer text-[12px] font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
            >
              Cancel
            </button>
          </div>

          <AddressFields draft={draft} setDraft={setDraft} />

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="mt-5 h-11 cursor-pointer rounded-[7px] bg-neutral-950 px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving
              ? "Saving..."
              : editingAddressIndex === null
                ? "Add Address"
                : "Save Address"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-neutral-600">
        {label}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function AddressList({ addresses, onEdit }) {
  if (!addresses.length) {
    return (
      <div className="mt-8 rounded-[9px] border border-neutral-200 bg-neutral-50 px-5 py-6">
        <p className="text-[15px] font-medium">
          No Address Saved Yet
        </p>
        <p className="mt-1.5 text-[13px] text-neutral-500">
          Add your delivery address to shop faster.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-7 grid gap-3">
      {addresses.map((address, index) => (
        <div
          key={`${address.addressLine}-${address.pincode}-${index}`}
          className="rounded-[9px] border border-neutral-200 bg-white p-4"
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

function AddressFields({ draft, setDraft }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Full Name">
        <input
          value={draft.fullName}
          onChange={(event) =>
            setDraft({
              ...draft,
              fullName: event.target.value,
            })
          }
          className={inputClass}
          placeholder="Full name"
        />
      </Field>

      <Field label="Email">
        <input
          type="email"
          value={draft.email}
          onChange={(event) =>
            setDraft({
              ...draft,
              email: event.target.value,
            })
          }
          className={inputClass}
          placeholder="Email"
        />
      </Field>

      <Field label="Full Address">
        <input
          value={draft.addressLine}
          onChange={(event) =>
            setDraft({
              ...draft,
              addressLine: event.target.value,
            })
          }
          className={inputClass}
          placeholder="House, street, area"
        />
      </Field>

      <Field label="City">
        <input
          value={draft.city}
          onChange={(event) =>
            setDraft({
              ...draft,
              city: event.target.value,
            })
          }
          className={inputClass}
          placeholder="City"
        />
      </Field>

      <Field label="State">
        <input
          value={draft.state}
          onChange={(event) =>
            setDraft({
              ...draft,
              state: event.target.value,
            })
          }
          className={inputClass}
          placeholder="State"
        />
      </Field>

      <Field label="Pincode">
        <input
          inputMode="numeric"
          value={draft.pincode}
          onChange={(event) =>
            setDraft({
              ...draft,
              pincode: event.target.value
                .replace(/\D/g, "")
                .slice(0, 6),
            })
          }
          className={inputClass}
          placeholder="6 digit pincode"
        />
      </Field>

      <Field label="Type">
        <select
          value={draft.type}
          onChange={(event) =>
            setDraft({
              ...draft,
              type: event.target.value,
            })
          }
          className={`${inputClass} cursor-pointer`}
        >
          <option value="Home">Home</option>
          <option value="Work">Work</option>
        </select>
      </Field>

      <label className="flex h-11 cursor-pointer items-center gap-3 self-end text-[12px] font-medium text-neutral-700">
        <input
          type="checkbox"
          checked={draft.isDefault}
          onChange={(event) =>
            setDraft({
              ...draft,
              isDefault: event.target.checked,
            })
          }
          className="h-4 w-4 cursor-pointer accent-neutral-950"
        />
        Default Address
      </label>
    </div>
  );
}
