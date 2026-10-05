import mongoose from "mongoose";

import { createRuntimeModel } from "@/lib/runtimeModel";

const adminNotificationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    kind: {
      type: String,
      enum: ["new_customer", "new_order", "order_cancelled"],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    href: { type: String, required: true, trim: true, maxlength: 200 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

adminNotificationSchema.index({ createdAt: -1 });

export const AdminNotificationSchema = adminNotificationSchema;

const AdminNotificationModel =
  mongoose.models.AdminNotification ||
  mongoose.model("AdminNotification", adminNotificationSchema);

export default createRuntimeModel("AdminNotification", AdminNotificationModel);
