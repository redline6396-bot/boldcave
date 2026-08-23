import mongoose from "mongoose";

import { PRODUCT_CATEGORIES } from "@/lib/validation";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    alt: { type: String, trim: true },
  },
  { _id: false }
);

const fragranceNotesSchema = new mongoose.Schema(
  {
    top: [{ type: String, trim: true }],
    heart: [{ type: String, trim: true }],
    base: [{ type: String, trim: true }],
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    sku: { type: String, trim: true },
    image: { type: imageSchema, default: undefined },
    images: { type: [imageSchema], default: [] },
  },
  { _id: false }
);

const comboItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productType: {
      type: String,
      enum: ["product", "combo"],
      default: "product",
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    audienceTags: [{ type: String, enum: PRODUCT_CATEGORIES, trim: true }],
    shortDescription: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    images: { type: [imageSchema], default: [] },
    fragranceProfile: { type: String, trim: true },
    longevity: { type: String, trim: true },
    projection: { type: String, trim: true },
    concentration: { type: String, trim: true },
    personality: { type: String, trim: true },
    positioning: { type: String, trim: true },
    whatYouGet: { type: String, trim: true },
    bestFor: [{ type: String, trim: true }],
    bestSeason: [{ type: String, trim: true }],
    howToUse: { type: String, trim: true },
    storagePrecautions: { type: String, trim: true },
    fragranceNotes: { type: fragranceNotesSchema, default: () => ({}) },
    variants: {
      type: [variantSchema],
      required: true,
      validate: {
        validator(variants) {
          if (!Array.isArray(variants) || variants.length === 0) return false;
          const sizes = variants.map((variant) => String(variant.size || "").trim().toLowerCase());
          return sizes.every(Boolean) && sizes.length === new Set(sizes).size;
        },
        message: "Product variants must have unique size labels",
      },
    },
    comboItems: { type: [comboItemSchema], default: [] },
    legalInformation: {
      ingredients: { type: String, trim: true },
      caution: { type: String, trim: true },
    },
    featured: { type: Boolean, default: false, index: true },
    featuredOrder: { type: Number, default: 0, index: true },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
  },
  { timestamps: true }
);

productSchema.index({ audienceTags: 1, status: 1 });
productSchema.index({ "variants.stock": 1 });
productSchema.index({ productType: 1, status: 1 });
productSchema.index({ featured: 1, featuredOrder: 1 });

if (
  mongoose.models.Product?.schema?.path("category") ||
  (mongoose.models.Product && !mongoose.models.Product.schema?.path("productType")) ||
  (mongoose.models.Product && !mongoose.models.Product.schema?.path("variants.image")) ||
  (mongoose.models.Product && !mongoose.models.Product.schema?.path("variants.images")) ||
  (mongoose.models.Product && !mongoose.models.Product.schema?.path("featured")) ||
  (mongoose.models.Product && !mongoose.models.Product.schema?.path("featuredOrder"))
) {
  delete mongoose.models.Product;
}

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
