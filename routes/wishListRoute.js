const express = require("express");
const wishListRoute=express();
const wishListController=require('../controllers/wishListController');
wishListRoute.set('view engine','ejs');
wishListRoute.set('view','./views/user');
const userAuth=require('../middleware/userAuth');



wishListRoute.get('/',wishListController.loadWhislist)

module.exports = wishListRoute;