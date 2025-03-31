const Product = require("../models/productModel");

async function getProductsWithReviews(filter) {
    return await Product.find(filter)
        .populate({ path: "category", populate: { path: "offer" } })
        .populate("offer")
        .limit(8)
        .lean();
}

module.exports = { getProductsWithReviews };