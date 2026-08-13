import mongoose from "mongoose";

const pendingCartSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // email
  cartData: { type: Object, default: {} },
}, { minimize: false, timestamps: true });

const pendingCartModel = mongoose.models.pending_cart || mongoose.model("pending_cart", pendingCartSchema);

export default pendingCartModel;
