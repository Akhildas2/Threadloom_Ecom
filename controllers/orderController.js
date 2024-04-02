const CartItems = require('../models/cartModel'); 
const Address = require('../models/addressModel');
const Order = require('../models/orderModel');


//for checkout process
const checkout = async (req, res) => {
    const userId = req.session.user_id; 
    try {
        const cartItems = await CartItems.find({ user: userId }).populate('productId');   
         
        let totalPrice = 0;
        cartItems.forEach(item => {
          item.subtotal = item.productId.price * item.quantity;
          totalPrice += item.subtotal;
        });
        const address = await Address.find({ userId: userId });
        
        res.render('checkout', { req, cartItems, totalPrice, address }); 

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};


//for place order
const placeOrder = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const { items, total,address } = req.body;
   
        const productIds = items.map(item => item.productId);
        const order = new Order({
            user: userId,
            items: productIds, 
            total: parseFloat(total), 
            address,
        });
       const orders= await order.save();
  
       await CartItems.deleteMany({ user: userId });
       return res.status(200).json({
        status: true,
        orderId:order._id, 
    });

    } catch (error) {
      console.error('Error placing order:', error);
    res.status(500).json({ message: 'Error placing order', error: error.message });   
    }
}


//to show order deatils 
const orderDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        const order = await Order.findById(userId).populate('user').populate('items').populate('address');
        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('orderDeatil', { req, order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

//this is for order confirmation
const orderConfirmation = async (req, res) => {
    try {   
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('user').populate('items').populate('address');
        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('orderConfirmation', {req,order});
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


//this is for oder cancellation
const cancelOrder = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        console.log("req",req.params);

        const order = await Order.findById(orderId).populate('items');
        console.log("order",order);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }


        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found.' });
        }

        item.status = 'Cancelled';
        await order.save();

        res.json({ success: true, message: 'Product cancelled successfully.' });
    } catch (error) {
        console.error('Error in /cancel/:orderId route:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};





module.exports={
    checkout,
    placeOrder,
    orderDetails,
    orderConfirmation,
    cancelOrder
}


