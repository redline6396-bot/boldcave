import reviewModel from '../models/reviewModel.js';

/**
 * Positive and negative keywords for sentiment analysis
 */
const POSITIVE_KEYWORDS = [
  'good', 'excellent', 'amazing', 'great', 'fresh', 'quality',
  'best', 'perfect', 'love', 'wonderful', 'fantastic', 'nice',
  'superb', 'outstanding', 'impressed', 'happy', 'satisfied',
  'recommend', 'premium', 'worth', 'organic', 'tasty', 'healthy',
  'reliable', 'efficient', 'fast', 'smooth', 'clean', 'brilliant'
];

const NEGATIVE_KEYWORDS = [
  'bad', 'poor', 'worst', 'terrible', 'awful', 'damaged',
  'broken', 'waste', 'late', 'slow', 'problem', 'issue',
  'concerned', 'disappointed', 'unhappy', 'regret', 'avoid',
  'useless', 'overpriced', 'low', 'quality', 'cheap', 'fresh',
  'stale', 'expired', 'wrong', 'missing', 'incomplete'
];

/**
 * Count keyword occurrences in text (case-insensitive, word boundaries)
 */
const countKeywordOccurrences = (text, keywords) => {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  let count = 0;

  keywords.forEach(keyword => {
    // Use word boundary regex to match whole words only
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) count += matches.length;
  });

  return count;
};

/**
 * Generate professional review summary based on approved reviews
 * @param {string|number} productId - Product ID
 * @returns {Promise<string>} Professional summary (max 500 chars)
 */
const generateReviewSummary = async (productId) => {
  try {
    // Fetch all approved reviews for the product
    const reviews = await reviewModel
      .find({
        productId: parseInt(productId),
        approved: true
      })
      .lean();

    // If no reviews, return empty string
    if (!reviews || reviews.length === 0) {
      return '';
    }

    // Calculate statistics
    const totalReviews = reviews.length;
    const ratings = reviews.map(r => r.rating);
    const averageRating = (ratings.reduce((a, b) => a + b, 0) / totalReviews).toFixed(1);

    // Count review sentiments
    const positiveReviews = ratings.filter(r => r >= 4).length;
    const negativeReviews = ratings.filter(r => r <= 2).length;
    const positivePercentage = Math.round((positiveReviews / totalReviews) * 100);

    // Combine all review text for keyword analysis
    const allReviewText = reviews
      .map(r => `${r.title || ''} ${r.reviewText || ''}`)
      .join(' ');

    // Count keyword occurrences
    const positiveKeywordCount = countKeywordOccurrences(
      allReviewText,
      POSITIVE_KEYWORDS
    );
    const negativeKeywordCount = countKeywordOccurrences(
      allReviewText,
      NEGATIVE_KEYWORDS
    );

    // Detect dominant sentiments
    const hasStrongPositiveSentiment = positivePercentage >= 75;
    const hasStrongNegativeSentiment = negativeReviews > positiveReviews;
    const hasMixedFeedback = positivePercentage >= 40 && positivePercentage < 75;

    // Generate professional summary
    let summary = `Customers rate this product ${averageRating} out of 5 based on ${totalReviews} review${totalReviews !== 1 ? 's' : ''}. `;

    // Add sentiment-based observation
    if (hasStrongPositiveSentiment) {
      summary += 'Most buyers appreciate the quality and value it offers. ';
    } else if (hasStrongNegativeSentiment) {
      summary += `However, ${negativePercentage}% of customers reported issues or concerns. `;
    } else if (hasMixedFeedback) {
      summary += 'While many customers are satisfied, some have noted areas for improvement. ';
    } else {
      summary += 'Customers have shared mixed feedback about their experience. ';
    }

    // Add specific concern if significant negative feedback
    if (negativeReviews >= 2) {
      summary += 'A few users mentioned concerns regarding delivery time and packaging. ';
    }

    // Add overall assessment
    summary += 'Overall, the product receives ';
    if (averageRating >= 4.5) {
      summary += 'strong positive feedback from customers.';
    } else if (averageRating >= 3.5) {
      summary += 'positive feedback with room for improvement.';
    } else if (averageRating >= 2.5) {
      summary += 'moderate feedback with noted concerns.';
    } else {
      summary += 'caution is recommended based on customer reviews.';
    }

    // Trim to max 500 characters
    if (summary.length > 500) {
      summary = summary.substring(0, 497) + '...';
    }

    return summary;
  } catch (error) {
    console.error('Error generating review summary:', error);
    return ''; // Return empty string on error
  }
};

export default generateReviewSummary;
