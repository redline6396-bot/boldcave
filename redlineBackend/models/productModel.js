import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    weight: { type: String, required: true, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null, min: 0 },
    stockQty: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  images: [
    {
      url: { type: String, required: true },
      public_id: { type: String, required: true }
    }
  ],
  variants: {
    type: [variantSchema],
    required: true,
    validate: [
      function(v) {
        if (!v || v.length === 0) return false;
        // Check for duplicate weights (case insensitive)
        const weights = v.map(variant => variant.weight.toLowerCase().trim());
        return weights.length === new Set(weights).size;
      },
      'Product must have at least one variant with no duplicate weights'
    ]
  },
  categories: {
    type: [String],
    required: true,
    validate: [
      function(c) {
        return c && c.length > 0;
      },
      'Product must have at least one category'
    ]
  },
  sku: { type: String, required: true, unique: true, sparse: true },
  bestseller: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  tags: [{ type: String }],
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
  date: { type: Number, required: true },
  reviewSummary: { type: String, default: '' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviews: { type: Number, default: 0, min: 0 }
})

// Add indexes for better query performance
productSchema.index({ status: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ bestseller: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ date: -1 });
productSchema.index({ 'variants.stockQty': 1 });

const productModel = mongoose.models.product || mongoose.model("product", productSchema);

export default productModel