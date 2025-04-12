const Review = require('../models/reviewModel');
const Product = require('../models/productModel');
const mongoose = require("mongoose");



const addReview = async (req, res, next) => {
    try {
        const { productId, comment } = req.body;
        const userId = req.session.user_id;

        if (!productId || !comment?.trim()) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (comment.length > 200) {
            return res.status(400).json({ message: "Comment should not exceed 200 characters" });
        }

        const existingReview = await Review.findOne({ productId, userId });
        if (existingReview) {
            if (!existingReview.comment) {
                existingReview.comment = comment;
                await existingReview.save();
                await updateProductRating(productId);
                return res.status(200).json({ message: "Comment added successfully", review: existingReview });
            }
            return res.status(400).json({ message: "You have already reviewed this purchase." });
        }

        const review = new Review({ productId, userId, comment });
        await review.save();

        await updateProductRating(productId);

        res.status(201).json({ message: "Review added successfully", review });

    } catch (error) {
        next(error);
    }
};



const addRating = async (req, res, next) => {
    try {
        const { productId, orderId, rating } = req.body;
        const userId = req.session.user_id;

        if (!productId || !orderId || !rating) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        let review = await Review.findOne({ productId, userId });
        if (!review) {
            // If no review exists, create a new one
            review = new Review({
                productId,
                userId,
                orders: [{ orderId, rating }]
            })
        } else {
            // Check if the order rating already exists
            const existingOrder = review.orders.find(order => order.orderId.toString() === orderId);
            if (existingOrder) {
                existingOrder.rating = rating;

            } else {
                review.orders.push({ orderId, rating });
            }
        }
        await review.save();

        await updateProductRating(productId);

        res.status(201).json({ message: "Rating added successfully", review });

    } catch (error) {
        next(error);
    }
};



// Function to calculate and update product rating
const updateProductRating = async (productId, next) => {
    try {
        const reviews = await Review.find({ productId });

        let totalWrittenReviews = 0;
        let ratingCount = 0;
        let totalRatingValue = 0;

        reviews.forEach(review => {
            if (review.comment && review.comment.trim().length > 0) {
                totalWrittenReviews++;
            }
            // Sum up ratings
            review.orders.forEach(order => {
                if (order.rating) {
                    totalRatingValue += order.rating;
                    ratingCount++;
                }
            });

        });

        const avgRating = ratingCount > 0 ? (totalRatingValue / ratingCount).toFixed(1) : 0;

        await Product.findByIdAndUpdate(
            productId,
            {
                avgRating: parseFloat(avgRating),
                totalReviews: totalWrittenReviews,
                totalRatings: ratingCount,
            },
            { new: true }
        );

    } catch (error) {
        next(error);
    }
};



// Like a review
const likeReview = async (req, res, next) => {
    try {
        const { reviewId } = req.body;
        const userId = req.session.user_id;

        if (!reviewId) {
            return res.status(400).json({ message: "Review ID is required" });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        const index = review.likes.indexOf(userId);
        if (index === -1) {
            review.likes.push(userId);
        } else {
            review.likes.splice(index, 1);
        }

        await review.save();
        res.status(200).json({ message: "Like updated successfully", likes: review.likes.length });

    } catch (error) {
        next(error);
    }
};



const getRating = async (req, res, next) => {
    try {
        const { productId, orderId } = req.params;
        const userId = req.session.user_id;

        if (!productId || !orderId) {
            return res.status(400).json({ message: "Product ID and Order ID are required" });
        }

        const review = await Review.findOne({ productId, userId, "orders.orderId": orderId });
        const order = review?.orders.find(order => order.orderId.toString() === orderId);

        res.status(200).json({ rating: order ? order.rating : null });

    } catch (error) {
        next(error);
    }
};



const editReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const { comment } = req.body;
        const userId = req.session.user_id;

        // Check if reviewId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ success: false, message: "Invalid review ID" });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        // Ensure only the review owner can edit
        if (review.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized action" });
        }

        // Validate and update the comment
        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Comment cannot be empty" });
        }

        review.comment = comment.trim();
        await review.save();

        res.json({ success: true, message: "Review updated successfully" });

    } catch (error) {
        next(error);
    }
};



module.exports = {
    addReview,
    addRating,
    likeReview,
    getRating,
    editReview,
};
