import {v2 as cloudinary} from 'cloudinary';
import productModel from '../models/productModel.js';
import userModel from '../models/userModel.js';
import pendingCartModel from '../models/pendingCartModel.js';
import orderModel from '../models/orderModel.js';
import reviewModel from '../models/reviewModel.js';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET_KEY
});

// function for add product
const addProduct = async (req, res) => {
    try {
        const { name, description, categories, sku, variants, bestseller, featured, tags, draft } = req.body;

        // ✅ Validate required fields
        if (!name || !description || !categories) {
            return res.status(400).json({ success: false, message: "Name, description, and categories are required" });
        }

        // ✅ Validate categories array
        let parsedCategories;
        try {
            parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid categories format" });
        }

        if (!Array.isArray(parsedCategories) || parsedCategories.length === 0) {
            return res.status(400).json({ success: false, message: "Product must have at least one category" });
        }

        // ✅ Validate variants
        if (!variants) {
            return res.status(400).json({ success: false, message: "Variants are required" });
        }

        let parsedVariants;
        try {
            parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid variants format" });
        }

        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(400).json({ success: false, message: "Product must have at least one variant" });
        }

        // ✅ Validate variant structure
        for (const variant of parsedVariants) {
            if (!variant.weight || !variant.sellingPrice || typeof variant.costPrice !== 'number' || typeof variant.stockQty !== 'number') {
                return res.status(400).json({ success: false, message: "Each variant must have weight, sellingPrice, costPrice, and stockQty" });
            }
            if (Number(variant.sellingPrice) <= 0 || Number(variant.costPrice) < 0) {
                return res.status(400).json({ success: false, message: "sellingPrice must be > 0, costPrice must be >= 0" });
            }
            if (Number(variant.stockQty) < 0) {
                return res.status(400).json({ success: false, message: "Stock quantity must be >= 0" });
            }
        }

        // ✅ Check for duplicate weights (case insensitive)
        const weights = parsedVariants.map(v => v.weight.toLowerCase().trim());
        if (weights.length !== new Set(weights).size) {
            return res.status(400).json({ success: false, message: "Duplicate weight values not allowed" });
        }

        // ✅ Generate or validate SKU
        let finalSku = sku;
        if (!finalSku || finalSku.trim() === '') {
            // Auto-generate: first 3 letters of product name + timestamp
            const namePrefix = name.substring(0, 3).toUpperCase();
            const timestamp = Date.now();
            finalSku = `${namePrefix}${timestamp}`;
        }

        // ✅ Check if SKU already exists
        const existingSku = await productModel.findOne({ sku: finalSku });
        if (existingSku) {
            return res.status(400).json({ success: false, message: "SKU already exists. Please provide a unique SKU." });
        }

        // Ensure req.files exists
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ success: false, message: "No images uploaded" });
        }

        // ✅ Extract images safely
        const image1 = req.files.image1?.[0];
        const image2 = req.files.image2?.[0];
        const image3 = req.files.image3?.[0];
        const image4 = req.files.image4?.[0];
        const image5 = req.files.image5?.[0];
        const image6 = req.files.image6?.[0];
        const images = [image1, image2, image3, image4, image5, image6].filter((item) => item !== undefined);

        if (images.length === 0) {
            return res.status(400).json({ success: false, message: "At least one image is required" });
        }

        // Upload images to Cloudinary
        const now = new Date();
        const dateString = now.toISOString().replace(/[:.]/g, '-');
        let imagesUrl = await Promise.all(
            images.map(async (item, idx) => {
                const customPublicId = `product_${name.replace(/\s+/g, '_')}_${dateString}_${idx+1}`;
                let result = await cloudinary.uploader.upload(item.path, {
                    resource_type: 'image',
                    public_id: customPublicId
                });
                return {
                    url: result.secure_url,
                    public_id: result.public_id
                };
            })
        );

        // ✅ Create product data object - UPDATED SCHEMA
        const productData = {
            name,
            description,
            categories: parsedCategories,
            sku: finalSku,
            variants: parsedVariants,
            bestseller: bestseller === "true" ? true : false,
            featured: featured === "true" ? true : false,
            tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
            status: draft === "true" ? 'draft' : 'published',
            images: imagesUrl,
            date: Date.now()
        };

        // ✅ Save product in DB
        const product = new productModel(productData);
        await product.save();
        res.json({ success: true, message: "Product Added" });

    }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// function for list product
