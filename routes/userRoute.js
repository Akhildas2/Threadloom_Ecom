const express = require('express');
const userRoute = express();
const userController = require('../controllers/userController');
const pageController = require('../controllers/pageController');
const auth = require('../middleware/userAuth');
const passport = require('passport')
require('../config/passport')



userRoute.set('view engine', 'ejs');
userRoute.set('views', './views/user');



userRoute.get('/', pageController.loadHome);
userRoute.get('/contact', pageController.loadContact);
userRoute.get('/about', pageController.loadAbout);
userRoute.get('/shop', pageController.loadShop);
userRoute.get('/register', auth.isLogout, pageController.loadRegister);
userRoute.get('/login', auth.isLogout, pageController.loadLogin);
userRoute.get('/productdetails/:productId', pageController.productDetails);
userRoute.get('/forgotPassword', auth.isLogout, pageController.forgotPasswordLoad);
userRoute.get('/resetPassword', auth.isLogout, pageController.loadResetPassword);
userRoute.get('/verifyOtp', pageController.loadVerifyOtp);
userRoute.get('/search-suggestions', pageController.searchSuggestions);
userRoute.get('/help', pageController.loadHelp);



userRoute.post('/register', userController.insertUser);
userRoute.post('/verifyOtp', userController.verifyOtp);
userRoute.post('/resendOtp', userController.resendOtp)
userRoute.post('/login', userController.verifyLogin)
userRoute.post('/logout', auth.isLogin, userController.userLogout);
userRoute.get('/logout', auth.isLogin, userController.userLogout);
userRoute.post('/forgotPassword', auth.isLogout, userController.forgotPassword);
userRoute.post('/resetPassword', auth.isLogout, userController.verifyResetPassword);
userRoute.post('/contact', userController.contactUs);



// Route for initiating Google authentication
userRoute.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// Callback route after Google authentication
userRoute.get('/register/google/callback',
	passport.authenticate('google', { failureRedirect: '/register' }),
	async (req, res) => {
		if (req.user) {
			req.session.user_id = req.user._id;
			await req.session.save();
			res.redirect('/')
		} else {
			res.redirect('/register')
		}
	}
);



module.exports = userRoute;