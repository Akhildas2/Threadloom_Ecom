const User = require('../models/userModel')
const Product = require('../models/productModel')
const Otp = require('../models/otpModel')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const Category = require("../models/categoryModel")
const Wishlist = require("../models/wishListModel")
const Referral = require("../models/referralModel")
const Wallet = require("../models/walletModel")
const crypto = require('crypto');
const sendResetPasswordEmail = require("../services/forgotEmailService")




//for loading the home page
const loadHome = async (req, res) => {
    try {
        //for getting the products
        const products = await Product.find({ isUnlisted: false }).populate({ path: "category", populate: { path: "offer" } }).populate('offer');
        //for getting the categories
        const categories = await Category.find({});
        const userId = req.session.user_id;

        let userWishlist = [];
        // If the user is logged in show the userWishlist
        if (userId) {
            userWishlist = await Wishlist.find({ user: userId }).populate('productId');
        }
        res.render('home', { req, products, categories, userWishlist });


    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}





// for loading the register page
const loadRegister = async (req, res) => {
    try {
        const pageTitle = "Sign Up";
        res.render('register', { req, pageTitle })
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}







//for secure password
const securePassword = async (password) => {
    try {
        //for harsh the password
        const passwordHarsh = await bcrypt.hash(password, 10)
        return passwordHarsh
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}





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
    // Generate a unique referral code
    const newReferralCode = await generateUniqueReferralCode();

    // Check if a referral code was provided
    if (!referralCode) {
        // Creating a new referral
        const referral = new Referral({
            user: newUserId,
            referralCode: newReferralCode
        });

        await referral.save();
        return referral; // Return the newly created referral
    } else {
        // Find the user who referred the new user
        const referredByUser = await Referral.findOne({ referralCode }).populate('user');

        if (!referredByUser) {
            throw new Error('The referral code you provided is invalid.');
        } else if (referredByUser.user._id.toString() === newUserId.toString()) {
            throw new Error('Cannot refer yourself.');
        } else {
            const referral = new Referral({
                user: newUserId,
                referralCode: newReferralCode,
                referredBy: referredByUser.user._id
            });

            await updateWalletBalance(newUserId, referredByUser.user._id);

            await referral.save();
            return referral;
        }
    }
};




//update or create the wallet
const updateWalletBalance = async (newUserId, referredByUserId) => {
    const newUserBonus = 50;
    const referredUserBonus = 150;

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
const insertUser = async (req, res) => {
    try {
        const { name, email, mobile, password, referralCode } = req.body;
       // Check if the user already exists by email
       const existingUserByEmail = await User.findOne({ email });
       if (existingUserByEmail) {
        if (!existingUserByEmail.isVerified) {
            // If the user is not verified, resend the OTP
            const otp = generateOTP();
            res.cookie('email', email); // Store email in cookie for verification
            await sendVerifyOtp(name, email, otp); // Send OTP to user's email
            res.status(200).json({
                status: true,
                url: '/verifyOtp'
            });
            return; // Ensure we exit here to prevent further execution
        }
        return res.status(400).json({ success: false, message: 'Email Already Exists. Please Use a Different Email.' });
    }

       // Check if the user already exists by mobile
       const existingUserByMobile = await User.findOne({ mobile });
       if (existingUserByMobile) {
           return res.status(400).json({ success: false, message: 'Phone Number Already Exists. Please Use a Different Phone Number.' });
       }
        // Create a new user
        const spassword = await securePassword(password);
        const user = new User({
            name,
            email,
            mobile,
            password: spassword,
        });

        const userData = await user.save();

        // Generate and save referral code
        await handleReferral(referralCode, userData._id);

        // Generate OTP and store it in cookie
        if (userData) {
            const otp = generateOTP();
            console.log(otp)
            res.cookie('email', email); // Store email in cookie for verification
            await sendVerifyOtp(name, email, otp); // Send OTP to user's email
            res.status(200).json({
                status: true,
                url: '/verifyOtp'
            });
        } else {
            return res.status(500).json({ success: false, message: 'Your registration has failed.' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
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
            else {
                console.log("email has been sent:", info.response);
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





// for loading the verify otp page
const loadVerfiyOtp = async (req, res) => {
    try {
        res.render('verifyOtp', { req })

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}





// for verifyOtp verification
const verifyOtp = async (req, res) => {
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
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};





//resend otp
const resendOtp = async (req, res) => {
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
        console.log('new otp:' + otp)
        // Send the OTP to the user's email
        await sendVerifyOtp(existingUser.name, email, otp);



        res.status(200).json({ success: true, message: 'OTP has been sent to your email.' });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }

}





// Generate a random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}






// for loading the login page
const loadLogin = async (req, res) => {
    try {
        const pageTitle = "Login";

        res.render('login', { req, pageTitle })
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}





// for verifying login
const verifyLogin = async (req, res) => {
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
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}





//for user logout
const userLogout = async (req, res) => {
    console.log('Logout initiated'); // Log to see if this function is called
    try {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
            }
            res.clearCookie(process.env.SESSION_NAME); // Clear the session cookie
            res.redirect('/');
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};




//for product deatils
const productDetails = async (req, res) => {
    try {
        const productId = req.params.productId;

        const productData = await Product.findById(productId).populate({ path: "category", populate: { path: "offer" } }).populate('offer');
        let userWishlist = false;
        const userId = req.session.user_id;
        // If the user is logged in
        if (userId) {
            const wishlistItem = await Wishlist.findOne({ productId: productId, user: userId });
            if (wishlistItem) {
                userWishlist = true;
            }
        }

        res.render('productDetails', { products: productData, req, userWishlist });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
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
                password:await securePassword(id),
                google: true,
                isVerified: true
            });

            const savedUser  = await newUser.save();
            if (savedUser ) {
                req.session.user_id = savedUser._id;
            }
            return savedUser ;
        }
    } catch (error) {
        return { success: false, message: 'Internal Server Error. Please try again later.' };
    }
}





//for shop showing product
const shop = async (req, res) => {
    try {
        const { sort, page, limit = 10, category, filter } = req.query;

        const currentPage = parseInt(page, 10) || 1;

        const userId = req.session.user_id;
        let userWishlist = [];
        if (userId) { // If the user is logged in
            userWishlist = await Wishlist.find({ user: userId }).populate('productId');
        }

        let query = { isUnlisted: false };

        if (category) {
            const categoryId = await Category.findOne({ categoryName: category }).select('_id');
            if (categoryId) {
                query.category = categoryId;
                console.log(`Filtering by category ID: ${categoryId}`);
            } else {
                console.log(`Category not found: ${category}`);
            }
        }



        let sortQuery = {};
        switch (sort) {
            case 'popularity':
                sortQuery = { popularity: -1 };
                break;
            case 'priceinc':
                sortQuery = { price: 1 };
                break;
            case 'priceDesc':
                sortQuery = { price: -1 };
                break;
            case 'featured':
                sortQuery = { isFeatured: -1 };
                break;
            case 'newArrivals':
                sortQuery = { createdAt: -1 };
                break;
            case 'az':
                sortQuery = { name: 1 };
                break;
            case 'za':
                sortQuery = { name: -1 };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }
        console.log("sortQuery", sortQuery)

        const products = await Product.find(query)
            .populate({ path: "category", populate: { path: "offer" } })
            .populate('offer')
            .sort(sortQuery)
            .skip((currentPage - 1) * limit)
            .limit(parseInt(limit));

        const categories = await Category.find({ isUnlisted: false });

        const totalCount = await Product.countDocuments(query);

        const totalPages = Math.ceil(totalCount / limit);


        res.render('shop', {
            req,
            products,
            totalPages,
            currentPage,
            limit,
            sort,
            filter,
            categories,
            userWishlist,
            totalCount
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};


//for forgot password page load
const forgotPasswordLoad = async (req, res) => {
    try {
        res.render("forgotPassword", { req });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};



//for forgot password page load
const forgotPassword = async (req, res) => {
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

        const userData = await User.updateOne(
            { email: email },
            { $set: { token: token } }
        );

        console.log("user", userData);

        sendResetPasswordEmail(
            user.name,
            user.email,
            token
        );


        return res.status(200).json({ success: true, message: 'Please check your mail to reset your password.' });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};



//for load reset password page
const loadResetPassword = async (req, res) => {
    try {
        const token = req.query.token;
        const tokenData = await User.findOne({ token: token });
        if (tokenData) {
            res.render("resetpassword", { req, tokenData });
        } else {
            res.redirect("/404page");
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};



//for verify reset password
const verifyResetPassword = async (req, res) => {
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
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};




module.exports = {
    loadHome,
    loadRegister,
    securePassword,
    insertUser,
    loadVerfiyOtp,
    sendVerifyOtp,
    verifyOtp,
    verifyLogin,
    resendOtp,
    loadLogin,
    userLogout,
    productDetails,
    findOrCreateGoogleUser,
    shop,
    forgotPasswordLoad,
    forgotPassword,
    loadResetPassword,
    verifyResetPassword



}