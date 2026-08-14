"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { products } from "@/data/products";

const CART_STORAGE_KEY = "perfume_cart";

const CartContext = createContext(undefined);

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const findProduct = (productId) => {
  const normalizedId = normalizeText(productId);

  return products.find((product) => {
    return [product.id, product.slug, product.name].some(
      (value) => normalizeText(value) === normalizedId
    );
  });
};

const findVariant = (product, size) => {
  const normalizedSize = normalizeText(size);

  return product?.variants?.find(
    (variant) => normalizeText(variant.size) === normalizedSize
  );
};

const clampQuantity = (quantity, stock) => {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  return Math.min(safeQuantity, Number(stock) || 0);
};

const normalizeCartItem = (item) => {
  const product = findProduct(item?.productId);
  const variant = findVariant(product, item?.size);

  if (!product || !variant || Number(variant.stock) <= 0) {
    return null;
  }

  return {
    productId: product.id,
    size: variant.size,
    quantity: clampQuantity(item.quantity, variant.stock),
  };
};

const normalizeCart = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.reduce((cart, item) => {
    const normalizedItem = normalizeCartItem(item);
    if (!normalizedItem) {
      return cart;
    }

    const existingItem = cart.find(
      (cartItem) =>
        cartItem.productId === normalizedItem.productId &&
        cartItem.size === normalizedItem.size
    );

    if (existingItem) {
      const variant = findVariant(findProduct(existingItem.productId), existingItem.size);
      existingItem.quantity = clampQuantity(
        existingItem.quantity + normalizedItem.quantity,
        variant.stock
      );
    } else {
      cart.push(normalizedItem);
    }

    return cart;
  }, []);
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [hasLoadedCart, setHasLoadedCart] = useState(false);

  useEffect(() => {
    try {
      const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      setCart(storedCart ? normalizeCart(JSON.parse(storedCart)) : []);
    } catch (error) {
      console.warn("Invalid perfume cart data was cleared.", error);
      window.localStorage.removeItem(CART_STORAGE_KEY);
      setCart([]);
    } finally {
      setHasLoadedCart(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedCart) {
      return;
    }

    if (cart.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hasLoadedCart]);

  const addToCart = (productId, size, quantity = 1) => {
    const product = findProduct(productId);
    const variant = findVariant(product, size);

    if (!product || !variant || Number(variant.stock) <= 0) {
      return false;
    }

    const safeQuantity = clampQuantity(quantity, variant.stock);

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.productId === product.id && item.size === variant.size
      );

      if (existingItem) {
        return currentCart.map((item) => {
          if (item.productId !== product.id || item.size !== variant.size) {
            return item;
          }

          return {
            ...item,
            quantity: clampQuantity(item.quantity + safeQuantity, variant.stock),
          };
        });
      }

      return [
        ...currentCart,
        {
          productId: product.id,
          size: variant.size,
          quantity: safeQuantity,
        },
      ];
    });

    return true;
  };

  const updateQuantity = (productId, size, quantity) => {
    const product = findProduct(productId);
    const variant = findVariant(product, size);

    if (!product || !variant || Number(variant.stock) <= 0) {
      return false;
    }

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.productId !== product.id || item.size !== variant.size) {
          return item;
        }

        return {
          ...item,
          quantity: clampQuantity(quantity, variant.stock),
        };
      })
    );

    return true;
  };

  const removeFromCart = (productId, size) => {
    const product = findProduct(productId);
    const variant = findVariant(product, size);

    if (!product || !variant) {
      return false;
    }

    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.productId !== product.id || item.size !== variant.size
      )
    );

    return true;
  };

  const clearCart = () => {
    setCart([]);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  };

  const getCartItems = () =>
    cart
      .map((item) => {
        const product = findProduct(item.productId);
        const variant = findVariant(product, item.size);

        if (!product || !variant) {
          return null;
        }

        return {
          ...item,
          product,
          variant,
        };
      })
      .filter(Boolean);

  const getCartCount = () =>
    cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);

  const getCartTotal = () =>
    getCartItems().reduce(
      (total, item) =>
        total + (Number(item.variant.sellingPrice) || 0) * item.quantity,
      0
    );

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartCount,
      getCartTotal,
      getCartItems,
    }),
    [cart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}

export default CartProvider;
