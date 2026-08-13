import userModel from "../models/userModel.js";
import pendingCartModel from "../models/pendingCartModel.js";
import productModel from "../models/productModel.js";

// Helper to ensure user exists
const getOrCreateUser = async (userId, email) => {
    let user = await userModel.findById(userId);
    if (!user) {
        // Create user with Firebase UID as _id
        user = await userModel.create({
            _id: userId,
            email: email,
            name: email.split('@')[0],
            cartData: {}
        });
    }
    return user;
};

const addToCart = async (req, res) => {
    try {
        const { userId, userEmail, itemId, variantWeight, quantity = 1 } = req.body;

        await getOrCreateUser(userId, userEmail); // Ensure user exists
        const userData = await userModel.findById(userId);

        // ✅ Validate variant if variantWeight is provided
        if (variantWeight) {
            const product = await productModel.findById(itemId);
            if (!product) {
                return res.json({ success: false, message: "Product not found" });
            }

            if (!product.variants || product.variants.length === 0) {
                return res.json({ success: false, message: "This product doesn't have variants" });
            }

            const variant = product.variants.find(v => v.weight === variantWeight);
            if (!variant) {
                return res.json({ success: false, message: "Invalid variant selected" });
            }

            if ((variant.stockQty || 0) <= 0) {
                return res.json({ success: false, message: "This variant is out of stock" });
            }
        }

        let cartData = userData.cartData || {};

        if (!cartData[itemId]) {
            // Create new product entry
            cartData[itemId] = {};
        }

        if (variantWeight) {
            // Add/update variant quantity
            const existing = Number(cartData[itemId][variantWeight]) || 0;
            cartData[itemId][variantWeight] = existing + Number(quantity);
        } else {
            // For backward compatibility, if no variant specified, store as simple product
            cartData[itemId] = Number(quantity);
        }

        await userModel.findByIdAndUpdate(userId, { cartData });
        res.json({ success: true, message: "Added To Cart" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const updateCart = async (req, res) => {
    try {
        const { userId, userEmail, itemId, variantWeight, quantity } = req.body;

        await getOrCreateUser(userId, userEmail); // Ensure user exists
        const userData = await userModel.findById(userId);

        // ✅ Validate variant if variantWeight is provided
        if (variantWeight) {
            const product = await productModel.findById(itemId);
            if (!product) {
                return res.json({ success: false, message: "Product not found" });
            }

            if (!product.variants || product.variants.length === 0) {
                return res.json({ success: false, message: "This product doesn't have variants" });
            }

            const variant = product.variants.find(v => v.weight === variantWeight);
            if (!variant) {
                return res.json({ success: false, message: "Invalid variant selected" });
            }

            if ((variant.stockQty || 0) <= 0 && Number(quantity) > 0) {
                return res.json({ success: false, message: "This variant is out of stock" });
            }
        }

        let cartData = userData.cartData || {};

        if (variantWeight) {
            // Update specific variant quantity
            if (!cartData[itemId]) {
                cartData[itemId] = {};
            }
            cartData[itemId][variantWeight] = Number(quantity) || 0;
        } else {
            // Backward compatibility for non-variant cart
            cartData[itemId] = Number(quantity) || 0;
        }

        await userModel.findByIdAndUpdate(userId, { cartData });
        res.json({ success: true, message: "Cart Updated" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const getUserCart = async (req, res) => {
    try {
        const { userId, userEmail } = req.body;

        const userData = await getOrCreateUser(userId, userEmail); // Ensure user exists
        let cartData = userData.cartData || {};

        // Fetch all existing product IDs
        const allProducts = await productModel.find({}, '_id');
        const validProductIds = new Set(allProducts.map(p => String(p._id)));

        // Filter out deleted products but keep nested variant structure
        const cleaned = {};
        Object.entries(cartData).forEach(([itemId, value]) => {
            if (!validProductIds.has(itemId)) return; // skip deleted products
            if (value == null) return;
            
            // Keep nested structure as-is (no flattening)
            cleaned[itemId] = value;
        });

        res.json({ success: true, cartData: cleaned });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const mergePendingCart = async (req, res) => {
    try {
        const { userId, userEmail, email } = req.body;
        const lookupEmail = String(email || userEmail || '').toLowerCase().trim();

        const userData = await getOrCreateUser(userId, userEmail);
        if (!lookupEmail) {
            return res.json({ success: true, cartData: userData.cartData || {} });
        }
        const pending = await pendingCartModel.findById(lookupEmail);

        if (!pending || !pending.cartData) {
            return res.json({ success: true, cartData: userData.cartData || {} });
        }

        const existing = userData.cartData || {};
        const merged = { ...existing };

        Object.entries(pending.cartData).forEach(([itemId, value]) => {
            if (!merged[itemId]) {
                // New product, add as-is
                merged[itemId] = value;
            } else if (typeof value === 'object' && typeof merged[itemId] === 'object') {
                // Both are objects (variant-based products), merge variants
                Object.entries(value).forEach(([variant, qty]) => {
                    merged[itemId][variant] = (Number(merged[itemId][variant]) || 0) + Number(qty);
                });
            } else {
                // Backward compatibility for non-variant/mixed carts
                merged[itemId] = (Number(merged[itemId]) || 0) + (Number(value) || 0);
            }
        });

        await userModel.findByIdAndUpdate(userId, { cartData: merged });
        await pendingCartModel.findByIdAndDelete(lookupEmail);

        return res.json({ success: true, cartData: merged });
    } catch (error) {
        console.log(error);
        return res.json({ success: false, message: error.message });
    }
};

export { addToCart, updateCart, getUserCart, mergePendingCart };