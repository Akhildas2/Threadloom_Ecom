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
    },
    password: {
        type: String,
        required: true,
    },
    google: {
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
    token: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});



const User = mongoose.model('User', userSchema);
module.exports = User;