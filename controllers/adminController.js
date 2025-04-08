const User = require("../models/userModel")
const Admin = require("../models/adminModel")
const Order = require('../models/orderModel')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const bcrypt = require('bcrypt');
const { securePassword } = require('../utils/securePassword');



//for admin register
const registerAdmin = async (req, res, next) => {
    try {
        const { name, email, mobile, password } = req.body;
        const spassword = await securePassword(password);

        const admin = new Admin({
            name,
            email,
            mobile,
            password: spassword,
        });
        await admin.save();

    } catch (error) {
        next(error);
    }
}



//for load login function
const loadLogin = async (req, res, next) => {
    try {
        res.render('adminLogin')

    } catch (error) {
        next(error);
    }
}



// for loading admin home
const loadAdminHome = async (req, res, next) => {
    try {

        const revenue = await Order.aggregate([
            { $match: { 'items.orderStatus': 'delivered' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        //daily
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1)
        const dailyRevenue = await Order.aggregate([
            {
                $match: {
                    'items.orderStatus': 'delivered',
                    updatedAt: { $gte: today, $lt: tomorrow }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        //weekly
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const weeklyRevenue = await Order.aggregate([
            {
                $match: {
                    'items.orderStatus': 'delivered',
                    updatedAt: { $gte: startOfWeek, $lt: tomorrow }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);


        //monthly 
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    'items.orderStatus': 'delivered',
                    updatedAt: { $gte: startOfMonth, $lt: tomorrow }
                }
            }, {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ])

        //yearly
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const yearlyRevenue = await Order.aggregate([
            {
                $match: {
                    'items.orderStatus': 'delivered',
                    updatedAt: { $gte: startOfYear, $lt: tomorrow }
                }
            }, {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ])

        const totalUsers = await User.find({}).countDocuments();
        const totalOrders = await Order.find({ 'items.orderStatus': 'delivered' }).countDocuments();
        const totalProducts = await Product.find({}).countDocuments()
        const totalCategorys = await Category.find({}).countDocuments()

        //sales data
        const pastWeek = new Date();
        pastWeek.setDate(pastWeek.getDate() - 6);
        const salesData = await Order.aggregate([
            {
                $match: {
                    'items.orderStatus': 'delivered',
                    updatedAt: { $gte: pastWeek }
                }
            }, {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" }
                    },
                    total: { $sum: '$totalAmount' }
                }
            }, {
                $sort: { _id: 1 }
            }
        ]);

        //top selling product
        const topSellingProducts = await Order.aggregate([
            { $unwind: "$items" },
            { $match: { 'items.orderStatus': 'delivered' } },
            { $group: { _id: "$items.productId", totalSold: { $sum: "$items.quantity" } } },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productInfo" } },
            { $unwind: "$productInfo" },
            { $project: { name: "$productInfo.name", totalSold: 1 } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        //top selling Category
        const topSellingCategories = await Order.aggregate([
            { $unwind: "$items" },
            { $match: { 'items.orderStatus': 'delivered' } },
            { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $group: { _id: "$product.category", totalSold: { $sum: "$items.quantity" } } },
            { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "categoryInfo" } },
            { $unwind: "$categoryInfo" },
            { $project: { name: "$categoryInfo.categoryName", totalSold: 1 } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ])


        //top 10 selling brands
        const topSellingBrands = await Order.aggregate([
            { $unwind: "$items" },
            { $match: { 'items.orderStatus': 'delivered' } },
            { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $group: { _id: "$product.brand", totalSold: { $sum: "$items.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);
        // Calculate totals for percentages
        const totalSoldAllBrands = topSellingBrands.reduce((acc, brand) => acc + brand.totalSold, 0);
        const totalSoldAllCategories = topSellingCategories.reduce((acc, category) => acc + category.totalSold, 0);
        const totalSoldAllProducts = topSellingProducts.reduce((acc, product) => acc + product.totalSold, 0);



        res.render('adminHome', {
            revenue,
            totalUsers,
            totalOrders,
            totalProducts,
            totalCategorys,
            dailyRevenue,
            weeklyRevenue,
            monthlyRevenue,
            yearlyRevenue,
            salesDataJSON: salesData,
            topSellingProducts,
            topSellingCategories,
            topSellingBrands,
            totalSoldAllBrands,
            totalSoldAllCategories,
            totalSoldAllProducts

        })

    }
    catch (error) {
        next(error);
    }
}



//for verify admin login
const verifyLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const adminData = await Admin.findOne({ email });

        if (adminData && await bcrypt.compare(password, adminData.password) && adminData.isAdmin) {
            req.session.admin_id = adminData._id;
            return res.status(200).json({ status: true, url: '/admin/adminhome' });
        } else {
            return res.status(400).json({ success: false, message: 'Email and Password is incorrect.' });
        }

    } catch (error) {
        next(error);
    }
}



//for logout
const logout = async (req, res, next) => {
    try {
        delete req.session.admin_id;
        res.redirect('/admin');

    } catch (error) {
        next(error);
    }
}



//for loading user list
const userList = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        let { sort = 'createdAt', order = 'desc' } = req.query;
        const sortOrder = order === 'asc' ? 1 : -1;
        const searchQuery = req.query.search ? req.query.search.trim() : '';
        let query = { isVerified: true };

        // Filter by status
        if (req.query.status) {
            query.isBlocked = req.query.status === 'blocked';
        }

        // Search
        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
                { mobile: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        // Define sorting options
        const sortField = ['name', 'email', 'mobile', 'createdAt'];
        const sortOptions = sortField.includes(sort) ? { [sort]: sortOrder } : {};


        const users = await User.find(query).sort(sortOptions).skip(skip).limit(limit);
        const totalCount = await User.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        res.render('userList', {
            users,
            currentPage: page,
            totalPages,
            selectedStatus: req.query.status || '',
            selectedLimit: limit,
            searchQuery,
            sortField: sort,
            sortOrder: order,
            totalCount
        });

    } catch (error) {
        next(error);
    }
};



//for block user 
const blockUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        // Check if the user exists
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Check if the user being blocked is the admin
        if (user.isAdmin) {
            return res.status(403).send('Cannot block admin user');
        }

        //destroy only the user's session
        if (req.session.user_id === userId) {
            delete req.session.user_id;
            req.session.save(err => {
                if (err) {
                    next(error);
                }
            });
        }

        // Update the user to be blocked
        user.isBlocked = true;
        await user.save();

        res.status(200).json({
            status: true,
            url: '/admin/userList'
        });

    } catch (error) {
        next(error);
    }
}



//for unblock user 
const unblockUser = async (req, res, next) => {
    try {
        const userId = req.params.id;

        await User.findByIdAndUpdate(userId, { isBlocked: false });

        res.status(200).json({
            status: true,
            url: '/admin/userList'
        });

    } catch (error) {
        next(error);
    }
}



module.exports = {
    securePassword,
    registerAdmin,
    loadLogin,
    verifyLogin,
    loadAdminHome,
    logout,
    userList,
    blockUser,
    unblockUser,
}