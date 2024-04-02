const express= require("express");
const orderListRoute = express();


const orderListController = require("../controllers/orderListController");
const adminAuth = require ('../middleware/adminAuth');



orderListRoute.set('view engine','ejs');
orderListRoute.set('views', './views/admin');



orderListRoute.get('/',orderListController.loadOrderList);
orderListRoute.get('/orderDetails/:id',orderListController.deatilOrderList);
orderListRoute.put('/:orderId/status', orderListController.changeOrderStatus);




module.exports = orderListRoute