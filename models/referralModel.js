const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    referralCode: {
        type: String,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Referral', referralSchema);
