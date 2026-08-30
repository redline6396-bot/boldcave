import mongoose from "mongoose";

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 100 },
    text: { type: String, required: true, trim: true },
    photos: { type: [photoSchema], default: [] },
    approved: { type: Boolean, default: false, index: true },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, approved: 1, createdAt: -1 });

export const ReviewSchema = reviewSchema;

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
