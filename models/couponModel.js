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
    discountAmount: {
        type: Number,
        required: true,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
    criteriaAmount: {
        type: Number,
        required: true,
    }
}, { timestamps: true });



const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;