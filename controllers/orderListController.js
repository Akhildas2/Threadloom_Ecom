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
const updateStatus = async (req, res) => {
    try {
        const {orderId,productId,newStatus}=req.body;
        const order = await Order.findById(orderId).populate('items.productId');
        console.log("order", order);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        const item = order.items.find(item => item.productId._id.toString() === productId);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        item.orderStatus = newStatus;
       const ordersave= await order.save();
       console.log("ordersave",ordersave);
       res.status(200).json({ message: 'success', order });


    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');

    }
}



module.exports = {
    loadOrderList,
    deatilOrderList,
    updateStatus

}