const express = require('express');
const userRoute = express();
const userController = require('../controllers/userController');
const pageController = require('../controllers/pageController');
const auth = require('../middleware/userAuth');
const passport = require('passport')
require('../config/passport')



userRoute.set('view engine', 'ejs');
userRoute.set('views', './views/user');
userRoute.use((req, res, next) => {
	res.locals.error = req.query.error;
	next();
  });


userRoute.get('/', pageController.loadHome);
userRoute.get('/contact', pageController.loadContact);
userRoute.get('/about', pageController.loadAbout);
userRoute.get('/shop', pageController.loadShop);
userRoute.get('/signup', auth.isLogout, pageController.loadRegister);
userRoute.get('/login', auth.isLogout, pageController.loadLogin);
userRoute.get('/productdetails/:productId', pageController.productDetails);
userRoute.get('/forgotPassword', auth.isLogout, pageController.forgotPasswordLoad);
userRoute.get('/resetPassword', auth.isLogout, pageController.loadResetPassword);
userRoute.get('/verifyOtp', pageController.loadVerifyOtp);
userRoute.get('/search-suggestions', pageController.searchSuggestions);
userRoute.get('/help', pageController.loadHelp);



userRoute.post('/signup', userController.insertUser);
userRoute.post('/verifyOtp', userController.verifyOtp);
userRoute.post('/resendOtp', userController.resendOtp)
userRoute.post('/login', userController.verifyLogin)
userRoute.post('/logout', auth.isLogin, userController.userLogout);
userRoute.get('/logout', auth.isLogin, userController.userLogout);
userRoute.post('/forgotPassword', auth.isLogout, userController.forgotPassword);
userRoute.post('/resetPassword', auth.isLogout, userController.verifyResetPassword);
userRoute.post('/contact', userController.contactUs);




// Route for initiating Google authentication
userRoute.get('/auth/google/signup', passport.authenticate('google-signup', { scope: ['profile', 'email'] }));
// Callback route after Google authentication
userRoute.get('/signup/google/callback', (req, res, next) => {
	passport.authenticate('google-signup', (err, user, info) => {
		if (err) return next(err);
		if (!user) {
			const message = info?.message || 'Google signup failed';
			return res.redirect(`/signup?error=${encodeURIComponent(message)}`);
		}
		req.logIn(user, async (err) => {
			if (err) return next(err);
			req.session.user_id = user._id;
			await req.session.save();
			res.redirect('/');
		});
	})(req, res, next);
});


// Route for initiating Google authentication (Login)
userRoute.get('/auth/google/login', passport.authenticate('google-login', { scope: ['profile', 'email'] }));

// Callback route after Google authentication (Login)
userRoute.get('/login/google/callback', (req, res, next) => {
	passport.authenticate('google-login', (err, user, info) => {
		if (err) return next(err);
		if (!user) {
			const message = info?.message || 'Google login failed';
			return res.redirect(`/login?error=${encodeURIComponent(message)}`);
		}
		req.logIn(user, async (err) => {
			if (err) return next(err);
			req.session.user_id = user._id;
			await req.session.save();
			res.redirect('/');
		});
	})(req, res, next);
});



module.exports = userRoute;