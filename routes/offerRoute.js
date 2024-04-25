const express = require('express')
const offerRoute= express()
const offerController = require ('../controllers/offerController')
const adminAuth = require("../middleware/adminAuth");

offerRoute.use(express.static('admin'));
offerRoute.set('view engine','ejs');
offerRoute.set('views','./views/admin')


offerRoute.get('/addOffer', adminAuth.isLogin, offerController.addOffer);
offerRoute.post('/addOffer', adminAuth.isLogin, offerController.insertOffer);





module.exports=offerRoute ;
