const Product = require('../models/productModel')
const Category = require("../models/categoryModel")
const Wishlist = require("../models/wishListModel");
const User = require('../models/userModel')
const Otp = require('../models/otpModel')



//for loading the home page
const loadHome = async (req, res, next) => {
    try {

        const featuredProducts = await Product.find({ isUnlisted: false, isHot: true }).populate({ path: "category", populate: { path: "offer" } }).populate('offer');
        const newProducts = await Product.find({ isUnlisted: false, isNewArrival: true }).populate({ path: "category", populate: { path: "offer" } }).populate('offer');
        const bestSellerProducts = await Product.find({ isUnlisted: false, isBestSeller: true }).populate({ path: "category", populate: { path: "offer" } }).populate('offer');

        //for getting the categories
        const categories = await Category.find({ isUnlisted: false }).limit(8);
        const userId = req.session.user_id;
        let userWishlist = [];
        // If the user is logged in show the userWishlist
        if (userId) {
            userWishlist = await Wishlist.find({ user: userId }).populate('productId');
        }

        res.render('home', { req, featuredProducts, newProducts, bestSellerProducts, categories, userWishlist });

    } catch (error) {
        next(error);
    }
}



// for loading the register page
const loadRegister = async (req, res, next) => {
    try {
        const pageTitle = "Sign Up";
        res.render('register', { req, pageTitle })

    } catch (error) {
        next(error);
    }
}



// for loading the login page
const loadLogin = async (req, res, next) => {
    try {
        const pageTitle = "Login";
        res.render('login', { req, pageTitle })

    } catch (error) {
        next(error);
    }
}



// for loading the contact page
const loadContact = async (req, res, next) => {
    try {
        res.render('contact', { req })

    } catch (error) {
        next(error);
    }
}



// for loading the about page
const loadAbout = async (req, res, next) => {
    try {
        res.render('about', { req })

    } catch (error) {
        next(error);
    }
}



//for shop showing product
const shop = async (req, res, next) => {
    try {
        const { sort = 'createdAt', page = '1', limit = '5', category, minPrice, maxPrice, size = '', gender = '' } = req.query;

        const currentPage = parseInt(page);
        const userId = req.session.user_id;

        // Initialize wishlist array
        let userWishlist = [];
        if (userId) { // If the user is logged in
            userWishlist = await Wishlist.find({ user: userId }).populate('productId');
        }

        let query = { isUnlisted: false };
        if (category) {
            const categoryId = await Category.findOne({ categoryName: category }).select('_id');
            if (categoryId) {
                query.category = categoryId;
            }
        }

        if (minPrice && maxPrice) {
            query.price = { $gte: parseInt(minPrice), $lte: parseInt(maxPrice) };
        }

        if (gender) {
            const genderArray = typeof gender === 'string' ? [gender] : gender;
            query.gender = { $in: genderArray };
        }


        if (size) {
            const sizeArray = typeof size === 'string' ? size.split(',') : size;
            query.size = { $in: sizeArray };
        }


        let sortQuery = {};
        switch (sort) {
            case 'popularity': sortQuery = { popularity: -1 }; break;
            case 'priceInc': sortQuery = { price: 1 }; break;
            case 'priceDesc': sortQuery = { price: -1 }; break;
            case 'featured': sortQuery = { isFeatured: -1 }; break;
            case 'newArrivals': sortQuery = { createdAt: -1 }; break;
            case 'az': sortQuery = { name: 1 }; break;
            case 'za': sortQuery = { name: -1 }; break;
            default: sortQuery = { createdAt: -1 };
        }

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
            category,
            categories,
            userWishlist,
            totalCount,
            minPrice,
            maxPrice,
            size: size || '',
            gender,
            selectedSizes: size || []
        });

    } catch (error) {
        next(error);
    }
};



//for product deatils
const productDetails = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        // Fetch product from the  products
        const productData = await Product.findById(productId).populate({ path: "category", populate: { path: "offer" } }).populate('offer');
        // Fetch related products from the same category
        const relatedProducts = await Product.find({ category: productData.category._id, _id: { $ne: productId }, isUnlisted: false }).limit(8).populate({ path: "category", populate: { path: "offer" } });

        let userWishlist = [];
        const userId = req.session.user_id;
        // If the user is logged in
        if (userId) {
            const wishlistItems = await Wishlist.find({ user: userId });
            userWishlist = wishlistItems.map(item => item.productId.toString());
        }

        res.render('productDetails', { product: productData, relatedProducts, req, userWishlist });

    } catch (error) {
        next(error);
    }
};



//for forgot password page load
const forgotPasswordLoad = async (req, res, next) => {
    try {
        res.render("forgotPassword", { req });

    } catch (error) {
        next(error);
    }
};



//for load reset password page
const loadResetPassword = async (req, res, next) => {
    try {
        const token = req.query.token;
        const tokenData = await User.findOne({ token: token });
        if (tokenData) {
            res.render("resetpassword", { req, tokenData });
        } else {
            res.redirect("/404page");
        }

    } catch (error) {
        next(error);
    }
};



// for loading the verify otp page
const loadVerifyOtp = async (req, res, next) => {
    try {
        const email = req.cookies.email;
        if (!email) {
            return res.redirect('/login');
        }
        // Find the corresponding OTP record
        await Otp.findOne({ email });

        // Mask the email
        const maskedEmail = email.replace(/^(.*)(.{4}@.*)$/, (match, p1, p2) => {
            const masked = p1.replace(/./g, '*'); // Mask all characters before the last 6
            return masked + p2; // Combine the masked part with the last 6 characters
        });

        res.render('verifyOtp', { req, email: maskedEmail })

    } catch (error) {
        next(error);
    }
}



module.exports = {
    loadHome,
    loadRegister,
    loadLogin,
    loadContact,
    loadAbout,
    shop,
    productDetails,
    forgotPasswordLoad,
    loadResetPassword,
    loadVerifyOtp,
}