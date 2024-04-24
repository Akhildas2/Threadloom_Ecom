const express = require("express");
const couponRoute = express();
const couponController = require("../controllers/couponController");
const adminAuth = require("../middleware/adminAuth");


couponRoute.use(express.static('admin'));
couponRoute.set('view engine', 'ejs');
couponRoute.set('views', './views/admin');


couponRoute.get('/listCoupon', adminAuth.isLogin, couponController.listCoupon);
couponRoute.get('/addCoupon', adminAuth.isLogin, couponController.addCoupon);
couponRoute.post('/addCoupon', adminAuth.isLogin, couponController.insertCoupon);
couponRoute.delete('/deleteCoupon/:couponId', adminAuth.isLogin, couponController.deleteCoupon);
couponRoute.put('/editCoupon/:couponId', adminAuth.isLogin, couponController.editcoupon);


module.exports = couponRoute;