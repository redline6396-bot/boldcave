import mongoose from "mongoose";
import { createRuntimeModel } from "@/lib/runtimeModel";

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
    displayName: { type: String, trim: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, maxlength: 255 },
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

if (
  mongoose.models.Review &&
  (!mongoose.models.Review.schema?.path("displayName") ||
    !mongoose.models.Review.schema?.path("email"))
) {
  delete mongoose.models.Review;
}

const ReviewModel = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default createRuntimeModel("Review", ReviewModel);
