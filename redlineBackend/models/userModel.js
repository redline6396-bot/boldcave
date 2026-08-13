import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // CHANGED: Accept Firebase UID string
    name: { type: String, default: 'User' },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: '' },
    cartData: { type: Object, default: {} }
}, { minimize: false, timestamps: true });

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;