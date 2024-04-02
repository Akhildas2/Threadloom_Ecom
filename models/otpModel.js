
const mongoose = require("mongoose");
const otpSchema = new mongoose.Schema({
    email: String,
    otp: String,
    expiryTime:{ type: Date, expires: 1440 } 
});
module.exports = mongoose.model('Otp', otpSchema);