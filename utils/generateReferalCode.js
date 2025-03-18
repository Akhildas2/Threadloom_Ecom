const Referral = require("../models/referralModel")



//for generate refferal code
function generateReferralCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let referralCode = '';
    for (let i = 0; i < 8; i++) {
        referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return referralCode;

}



//for checking and generate unique referral code
const generateUniqueReferralCode = async () => {
    let newReferralCode;
    do {
        newReferralCode = generateReferralCode();
    } while (await Referral.findOne({ referralCode: newReferralCode }));
    return newReferralCode;

};


module.exports = { generateUniqueReferralCode };