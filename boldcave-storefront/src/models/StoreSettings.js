import mongoose from "mongoose";

const storeSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      immutable: true,
    },
    acceptingOrders: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const StoreSettings =
  mongoose.models.StoreSettings ||
  mongoose.model("StoreSettings", storeSettingsSchema);

export default StoreSettings;
