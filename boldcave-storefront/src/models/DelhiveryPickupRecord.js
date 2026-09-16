import mongoose from "mongoose";

import { createRuntimeModel } from "@/lib/runtimeModel";

const pickupEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const pickupOrderSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    orderNumber: { type: String, trim: true },
    waybill: { type: String, trim: true },
    orderStatus: { type: String, trim: true },
    paymentMethod: { type: String, trim: true },
    finalAmount: { type: Number, min: 0 },
    customerName: { type: String, trim: true },
    orderedAt: { type: Date },
  },
  { _id: false }
);

const delhiveryPickupRecordSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "delhivery", immutable: true },
    pickupId: { type: String, trim: true, index: true },
    state: {
      type: String,
      enum: [
        "requesting",
        "scheduled",
        "cancelled",
        "failed",
        "needs_reconciliation",
        "no_ready_shipments",
      ],
      required: true,
    },
    source: {
      type: String,
      enum: ["manual", "automatic", "legacy_snapshot"],
      default: "manual",
    },
    requestDate: { type: String, trim: true },
    pickupTime: { type: String, trim: true },
    pickupLocation: { type: String, trim: true },
    expectedPackageCount: { type: Number, min: 0, default: 0 },
    providerHttpStatus: { type: Number },
    lastError: { type: String, trim: true },
    statusSource: { type: String, trim: true, default: "local_snapshot" },
    requestedAt: { type: Date },
    cancelledAt: { type: Date },
    orders: { type: [pickupOrderSchema], default: [] },
    events: { type: [pickupEventSchema], default: [] },
  },
  { timestamps: true }
);

delhiveryPickupRecordSchema.index({ createdAt: -1 });
delhiveryPickupRecordSchema.index({ state: 1, createdAt: -1 });

export const DelhiveryPickupRecordSchema = delhiveryPickupRecordSchema;

if (
  mongoose.models.DelhiveryPickupRecord &&
  !mongoose.models.DelhiveryPickupRecord.schema?.path("orders")
) {
  delete mongoose.models.DelhiveryPickupRecord;
}

const DelhiveryPickupRecordModel =
  mongoose.models.DelhiveryPickupRecord ||
  mongoose.model("DelhiveryPickupRecord", delhiveryPickupRecordSchema);

export default createRuntimeModel(
  "DelhiveryPickupRecord",
  DelhiveryPickupRecordModel
);
