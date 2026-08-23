import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
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

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
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
    items: { type: [orderItemSchema], required: true },
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
    payment: {
      method: { type: String, enum: ["razorpay", "cod"], required: true },
      paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "cod"],
        default: "pending",
        index: true,
      },
      razorpayOrderId: { type: String, index: true },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
    },
    orderStatus: {
      type: String,
      enum: ["confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "confirmed",
      index: true,
    },
    shiprocket: {
      shiprocketOrderId: { type: String },
      shipmentId: { type: String },
      awbCode: { type: String },
      courierName: { type: String },
      trackingUrl: { type: String },
      shipmentStatus: { type: String },
      syncStatus: {
        type: String,
        enum: ["not_configured", "pending", "created", "failed"],
        default: "pending",
      },
      lastError: { type: String },
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
