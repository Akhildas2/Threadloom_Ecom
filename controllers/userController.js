const User = require('../models/userModel')
const Product = require('../models/productModel')
const Otp = require('../models/otpModel')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const Address = require("../models/addressModel")
const Category=require("../models/categoryModel")
const Order=require("../models/orderModel")


//for loading the home page
const loadHome = async (req, res) => {
    try {

        const products = await Product.find({ isUnlisted: false }).populate('category');
        const categories = await Category.find({});
        res.render('home', { req, products ,categories});


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





// Function to insert user
const insertUser = async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;

        const spassword = await securePassword(password);
        const existingUser = await User.findOne({ email });
        const existing = await User.findOne({ mobile });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email Already Exists. Please Use a Different Email.' });
        }
        if (existing) {
            return res.status(400).json({ success: false, message: 'Phone Number Already Exists. Please Use a Different Phone Number.' });
        }
        const user = new User({
            name,
            email,
            mobile,
            password: spassword,
        });

        const userData = await user.save();

        if (userData) {
            // Generate OTP and store it in cookie
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
            from:process.env.EMAIL_USER,
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
        const updateInfo = await User.updateOne({ email: req.cookies.email }, { isVerified: true });
      
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
        const productData = await Product.findById(productId).populate('category')

        res.render('productDetails', { products: productData, req });
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


//for loading dashboard

const loadDashboard = async (req, res) => {
    try {
        const pageTitle = "Dashboard";
        if (req.session.user_id) {
            
            const userData = await User.findById(req.session.user_id);
            const address = await Address.find({ userId: req.session.user_id });
            const orders = await Order.find({ userId: req.session.user_id }).populate('userId').populate('items.productId').sort({ createdAt: -1 });
console.log("order",orders)
            res.render('dashboard', { req, pageTitle, userData, address,orders });
        }
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
    const userId = req.session.user_id;
    const user = await User.findById(userId)
    if (user) {
        const passwordMatch = await bcrypt.compare(oldPassword, user.password);

        if (passwordMatch) {
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ message: 'New password and confirm password do not match' });
            } else {
                const sPassword = await securePassword(newPassword)
                user.password = sPassword
                const updatedUser = await user.save();
                console.log("Password updated successful");
                return res.status(200).json({
                    status: true,
                    url: '/dashboard'
                });
            }
        }
        return res.status(400).json({ message: 'Incorrect password' });
    } else {
        return res.status(404).json({ message: 'User not found' });
    }
}


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
        const {  fullName, mobileNumber, pincode, houseNo, area, city, state } = req.body;
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
const deleteAddress = async(req,res)=>{
    try {
        const addressId=req.params.addressId
        const result = await Address.findByIdAndDelete(addressId)
        if(result){
            return res.status(200).json({
                status: true,
                url: '/dashboard'
            });
        } else{
            res.status(404).json({ message: 'Address not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
}


//for shop showing product
const shop = async (req,res)=>{
    try {

        const products = await Product.find({ isUnlisted: false }).populate('category');

        res.render('shop', { req, products });


    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}






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
    loadDashboard,
    updateUser,
    changePassword,
    addAddress,
    editAddress,
    deleteAddress,
    shop



}