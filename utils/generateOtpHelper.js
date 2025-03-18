const crypto = require('crypto');



// Generate a secure 6-digit OTP
function generateSecureOTP() {
    return crypto.randomInt(100000, 999999).toString();
}



module.exports = { generateSecureOTP };