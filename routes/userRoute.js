const express = require('express');
const userRoute = express();
const userController = require('../controllers/userController');
const auth = require('../middleware/userAuth');
const passport = require('passport')
require('../config/passport')

userRoute.set('view engine', 'ejs');
userRoute.set('views', './views/user');



userRoute.get('/', userController.loadHome);
userRoute.get('/shop', userController.shop);
userRoute.get('/register', auth.isLogout, userController.loadRegister);
userRoute.post('/register', userController.insertUser);
userRoute.get('/verifyOtp', userController.loadVerifyOtp);
userRoute.post('/verifyOtp', userController.verifyOtp);
userRoute.post('/resendOtp', userController.resendOtp)
userRoute.get('/login', auth.isLogout, userController.loadLogin);
userRoute.post('/login', userController.verifyLogin)
userRoute.post('/logout', auth.isLogin, userController.userLogout);
userRoute.get('/logout', auth.isLogin, userController.userLogout);
userRoute.get('/productdetails/:productId', userController.productDetails);
userRoute.get('/forgotPassword', auth.isLogout, userController.forgotPasswordLoad);
userRoute.post('/forgotPassword', auth.isLogout, userController.forgotPassword);
userRoute.get('/resetPassword', auth.isLogout, userController.loadResetPassword);
userRoute.post('/resetPassword', auth.isLogout, userController.verifyResetPassword);

// Route for initiating Google authentication
userRoute.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback route after Google authentication
userRoute.get('/register/google/callback',
	passport.authenticate('google', {
		successRedirect: '/',
		failureRedirect: '/register'
	})
);



module.exports = userRoute;