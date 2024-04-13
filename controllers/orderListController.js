const Order = require("../models/orderModel")
const User = require("../models/userModel")


//for loading order list 
const loadOrderList = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('userId');

        res.render('orderList', { orders })

    }
    catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');


    }
}

//for deatil order list
const deatilOrderList = async (req, res) => {
    try {
        const id=req.params.id
        const order = await Order.findById(id).populate('items.productId').populate("userId");

        res.render('orderDetails', { order });


    }
    catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');


    }
}



//change order status
const changeOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        console.log("order", order);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        order.status = req.body.status;
        await order.save();
        res.render('orderDetails', { order });

    } catch (error) {

    }
}



module.exports = {
    loadOrderList,
    deatilOrderList,
    changeOrderStatus

}