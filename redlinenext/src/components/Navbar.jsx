"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "../Config";
import { ShopContext } from "../context/ShopContext";
import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

const DESKTOP_NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "Shop", path: "/collection" },
  { label: "About Us", path: "/about" },
  { label: "Contact", path: "/contact" },
];

const SHOP_CATEGORIES = [
  "Atta",
  "Grains",
  "Millets",
  "Pulses",
  "Healthy Flours",
  "Organic",
  "Diet",
];

const SHOP_DISCOVER = [
  { label: "Best Sellers", path: "/collection?sort=bestseller" },
  { label: "New Arrivals", path: "/collection?sort=newest" },
  { label: "Combo Packs", path: "/collection?tag=combo" },
  { label: "Offers", path: "/collection?tag=offer" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, cartCount = 0, logout } = useContext(ShopContext);

  const isLoggedIn = Boolean(token);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showShopMenu, setShowShopMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showPromoBar, setShowPromoBar] = useState(true);
  const [showNavbar, setShowNavbar] = useState(true);

  const accountMenuRef = useRef(null);
  const shopMenuRef = useRef(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const PROMO_THRESHOLD = 10;
    const isProductPage = pathname?.includes("/product/");
    const NAV_HIDE_THRESHOLD = isProductPage ? 50 : 200;
    const SCROLL_THRESHOLD = isProductPage ? 1 : 5;

    const updateScroll = () => {
      const currentScroll = window.scrollY;
      const delta = currentScroll - lastScrollY.current;

      if (delta > SCROLL_THRESHOLD) {
        if (currentScroll > PROMO_THRESHOLD) setShowPromoBar(false);
        if (currentScroll > NAV_HIDE_THRESHOLD) setShowNavbar(false);
      }

      if (delta < -SCROLL_THRESHOLD) setShowNavbar(true);
      if (currentScroll <= PROMO_THRESHOLD) setShowPromoBar(true);

      lastScrollY.current = currentScroll;
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScroll);
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserEmail(user?.email || "");
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    document.body.style.overflow = showSidebar ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showSidebar]);

  useEffect(() => {
    setShowSidebar(false);
    setShowShopMenu(false);
    setShowAccountMenu(false);
  }, [pathname]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }

      if (shopMenuRef.current && !shopMenuRef.current.contains(event.target)) {
        setShowShopMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowSidebar(false);
        setShowShopMenu(false);
        setShowAccountMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const isLinkActive = (link) => {
    if (link.label === "Home") return pathname === "/";
    if (link.label === "Shop") {
      return pathname.startsWith("/collection") || pathname.startsWith("/product");
    }

    return pathname.startsWith(link.path);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-[#e8e0d3] bg-[#fbf8f1]/95 backdrop-blur-md transition-transform duration-300 ease-out ${
          showNavbar ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div
          className={`overflow-hidden bg-[#344b2b] px-4 text-center text-[11px] font-medium tracking-[0.09em] text-[#f8f2e7] transition-all duration-300 sm:text-xs ${
            showPromoBar ? "py-2.5 opacity-100" : "h-0 py-0 opacity-0"
          }`}
        >
          Free delivery above Rs.499
          <span className="mx-3 text-[#d2bf94]">|</span>
          Naturally sourced staples
          <span className="mx-3 hidden text-[#d2bf94] sm:inline">|</span>
          <span className="hidden sm:inline">Secure payments</span>
        </div>

        <div className="border-b border-[#eee6d9] bg-[#fbf8f1]">
          <div className="mx-auto flex h-[70px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-[82px] lg:px-10">
            <button
              type="button"
              onClick={() => setShowSidebar(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#34412d] transition-colors hover:bg-[#f1ebdf] md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.7} />
            </button>

            <Link href="/" className="flex shrink-0 items-center gap-1.5">
              <Image
                src="/images/logo-design.png"
                alt="Green Valley Naturals"
                width={46}
                height={46}
                priority
                className="h-9 w-9 object-contain sm:h-10 sm:w-10 lg:h-11 lg:w-11"
              />

              <div className="hidden leading-none min-[320px]:block">
                <p className="font-serif text-[16px] tracking-[-0.03em] text-[#31442c] min-[360px]:text-[17px] min-[400px]:text-[20px] sm:text-[22px] lg:text-[27px]">
                  Green Valley
                </p>
                <p className="mt-0 text-[7px] font-medium uppercase tracking-[0.25em] text-[#687558] min-[360px]:text-[7.5px] min-[400px]:text-[8.5px] sm:text-[9px] lg:text-[10px]">
                  Naturals
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex lg:gap-2">
              {DESKTOP_NAV_LINKS.map((link) => {
                if (link.label === "Shop") {
                  return (
                    <div key={link.path} ref={shopMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowShopMenu((previous) => !previous)}
                        className={`flex h-11 items-center gap-1 rounded-full px-4 text-sm font-medium transition-colors ${
                          isLinkActive(link)
                            ? "bg-[#f1ebdf] text-[#405526]"
                            : "text-[#34412d] hover:bg-[#f1ebdf] hover:text-[#405526]"
                        }`}
                      >
                        Shop
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            showShopMenu ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {showShopMenu && <ShopDropdown close={() => setShowShopMenu(false)} />}
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`flex h-11 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                      isLinkActive(link)
                        ? "bg-[#f1ebdf] text-[#405526]"
                        : "text-[#34412d] hover:bg-[#f1ebdf] hover:text-[#405526]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <div ref={accountMenuRef} className="relative hidden md:block">
                {isLoggedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAccountMenu((previous) => !previous)}
                      aria-expanded={showAccountMenu}
                      aria-haspopup="menu"
                      className={`flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
                        showAccountMenu
                          ? "bg-[#f1ebdf] text-[#405526]"
                          : "text-[#34412d] hover:bg-[#f1ebdf] hover:text-[#405526]"
                      }`}
                    >
                      <User className="h-[19px] w-[19px]" strokeWidth={1.7} />
                      <span className="hidden lg:block">Account</span>
                      <ChevronDown
                        className={`hidden h-4 w-4 transition-transform duration-200 lg:block ${
                          showAccountMenu ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showAccountMenu && (
                      <AccountDropdown
                        userEmail={userEmail}
                        logout={logout}
                        router={router}
                        close={() => setShowAccountMenu(false)}
                      />
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-[#34412d] transition-colors hover:bg-[#f1ebdf] hover:text-[#405526]"
                  >
                    <LogIn className="h-[19px] w-[19px]" strokeWidth={1.7} />
                    <span className="hidden lg:block">Login</span>
                  </button>
                )}
              </div>

              <Link
                href="/cart"
                className="ml-1 flex h-11 items-center gap-2 rounded-full bg-[#405526] px-3.5 text-sm font-medium text-[#fbf8f1] transition-colors hover:bg-[#304322] sm:px-4"
              >
                <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span className="hidden sm:block">Cart</span>

                {cartCount > 0 && (
                  <span className="flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#d3b06b] px-1.5 text-[11px] font-semibold text-[#2e3724]">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {showSidebar && (
        <MobileSidebar
          pathname={pathname}
          isLoggedIn={isLoggedIn}
          userEmail={userEmail}
          cartCount={cartCount}
          logout={logout}
          router={router}
          close={() => setShowSidebar(false)}
        />
      )}
    </>
  );
}

function ShopDropdown({ close }) {
  return (
    <div className="absolute left-1/2 top-full z-50 w-[540px] -translate-x-1/2 pt-3">
      <div className="overflow-hidden rounded-2xl border border-[#e8e0d4] bg-[#fffdf8] shadow-[0_22px_55px_rgba(42,50,34,0.12)]">
        <div className="grid grid-cols-[1fr_0.9fr]">
          <div className="p-7">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#71805e]">
              Shop by Category
            </p>

            <div className="grid grid-cols-2 gap-x-5 gap-y-3">
              {SHOP_CATEGORIES.map((category) => (
                <Link
                  key={category}
                  href={`/collection?category=${encodeURIComponent(category)}`}
                  onClick={close}
                  className="group flex items-center gap-2 text-[14px] text-[#404a38] transition-colors hover:text-[#405526]"
                >
                  <span className="h-1 w-1 rounded-full bg-[#b9b095] transition-colors group-hover:bg-[#405526]" />
                  {category}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-l border-[#eee6da] bg-[#f7f2e8] p-7">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#71805e]">
              Discover
            </p>

            <div className="space-y-3.5">
              {SHOP_DISCOVER.map((item) => (
                <Link
                  key={item.label}
                  href={item.path}
                  onClick={close}
                  className="block text-[14px] text-[#404a38] transition-colors hover:text-[#405526]"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <Link
              href="/collection"
              onClick={close}
              className="mt-7 inline-flex items-center text-[13px] font-medium text-[#405526] transition-opacity hover:opacity-70"
            >
              View all products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountDropdown({ userEmail, logout, router, close }) {
  const initial = userEmail?.charAt(0)?.toUpperCase() || "U";

  const accountLinks = [
    { label: "My Profile", path: "/profile", icon: User },
    { label: "My Orders", path: "/orders", icon: Package },
  ];

  return (
    <div
      role="menu"
      className="absolute right-0 top-[calc(100%+12px)] z-50 w-[280px] overflow-hidden rounded-[20px] border border-[#e8dfd1] bg-[#fffdf8] shadow-[0_22px_55px_rgba(42,50,34,0.12)]"
    >
      <div className="border-b border-[#eee5d8] bg-[#f7f2e8] px-5 py-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#405526] font-serif text-xl text-[#fbf8f1]">
            {initial}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#71805e]">
              Welcome Back
            </p>
            <p className="mt-1.5 truncate text-sm text-[#303a2b]">{userEmail}</p>
          </div>
        </div>
      </div>

      <div className="px-2.5 py-3">
        {accountLinks.map(({ label, path, icon: Icon }) => (
          <button
            key={label}
            type="button"
            role="menuitem"
            onClick={() => {
              router.push(path);
              close();
            }}
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] text-[#3b4635] transition-colors hover:bg-[#f5efe4] hover:text-[#405526]"
          >
            <Icon
              className="h-[17px] w-[17px] text-[#71805e] transition-colors group-hover:text-[#405526]"
              strokeWidth={1.7}
            />
            {label}
          </button>
        ))}
      </div>

      <div className="border-t border-[#eee5d8] p-2.5">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            logout();
            close();
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] text-[#9d4c38] transition-colors hover:bg-[#fbefea]"
        >
          <LogOut className="h-[17px] w-[17px]" strokeWidth={1.7} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function MobileSidebar({
  pathname,
  isLoggedIn,
  userEmail,
  cartCount,
  logout,
  router,
  close,
}) {
  const menuLinks = [
    ...DESKTOP_NAV_LINKS,
    { label: "Cart", path: "/cart" },
    { label: "Privacy Policy", path: "/privacy" },
    { label: "Terms & Conditions", path: "/terms" },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-[#182015]/35" onClick={close}>
      <aside
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-[86%] max-w-[360px] flex-col bg-[#fffdf8] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#ebe3d7] px-5 py-5">
          <div>
            <p className="font-serif text-2xl tracking-[-0.03em] text-[#31442c]">
              Green Valley
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.35em] text-[#71805e]">
              Naturals
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3ede2] text-[#384331]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoggedIn && (
          <div className="border-b border-[#ebe3d7] bg-[#f7f2e7] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#78836c]">
              Signed in as
            </p>
            <p className="mt-1 truncate text-sm text-[#293323]">{userEmail}</p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {menuLinks.map((link) => {
            const active = link.label === "Home" ? pathname === "/" : pathname.startsWith(link.path);

            return (
              <button
                key={link.path}
                type="button"
                onClick={() => {
                  router.push(link.path);
                  close();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-[15px] transition-colors ${
                  active
                    ? "bg-[#f3edde] font-medium text-[#405526]"
                    : "text-[#364130] hover:bg-[#f5efe4]"
                }`}
              >
                {link.label}

                {link.label === "Cart" && cartCount > 0 && (
                  <span className="rounded-full bg-[#d3b06b] px-2 py-0.5 text-xs font-semibold text-[#2e3724]">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#ebe3d7] p-4">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => {
                logout();
                close();
                router.push("/login");
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#dbc9bd] text-sm font-medium text-[#9f4a37] transition-colors hover:bg-[#fbefea]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                close();
                router.push("/login");
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#405526] text-sm font-medium text-white transition-colors hover:bg-[#304322]"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
