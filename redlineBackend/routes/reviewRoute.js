import express from 'express';
import {
  addReview,
  getProductReviews,
  getAllReviews,
  deleteReview,
  updateReview,
  getUserReviews,
  markReviewHelpful,
  getAllReviewsForAdmin,
  toggleApproveReview,
  toggleVerifyReview,
  deleteReviewAdmin,
  regenerateReviewSummary
} from '../controllers/reviewController.js';
import authUser from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import mergeUserData from '../middleware/mergeUserData.js';
import upload from '../middleware/multer.js';

const reviewRouter = express.Router();

// Public routes (no auth required)
reviewRouter.get('/product/:productId', getProductReviews); // Get reviews for specific product
reviewRouter.get('/all', getAllReviews); // Get all reviews (with pagination)

// Protected routes (auth required)
reviewRouter.post('/add', authUser, upload.any(), mergeUserData, addReview); // Add new review with photo uploads
reviewRouter.put('/:reviewId', authUser, upload.any(), mergeUserData, updateReview); // Update own review with photos
reviewRouter.delete('/:reviewId', authUser, mergeUserData, deleteReview); // Delete own review
reviewRouter.post('/:reviewId/helpful', authUser, mergeUserData, markReviewHelpful); // Mark review as helpful
reviewRouter.get('/user/my-reviews', authUser, mergeUserData, getUserReviews); // Get user's own reviews

// Admin routes (admin auth required)
reviewRouter.get('/admin/all', adminAuth, getAllReviewsForAdmin); // Get all reviews with filters
reviewRouter.patch('/admin/:reviewId/approve', adminAuth, toggleApproveReview); // Toggle approve
reviewRouter.patch('/admin/:reviewId/verify', adminAuth, toggleVerifyReview); // Toggle verify
reviewRouter.delete('/admin/:reviewId', adminAuth, deleteReviewAdmin); // Delete review
reviewRouter.post('/admin/:productId/regenerate-summary', adminAuth, regenerateReviewSummary); // Regenerate summary manually

export default reviewRouter;
