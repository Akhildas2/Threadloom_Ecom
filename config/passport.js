const passport = require('passport');
require("dotenv").config();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const authController = require('../controllers/authController');
const User = require('../models/userModel');



passport.use('google-signup', new GoogleStrategy({
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: process.env.GOOGLE_SIGNUP_CALLBACK_URL,
	passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
	const { id, displayName, emails } = profile;
	const email = emails[0].value;
	try {
		const existingUser = await User.findOne({ email });
		if (existingUser) {
		  return done(null, false, { message: 'Email already registered. Please login instead.' });
		}
	
		const user = await authController.findOrCreateGoogleUser(id, displayName, email);
		return done(null, user);
	} catch (err) {
		done(err, null, { message: 'Registration failed. Please try again.' });
	}
}));



passport.use('google-login', new GoogleStrategy({
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: process.env.GOOGLE_LOGIN_CALLBACK_URL,
	passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
	const { emails } = profile;
	const email = emails[0].value;
	try {
		const user = await User.findOne({ email });
		if (!user) {
			return done(null, false, { message: 'No account found. Please sign up first.' });
		}
		
		return done(null, user);
	} catch (err) {
		done(err, null, { message: 'Login failed. Please try again.' });
	}
}));



passport.serializeUser((user, done) => {
	done(null, user._id);

});



passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (err) {
		done(err, null);
	}
});



module.exports = passport;