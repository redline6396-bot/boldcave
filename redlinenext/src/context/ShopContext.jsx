'use client';

import { createContext, useEffect, useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../Config';

export const ShopContext = createContext();

const cloneCartItems = (items) => JSON.parse(JSON.stringify(items || {}));

const ShopContextProvider = (props) => {
    const router = useRouter();
    const currency = '₹';
    const delivery_fee = 50;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [cartItems, setCartItems] = useState({});
    const [products, setProducts] = useState([]);
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(true);
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponDiscount, setCouponDiscount] = useState(0);

    // Fetch Products
    const getProductsData = async () => {
        try {
            console.log('🔄 Fetching products from:', `${backendUrl}/api/product/list`);
            const response = await axios.get(`${backendUrl}/api/product/list`);
            console.log('📦 Products API Response:', response.data);
            if (response.data.success) {
                // Filter out draft products - only show published
                const publishedProducts = response.data.products.filter(p => p.status !== 'draft');
                console.log('✅ Published products found:', publishedProducts.length);
                setProducts(publishedProducts);
            } else {
                console.log('⚠️ API returned success: false');
            }
        } catch (error) {
            console.log('❌ Error fetching products:', error.message);
            console.error('Full error:', error);
        }
    };

    // Add To Cart - returns a promise that resolves after local update and server sync (if logged in)
    const addToCart = async (itemId, quantity = 1, variantWeight = null) => {
        try {
            let cartData = cloneCartItems(cartItems);
            
            // Normalize variantWeight by trimming whitespace
            const normalizedWeight = variantWeight ? String(variantWeight).trim() : null;
            
            if (normalizedWeight) {
                // Variant-based cart structure
                if (!cartData[itemId]) {
                    cartData[itemId] = {};
                }
                const existing = Number(cartData[itemId][normalizedWeight]) || 0;
                cartData[itemId][normalizedWeight] = existing + quantity;
            } else {
                // Backward compatible simple quantity
                const existing = cartData[itemId];
                let existingCount = 0;
                if (existing != null) {
                    if (typeof existing === 'object') {
                        existingCount = Object.values(existing).reduce((s, v) => s + (Number(v) || 0), 0);
                    } else {
                        existingCount = Number(existing) || 0;
                    }
                }
                cartData[itemId] = existingCount + quantity;
            }
            
            setCartItems(cartData);

            // If logged in, sync with server but don't block UI on failure
            if (token) {
                try {
                    await axios.post(
                        `${backendUrl}/api/cart/add`,
                        { itemId, quantity, variantWeight: normalizedWeight },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } catch (error) {
                    console.log('Error adding to cart (server):', error?.response?.data || error.message || error);
                }
            }
            return true;
        } catch (err) {
            console.error('addToCart unexpected error:', err);
            return false;
        }
    };

    // Update Quantity
    const updateQuantity = async (itemId, quantity, variantWeight = null) => {
        let cartData = cloneCartItems(cartItems);
        
        // Normalize variantWeight by trimming whitespace
        const normalizedWeight = variantWeight ? String(variantWeight).trim() : null;
        
        if (normalizedWeight) {
            // Update specific variant quantity
            if (!cartData[itemId]) {
                cartData[itemId] = {};
            }
            cartData[itemId][normalizedWeight] = Number(quantity) || 0;
        } else {
            // Backward compatible simple quantity update
            cartData[itemId] = Number(quantity) || 0;
        }
        
        setCartItems(cartData);
        
        if (token) {
            try {
                await axios.post(
                    `${backendUrl}/api/cart/update`,
                    { itemId, quantity, variantWeight: normalizedWeight },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (error) {
                console.log('Error updating cart:', error);
            }
        }
    };

    // Get User Cart - merge with local cart
    const getUserCart = async (currentToken, persistToServer = false) => {
        try {
            const response = await axios.post(
                `${backendUrl}/api/cart/get`,
                {},
                { headers: { Authorization: `Bearer ${currentToken}` } }
            );
            if (response.data.success && response.data.cartData) {
                // Keep nested variant structure as-is (no flattening)
                const serverCart = response.data.cartData;

                // Load local cart (from current state/localStorage) and filter out deleted products
                const localRaw = (() => {
                    try {
                        const saved = localStorage.getItem('cartItems');
                        return saved ? JSON.parse(saved) : {};
                    } catch (error) {
                        console.log('Failed to parse local cart:', error);
                        return {};
                    }
                })();
                // Only keep items that exist in the current products list
                const validProductIds = new Set(products.map(p => String(p._id)));
                const cleanedLocal = {};
                Object.entries(localRaw).forEach(([itemId, value]) => {
                    if (!validProductIds.has(itemId)) return;
                    if (value == null) return;
                    cleanedLocal[itemId] = value;
                });

                // Decide merging strategy:
                // - On fresh login (persistToServer === true) merge local guest items into server and persist.
                // - On refresh or non-fresh login (persistToServer === false) prefer server cart if present, else fall back to local.
                let merged;
                if (persistToServer) {
                    merged = { ...serverCart };
                    Object.entries(cleanedLocal).forEach(([itemId, value]) => {
                        if (!merged[itemId]) {
                            merged[itemId] = value;
                        } else if (typeof value === 'object' && typeof merged[itemId] === 'object') {
                            // Both are variant objects, merge
                            Object.entries(value).forEach(([variant, qty]) => {
                                merged[itemId][variant] = (Number(merged[itemId][variant]) || 0) + Number(qty);
                            });
                        } else {
                            // Backward compatible: sum quantities
                            merged[itemId] = (Number(merged[itemId]) || 0) + (Number(value) || 0);
                        }
                    });
                } else {
                    merged = Object.keys(serverCart).length ? serverCart : cleanedLocal;
                }

                // Remove all items with quantity 0 from merged cart
                Object.keys(merged).forEach(itemId => {
                    const val = merged[itemId];
                    if (val == null) {
                        delete merged[itemId];
                    } else if (typeof val === 'object') {
                        // For variant objects, remove empty variants and the product if all empty
                        Object.keys(val).forEach(variant => {
                            if (!val[variant] || val[variant] <= 0) {
                                delete val[variant];
                            }
                        });
                        if (Object.keys(val).length === 0) {
                            delete merged[itemId];
                        }
                    } else if (val <= 0) {
                        delete merged[itemId];
                    }
                });

                console.log('getUserCart: server:', serverCart, 'local:', cleanedLocal, 'mergedChoice:', persistToServer ? 'sum' : 'prefer-server', 'result:', merged);
                setCartItems(merged);

                // Persist merged cart back to server only when explicitly requested
                if (persistToServer && currentToken) {
                    try {
                        for (const [itemId, value] of Object.entries(merged)) {
                            if (typeof value === 'object') {
                                // Variant-based product
                                for (const [variant, qty] of Object.entries(value)) {
                                    await axios.post(
                                        `${backendUrl}/api/cart/update`,
                                        { itemId, variantWeight: variant, quantity: qty },
                                        { headers: { Authorization: `Bearer ${currentToken}` } }
                                    );
                                }
                            } else {
                                // Simple product (backward compat)
                                await axios.post(
                                    `${backendUrl}/api/cart/update`,
                                    { itemId, quantity: value },
                                    { headers: { Authorization: `Bearer ${currentToken}` } }
                                );
                            }
                        }
                        for (const [itemId] of Object.entries(serverCart)) {
                            if (!merged[itemId]) {
                                await axios.post(
                                    `${backendUrl}/api/cart/update`,
                                    { itemId, quantity: 0 },
                                    { headers: { Authorization: `Bearer ${currentToken}` } }
                                );
                            }
                        }
                    } catch (err) {
                        console.log('Error syncing merged cart to server:', err);
                    }
                }
            }
        } catch (error) {
            console.log('Error getting cart:', error);
        }
    };

    // Validate cart - remove items only when the product is deleted from admin panel
    const validateCart = async (productsToCheck = products) => {
        if (!productsToCheck || productsToCheck.length === 0) return;

        setCartItems(prevCart => {
            const validatedCart = { ...prevCart };
            let hasChanges = false;

            for (const itemId of Object.keys(validatedCart)) {
                const productExists = productsToCheck.find(p => p._id === itemId);
                if (!productExists) {
                    delete validatedCart[itemId];
                    hasChanges = true;
                    // Remove from server cart if logged in
                    if (token) {
                        try {
                            axios.post(
                                `${backendUrl}/api/cart/update`,
                                { itemId, quantity: 0 },
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                        } catch (err) {
                            console.log('Error removing invalid cart item from server:', err);
                        }
                    }
                }
            }

            if (hasChanges) {
                try {
                    localStorage.setItem('cartItems', JSON.stringify(validatedCart));
                } catch (error) {
                    console.log('Failed to persist validated cart:', error);
                }
                return { ...validatedCart };
            }
            return prevCart;
        });
    };

    // Logout Function
    const logout = async () => {
        try {
            const wasLoggedIn = Boolean(token);
            await signOut(auth);
            setToken('');
            localStorage.removeItem('token');
            // If the user was logged in, clear their local cart on logout
            if (wasLoggedIn) {
                setCartItems({});
                try {
                    localStorage.removeItem('cartItems');
                } catch (error) {
                    console.log('Failed to remove cart from storage:', error);
                }
            }
            // Restore previous behavior: redirect to last visited path (or homepage), not forced /login
            const redirectPath = localStorage.getItem('lastVisitedPath');
            const loginPaths = ['/login', '/newlogin', '/finish-login'];
            const target = redirectPath && !loginPaths.includes(redirectPath) ? redirectPath : '/';
            router.push(target);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const getCartCount = () => {
        let totalCount = 0;
        for (const items in cartItems) {
            try {
                const val = cartItems[items];
                if (val == null) continue;
                if (typeof val === 'object') {
                    totalCount += Object.values(val).reduce((s, v) => s + (Number(v) || 0), 0);
                } else {
                    totalCount += Number(val) || 0;
                }
            } catch (error) {
                console.log('Failed to count cart item:', error);
            }
        }
        return totalCount;
    };

    const getCartAmount = () => {
        let totalAmount = 0;
        for (const itemId in cartItems) {
            let itemInfo = products.find((product) => product._id === itemId);
            try {
                if (!itemInfo) continue;
                const val = cartItems[itemId];
                if (val == null) continue;
                
                // Variant-based product: {variantWeight: quantity}
                if (typeof val === 'object' && itemInfo.variants) {
                    Object.entries(val).forEach(([variantWeight, quantity]) => {
                        // Find variant selling price
                        const variant = itemInfo.variants.find(v => v.weight === variantWeight);
                        if (variant) {
                            totalAmount += variant.sellingPrice * Number(quantity);
                        }
                    });
                }
            } catch (error) {
                console.log('Failed to calculate cart item amount:', error);
            }
        }
        return totalAmount;
    };

    // Computed authoritative cart count (sum of all variant quantities)
    const cartCount = useMemo(() => {
        let total = 0;
        for (const key in cartItems) {
            const val = cartItems[key];
            if (val == null) continue;
            if (typeof val === 'object') {
                total += Object.values(val).reduce((s, v) => s + (Number(v) || 0), 0);
            } else {
                total += Number(val) || 0;
            }
        }
        return total;
    }, [cartItems]);

    useEffect(() => {
        getProductsData();
        // Refresh products every 10 seconds to catch deleted items
        const interval = setInterval(getProductsData, 10000);
        return () => clearInterval(interval);
    }, []);

    // Load cart from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('cartItems');
            const parsed = saved ? JSON.parse(saved) : {};
            setCartItems(parsed);
        } catch (err) {
            console.log('Failed to read cart from storage', err);
        }
    }, []);

    // Validate cart whenever products change
    useEffect(() => {
        validateCart(products);
    }, [products]);

    // Persist cart for guests so refresh keeps items
    useEffect(() => {
        try {
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
        } catch (err) {
            console.log('Failed to save cart to storage', err);
        }
    }, [cartItems]);

    // Listen to Firebase Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const prevToken = localStorage.getItem('token');
                const freshMagicLogin = localStorage.getItem('freshMagicLogin') === '1';
                const freshToken = await user.getIdToken();
                setToken(freshToken);
                localStorage.setItem('token', freshToken);
                localStorage.setItem('userId', user.uid);
                // If there was no previous token stored, this is a fresh login — persist merged cart to server
                const persist = !prevToken && !freshMagicLogin;
                if (freshMagicLogin) {
                    localStorage.removeItem('freshMagicLogin');
                }
                await getUserCart(freshToken, persist);
            } else {
                setToken('');
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                // Don't clear cart - keep guest cart items
            }
            // Always refetch products after auth state changes
            console.log('✅ Auth state changed, refetching products...');
            await getProductsData();
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const value = {
        products,
        currency,
        delivery_fee,
        setSearch,
        showSearch,
        search,
        setShowSearch,
        cartItems,
        addToCart,
        getCartCount,
        cartCount,
        updateQuantity,
        getCartAmount,
        backendUrl,
        setToken,
        token,
        setCartItems,
        loading,
        logout,
        validateCart,
        appliedCoupon,
        setAppliedCoupon,
        couponDiscount,
        setCouponDiscount
    };

    return (
        <ShopContext.Provider value={value}>
            {props.children}
        </ShopContext.Provider>
    );
};

export default ShopContextProvider;
