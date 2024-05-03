
const Address = require("../models/addressModel")
const User = require('../models/userModel')
const Order = require("../models/orderModel")
const bcrypt = require('bcrypt')
const Wallet = require('../models/walletModel')

//for secure password
const securePassword = async (password) => {
    try {
        const passwordHarsh = await bcrypt.hash(password, 10)
        return passwordHarsh
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}

//for loading dashboard

const loadDashboard = async (req, res) => {
    try {
        const pageTitle = "Dashboard";
        const userId = req.session.user_id;

            const userData = await User.findById(userId);
            const address = await Address.find({ userId });
            const orders = await Order.find({ userId}).populate('userId').populate('items.productId').sort({ createdAt: -1 });
            const wallet = await Wallet.findOne({ userId }).sort({ 'transactions.date': -1 });


            res.render('dashboard', { req, pageTitle, userData, address, orders,wallet });
    } catch (error) {
        console.log(error.message);
        return { success: false, message: 'Internal Server Error. Please try again later.' };
    }
}

//for update user
const updateUser = async (req, res) => {
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

        const updatedUser = await user.save();
        console.log("User deatils updated successful");

        return res.status(200).json({
            status: true,
            url: '/dashboard'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}


//for changing the password
const changePassword = async (req, res) => {

    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.params.userId;


    if (!userId) {
        return res.status(400).json({ message: 'User not found' });
    }

    try {
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
        const updatedUser = await user.save();
        console.log("Password updated successfully");
        return res.status(200).json({
            status: true,
            url: "/dashboard"
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Error updating user' });
    }
};

//for adding address
const addAddress = async (req, res) => {
    try {
        const { fullName, mobileNumber, pincode, houseNo, area, city, state } = req.body;

        const userId = req.session.user_id;
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

        const add = await address.save();
        console.log("Address add successful");
        return res.status(200).json({
            status: true,
            url: '/dashboard'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error. Please try again later.'
        });
    }
}


//for edit address
const editAddress = async (req, res) => {
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
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}



//for delete address 
const deleteAddress = async (req, res) => {
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
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
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