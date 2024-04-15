const express = require("express");
const wishListRoute=express();
const wishListController=require('../controllers/wishListController');
wishListRoute.set('view engine','ejs');
wishListRoute.set('views','./views/user');
const userAuth=require('../middleware/userAuth');



wishListRoute.get('/',wishListController.loadWishlist)

module.exports = wishListRoute;