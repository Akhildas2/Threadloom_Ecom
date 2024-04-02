const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,

    },
    mobile: {
        type: String,
        unique: true,
        required: true,

    },
    password: {
        type: String,
        required: true,
    },
    google:{
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('User', userSchema);

