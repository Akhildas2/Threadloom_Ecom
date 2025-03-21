const mongoose = require('mongoose');



const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    size: {
        type: String,
        required: true
    },
    stockCount: {
        type: Number,
        required: true
    },
    productImage: {
        type: Array,
        required: true
    },
    isUnlisted: {
        type: Boolean,
        default: false
    },
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer",
    },
    fit: {
        type: String,
        required: true
    },
    fabric: {
        type: String,
        required: true
    },
    sleeve: {
        type: String,
        required: true
    },
    pattern: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    fabricCare: {
        type: String,
        required: true
    },
    origin: {
        type: String,
        required: true
    },
    isHot: {
        type: Boolean,
        default: false
    },
    isNewArrival: {
        type: Boolean,
        default: false
    },
    isBestSeller: {
        type: Boolean,
        default: false
    },
    avgRating: {
        type: Number,
        default: 0
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    }
});



const Product = mongoose.model('Product', productSchema);
module.exports = Product;