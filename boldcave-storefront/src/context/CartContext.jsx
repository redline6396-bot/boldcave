"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchProductsByIds } from "@/lib/clientApi";

const CART_STORAGE_KEY = "perfume_cart";

const CartContext = createContext(undefined);

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const normalizeSize = (size) => {
  return String(size || "").trim();
};

const getProductId = (product) => String(product?.id || product?._id || "").trim();

const getProductKeys = (product) =>
  [getProductId(product), product?.slug].map((value) => String(value || "").trim()).filter(Boolean);

const clampQuantity = (quantity, stock) => {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  return Math.min(safeQuantity, Math.max(0, Number(stock) || 0));
};

const findVariant = (product, size) => {
  const normalizedSize = normalizeText(size);
  return product?.variants?.find(
    (variant) => normalizeText(variant.size) === normalizedSize
  );
};

const normalizeStoredCart = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.reduce((cart, item) => {
    const productId = String(item?.productId || "").trim();
    const size = normalizeSize(item?.size);
    const quantity = Math.max(1, Number(item?.quantity) || 1);

    if (!productId || !size) {
      return cart;
    }

    const existingItem = cart.find(
      (cartItem) => cartItem.productId === productId && cartItem.size === size
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ productId, size, quantity });
    }

    return cart;
  }, []);
};

const normalizeCartWithProducts = (
  items,
  productMap,
  { removeMissingProductIds = [] } = {}
) => {
  const missingProductIdsToRemove = new Set(removeMissingProductIds);

  if (!productMap.size && !missingProductIdsToRemove.size) {
    return normalizeStoredCart(items);
  }

  return normalizeStoredCart(items).reduce((cart, item) => {
    const product = productMap.get(item.productId);
    const variant = findVariant(product, item.size);

    if (!product) {
      return missingProductIdsToRemove.has(item.productId)
        ? cart
        : [...cart, item];
    }

    if (!variant || Number(variant.stock) <= 0) {
      return cart;
    }

    const productId = getProductId(product);
    const existingItem = cart.find(
      (cartItem) => cartItem.productId === productId && cartItem.size === variant.size
    );

    if (existingItem) {
      existingItem.quantity = clampQuantity(
        existingItem.quantity + item.quantity,
        variant.stock
      );
    } else {
      cart.push({
        productId,
        size: variant.size,
        quantity: clampQuantity(item.quantity, variant.stock),
      });
    }

    return cart;
  }, []);
};

