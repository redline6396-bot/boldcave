import mongoose from "mongoose";

import { createRuntimeModel } from "@/lib/runtimeModel";

const messageDeliverySchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => globalThis.crypto.randomUUID() },
    audience: {
      type: String,
      enum: ["customer", "owner"],
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["customer_message", "new_customer", "new_order", "order_cancelled"],
      required: true,
      index: true,
    },
    eventKey: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    channel: { type: String, enum: ["email", "whatsapp"], required: true },
    recipient: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    message: { type: String, required: true, maxlength: 10000 },
    couponCode: { type: String, trim: true, uppercase: true },
    promotionalImageUrl: { type: String, trim: true, maxlength: 1000 },
    promotionalImagePublicId: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ["sent", "failed"], required: true },
    providerMessageId: { type: String, trim: true },
    errorCode: { type: String, trim: true, maxlength: 100 },
    errorSummary: { type: String, trim: true, maxlength: 300 },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

messageDeliverySchema.index({ userId: 1, audience: 1, createdAt: -1 });
messageDeliverySchema.index({ orderId: 1, kind: 1, createdAt: -1 });

export const MessageDeliverySchema = messageDeliverySchema;

if (
  mongoose.models.MessageDelivery &&
  !mongoose.models.MessageDelivery.schema?.path("promotionalImageUrl")
) {
  delete mongoose.models.MessageDelivery;
}

const MessageDeliveryModel =
  mongoose.models.MessageDelivery ||
  mongoose.model("MessageDelivery", messageDeliverySchema);

export default createRuntimeModel("MessageDelivery", MessageDeliveryModel);
