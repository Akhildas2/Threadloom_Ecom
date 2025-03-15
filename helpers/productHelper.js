const Product = require("../models/productModel");

async function getProductsWithReviews(filter) {
    return await Product.find(filter)
        .populate({ path: "category", populate: { path: "offer" } })
        .populate("offer")
        .lean();
}

module.exports = { getProductsWithReviews };