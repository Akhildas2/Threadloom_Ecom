const express = require("express");
const cartRoute=express();
const cartController= require('../controllers/cartController');
const auth = require('../middleware/userAuth');
cartRoute.set('view engine', 'ejs');
cartRoute.set('views', './views/user');




cartRoute.get('/',cartController.loadCart)
cartRoute.post('/addToCart/:productId', auth.isLogin, cartController.addToCart);
cartRoute.get('/listProductsInCart', auth.isLogin,cartController.listProductsInCart)

cartRoute.delete('/removeFromCart/:id', auth.isLogin, cartController.removeFromCart);
cartRoute.delete('/clear', auth.isLogin, cartController.clearCart);
cartRoute.put('/updateQuantity/:itemId',auth.isLogin,cartController.updateQuantity);
cartRoute.post('/applyCoupon/:productId',auth.isLogin,cartController.applyCoupon);


module.exports = cartRoute;