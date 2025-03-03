const Address = require("../models/addressModel")
const User = require('../models/userModel')
const Order = require("../models/orderModel")
const bcrypt = require('bcrypt')
const Wallet = require('../models/walletModel')
const Referral = require("../models/referralModel")



//for secure password
const securePassword = async (password, next) => {
    try {
        const passwordHarsh = await bcrypt.hash(password, 10)
        return passwordHarsh

    } catch (error) {
        next(error);
    }
}



//for loading dashboard
const loadDashboard = async (req, res, next) => {
    try {
        const pageTitle = "Dashboard";
        const userId = req.session.user_id;
        const orderPage = parseInt(req.query.orderPage) || 1;
        const walletPage = parseInt(req.query.walletPage) || 1;
        const pageSize = 5;

        const userData = await User.findById(userId);
        const address = await Address.find({ userId });
        const ordersCount = await Order.countDocuments({ userId });
        const referral = await Referral.findOne({ user: userId });
        const orders = await Order.find({ userId })
            .populate('userId')
            .populate('items.productId')
            .sort({ createdAt: -1 })
            .skip((orderPage - 1) * pageSize)
            .limit(pageSize);

        const orderTotalPages = Math.ceil(ordersCount / pageSize);
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            // wallet is not found
            return res.render('dashboard', { req, pageTitle, userData, address, orders, wallet: null, orderTotalPages, orderCurrentPage: orderPage, walletCurrentPage: 0, walletTotalPages: 0, referral });
        }

        // Sorting new transactions
        wallet.transactions.sort((a, b) => b.date - a.date);

        const transactionsCount = wallet.transactions.length;
        const walletTotalPages = Math.ceil(transactionsCount / pageSize);
        const transactions = wallet.transactions.slice((walletPage - 1) * pageSize, walletPage * pageSize);
        const balance = wallet.balance

        res.render('dashboard', { req, pageTitle, userData, address, orders, wallet: { ...wallet, transactions }, orderTotalPages, orderCurrentPage: orderPage, walletTotalPages, walletCurrentPage: walletPage, balance, referral });

    } catch (error) {
        next(error);
    }
}



//for update user
const updateUser = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const { name, mobile } = req.body;

        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (name) {
            user.name = name;
        }
        if (mobile) {
            const existingUser = await User.findOne({ mobile });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ message: "Mobile number already exists" });
            }
            user.mobile = mobile;
        }

        await user.save();

        return res.status(200).json({
            status: true,
            url: '/dashboard'
        });

    } catch (error) {
        next(error);
    }
}



//for changing the password
const changePassword = async (req, res, next) => {
    try {

        const { oldPassword, newPassword, confirmPassword } = req.body;
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).json({ message: 'User not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: 'Incorrect password' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'New password and confirm password do not match' });
        }
        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[@$!%*?&]/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character' });
        }

        user.password = await securePassword(newPassword);
        await user.save();

        return res.status(200).json({
            status: true,
            url: "/dashboard"
        });

    } catch (error) {
        next(error);
    }
};



//for adding address
const addAddress = async (req, res, next) => {
    try {
        const { fullName, mobileNumber, pincode, houseNo, area, city, state } = req.body;
        const userId = req.session.user_id;

        // Check if an identical address already exists for the user
        const existingAddress = await Address.findOne({
            userId,
            fullName,
            mobileNumber,
            pincode,
            houseNo,
            area,
            city,
            state
        });
        if (existingAddress) {
            return res.status(400).json({
                status: false,
                message: 'Address already exists.'
            });
        }

        const address = new Address({
            fullName,
            mobileNumber,
            pincode,
            houseNo,
            area,
            city,
            state,
            userId: userId
        });
        await address.save();

        return res.status(200).json({
            status: true,
            url: '/dashboard'
        });

    } catch (error) {
        next(error);
    }
}



//for edit address
const editAddress = async (req, res, next) => {
    try {
        const { fullName, mobileNumber, pincode, houseNo, area, city, state } = req.body;
        const addressId = req.params.addressId;

        const updatedAddress = await Address.findByIdAndUpdate(addressId, {
            fullName,
            mobileNumber,
            pincode,
            houseNo,
            area,
            city,
            state
        }, { new: true });
        if (!updatedAddress) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        return res.status(200).json({
            status: true,
            url: '/dashboard'
        });

    } catch (error) {
        next(error);
    }
}



//for delete address 
const deleteAddress = async (req, res, next) => {
    try {
        const addressId = req.params.addressId

        const result = await Address.findByIdAndDelete(addressId)
        if (result) {
            return res.status(200).json({
                status: true,
                url: '/dashboard'
            });
        } else {
            res.status(404).json({ message: 'Address not found' });
        }

    } catch (error) {
        next(error);
    }
}



module.exports = {
    loadDashboard,
    updateUser,
    changePassword,
    addAddress,
    editAddress,
    deleteAddress,
}