"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShopContext } from "@/context/ShopContext";
import AuthPrompt from "@/components/AuthPrompt";
import axios from "axios";
import {
  Package,
  LogOut,
  ChevronRight,
  MapPin,
  CreditCard,
  Edit2,
  Save,
  X,
  TrendingUp,
  Award,
  User,
  Mail,
  ShoppingBag,
  Leaf,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { backendUrl, token, currency = "₹", setToken } = useContext(ShopContext);

  const [userData, setUserData] = useState(null);
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "" });

  const getInitials = (name) => {
    if (!name) return "U";

    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatJoinDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();

    if (statusLower === "delivered") {
      return {
        bg: "#f4eddf",
        text: "#405526",
      };
    }

    if (statusLower === "shipped") {
      return {
        bg: "#eef2e8",
        text: "#405526",
      };
    }

    if (statusLower === "processing") {
      return {
        bg: "#fff3df",
        text: "#a45a00",
      };
    }

    if (statusLower === "cancelled") {
      return {
        bg: "#fff2f1",
        text: "#c9504a",
      };
    }

    return {
      bg: "#f4eee2",
      text: "#6f6658",
    };
  };

  const loadProfileData = async () => {
    try {
      setLoading(true);

      if (!backendUrl || !token) {
        setLoading(false);
        return;
      }

      const userResponse = await axios.get(`${backendUrl}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (userResponse.data.success) {
        setUserData(userResponse.data.user);
        setEditForm({
          name: userResponse.data.user.name || "",
          email: userResponse.data.user.email || "",
        });
      }

      const orderResponse = await axios.post(
        `${backendUrl}/api/order/userOrders`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (orderResponse.data.success) {
        setOrderData(orderResponse.data.orders.slice(0, 5));
      }
    } catch (error) {
      console.error("Profile load error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadProfileData();
    }
  }, [token]);

  const totalSpent = useMemo(() => {
    return orderData.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  }, [orderData]);

  if (!token) {
    return (
      <AuthPrompt
        title="Your Profile"
        subtitle="Sign in to view and manage your account information"
      />
    );
  }

  const handleLogout = () => {
    const redirectPath = localStorage.getItem("lastVisitedPath");
    const blockedPaths = ["/login", "/newlogin", "/finish-login"];
    const target =
      redirectPath && !blockedPaths.includes(redirectPath) ? redirectPath : "/";

    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    setToken(null);
    router.push(target);
  };

  const handleEditSave = async () => {
    try {
      setSaving(true);

      const response = await axios.put(
        `${backendUrl}/api/user/update-profile`,
        {
          name: editForm.name,
          email: editForm.email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setUserData(response.data.user);
        setIsEditing(false);
      } else {
        console.error("Update failed:", response.data.message);
      }
    } catch (error) {
      console.error("Profile update error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditForm({
      name: userData?.name || "",
      email: userData?.email || "",
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fbf8f1] font-body text-[#332519]">
        <div className="mx-auto flex min-h-[70vh] max-w-[1440px] items-center justify-center px-5">
          <div className="rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] px-8 py-10 text-center shadow-[0_14px_40px_rgba(58,45,29,0.04)]">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#d8ceb9] border-t-[#405526]" />
            <p className="mt-4 text-sm font-medium text-[#5f5648]">
              Loading your profile...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbf8f1] font-body text-[#332519]">
      {/* Header */}
      <section className="border-b border-[#e8dfd1] bg-[#fffdf8]">
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-7 md:px-8 lg:px-12 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#405526]">
                My Account
              </p>

              <h1 className="mt-3 font-display text-[42px] font-medium leading-none tracking-[-0.045em] text-[#332519] sm:text-[56px]">
                Profile
              </h1>

              <p className="mt-3 max-w-[520px] text-sm leading-6 text-[#5f5648]">
                Manage your details, track recent orders, and quickly access
                your Green Valley account.
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#e8dfd1] rounded-[16px] border border-[#e8dfd1] bg-[#fbf8f1]">
              <StatBlock label="Recent orders" value={orderData.length} />
              <StatBlock
                label="Total spent"
                value={`${currency}${totalSpent.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                })}`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-7 sm:px-7 md:px-8 lg:px-12 lg:py-10">
        <div className="grid gap-7 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="min-w-0 space-y-5">
            {/* Profile Card */}
            <div className="rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] p-5 shadow-[0_14px_40px_rgba(58,45,29,0.04)] sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#405526] font-display text-[24px] font-semibold text-white">
                  {getInitials(userData?.name || "User")}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[18px] font-semibold text-[#332519]">
                    {userData?.name || "User"}
                  </p>

                  <p className="mt-1 truncate text-[13px] text-[#5f5648]">
                    {userData?.email || "No email"}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-[12px] text-[#7a756b]">
                    <Award className="h-4 w-4 text-[#405526]" strokeWidth={1.6} />
                    Member since {formatJoinDate(userData?.createdAt)}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-[6px] bg-[#405526] text-sm font-semibold text-white transition-colors hover:bg-[#30421e]"
                >
                  <Edit2 className="h-4 w-4" strokeWidth={1.8} />
                  Edit Profile
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-11 items-center justify-center gap-2 rounded-[6px] border border-[#eadfd0] bg-[#fffdf8] text-sm font-semibold text-[#9a4d45] transition-colors hover:border-[#c9504a] hover:bg-[#fff2f1]"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.8} />
                  Logout
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="overflow-hidden rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] shadow-[0_14px_40px_rgba(58,45,29,0.04)]">
              <div className="border-b border-[#e8dfd1] p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#405526]">
                  Quick Links
                </p>
                <h2 className="mt-2 font-display text-[28px] font-medium tracking-[-0.035em] text-[#332519]">
                  Account
                </h2>
              </div>

              <nav className="divide-y divide-[#eee6d9]">
                {[
                  {
                    icon: Package,
                    label: "My Orders",
                    path: "/orders",
                    description: "Track purchases",
                  },
                  {
                    icon: MapPin,
                    label: "Addresses",
                    path: "/addresses",
                    description: "Delivery locations",
                  },
                  {
                    icon: CreditCard,
                    label: "Payment Methods",
                    path: "/payments",
                    description: "Saved payment options",
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => router.push(item.path)}
                    className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#fbf8f1]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4eddf] text-[#405526]">
                        <item.icon className="h-4.5 w-4.5" strokeWidth={1.65} />
                      </span>

                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[#332519]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-[#6f6658]">
                          {item.description}
                        </span>
                      </span>
                    </span>

                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[#405526] opacity-40 transition-opacity group-hover:opacity-100"
                      strokeWidth={1.8}
                    />
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="min-w-0 space-y-5">
            {/* Edit Panel */}
            {isEditing && (
              <div className="rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] p-5 shadow-[0_14px_40px_rgba(58,45,29,0.04)] sm:p-6">
                <div className="flex items-start justify-between gap-4 border-b border-[#eee6d9] pb-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#405526]">
                      Edit Details
                    </p>
                    <h2 className="mt-2 font-display text-[30px] font-medium tracking-[-0.035em] text-[#332519]">
                      Profile Information
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4eddf] text-[#5f5648]"
                  >
                    <X className="h-5 w-5" strokeWidth={1.7} />
                  </button>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field label="Full Name" icon={User}>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm({ ...editForm, name: event.target.value })
                      }
                      className={inputClass}
                      placeholder="Enter your full name"
                    />
                  </Field>

                  <Field label="Email Address" icon={Mail}>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(event) =>
                        setEditForm({ ...editForm, email: event.target.value })
                      }
                      className={inputClass}
                      placeholder="Enter your email address"
                    />
                  </Field>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={saving}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#405526] text-sm font-semibold text-white transition-colors hover:bg-[#30421e] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" strokeWidth={1.8} />
                        Save Changes
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleEditCancel}
                    className="flex h-11 flex-1 items-center justify-center rounded-[6px] border border-[#ded4c3] bg-[#fffdf8] text-sm font-semibold text-[#5f5648] transition-colors hover:bg-[#f4eee2]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Overview */}
            <div className="grid gap-4 sm:grid-cols-3">
              <OverviewCard
                icon={ShoppingBag}
                title="Orders"
                value={orderData.length}
                text="Recent purchases"
              />
              <OverviewCard
                icon={TrendingUp}
                title="Spent"
                value={`${currency}${totalSpent.toLocaleString("en-IN", {
                  minimumFractionDigits: 0,
                })}`}
                text="Across recent orders"
              />
              <OverviewCard
                icon={Leaf}
                title="Member"
                value="Active"
                text="Green Valley account"
              />
            </div>

            {/* Recent Orders */}
            <div className="overflow-hidden rounded-[18px] border border-[#e8dfd1] bg-[#fffdf8] shadow-[0_14px_40px_rgba(58,45,29,0.04)]">
              <div className="flex items-center justify-between gap-4 border-b border-[#e8dfd1] p-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#405526]">
                    Recent Activity
                  </p>
                  <h2 className="mt-2 font-display text-[30px] font-medium tracking-[-0.035em] text-[#332519]">
                    Recent Orders
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/orders")}
                  className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-[#ded4c3] bg-[#fffdf8] px-4 text-[13px] font-semibold text-[#405526] transition-colors hover:border-[#405526]"
                >
                  View All
                  <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>

              {orderData.length > 0 ? (
                <div className="divide-y divide-[#eee6d9]">
                  {orderData.map((order) => {
                    const statusColor = getStatusColor(order.status);

                    return (
                      <button
                        key={order._id}
                        type="button"
                        onClick={() => router.push("/orders")}
                        className="group w-full p-5 text-left transition-colors hover:bg-[#fbf8f1]"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7a756b]">
                              Order ID
                            </p>

                            <p className="mt-1 text-[17px] font-bold text-[#332519]">
                              #{String(order._id).slice(-8).toUpperCase()}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-[#6f6658]">
                              <span>
                                {new Date(order.date).toLocaleDateString(
                                  "en-IN",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                              <span>•</span>
                              <span>
                                {order.items.length} item
                                {order.items.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                            <p className="text-[18px] font-bold text-[#332519]">
                              {currency}
                              {Number(order.amount || 0).toFixed(0)}
                            </p>

                            <span
                              className="rounded-full px-3 py-1 text-[12px] font-semibold"
                              style={{
                                backgroundColor: statusColor.bg,
                                color: statusColor.text,
                              }}
                            >
                              {order.status || "Pending"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4eddf] text-[#405526]">
                    <Package className="h-6 w-6" strokeWidth={1.6} />
                  </div>

                  <h3 className="mt-5 font-display text-[30px] font-medium tracking-[-0.04em] text-[#332519]">
                    No orders yet
                  </h3>

                  <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-[#5f5648]">
                    Start shopping to see your recent orders and delivery
                    updates here.
                  </p>

                  <button
                    type="button"
                    onClick={() => router.push("/collection")}
                    className="mt-7 inline-flex h-11 items-center justify-center rounded-[6px] bg-[#405526] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#30421e]"
                  >
                    Start Shopping
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

const inputClass =
  "w-full rounded-[8px] border border-[#ded4c3] bg-[#fffdf8] px-4 py-3 text-[14px] text-[#332519] outline-none transition-colors placeholder:text-[#9a9183] focus:border-[#405526]";

function StatBlock({ label, value }) {
  return (
    <div className="px-4 py-5 text-center">
      <p className="font-display text-[26px] font-semibold leading-none tracking-[-0.04em] text-[#405526] sm:text-[32px]">
        {value}
      </p>

      <p className="mt-2 text-[11px] text-[#6f6658]">{label}</p>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[#332519]">
        {Icon && <Icon className="h-4 w-4 text-[#405526]" strokeWidth={1.6} />}
        {label}
      </label>

      {children}
    </div>
  );
}

function OverviewCard({ icon: Icon, title, value, text }) {
  return (
    <div className="rounded-[16px] border border-[#e8dfd1] bg-[#fffdf8] p-5 shadow-[0_14px_40px_rgba(58,45,29,0.04)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4eddf] text-[#405526]">
        <Icon className="h-4.5 w-4.5" strokeWidth={1.65} />
      </div>

      <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7a756b]">
        {title}
      </p>

      <p className="mt-2 text-[22px] font-bold text-[#332519]">{value}</p>

      <p className="mt-1 text-[12px] text-[#6f6658]">{text}</p>
    </div>
  );
}
