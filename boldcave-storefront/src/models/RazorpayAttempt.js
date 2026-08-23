import mongoose from "mongoose";

const attemptItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String },
    image: { type: String },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    productType: { type: String, enum: ["product", "combo"], default: "product" },
    comboItems: {
      type: [
        {
          productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
          name: { type: String },
          slug: { type: String },
          size: { type: String },
          variantId: { type: String },
          quantity: { type: Number, min: 1 },
          image: { type: String },
        },
      ],
      default: undefined,
    },
  },
  { _id: false }
);

const razorpayAttemptSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customer: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      phone: { type: String, trim: true },
      phoneVerified: { type: Boolean, default: false },
      email: { type: String, trim: true, lowercase: true },
    },
    deliveryAddress: {
      fullName: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      addressLine: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      type: { type: String, enum: ["Home", "Work"], default: "Home" },
    },
    items: { type: [attemptItemSchema], required: true },
    amounts: {
      subtotal: { type: Number, required: true, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      shipping: { type: Number, default: 0, min: 0 },
      finalAmount: { type: Number, required: true, min: 0 },
    },
    coupon: {
      code: { type: String, default: null },
      discount: { type: Number, default: 0 },
    },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    status: {
      type: String,
      enum: ["created", "verifying", "paid", "failed"],
      default: "created",
      index: true,
    },
    failureReason: { type: String, trim: true },
    finalOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

razorpayAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
razorpayAttemptSchema.index({ user: 1, createdAt: -1 });

const RazorpayAttempt =
  mongoose.models.RazorpayAttempt ||
  mongoose.model("RazorpayAttempt", razorpayAttemptSchema);

export default RazorpayAttempt;