const listProducts = async (req, res) => {
    try{
        const products = await productModel.find({});
        
        // Calculate average rating and review count for each product
        const productsWithRatings = await Promise.all(
            products.map(async (product) => {
                const reviews = await reviewModel.find({
                    productId: product._id,
                    approved: true
                });
                
                const avgRating = reviews.length > 0
                    ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
                    : 0;
                
                const productObj = product.toObject();
                productObj.rating = avgRating;
                productObj.reviews = reviews.length;
                return productObj;
            })
        );
        
        res.json({success:true, products: productsWithRatings})
    }
    catch (error){
        console.log(error);
        res.json({success:false, message: error.message})
    }
}


    // function for remove product
    const removeProduct = async (req, res) => {
        try {
            const productId = req.body.id;
            const product = await productModel.findById(productId);
            if (!product) {
                return res.json({ success: false, message: "Product not found" });
            }

            // Delete all cloudinary images except the one used for downloadLink
            let downloadPublicId = null;
            let dateString = product.date ? new Date(product.date).toISOString().replace(/[:.]/g, '-') : null;
            if (product.downloadLink) {
                const match = product.images.find(img => img.url === product.downloadLink);
                if (match) {
                    downloadPublicId = match.public_id;
                }
            }
            await Promise.all(
                product.images
                    .filter(img => {
                        // Do not delete if public_id matches downloadPublicId or contains the product date
                        if (img.public_id === downloadPublicId) return false;
                        if (dateString && img.public_id.includes(dateString)) return false;
                        return true;
                    })
                    .map(img => cloudinary.uploader.destroy(img.public_id))
            );

            // Remove product from all user carts
            const users = await userModel.find({});
            for (let user of users) {
                if (user.cartData && user.cartData[productId]) {
                    delete user.cartData[productId];
                    await user.save();
                }
            }

            // Remove product from all pending (guest) carts
            await pendingCartModel.updateMany(
                { ["cartData." + productId]: { $exists: true } },
                { $unset: { ["cartData." + productId]: "" } }
            );

            // Delete the product record
            await productModel.findByIdAndDelete(productId);

            res.json({ success: true, message: "Product removed & images deleted" });
        }
        catch (error) {
            console.log(error);
            res.json({ success: false, message: error.message });
        }
    }
    
// function for single product info
const singleProduct = async (req, res) => {
    try {
        // Support both POST body and GET query parameter
        const productId = req.body?.productId || req.query?.id;
        
        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }
        
        const product = await productModel.findById(productId)
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        
        // Calculate average rating and review count from approved reviews
        const reviews = await reviewModel.find({
            productId: product._id,
            approved: true
        });
        
        const avgRating = reviews.length > 0
            ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
            : 0;
        
        const productObj = product.toObject();
        productObj.rating = avgRating;
        productObj.reviews = reviews.length;
        
        res.json({success: true, product: productObj})
    }
    catch (error){
        console.log(error)
        res.json({success:false, message: error.message})
    }
}

// Get download link (only for verified buyers)
const getDownloadLink = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.userId;

        // Get the product
        const product = await productModel.findById(productId);
        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }
        
        if (!product.downloadLink) {
            return res.json({ success: false, message: "Download not available for this product" });
        }

        // Import orderModel to verify purchase
        const orderModel = (await import('../models/orderModel.js')).default;
        
        // Check if user has purchased this product
        const order = await orderModel.findOne({
            userId: userId,
            'items._id': productId
        });

        if (!order) {
            return res.status(403).json({ success: false, message: "You haven't purchased this product" });
        }
        res.json({ success: true, downloadLink: product.downloadLink });
    }
    catch (error) {
        console.log('Download error:', error);
        res.json({ success: false, message: error.message });
    }
}

