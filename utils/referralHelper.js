const { generateUniqueReferralCode } = require('../utils/generateReferalCode');
const Referral = require("../models/referralModel")
const { updateWalletBalance } = require('../utils/updateBalanceHelper');



//for checking  and creating referral
const handleReferral = async (referralCode, newUserId) => {
    try {
        // Generate a unique referral code
        const newReferralCode = await generateUniqueReferralCode();
        // Check if a referral code was provided
        if (!referralCode) {
            // No referral code provided, creating a new referral without "referredBy"
            const referral = new Referral({
                user: newUserId,
                referralCode: newReferralCode
            });

            await referral.save();
            return referral; // Return the newly created referral
        }

        // Referral code provided, find the user who referred the new user
        const referredByUser = await Referral.findOne({ referralCode }).populate('user');
        if (!referredByUser) {
            // If the referral code is invalid, just save the new user's referral code without a referrer
            const referral = new Referral({
                user: newUserId,
                referralCode: newReferralCode
            });
            await referral.save();
            return referral;
        }

        // Create a new referral entry with the "referredBy" user
        const referral = new Referral({
            user: newUserId,
            referralCode: newReferralCode,
            referredBy: referredByUser.user._id
        });

        await referral.save();
        // Update wallet balance for both the new user and the referrer
        await updateWalletBalance(newUserId, referredByUser.user._id);
        return referral; // Return the newly created referral

    } catch (error) {
        throw new Error(error.message || 'Internal server error.'); // Throw error to be handled outside
    }
};



module.exports = { handleReferral };
