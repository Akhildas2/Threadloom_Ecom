const mongoose = require("mongoose");



const otpSchema = new mongoose.Schema({
    email: String,
    otp: String,
    expiryTime: { type: Date, expires: 1440 }
});



const Otp = mongoose.model('Otp', otpSchema);
module.exports = Otp;