// function for dashboard stats
const getDashboardStats = async (req, res) => {
    try {
        // Use timeout promise to handle slow queries
        const timeout = (promise, ms) => Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
            )
        ]);

        // Execute queries in parallel with 30s timeout
        const [totalProducts, totalOrders, revenueResult, lowStockProducts, draftProducts] = 
            await Promise.all([
                timeout(productModel.countDocuments({}), 30000),
                timeout(orderModel.countDocuments({}), 30000),
                timeout(
                    orderModel.aggregate([
                        { $match: { payment: true } },
                        { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
                    ]),
                    30000
                ),
                timeout(
                    productModel.find({
                        "variants": {
                            $elemMatch: { "stockQty": { $gte: 0, $lt: 5 } }
                        }
                    }).select('name variants sku').lean(),
                    30000
                ),
                timeout(productModel.countDocuments({ status: 'draft' }), 30000)
            ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
        const lowStockCount = lowStockProducts.length;

        res.json({
            success: true,
            stats: {
                totalProducts,
                totalOrders,
                totalRevenue,
                lowStockCount,
                draftProducts
            }
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message.includes('Query timeout') 
                ? 'Database query timeout. Indexes may not be created yet. Please wait a few moments and try again.' 
                : 'Error loading stats: ' + error.message 
        });
    }
}

// function for update product
const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, description, categories, sku, variants, bestseller, featured, tags, status, imagesToRemove } = req.body;
        
        // Find existing product
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // ✅ Validate required fields
        if (!name || !description || !categories) {
            return res.status(400).json({ success: false, message: "Name, description, and categories are required" });
        }

        // ✅ Validate categories
        let parsedCategories;
        try {
            parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid categories format" });
        }

        if (!Array.isArray(parsedCategories) || parsedCategories.length === 0) {
            return res.status(400).json({ success: false, message: "Product must have at least one category" });
        }

        // ✅ Validate variants
        if (!variants) {
            return res.status(400).json({ success: false, message: "Variants are required" });
        }

        let parsedVariants;
        try {
            parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid variants format" });
        }

        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(400).json({ success: false, message: "Product must have at least one variant" });
        }

        // ✅ Validate variant structure
        for (const variant of parsedVariants) {
            if (!variant.weight || !variant.sellingPrice || typeof variant.costPrice !== 'number' || typeof variant.stockQty !== 'number') {
                return res.status(400).json({ success: false, message: "Each variant must have weight, sellingPrice, costPrice, and stockQty" });
            }
            if (Number(variant.sellingPrice) <= 0 || Number(variant.costPrice) < 0) {
                return res.status(400).json({ success: false, message: "sellingPrice must be > 0, costPrice must be >= 0" });
            }
            if (Number(variant.stockQty) < 0) {
                return res.status(400).json({ success: false, message: "Stock quantity must be >= 0" });
            }
        }

        // ✅ Check for duplicate weights
        const weights = parsedVariants.map(v => v.weight.toLowerCase().trim());
        if (weights.length !== new Set(weights).size) {
            return res.status(400).json({ success: false, message: "Duplicate weight values not allowed" });
        }

        // ✅ Validate SKU uniqueness (excluding current product)
        if (sku && sku.trim() !== '') {
            const existingSku = await productModel.findOne({ sku: sku, _id: { $ne: productId } });
            if (existingSku) {
                return res.status(400).json({ success: false, message: "SKU already exists in another product" });
            }
        }

        // Handle image removal from Cloudinary
        let updatedImages = product.images || [];
        if (imagesToRemove) {
            let imagesToRemoveArray;
            try {
                imagesToRemoveArray = typeof imagesToRemove === 'string' ? JSON.parse(imagesToRemove) : imagesToRemove;
            } catch (error) {
                imagesToRemoveArray = [];
            }

            // Delete images from Cloudinary
            for (const publicId of imagesToRemoveArray) {
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.log(`Failed to delete image ${publicId}:`, err);
                }
            }

            // Remove from product images array
            updatedImages = updatedImages.filter(img => !imagesToRemoveArray.includes(img.public_id));
        }

        // Handle new images if uploaded
        if (req.files && Object.keys(req.files).length > 0) {
            const imageFields = ['image1', 'image2', 'image3', 'image4', 'image5', 'image6'];
            const newImages = [];
            
            for (const field of imageFields) {
                if (req.files[field]) {
                    const file = req.files[field][0];
                    const customPublicId = `product_${name.replace(/\s+/g, '_')}_${Date.now()}_${field}`;
                    const result = await cloudinary.uploader.upload(file.path, {
                        resource_type: 'image',
                        public_id: customPublicId
                    });
                    newImages.push({
                        url: result.secure_url,
                        public_id: result.public_id
                    });
                }
            }
            
            // Append new images to existing
            if (newImages.length > 0) {
                updatedImages = [...updatedImages, ...newImages];
            }
        }

        // Update product
        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            {
                name,
                description,
                categories: parsedCategories,
                sku: sku || product.sku,
                variants: parsedVariants,
                bestseller: bestseller === "true" ? true : false,
                featured: featured === "true" ? true : false,
                tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
                status: status || 'published',
                images: updatedImages,
                updated_at: Date.now()
            },
            { new: true }
        );

        res.json({ success: true, message: "Product updated successfully", product: updatedProduct });
    }
    catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

export { listProducts, addProduct, removeProduct, singleProduct, getDownloadLink, getDashboardStats, updateProduct }