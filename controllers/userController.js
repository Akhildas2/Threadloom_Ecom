const User = require('../models/userModel')
const Otp = require('../models/otpModel')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const Referral = require("../models/referralModel")
const Wallet = require("../models/walletModel")
const crypto = require('crypto');
const sendResetPasswordEmail = require("../services/forgotEmailService")



// Secure password hashing
const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);

    } catch (error) {
        throw new Error('Error hashing password');
    }
};



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



//update or create the wallet
const updateWalletBalance = async (newUserId, referredByUserId) => {
    const newUserBonus = 50;
    const referredUserBonus = 100;

    const updateWallet = async (userId, bonus) => {
        let userWallet = await Wallet.findOne({ userId });
        if (!userWallet) {
            userWallet = new Wallet({
                userId,
                balance: bonus,
                transactions: [{
                    type: 'credit',
                    amount: bonus,
                    date: new Date(),
                    description: 'Referral bonus'
                }]
            });
        } else {
            userWallet.balance += bonus;
            userWallet.transactions.push({
                type: 'credit',
                amount: bonus,
                date: new Date(),
                description: 'Referral bonus'
            });
        }
        await userWallet.save();
    };

    await Promise.all([
        updateWallet(newUserId, newUserBonus),
        updateWallet(referredByUserId, referredUserBonus)
    ]);

};



// Function to insert user
const insertUser = async (req, res, next) => {
    try {
        const { name, email, mobile, password, referralCode } = req.body;
        // Check if the user already exists by mobile
        const existingUserByMobile = await User.findOne({ mobile });
        // If user already exists by mobile and is not verified
        if (existingUserByMobile) {
            if (!existingUserByMobile.isVerified) {
                await handleReferral(referralCode || null, existingUserByMobile._id);
                const otp = generateOTP();
                res.cookie('email', email); // Store email in cookie for verification
                await sendVerifyOtp(name, email, otp); // Send OTP to user's email
                return res.status(200).json({
                    status: true,
                    url: '/verifyOtp'
                });
            }
            return res.status(400).json({ success: false, message: 'Phone Number Already Exists. Please Use a Different Phone Number.' });
        }

        // Check if the user already exists by email
        const existingUserByEmail = await User.findOne({ email });
        // If user already exists by email and is not verified
        if (existingUserByEmail) {
            if (!existingUserByEmail.isVerified) {
                await handleReferral(referralCode || null, existingUserByEmail._id);
                const otp = generateOTP();
                res.cookie('email', email); // Store email in cookie for verification
                await sendVerifyOtp(name, email, otp); // Send OTP to user's email
                return res.status(200).json({
                    status: true,
                    url: '/verifyOtp'
                });
            }
            return res.status(400).json({ success: false, message: 'Email Already Exists. Please Use a Different Email.' });
        }

        // Create a new user if neither mobile nor email exists
        const hashedPassword = await securePassword(password);
        const user = new User({
            name,
            email,
            mobile,
            password: hashedPassword,
        });

        const userData = await user.save();

        // Handle referral if provided, else create a new referral for the user
        await handleReferral(referralCode || null, userData._id);
        // Generate OTP and send it to the user's email for verification
        const otp = generateOTP();
        res.cookie('email', email); // Store email in cookie for verification
        await sendVerifyOtp(name, email, otp); // Send OTP to user's email

        return res.status(200).json({
            status: true,
            url: '/verifyOtp'
        });

    } catch (error) {
        next(error);
    }
};



// this for sendVerifyOtp function to accept otp parameter
const sendVerifyOtp = async (name, email, otp) => {
    try {
        const expiryTime = new Date(Date.now() + 2 * 60 * 1000); // OTP expires in 2 minutes

        // Create a nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Send OTP to user's email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP For Verification',
            text: `Hello ${name},\n\nYour OTP is: ${otp}\n\nThis OTP is valid for 1 minutes.`
        };

        await transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ success: false, message: 'Internal mail Server Error. Please try again later.' });
            }
        });

        // Save OTP record to the database
        const otpRecord = new Otp({
            email,
            otp,
            expiryTime
        });
        await otpRecord.save(); // Save OTP record to the database

    } catch (error) {
        throw error;
    }
};



