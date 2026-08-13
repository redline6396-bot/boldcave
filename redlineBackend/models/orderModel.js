import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
        name: String,
        variant: {
            weight: String,
            price: Number
        },
        quantity: Number,
        image: String
    }],
    amount: { type: Number, required: true },
    address: { type: Object, required: true},
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    status: { 
        type: String, 
        required: true, 
        default: 'placed',
        enum: ['placed', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']
    },
    paymentMethod: { type: String, required: true },
    payment: { type: Boolean, required: true, default: false},
    date: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt timestamp before saving
orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Update updatedAt timestamp on findByIdAndUpdate
orderSchema.pre('findByIdAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
});

// Add indexes for better query performance
orderSchema.index({ payment: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ date: -1 });
orderSchema.index({ payment: 1, createdAt: -1 });

const orderModel = mongoose.models.order || mongoose.model('order', orderSchema)
export default orderModel;