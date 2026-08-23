"use client";

export const OPEN_CART_DRAWER_EVENT = "bold-cave:open-cart-drawer";
export const OPEN_CHECKOUT_EVENT = "bold-cave:open-checkout";

export function requestCartDrawerOpen() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new window.Event(OPEN_CART_DRAWER_EVENT));
}

export function requestCheckoutOpen() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new window.Event(OPEN_CHECKOUT_EVENT));
}
