import reviewModel from "../models/reviewModel.js";
import productModel from "../models/productModel.js";
import validator from "validator";
import { v2 as cloudinary } from 'cloudinary';
import generateReviewSummary from "../utils/generateReviewSummary.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

// Add Review
const addReview = async (req, res) => {
  try {
    const { productId, title, reviewText, rating, userId, userEmail, userName } = req.body;

    // Validation
    if (!productId || !reviewText || !rating || !userId) {
      return res.json({
        success: false,
        message: "Missing required fields"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    if (!reviewText.trim()) {
      return res.json({
        success: false,
        message: "Review cannot be empty"
      });
    }

    if (title && title.trim().length > 100) {
      return res.json({
        success: false,
        message: "Title must be 100 characters or less"
      });
    }

    // Handle file uploads from multer
    let photoUrls = [];
    if (req.files && Object.keys(req.files).length > 0) {
      console.log('Files received:', Object.keys(req.files));
      // Get array of uploaded files
      const uploadedFiles = Object.values(req.files).flat();

      console.log(`Found ${uploadedFiles.length} files to upload`);

      if (uploadedFiles.length > 2) {
        return res.json({
          success: false,
          message: "Maximum 2 photos allowed"
        });
      }

      // Upload each file to cloudinary
      const timestamp = Date.now();
      photoUrls = await Promise.all(
        uploadedFiles.map(async (file, index) => {
          console.log(`Uploading file ${index + 1}:`, file.originalname);
          const customPublicId = `review_${productId}_${userId}_${timestamp}_${index + 1}`;
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
            public_id: customPublicId,
            folder: 'reviews'
          });
          console.log(`File ${index + 1} uploaded:`, result.secure_url);
          return {
            url: result.secure_url,
            public_id: result.public_id
          };
        })
      );
    } else {
      console.log('No files in req.files');
    }
    console.log('Photo URLs to save:', photoUrls);

    // Create review
    const reviewData = {
      productId: productId,
      userId,
      userName,
      userEmail,
      rating: parseInt(rating),
      title: title?.trim() || "",
      reviewText: reviewText.trim(),
      photos: photoUrls,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating review with data:', {
      productId,
      userId,
      userName,
      rating,
      title: reviewData.title,
      reviewText: reviewData.reviewText.substring(0, 50),
      photoCount: photoUrls.length,
      photos: photoUrls
    });

    const review = new reviewModel(reviewData);
    await review.save();

    console.log('Review saved successfully:', review._id, 'with', review.photos.length, 'photos');

    // Get updated average rating
    const allReviews = await reviewModel.find({ productId: productId });
    const averageRating = allReviews.length > 0
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
      : 0;

    // Generate review summary
    const reviewSummary = await generateReviewSummary(productId);

    // Update product with rating, review count, and summary
    await productModel.findByIdAndUpdate(
      productId,
      {
        rating: parseFloat(averageRating),
        reviews: allReviews.length,
        reviewSummary
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Review added successfully",
      review,
      averageRating: parseFloat(averageRating)
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Get Reviews for a Product (sorted by date, current product first)
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.json({
        success: false,
        message: "Product ID required"
      });
    }

    // Get all APPROVED reviews for this product, sorted by newest first
    const reviews = await reviewModel
      .find({ productId: productId, approved: true })
      .sort({ createdAt: -1 });

    // Calculate average rating (only from approved reviews)
    const averageRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    res.json({
      success: true,
      reviews,
      totalReviews: reviews.length,
      averageRating: parseFloat(averageRating)
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Get All Reviews (for browsing all product reviews)
const getAllReviews = async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const reviews = await reviewModel
      .find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const totalCount = await reviewModel.countDocuments();

    res.json({
      success: true,
      reviews,
      totalReviews: totalCount
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Delete Review (user can only delete their own)
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId } = req.body; // From auth middleware

    if (!reviewId || !userId) {
      return res.json({
        success: false,
        message: "Review ID and User ID required"
      });
    }

    const review = await reviewModel.findById(reviewId);

    if (!review) {
      return res.json({
        success: false,
        message: "Review not found"
      });
    }

    if (review.userId !== userId) {
      return res.json({
        success: false,
        message: "Unauthorized: You can only delete your own reviews"
      });
    }

    // Delete photos from cloudinary
    if (review.photos && review.photos.length > 0) {
      await Promise.all(
        review.photos.map(photo =>
          cloudinary.uploader.destroy(photo.public_id)
        )
      );
    }

    await reviewModel.findByIdAndDelete(reviewId);

    // Recalculate average rating and update product
    const remainingReviews = await reviewModel.find({ productId: review.productId });
    const averageRating = remainingReviews.length > 0
      ? (remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length).toFixed(1)
      : 0;

    // Generate updated review summary
    const reviewSummary = await generateReviewSummary(review.productId);

    // Update product with new rating, review count, and summary
    await productModel.findByIdAndUpdate(
      review.productId,
      {
        rating: parseFloat(averageRating),
        reviews: remainingReviews.length,
        reviewSummary
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Update Review (user can only update their own)
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, title, reviewText, rating } = req.body;

    if (!reviewId || !userId) {
      return res.json({
        success: false,
        message: "Review ID and User ID required"
      });
    }

    // Validation
    if (rating && (rating < 1 || rating > 5)) {
      return res.json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    if (reviewText && !reviewText.trim()) {
      return res.json({
        success: false,
        message: "Review cannot be empty"
      });
    }

    if (title && title.trim().length > 100) {
      return res.json({
        success: false,
        message: "Title must be 100 characters or less"
      });
    }

    const review = await reviewModel.findById(reviewId);

    if (!review) {
      return res.json({
        success: false,
        message: "Review not found"
      });
    }

    if (review.userId !== userId) {
      return res.json({
        success: false,
        message: "Unauthorized: You can only update your own reviews"
      });
    }

    // Handle new file uploads if provided
    let photoUrls = review.photos;
    if (req.files && Object.keys(req.files).length > 0) {
      const uploadedFiles = Object.values(req.files).flat();

      if (uploadedFiles.length > 2) {
        return res.json({
          success: false,
          message: "Maximum 2 photos allowed"
        });
      }

      // Delete old photos from cloudinary if replacing
      if (review.photos && review.photos.length > 0) {
        await Promise.all(
          review.photos.map(photo =>
            cloudinary.uploader.destroy(photo.public_id)
          )
        );
      }

      // Upload new files
      const timestamp = Date.now();
      photoUrls = await Promise.all(
        uploadedFiles.map(async (file, index) => {
          const customPublicId = `review_${review.productId}_${userId}_${timestamp}_${index + 1}`;
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'image',
            public_id: customPublicId,
            folder: 'reviews'
          });
          return {
            url: result.secure_url,
            public_id: result.public_id
          };
        })
      );
    }

    // Update fields
    if (title !== undefined) review.title = title.trim();
    if (reviewText !== undefined) review.reviewText = reviewText.trim();
    if (rating !== undefined) review.rating = parseInt(rating);
    review.photos = photoUrls;
    review.updatedAt = new Date();

    await review.save();

    // Recalculate average rating and update product
    const allReviews = await reviewModel.find({ productId: review.productId });
    const averageRating = allReviews.length > 0
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
      : 0;

    // Update product with new rating
    await productModel.findByIdAndUpdate(
      review.productId,
      {
        rating: parseFloat(averageRating),
        reviews: allReviews.length
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Review updated successfully",
      review
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Get Reviews by User (user's own reviews)
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.body; // From auth middleware

    if (!userId) {
      return res.json({
        success: false,
        message: "User ID required"
      });
    }

    const reviews = await reviewModel
      .find({ userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      reviews,
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Mark Review as Helpful
const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.body.userId || req.user?.id;

    if (!reviewId || !userId) {
      return res.json({
        success: false,
        message: "Review ID and User ID are required"
      });
    }

    // Find the review
    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.json({
        success: false,
        message: "Review not found"
      });
    }

    // Check if user already marked as helpful
    if (review.helpfulUsers.includes(userId)) {
      return res.json({
        success: false,
        message: "You already marked this review as helpful"
      });
    }

    // Add user to helpfulUsers and increment count
    review.helpfulUsers.push(userId);
    review.helpfulCount = (review.helpfulCount || 0) + 1;
    await review.save();

    res.json({
      success: true,
      message: "Review marked as helpful",
      helpfulCount: review.helpfulCount
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Get All Reviews with Filters
const getAllReviewsForAdmin = async (req, res) => {
  try {
    const { productId, rating, approved, search = '', limit = 50, skip = 0 } = req.query;

    // Build filter object
    const filter = {};
    if (productId) filter.productId = productId;
    if (rating) filter.rating = parseInt(rating);
    if (approved !== undefined && approved !== '') {
      filter.approved = approved === 'true';
    }
    if (search) {
      filter.userName = { $regex: search, $options: 'i' };
    }

    // Get reviews with filter
    const reviews = await reviewModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const totalCount = await reviewModel.countDocuments(filter);

    res.json({
      success: true,
      reviews,
      totalCount,
      totalShowing: reviews.length
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Toggle Approve Status
const toggleApproveReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.json({
        success: false,
        message: "Review ID required"
      });
    }

    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.json({
        success: false,
        message: "Review not found"
      });
    }

    // Toggle approved status
    review.approved = !review.approved;
    await review.save();

    // Generate updated review summary
    const reviewSummary = await generateReviewSummary(review.productId);

    // Update product with new summary
    await productModel.findByIdAndUpdate(
      review.productId,
      { reviewSummary },
      { new: true }
    );

    res.json({
      success: true,
      message: `Review ${review.approved ? 'approved' : 'unapproved'}`,
      review
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Toggle Verify Status
const toggleVerifyReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.json({
        success: false,
        message: "Review ID required"
      });
    }

    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.json({
        success: false,
        message: "Review not found"
      });
    }

    // Toggle verified status
    review.verified = !review.verified;
    await review.save();

    res.json({
      success: true,
      message: `Review ${review.verified ? 'verified' : 'unverified'}`,
      review
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Delete Review
const deleteReviewAdmin = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.json({
        success: false,
        message: "Review ID required"
      });
    }

    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.json({
        success: false,
        message: "Review not found"
      });
    }

    // Delete photos from cloudinary if any
    if (review.photos && review.photos.length > 0) {
      await Promise.all(
        review.photos.map(photo =>
          cloudinary.uploader.destroy(photo.public_id)
        )
      );
    }

    await reviewModel.findByIdAndDelete(reviewId);

    // Recalculate product rating
    const remainingReviews = await reviewModel.find({ productId: review.productId, approved: true });
    const averageRating = remainingReviews.length > 0
      ? (remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length).toFixed(1)
      : 0;

    await productModel.findByIdAndUpdate(
      review.productId,
      {
        rating: parseFloat(averageRating),
        reviews: remainingReviews.length
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Manually regenerate product review summary
const regenerateReviewSummary = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.json({
        success: false,
        message: "Product ID required"
      });
    }

    // Check if product exists
    const product = await productModel.findById(productId);
    if (!product) {
      return res.json({
        success: false,
        message: "Product not found"
      });
    }

    // Generate review summary
    const reviewSummary = await generateReviewSummary(productId);

    // Update product with new summary
    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      { reviewSummary },
      { new: true }
    );

    res.json({
      success: true,
      message: "Review summary regenerated successfully",
      reviewSummary,
      product: updatedProduct
    });
  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

export {
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
};
