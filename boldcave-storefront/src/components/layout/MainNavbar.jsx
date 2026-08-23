"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, ShoppingCart } from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import CartDrawer from "@/features/customer/cart/CartDrawer";
import CheckoutPage from "@/features/customer/checkout/CheckoutPage";
import {
  OPEN_CART_DRAWER_EVENT,
  OPEN_CHECKOUT_EVENT,
} from "@/lib/cartEvents";

const ROUTES = {
  shopAll: "/collection",
  men: "/collection?category=Men",
  women: "/collection?category=Women",
  unisex: "/collection?category=Unisex",
  about: "/about",
  contact: "/contact",
  trackOrder: "/profile?section=orders",
  orders: "/profile?section=orders",
  login: "/login",
};

const mainMenuItems = [
  { label: "SHOP ALL", href: ROUTES.shopAll },
  { label: "MEN", href: ROUTES.men },
  { label: "WOMEN", href: ROUTES.women },
  { label: "UNISEX", href: ROUTES.unisex },
  { label: "ABOUT US", href: ROUTES.about },
  { label: "CONTACT US", href: ROUTES.contact },
];

const utilityItems = [
  { label: "TRACK ORDER", href: ROUTES.trackOrder },
  { label: "MY ORDERS", href: ROUTES.orders },
];

const socialItems = [
  { label: "X", href: "https://x.com/boldcave", Icon: FaXTwitter },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61593546664572",
    Icon: FaFacebookF,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/bold_cave/",
    Icon: FaInstagram,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@BoldCave",
    Icon: FaYoutube,
  },
];

function getActiveCategoryFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("category") || "";
}

