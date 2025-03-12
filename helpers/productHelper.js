const Product = require("../models/productModel");
const Review = require("../models/reviewModel");

async function getProductsWithReviews(filter) {
    const products = await Product.find(filter)
        .populate({ path: "category", populate: { path: "offer" } })
        .populate("offer");

    return Promise.all(
        products.map(async (product) => {
            const reviews = await Review.find({ productId: product._id });
            const totalReviews = reviews.length;
            const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
            const averageRating = totalReviews > 0
                ? Math.round((totalRating / totalReviews) * 10) / 10
                : 0;

            return {
                ...product.toObject(),
                totalReviews,
                totalRating,
                averageRating
            };
        })
    );
}

module.exports = { getProductsWithReviews };
