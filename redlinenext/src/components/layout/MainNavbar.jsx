"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, ShoppingBag, X } from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { useCart } from "@/context/CartContext";

const ROUTES = {
  shopAll: "/collection",
  men: "/collection?category=Men",
  women: "/collection?category=Women",
  unisex: "/collection?category=Unisex",
  about: "/about",
  contact: "/contact",
  trackOrder: "/orders",
  orders: "/orders",
  login: "/login",
  cart: "/cart",
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
  { label: "LOGIN", href: ROUTES.login },
];

const socialItems = [
  { label: "X", Icon: FaXTwitter },
  { label: "Facebook", Icon: FaFacebookF },
  { label: "Instagram", Icon: FaInstagram },
  { label: "YouTube", Icon: FaYoutube },
];

function BuyNowLink({ className = "" }) {
  return (
    <Link
      href={ROUTES.shopAll}
      className={[
        "inline-flex h-[30px] items-center justify-center border border-white bg-white px-2.5 text-[10px] font-normal tracking-0 text-neutral-950 sm:h-8 sm:px-4 sm:text-[11px]",
        className,
      ].join(" ")}
    >
      BUY NOW
    </Link>
  );
}

function CartLink({ count, isLight = false, onClick }) {
  return (
    <Link
      href={ROUTES.cart}
      onClick={onClick}
      aria-label={`Cart with ${count} items`}
      className={[
        "relative inline-flex h-9 w-9 cursor-pointer items-center justify-center sm:h-12 sm:w-12",
        isLight ? "text-neutral-950" : "text-white",
      ].join(" ")}
    >
      <ShoppingBag
        className="h-[24px] w-[24px] sm:h-[26px] sm:w-[26px]"
        strokeWidth={1.55}
      />
      <span
        className={[
          "absolute -right-0.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border px-1 text-[9px] font-semibold leading-none",
          isLight
            ? "border-neutral-950 bg-neutral-950 text-white"
            : "border-white bg-white text-neutral-950",
        ].join(" ")}
      >
        {count}
      </span>
    </Link>
  );
}

function DrawerLinks({ activePathname, onNavigate }) {
  return (
    <nav className="flex flex-col pt-7 sm:pt-6">
      {mainMenuItems.map((item, index) => (
        (() => {
          const itemPathname = item.href.split("?")[0];
          const isActive =
            activePathname === itemPathname ||
            (itemPathname !== "/" && activePathname.startsWith(`${itemPathname}/`));

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={[
                "group -mx-9 flex h-14 items-center px-9 text-[14px] font-normal uppercase leading-none tracking-[0.07em] text-neutral-950 transition-colors duration-200 hover:bg-neutral-100 sm:-mx-10 sm:h-[50px] sm:px-10 sm:text-[14px]",
                index === 4 ? "mt-2 sm:mt-1" : "",
                isActive ? "bg-neutral-100" : "",
              ].join(" ")}
            >
              <span className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1">
                {item.label}
              </span>
            </Link>
          );
        })()
      ))}
    </nav>
  );
}

function DrawerUtility({ activePathname, onNavigate }) {
  return (
    <div className="mt-16 sm:mt-auto sm:pt-8">
      <div className="w-full border-t border-neutral-200/70">
        {utilityItems.map((item) => (
          (() => {
            const itemPathname = item.href.split("?")[0];
            const isActive =
              activePathname === itemPathname ||
              (itemPathname !== "/" && activePathname.startsWith(`${itemPathname}/`));

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className={[
                  "group flex h-[50px] w-full items-center justify-between border-b border-neutral-200/70 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-800 transition-colors duration-200 hover:bg-neutral-100 sm:h-[44px] sm:text-[10px]",
                  isActive ? "bg-neutral-100" : "",
                ].join(" ")}
              >
                <span>{item.label}</span>
                <ChevronRight
                  className="h-3.5 w-3.5 text-neutral-700 transition-transform duration-200 group-hover:translate-x-0.5"
                  strokeWidth={1.4}
                />
              </Link>
            );
          })()
        ))}
      </div>

      <div className="mt-10 pb-2 sm:mt-7">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-700 sm:text-[10px]">
          FOLLOW US
        </p>

        <div className="mt-5 flex items-center gap-7 sm:mt-4">
          {socialItems.map(({ label, Icon }) => (
            <span
              key={label}
              aria-label={label}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center text-neutral-950 transition-transform duration-200 hover:scale-105"
              role="img"
            >
              <Icon className="h-[21px] w-[21px]" aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MainNavbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((current) => !current);
  }, []);

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

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDrawer, isDrawerOpen]);

  return (
    <div
      className="sticky top-0 z-[100]"
      style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
    >
      <nav className="grid h-[58px] w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5 bg-black px-3 text-white sm:flex sm:h-[65px] sm:px-8">
        <button
          type="button"
          onClick={toggleDrawer}
          aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={isDrawerOpen}
          className="flex h-10 w-10 cursor-pointer items-center justify-center text-white transition-transform duration-200 hover:scale-105 active:scale-95 sm:absolute sm:left-8 sm:h-12 sm:w-12"
        >
          {isDrawerOpen ? (
            <X className="h-8 w-8 sm:h-[31px] sm:w-[31px]" strokeWidth={1.35} />
          ) : (
            <Menu className="h-[30px] w-[30px] sm:h-[31px] sm:w-[31px]" strokeWidth={1.45} />
          )}
        </button>

        <Link
          href="/"
          aria-label="Home"
          className="justify-self-start truncate text-[20px] font-semibold uppercase tracking-[0.16em] text-white sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:text-[23px] sm:tracking-[0.14em]"
        >
          BRAND
        </Link>

        <div className="flex items-center justify-end gap-1.5 justify-self-end sm:absolute sm:right-8 sm:gap-5">
          <BuyNowLink />
          <CartLink count={cartCount} />
        </div>
      </nav>

      {isDrawerOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={closeDrawer}
          className="fixed bottom-0 left-0 right-0 top-[65px] z-[101] hidden bg-black/50 sm:block"
        />
      )}

      <aside
        className={[
          "fixed left-0 top-0 z-[102] h-dvh w-screen max-w-none bg-white text-neutral-950 transition-transform duration-300 ease-out sm:top-[65px] sm:h-[calc(100dvh-65px)] sm:w-[410px] sm:max-w-[410px]",
          isDrawerOpen ? "translate-x-0" : "-translate-x-[calc(100%+2px)]",
        ].join(" ")}
        aria-hidden={!isDrawerOpen}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="relative grid h-[58px] shrink-0 grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5 bg-black px-3 text-white sm:hidden">
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close menu"
              className="flex h-10 w-10 cursor-pointer items-center justify-center text-white transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <X className="h-8 w-8" strokeWidth={1.35} />
            </button>

            <Link
              href="/"
              onClick={closeDrawer}
              aria-label="Home"
              className="justify-self-start truncate text-[20px] font-semibold uppercase tracking-[0.16em] text-white"
            >
              BRAND
            </Link>

            <div className="flex items-center justify-end gap-1.5 justify-self-end">
              <BuyNowLink />
              <CartLink count={cartCount} onClick={closeDrawer} />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-9 pb-9 sm:px-10 sm:pb-7">
            <DrawerLinks activePathname={pathname} onNavigate={closeDrawer} />
            <DrawerUtility activePathname={pathname} onNavigate={closeDrawer} />
          </div>
        </div>
      </aside>
    </div>
  );
}