// for verifyOtp verification
const verifyOtp = async (req, res, next) => {
    try {
        const { otp1, otp2, otp3, otp4, otp5, otp6 } = req.body;
        const otp = otp1 + otp2 + otp3 + otp4 + otp5 + otp6; // Concatenate OTP digits
        // Validate if all OTP digits are provided
        if (![otp1, otp2, otp3, otp4, otp5, otp6].every(otpDigit => otpDigit && otpDigit.length === 1)) {
            return res.status(400).json({ success: false, message: 'Invalid OTP format.' });
        }

        // Find the corresponding OTP record
        const otpRecord = await Otp.findOne({ email: req.cookies.email, otp });
        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }
        // Check OTP expiry
        if (otpRecord.expiryTime < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }
        //for updating is_verified
        await User.updateOne({ email: req.cookies.email }, { isVerified: true });
        // OTP is valid, clear the OTP cookie
        res.clearCookie('email');
        // Delete OTP record from the database
        await Otp.findByIdAndDelete(otpRecord._id);
        return res.status(200).json({
            status: true,
            url: '/login'
        });

    } catch (error) {
        next(error);
    }
};



//resend otp
const resendOtp = async (req, res, next) => {
    try {
        const email = req.cookies.email;
        // Check if email exists in the database
        const existingUser = await User.findOne({ email });
        if (!existingUser) {
            return res.status(400).json({ success: false, message: 'Email does not exist.' });
        }
        await Otp.deleteMany({ email })

        // Generate a new OTP
        const otp = generateOTP();
        // Send the OTP to the user's email
        await sendVerifyOtp(existingUser.name, email, otp);

        res.status(200).json({ success: true, message: 'OTP has been sent to your email.' });

    } catch (error) {
        next(error);
    }
}



// Generate a random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}



// for verifying login
const verifyLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({ email });
        if (userData) {
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if (passwordMatch) {
                if (userData.isVerified === true) {
                    if (userData.isBlocked === false) {
                        // Set user_id in session and redirect
                        req.session.user_id = userData._id;
                        return res.status(200).json({
                            status: true,
                            url: '/'
                        });

                    } else {
                        return res.status(400).json({ success: false, message: 'Your account is blocked.' });
                    }
                } else {
                    return res.status(400).json({ success: false, message: 'Your account is not verified yet.' });
                }
            } else {
                return res.status(400).json({ success: false, message: 'Email and Password is incorrect.' });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Email and Password is incorrect.' });
        }

    } catch (error) {
        next(error);
    }
}



//for user logout
const userLogout = async (req, res, next) => {
    try {
        req.session.destroy(err => {
            if (err) {
                next(error);
            }

            res.clearCookie(process.env.SESSION_NAME); // Clear the session cookie
            res.redirect('/');
        });

    } catch (error) {
        next(error);
    }
};



//for add google user
const findOrCreateGoogleUser = async (id, displayName, email, req) => {
    try {
        let user = await User.findOne({ email });
        if (user) {
            req.session.user_id = user._id;
            return user;
        } else {
            const newUser = new User({
                name: displayName,
                email,
                mobile: 0,
                password: await securePassword(id),
                google: true,
                isVerified: true
            });

            const savedUser = await newUser.save();
            if (savedUser) {
                req.session.user_id = savedUser._id;
            }
            return savedUser;
        }

    } catch (error) {
        next(error);
    }
}



//for send password 
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found.' });
        }
        if (user.isVerified === 0) {
            return res.status(400).json({ success: false, message: 'Please verify your email.' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        await User.updateOne({ email: email }, { $set: { token: token } });
        sendResetPasswordEmail(user.name, user.email, token);

        return res.status(200).json({ success: true, message: 'Please check your mail to reset your password.' });

    } catch (error) {
        next(error);
    }
};



//for verify reset password
const verifyResetPassword = async (req, res, next) => {
    try {
        const { password, user_id } = req.body;
        if (password && user_id) {
            const spassword = await securePassword(password);
            await User.findByIdAndUpdate(
                { _id: user_id },
                {
                    $set: {
                        password: spassword,
                        token: ''
                    }
                }
            );
            return res.status(200).json({ url: "/login", success: true, message: 'Your password has been reset successfully.' });
        }

    } catch (error) {
        next(error);
    }
};



module.exports = {
    securePassword,
    insertUser,
    sendVerifyOtp,
    verifyOtp,
    verifyLogin,
    resendOtp,
    userLogout,
    findOrCreateGoogleUser,
    forgotPassword,
    verifyResetPassword,
}