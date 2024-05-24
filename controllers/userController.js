const User = require('../models/userModel')
const Product = require('../models/productModel')
const Otp = require('../models/otpModel')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const Category = require("../models/categoryModel")
const Wishlist = require("../models/wishListModel")
const Referral = require("../models/referralModel")
const Wallet = require("../models/walletModel")



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
        console.log(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}





// for loading the register page
const loadRegister = async (req, res) => {
    try {
        const pageTitle = "Sign Up";
        res.render('register', { req, pageTitle })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}


// for loading the 404 page
const errorPage = async (req, res) => {
    try {
        res.render('404page')
    } catch (error) {
        console.log(error.message);
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
        console.log(error.message);
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
    const newReferralCode = await generateUniqueReferralCode();
    let referral;
    console.log("referralCode", referralCode);
    if (referralCode) {
        const referredByUser = await Referral.findOne({ referralCode }).populate('user');
        console.log("referredByUser", referredByUser)
        if (referredByUser && referredByUser.user._id.toString() !== newUserId.toString()) {
            referral = new Referral({
                user: newUserId,
                referralCode: newReferralCode,
                referredBy: referredByUser.user._id
            });
            await updateWalletBalance(newUserId, referredByUser.user._id);
        } else {
            throw new Error('Invalid or self-referral code.');
        }
    } else {
        referral = new Referral({
            user: newUserId,
            referralCode: newReferralCode
        });
    }

    await referral.save();
    return referral;
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
        // Check if the user already exists
        if (await User.findOne({ email })) {
            return res.status(400).json({ success: false, message: 'Email Already Exists. Please Use a Different Email.' });
        }
        if (await User.findOne({ mobile })) {
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
        console.log(error.message);
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
                console.log(error);
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
        console.error('Error sending OTP:', error);
        throw error;
    }
};





// for loading the verify otp page
const loadVerfiyOtp = async (req, res) => {
    try {
        res.render('verifyOtp', { req })

    } catch (error) {
        console.log(error.message);
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
        console.log('OTP verified successfully.');
        return res.status(200).json({
            status: true,
            url: '/login'
        });


    } catch (error) {
        console.error('Error verifying OTP:', error);
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
        console.error('Error resending OTP:', error);
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
        console.log(error.message);
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
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}





//for user logout
const userLogout = async (req, res) => {
    try {
        delete req.session.user_id;

        res.redirect('/')
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}





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
        console.log(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};



//for add google user

const findOrCreateGoogleUser = async (id, displayName, email, req) => {
    try {
        let user = await User.findOne({ email });
        if (user) {
            return { success: false, message: 'Email Already Exists.' };
        } else {
            const spassword = await securePassword(id);

            const newUser = new User({
                name: displayName,
                email,
                mobile: 0,
                password: spassword,
                google: true,
                isVerified: true
            });

            const userData = await newUser.save();
            console.log("New user created:", userData);
            if (userData) {
                req.session.user_id = userData._id;
                console.log("User ID stored in session:", userData._id);
            }
            return userData;
        }
    } catch (error) {
        console.log(error.message);
        return { success: false, message: 'Internal Server Error. Please try again later.' };
    }
}





//for shop showing product
const shop = async (req, res) => {
    try {
        const { sort, page, limit = 10, category, filter } = req.query;
        console.log("req.query", req.query)

        const currentPage = parseInt(page, 10) || 1;
        console.log("currentPage", currentPage)

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
        console.log("totalCount", totalCount)

        const totalPages = Math.ceil(totalCount / limit);
        console.log("totalPages", totalPages)


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
        console.log(error.message);
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
    errorPage



}