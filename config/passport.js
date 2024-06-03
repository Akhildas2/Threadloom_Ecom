const passport = require('passport'); 
require("dotenv").config();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userController = require('../controllers/userController');
const User = require('../models/userModel');

passport.use(new GoogleStrategy({ 
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: process.env.GOOGLE_CALLBACK_URL,
	passReqToCallback: true
}, 
async (req, accessToken, refreshToken, profile, done) => { 
	const { id, displayName, emails } = profile;
	const email = emails[0].value;
	try {
		// Find or create Google user
		const user = await userController.findOrCreateGoogleUser(id, displayName, email, req);

		return done(null, user);
	} catch (err) {
		done(err, null);
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
