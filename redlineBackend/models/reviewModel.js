import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: false, maxlength: 100 },
  reviewText: { type: String, required: true },
  photos: [
    {
      url: { type: String },
      public_id: { type: String },
      _id: false
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
  approved: { type: Boolean, default: true },
  helpfulCount: { type: Number, default: 0 },
  helpfulUsers: [{ type: String }]
});

// Index for faster queries
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1 });

const reviewModel = mongoose.models.review || mongoose.model('review', reviewSchema);
export default reviewModel;
