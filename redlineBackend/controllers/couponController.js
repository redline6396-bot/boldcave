import couponModel from '../models/couponModel.js';

// Admin: Create a new coupon
const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, maxDiscount, minOrderAmount, expiryDate } = req.body;

    // Validation
    if (!code || !discountType || discountValue === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Code, discount type, discount value, and expiry date are required'
      });
    }

    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid discount type. Must be "percentage" or "fixed"'
      });
    }

    // Convert to number and validate
    const discountNum = Number(discountValue);
    if (isNaN(discountNum) || discountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount value must be a number greater than 0'
      });
    }

    if (discountType === 'percentage' && discountNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot exceed 100%'
      });
    }

    // Check if coupon already exists
    const existingCoupon = await couponModel.findOne({ code: code.toUpperCase().trim() });
    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    // Validate expiry date
    const expiryDateObj = new Date(expiryDate);
    if (expiryDateObj <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must be in the future'
      });
    }

    // Create new coupon
    const coupon = new couponModel({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: discountNum,
      maxDiscount: discountType === 'percentage' && maxDiscount ? Number(maxDiscount) : null,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      expiryDate: expiryDateObj,
      isActive: true
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      coupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create coupon'
    });
  }
};

// Admin: Get all coupons
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await couponModel.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      coupons
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons'
    });
  }
};

// Admin: Delete a coupon
const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.body;

    if (!couponId) {
      return res.status(400).json({
        success: false,
        message: 'Coupon ID is required'
      });
    }

    const coupon = await couponModel.findByIdAndDelete(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete coupon'
    });
  }
};

// Admin: Toggle coupon active status
const toggleCouponStatus = async (req, res) => {
  try {
    const { couponId } = req.body;

    if (!couponId) {
      return res.status(400).json({
        success: false,
        message: 'Coupon ID is required'
      });
    }

    const coupon = await couponModel.findById(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
      coupon
    });
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle coupon status'
    });
  }
};

// User: Validate and apply coupon
const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code || cartTotal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and cart total are required'
      });
    }

    // Never trust frontend cart total in production
    // In a real system, recalculate from cart items
    const cartTotalAmount = Number(cartTotal);
    if (isNaN(cartTotalAmount) || cartTotalAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cart total'
      });
    }

    // Find coupon
    const coupon = await couponModel.findOne({ 
      code: code.toUpperCase().trim() 
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon code not found'
      });
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is no longer active'
      });
    }

    // Check expiry date
    if (new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired'
      });
    }

    // Check minimum order amount
    if (cartTotalAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required to use this coupon`
      });
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.discountType === 'percentage') {
      discountAmount = (cartTotalAmount * coupon.discountValue) / 100;

      // Apply max discount cap if specified
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed cart total
    if (discountAmount > cartTotalAmount) {
      discountAmount = cartTotalAmount;
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      discount: discountAmount,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon'
    });
  }
};

export {
  createCoupon,
  getAllCoupons,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon
};
