const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponName: {
        type: String,
        required: true
    },
    couponCode: {
        type: String,
        required: true,
        unique: true
    },
    discount: {
        type: Number,
        required: true,
        min: 0
    },
    expiryDate: {
        type: Date,
        required: true,
        min: Date.now()
    },
    criteriaAmount: {
        type: Number,
        required: true,
        min: 0
    }
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
