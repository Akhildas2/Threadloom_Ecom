const express= require("express");
const orderListRoute = express();


const orderListController = require("../controllers/orderListController");
const adminAuth = require ('../middleware/adminAuth');



orderListRoute.set('view engine','ejs');
orderListRoute.set('views', './views/admin');



orderListRoute.get('/',adminAuth.isLogin,orderListController.loadOrderList);
orderListRoute.get('/orderDetails/:id',adminAuth.isLogin,orderListController.deatilOrderList);
orderListRoute.put('/orderDetails/updateStatus',adminAuth.isLogin, orderListController.updateStatus);
orderListRoute.get('/salesReport',adminAuth.isLogin,orderListController.loadSalesReport)
orderListRoute.get('/generatePdf',adminAuth.isLogin,orderListController.generatePdfReport)



module.exports = orderListRoute