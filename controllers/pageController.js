const Product = require('../models/productModel');
const Category = require("../models/categoryModel");
const Wishlist = require("../models/wishListModel");
const User = require('../models/userModel');
const Otp = require('../models/otpModel');
const Review = require('../models/reviewModel');
const Orders = require('../models/orderModel');
const { getProductsWithReviews } = require("../helpers/productHelper");


//for loading the home page
const loadHome = async (req, res, next) => {
    try {

        const [featuredProducts, newProducts, bestSellerProducts] = await Promise.all([
            getProductsWithReviews({ isUnlisted: false, isHot: true }),
            getProductsWithReviews({ isUnlisted: false, isNewArrival: true }),
            getProductsWithReviews({ isUnlisted: false, isBestSeller: true })
        ]);

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
        const { sort = 'createdAt', page = '1', limit = '5', category, minPrice, maxPrice, size = '', gender = '', query: searchQuery } = req.query;

        const currentPage = parseInt(page);
        const userId = req.session.user_id;

        // Initialize wishlist array
        let userWishlist = [];
        if (userId) { // If the user is logged in
            userWishlist = await Wishlist.find({ user: userId }).populate('productId');
        }

        let query = { isUnlisted: false };
        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ];
        }
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
            const genderArray = typeof gender === 'string' ? gender.split(',') : gender;
            query.gender = { $in: genderArray };
        }


        if (size) {
            const sizeArray = typeof size === 'string' ? size.split(',') : size;
            query.size = { $in: sizeArray };
        }


        let sortQuery = {};
        switch (sort) {
            case 'popularity': sortQuery = { isHot: -1 }; break;
            case 'featured': sortQuery = { isHot: 1 }; break;
            case 'newArrivals': sortQuery = { isNewArrival: -1 }; break;
            case 'bestSeller': sortQuery = { isBestSeller: -1 }; break;
            case 'priceInc': sortQuery = { price: 1 }; break;
            case 'priceDesc': sortQuery = { price: -1 }; break;
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

        const productsWithReviews = await Promise.all(
            products.map(async (product) => {
                const reviews = await Review.find({ productId: product._id });
                const totalReviews = reviews.length;
                const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                const averageRating = totalReviews > 0
                    ? Math.round((totalRating / totalReviews) * 10) / 10
                    : 0;

                return {
                    ...product.toObject(),
                    totalReviews,
                    totalRating,
                    averageRating
                };
            })
        );

        const categories = await Category.find({ isUnlisted: false });
        const totalCount = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        res.render('shop', {
            req,
            products: productsWithReviews,
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
        const userId = req.session.user_id;

        // Fetch product from the  products
        const productData = await Product.findById(productId).populate({ path: "category", populate: { path: "offer" } }).populate('offer');
        // Fetch related products from the same category
        const relatedProducts = await Product.find({ category: productData.category._id, _id: { $ne: productId }, isUnlisted: false }).limit(8).populate({ path: "category", populate: { path: "offer" } });
        const relatedProductsWithReviews = await Promise.all(
            relatedProducts.map(async (product) => {
                const reviews = await Review.find({ productId: product._id });
                const totalReviews = reviews.length;
                const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                const averageRating = totalReviews > 0
                    ? Math.round((totalRating / totalReviews) * 10) / 10
                    : 0;

                return {
                    ...product.toObject(),
                    totalReviews,
                    totalRating,
                    averageRating
                };
            })
        );

        // Fetch reviews for main product
        const reviews = await Review.find({ productId }).populate('userId', 'name');
        const totalReviews = reviews.length;
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0;

        let userWishlist = [];
        // If the user is logged in
        if (userId) {
            const wishlistItems = await Wishlist.find({ user: userId });
            userWishlist = wishlistItems.map(item => item.productId.toString());
        }

        // Check if the user has purchased this product and it is delivered
        let hasPurchased = false;
        let hasReviewed = false;
        if (userId) {
            const orders = await Orders.find({ userId: userId, 'items.productId': productId });
            if (orders.length > 0) hasPurchased = true;

            // Check if user already reviewed the product
            const existingReview = await Review.findOne({ userId, productId });
            if (existingReview) hasReviewed = true;
        }

        res.render('productDetails', { product: productData, relatedProducts: relatedProductsWithReviews, req, userWishlist, totalReviews, reviews, hasPurchased, hasReviewed, averageRating, totalRating });

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



const searchSuggestions = async (req, res, next) => {
    try {
        const { q: query, category } = req.query;
        if (!query) return res.json([]);

        // 1. Find matching categories (if no category filter applied)
        const categoryResults = !category ? await Category.find({
            categoryName: { $regex: query, $options: "i" },
            isUnlisted: false
        }).limit(3).select('categoryName -_id') : [];

        // 2. Find matching products (with optional category filter)
        const categoryFilter = category ?
            { category: (await Category.findOne({ categoryName: category }))?._id }
            : {};

        const productResults = await Product.find({
            name: { $regex: query, $options: "i" },
            isUnlisted: false,
            ...categoryFilter
        }).limit(5).select('name -_id');

        // 3. Combine results with type indicators
        const results = [
            ...categoryResults.map(c => ({ type: 'category', value: c.categoryName })),
            ...productResults.map(p => ({ type: 'product', value: p.name }))
        ];

        res.json(results);

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
    searchSuggestions
}