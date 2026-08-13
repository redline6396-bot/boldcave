import express from 'express';
import {
  createCoupon,
  getAllCoupons,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon
} from '../controllers/couponController.js';
import adminAuth from '../middleware/adminAuth.js';

const couponRouter = express.Router();

// Admin endpoints
couponRouter.post('/create', adminAuth, createCoupon);
couponRouter.get('/list', adminAuth, getAllCoupons);
couponRouter.post('/delete', adminAuth, deleteCoupon);
couponRouter.post('/toggle-status', adminAuth, toggleCouponStatus);

// User endpoint
couponRouter.post('/validate', validateCoupon);

export default couponRouter;