function MenuToggleButton({
  open,
  onClick,
  ariaLabel,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || (open ? "Close menu" : "Open menu")}
      aria-expanded={open}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={[
        "inline-flex cursor-pointer items-center justify-center justify-self-center border-0 bg-transparent p-0 text-white outline-none transition-transform duration-200 hover:scale-105 hover:bg-transparent active:bg-transparent focus:bg-transparent focus-visible:outline-none sm:absolute sm:left-[46.5px] sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:hover:scale-105",
        open
          ? "h-[27px] w-[27px] sm:h-[31px] sm:w-[29px]"
          : "h-[24px] w-[25px] sm:h-[28px] sm:w-[27px]",
        className,
      ].join(" ")}
    >
      {open ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 30 30"
          className="block h-full w-full"
          fill="none"
        >
          <path
            d="M4 4L26 26M26 4L4 26"
            stroke="#ffffff"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 30 28"
          className="block h-full w-full"
          fill="none"
        >
          <path
            d="M1.5 3H28.5M1.5 14H28.5M1.5 25H28.5"
            stroke="#ffffff"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

function CaveShopLink({ className = "" }) {
  return (
    <Link
      href={ROUTES.shopAll}
      aria-label="Shop the collection"
      className={[
        "inline-flex h-9 w-9 cursor-pointer items-center justify-center text-white sm:h-12 sm:w-12",
        className,
      ].join(" ")}
    >
      <img
        src="/images/brand/bold-cave-icon.png"
        alt=""
        className="h-[28px] w-auto max-w-[34px] object-contain sm:h-[34px] sm:max-w-[40px]"
      />
    </Link>
  );
}

function BrandLogo({ onClick, className = "" }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Bold Cave home"
      className={[
        "inline-flex h-[48px] w-[150px] cursor-pointer items-center justify-center justify-self-center overflow-hidden sm:absolute sm:left-1/2 sm:top-1/2 sm:h-[75px] sm:w-[290px] sm:-translate-x-1/2 sm:-translate-y-1/2",
        className,
      ].join(" ")}
    >
      <img
        src="/images/brand/bold-cave-logo.png"
        alt="Bold Cave"
        className="block h-full w-full object-contain object-center"
      />
    </Link>
  );
}

function CartLink({ count, isLight = false, onClick }) {
  const visibleCount = count > 99 ? "99+" : count;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Cart with ${count} items`}
      className={[
        "relative inline-flex h-9 w-9 cursor-pointer items-center justify-center sm:h-12 sm:w-12",
        isLight ? "text-neutral-950" : "text-white",
      ].join(" ")}
    >
      <ShoppingCart
        className="h-[23px] w-[23px] sm:h-[26px] sm:w-[26px]"
        strokeWidth={2}
      />

      {count > 0 && (
        <span
          className={[
            "absolute right-0 top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border px-0.5 text-[10px] font-semibold leading-none sm:right-0.5 sm:top-0.5 sm:h-5 sm:min-w-5 sm:px-1 sm:text-[10px]",
            isLight
              ? "border-neutral-950 bg-neutral-950 text-white"
              : "border-white bg-white text-neutral-950",
          ].join(" ")}
        >
          {visibleCount}
        </span>
      )}
    </button>
  );
}

function DrawerLinks({
  activePathname,
  activeCategory,
  onNavigate,
}) {
  const normalizedCategory = String(activeCategory || "").trim().toLowerCase();

  const isMainItemActive = (item) => {
    if (item.href === ROUTES.shopAll) {
      return activePathname === "/collection" && !normalizedCategory;
    }

    if (item.href === ROUTES.men) {
      return (
        activePathname === "/collection" && normalizedCategory === "men"
      );
    }

    if (item.href === ROUTES.women) {
      return (
        activePathname === "/collection" && normalizedCategory === "women"
      );
    }

    if (item.href === ROUTES.unisex) {
      return (
        activePathname === "/collection" && normalizedCategory === "unisex"
      );
    }

    const itemPathname = item.href.split("?")[0];

    return (
      activePathname === itemPathname ||
      (itemPathname !== "/" &&
        activePathname.startsWith(`${itemPathname}/`))
    );
  };

  return (
    <nav className="pt-[clamp(16px,4dvh,28px)] sm:pt-8">
      <div className="flex flex-col">
        {mainMenuItems.map((item) => {
          const isActive = isMainItemActive(item);

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={[
                "group -mx-7 flex min-h-[clamp(38px,6.4dvh,46px)] cursor-pointer items-center px-7 text-[15px] font-normal uppercase leading-none tracking-[0.055em] text-neutral-950 transition-colors duration-200 hover:bg-[#f3f3f3] sm:-mx-9 sm:min-h-[48px] sm:px-9 sm:text-[15px]",
                isActive ? "font-medium" : "",
              ].join(" ")}
            >
              <span className="inline-block">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DrawerUtility({
  onNavigate,
  isAuthenticated,
  openAuth,
}) {
  const authItems = isAuthenticated
    ? [{ label: "MY ACCOUNT", href: "/profile" }]
    : [{ label: "LOGIN", href: ROUTES.login, authRedirect: "/profile" }];

  const items = [...utilityItems, ...authItems];

  const handleAuthClick = (event, redirectTo) => {
    event.preventDefault();
    onNavigate();
    openAuth(redirectTo);
  };

  return (
    <div className="mt-[clamp(12px,2.5dvh,20px)] border-t border-neutral-200/80 pt-3 sm:mt-6 sm:pt-4">
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const shouldOpenAuth =
            !isAuthenticated &&
            (item.label === "MY ORDERS" || item.authRedirect);

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={
                shouldOpenAuth
                  ? (event) =>
                      handleAuthClick(event, item.authRedirect || item.href)
                  : onNavigate
              }
              className="group -mx-7 flex min-h-[clamp(34px,5.5dvh,39px)] cursor-pointer items-center justify-between px-7 text-[11px] font-medium uppercase tracking-[0.09em] text-neutral-700 transition-colors duration-200 hover:bg-[#f3f3f3] sm:-mx-9 sm:min-h-[40px] sm:px-9 sm:text-[11px]"
            >
              <span className="inline-block">
                {item.label}
              </span>

              <ChevronRight
                className="h-3.5 w-3.5 text-neutral-500"
                strokeWidth={1.4}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DrawerSocials() {
  return (
    <div className="mt-auto pb-1 pt-[clamp(18px,4dvh,32px)] sm:pt-9">
      <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-neutral-600">
        FOLLOW US
      </p>

      <div className="mt-3.5 flex items-center gap-5 sm:gap-8">
        {socialItems.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            aria-label={label}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center text-neutral-950"
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function MainNavbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [mobileDrawerTop, setMobileDrawerTop] = useState(0);
  const [desktopDrawerTop, setDesktopDrawerTop] = useState(65);
  const [activeCategory, setActiveCategory] = useState("");

  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef(null);

  const { getCartCount } = useCart();
  const { isAuthenticated, openAuth } = useAuth();
  const cartCount = getCartCount();

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const closeCartDrawer = useCallback(() => setIsCartDrawerOpen(false), []);
  const syncActiveCategory = useCallback(() => {
    setActiveCategory(getActiveCategoryFromLocation());
  }, []);

  const measureDrawerTop = useCallback(() => {
    if (!navRef.current) {
      return;
    }

    const navRect = navRef.current.getBoundingClientRect();

    setMobileDrawerTop(Math.max(0, Math.round(navRect.bottom)));
    setDesktopDrawerTop(Math.max(0, Math.round(navRect.bottom)));
  }, []);

  const toggleDrawer = useCallback(() => {
    if (isDrawerOpen) {
      setIsDrawerOpen(false);
      return;
    }

    syncActiveCategory();

    if (navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      setMobileDrawerTop(Math.max(0, Math.round(navRect.bottom)));
      setDesktopDrawerTop(Math.max(0, Math.round(navRect.bottom)));
    }

    setIsCartDrawerOpen(false);
    setIsDrawerOpen(true);
  }, [isDrawerOpen, syncActiveCategory]);

  const openCartDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setIsCartDrawerOpen(true);
  }, []);

  const openCheckout = useCallback(() => {
    setIsDrawerOpen(false);
    setIsCheckoutOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
  }, []);

  const handleCheckoutSuccess = useCallback(() => {
    setIsCheckoutOpen(false);
    setIsCartDrawerOpen(false);
    router.push("/orders");
  }, [router]);

  useEffect(() => {
    window.addEventListener(OPEN_CART_DRAWER_EVENT, openCartDrawer);
    window.addEventListener(OPEN_CHECKOUT_EVENT, openCheckout);

    return () => {
      window.removeEventListener(OPEN_CART_DRAWER_EVENT, openCartDrawer);
      window.removeEventListener(OPEN_CHECKOUT_EVENT, openCheckout);
    };
  }, [openCartDrawer, openCheckout]);

  useEffect(() => {
    syncActiveCategory();
    window.addEventListener("popstate", syncActiveCategory);

    return () => {
      window.removeEventListener("popstate", syncActiveCategory);
    };
  }, [pathname, syncActiveCategory]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", measureDrawerTop);
    window.addEventListener("scroll", measureDrawerTop, { passive: true });

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", measureDrawerTop);
      window.removeEventListener("scroll", measureDrawerTop);
    };
  }, [closeDrawer, isDrawerOpen, measureDrawerTop]);

  return (
    <div
      className="sticky top-0 z-[100]"
      style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
    >
      <nav
        ref={navRef}
        className="relative grid h-[58px] w-full grid-cols-[38px_minmax(0,1fr)_78px] items-center gap-1.5 bg-black px-3 text-white sm:flex sm:h-[65px] sm:px-8"
      >
        <MenuToggleButton
          open={isDrawerOpen}
          onClick={toggleDrawer}
        />

        <BrandLogo />

        <div className="flex items-center justify-end gap-1.5 justify-self-end sm:absolute sm:right-8 sm:gap-2">
          <CaveShopLink />
          <CartLink count={cartCount} onClick={openCartDrawer} />
        </div>
      </nav>

      {isDrawerOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={closeDrawer}
          className="fixed bottom-0 left-0 right-0 z-[101] hidden cursor-pointer bg-black/50 sm:block"
          style={{ top: `${desktopDrawerTop}px` }}
        />
      )}

      <aside
        className={[
          "fixed left-0 z-[102] w-screen max-w-none bg-white text-neutral-950 transition-transform duration-300 ease-out sm:w-[400px] sm:max-w-[400px]",
          isDrawerOpen
            ? "translate-x-0"
            : "-translate-x-[calc(100%+2px)]",
        ].join(" ")}
        style={{
          "--mobile-drawer-top": `${mobileDrawerTop}px`,
          "--drawer-top": `${desktopDrawerTop}px`,
        }}
        aria-hidden={!isDrawerOpen}
      >
        <style jsx>{`
          aside {
            top: var(--mobile-drawer-top);
            height: calc(100dvh - var(--mobile-drawer-top));
          }

          @media (min-width: 640px) {
            aside {
              top: var(--drawer-top);
              height: calc(100dvh - var(--drawer-top));
            }
          }

          .drawer-content {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .drawer-content::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="drawer-content flex min-h-0 flex-1 flex-col overflow-y-auto px-7 pb-[clamp(14px,3dvh,28px)] sm:px-9 sm:pb-7">
            <DrawerLinks
              activePathname={pathname}
              activeCategory={activeCategory}
              onNavigate={closeDrawer}
            />

            <DrawerUtility
              isAuthenticated={isAuthenticated}
              onNavigate={closeDrawer}
              openAuth={openAuth}
            />

            <DrawerSocials />
          </div>
        </div>
      </aside>

      <CartDrawer isOpen={isCartDrawerOpen} onClose={closeCartDrawer} />
      {isCheckoutOpen && (
        <CheckoutPage
          onClose={closeCheckout}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
