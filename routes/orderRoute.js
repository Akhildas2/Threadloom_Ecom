const express = require('express');
const orderRoute = express()
const orderController = require("../controllers/orderController")
const auth = require('../middleware/userAuth');



orderRoute.set('view engine', 'ejs');
orderRoute.set('views', './views/user');



orderRoute.get('/', auth.isLogin, orderController.checkout)
orderRoute.get('/paymentSuccess/:orderId', auth.isLogin, orderController.paymentSuccess)
orderRoute.get('/paymentCancel/:orderId', auth.isLogin, orderController.paymentCancel)
orderRoute.post('/placeOrder', auth.isLogin, orderController.placeOrder);
orderRoute.get('/orderDeatil/:id', auth.isLogin, orderController.orderDetails);
orderRoute.get('/orderConfirmation/:orderId', auth.isLogin, orderController.orderConfirmation);
orderRoute.post('/cancel/:orderId/:itemId', auth.isLogin, orderController.cancelOrder);
orderRoute.post('/return/:orderId/:itemId', auth.isLogin, orderController.returnOrder);
orderRoute.put('/retryPayment/:ordersId', auth.isLogin, orderController.retryPayment);
orderRoute.get('/invoice/:orderId', auth.isLogin, orderController.downloadInvoice)
orderRoute.get('/checkBalance', auth.isLogin, orderController.getCheckoutBalance)



module.exports = orderRoute;