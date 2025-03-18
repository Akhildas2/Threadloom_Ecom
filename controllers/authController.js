const User = require('../models/userModel');
const Referral = require('../models/referralModel');
const { securePassword } = require('../utils/securePassword');
const { generateUniqueReferralCode } = require('../utils/generateReferalCode');



const findOrCreateGoogleUser = async (id, displayName, email, req) => {
    try {
        let user = await User.findOne({ email });

        if (!user) {
            const hashedPassword = await securePassword(id);
            user = new User({
                name: displayName,
                email,
                password: hashedPassword,
                google: true,
                isVerified: true
            });
            await user.save();
        }

        // Ensure user has a referral code
        let referral = await Referral.findOne({ user: user._id });

        if (!referral) {
            const newReferralCode = await generateUniqueReferralCode();
            referral = new Referral({
                user: user._id,
                referralCode: newReferralCode
            });
            await referral.save();
        }

        // Set session for the user
        req.session.user_id = user._id;

        return user;

    } catch (error) {
        throw error;
    }
};



module.exports = {
    findOrCreateGoogleUser
};