const areCartItemsEqual = (leftItems, rightItems) => {
  if (leftItems.length !== rightItems.length) return false;

  return leftItems.every((leftItem, index) => {
    const rightItem = rightItems[index];
    return (
      leftItem.productId === rightItem.productId &&
      leftItem.size === rightItem.size &&
      Number(leftItem.quantity) === Number(rightItem.quantity)
    );
  });
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [productsById, setProductsById] = useState({});
  const [hasLoadedCart, setHasLoadedCart] = useState(false);

  const productMap = useMemo(() => new Map(Object.entries(productsById)), [productsById]);

  const rememberProducts = useCallback((products) => {
    const nextProducts = Array.isArray(products) ? products : [products];

    setProductsById((currentProducts) => {
      let didChange = false;
      const updatedProducts = { ...currentProducts };

      nextProducts.forEach((product) => {
        const productKeys = getProductKeys(product);
        if (!productKeys.length) {
          return;
        }

        productKeys.forEach((productKey) => {
          updatedProducts[productKey] = product;
          didChange = didChange || currentProducts[productKey] !== product;
        });
      });

      return didChange ? updatedProducts : currentProducts;
    });
  }, []);

  const resolveProduct = useCallback(
    (productOrId) => {
      if (typeof productOrId === "object" && productOrId) {
        rememberProducts(productOrId);
        return productOrId;
      }

      return productMap.get(String(productOrId || "").trim());
    },
    [productMap, rememberProducts]
  );

  useEffect(() => {
    try {
      const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      setCart(storedCart ? normalizeStoredCart(JSON.parse(storedCart)) : []);
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      setCart([]);
    } finally {
      setHasLoadedCart(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!hasLoadedCart || cart.length === 0) {
      return undefined;
    }

    const missingProductIds = Array.from(
      new Set(
        cart
          .map((item) => item.productId)
          .filter((productId) => productId && !productMap.has(productId))
      )
    );

    if (!missingProductIds.length) {
      return undefined;
    }

    fetchProductsByIds(missingProductIds)
      .then((products) => {
        if (!isMounted) {
          return;
        }

        const resolvedProducts = Array.isArray(products) ? products : [];
        const resolvedProductMap = new Map(productMap);

        resolvedProducts.forEach((product) => {
          getProductKeys(product).forEach((productKey) => {
            resolvedProductMap.set(productKey, product);
          });
        });

        rememberProducts(resolvedProducts);
        setCart((currentCart) => {
          const normalizedCart = normalizeCartWithProducts(
            currentCart,
            resolvedProductMap,
            { removeMissingProductIds: missingProductIds }
          );

          return areCartItemsEqual(currentCart, normalizedCart)
            ? currentCart
            : normalizedCart;
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [cart, hasLoadedCart, productMap, rememberProducts]);

  useEffect(() => {
    if (
      !hasLoadedCart ||
      cart.length === 0 ||
      !cart.every((item) => productMap.has(item.productId))
    ) {
      return;
    }

    setCart((currentCart) => {
      const normalizedCart = normalizeCartWithProducts(currentCart, productMap);
      return areCartItemsEqual(currentCart, normalizedCart)
        ? currentCart
        : normalizedCart;
    });
  }, [cart, hasLoadedCart, productMap]);

  useEffect(() => {
    if (!hasLoadedCart) {
      return;
    }

    const storedCart = cart.map(({ productId, size, quantity }) => ({
      productId,
      size,
      quantity,
    }));

    if (storedCart.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(storedCart));
  }, [cart, hasLoadedCart]);

  const addToCart = useCallback(
    (productOrId, size, quantity = 1) => {
      const product = resolveProduct(productOrId);
      const variant = findVariant(product, size);

      if (!product || !variant || Number(variant.stock) <= 0) {
        return false;
      }

      const productId = getProductId(product);
      const safeQuantity = clampQuantity(quantity, variant.stock);

      setCart((currentCart) => {
        const existingItem = currentCart.find(
          (item) => item.productId === productId && item.size === variant.size
        );

        if (existingItem) {
          return currentCart.map((item) => {
            if (item.productId !== productId || item.size !== variant.size) {
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
            productId,
            size: variant.size,
            quantity: safeQuantity,
          },
        ];
      });

      return true;
    },
    [resolveProduct]
  );

  const updateQuantity = useCallback(
    (productId, size, quantity) => {
      const product = resolveProduct(productId);
      const variant = findVariant(product, size);

      if (!product || !variant || Number(variant.stock) <= 0) {
        return false;
      }

      setCart((currentCart) => {
        if (Number(quantity) <= 0) {
          return currentCart.filter(
            (item) => item.productId !== getProductId(product) || item.size !== variant.size
          );
        }

        return currentCart.map((item) => {
          if (item.productId !== getProductId(product) || item.size !== variant.size) {
            return item;
          }

          return {
            ...item,
            quantity: clampQuantity(quantity, variant.stock),
          };
        });
      });

      return true;
    },
    [resolveProduct]
  );

  const removeFromCart = useCallback((productId, size) => {
    const normalizedProductId = String(productId || "").trim();
    const normalizedSize = normalizeSize(size);

    if (!normalizedProductId || !normalizedSize) {
      return false;
    }

    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.productId !== normalizedProductId || item.size !== normalizedSize
      )
    );

    return true;
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  const getCartItems = useCallback(
    () =>
      cart
        .map((item) => {
          const product = productMap.get(item.productId);
          const variant = findVariant(product, item.size);

          if (!product || !variant) {
            return null;
          }

          const quantity = clampQuantity(item.quantity, variant.stock);

          return {
            ...item,
            quantity,
            product,
            variant,
          };
        })
        .filter(Boolean),
    [cart, productMap]
  );

  const getCartCount = useCallback(
    () => cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
    [cart]
  );

  const getCartTotal = useCallback(
    () =>
      getCartItems().reduce(
        (total, item) =>
          total + (Number(item.variant.sellingPrice) || 0) * item.quantity,
        0
      ),
    [getCartItems]
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
      rememberProducts,
    }),
    [
      addToCart,
      cart,
      clearCart,
      getCartCount,
      getCartItems,
      getCartTotal,
      rememberProducts,
      removeFromCart,
      updateQuantity,
    ]
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
