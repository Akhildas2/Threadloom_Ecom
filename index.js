const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require("express-session");
const passport = require('passport');
const { configurePayPal } = require('./config/paypalConfig');
const loadCategories = require('./middleware/categories');

// MongoDB connection
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
})();

//for session
app.use(session({
  secret: process.env.SESSION_SECRET,
  name: process.env.SESSION_NAME,
  resave: false,
  saveUninitialized: true,
}));

// Configure PayPal
configurePayPal();

// Middleware setup
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.set('Cache-control', 'no-store,no-cache');
  next();
});
app.use(loadCategories);

// View engine
app.set('view engine', 'ejs');
app.set('views', './views/user');

// Static files
app.use('/admin', express.static('adminAssets'));
app.use('/uploads', express.static('uploads'));
app.use(express.static('assets'));

// PayPal
configurePayPal();

// Routes
const routes = [
  { path: '/', module: './routes/userRoute' },
  { path: '/admin', module: './routes/adminRoute' },
  { path: '/admin/category', module: './routes/categoryRoute' },
  { path: '/admin/product', module: './routes/productRoute' },
  { path: '/cart', module: './routes/cartRoute' },
  { path: '/order', module: './routes/orderRoute' },
  { path: '/admin/orderList', module: './routes/orderListRoute' },
  { path: '/wishList', module: './routes/wishListRoute' },
  { path: '/dashboard', module: './routes/dashboardRoute' },
  { path: '/admin/coupon', module: './routes/couponRoute' },
  { path: '/admin/offer', module: './routes/offerRoute' },
  { path: '/review', module: './routes/reviewRoute' },
  { path: '/admin/banner', module: './routes/bannerRoute' },
];


routes.forEach(route => app.use(route.path, require(route.module)));


// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500page');
});

app.get("*", function (req, res) {
  res.status(404).render("404page")
})

// Start server
const port = parseInt(process.env.PORT) || 6969;
app.listen(port, () => {
  console.log(`Sever Running on port number http://localhost:${port}`);
  console.log(`Sever Running on port number http://localhost:${port}/admin/`);
});