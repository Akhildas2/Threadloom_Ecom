const CartItems = require('../models/cartModel'); 
const Address = require('../models/addressModel');
const Order = require('../models/orderModel');
const paypal = require('@paypal/checkout-server-sdk');

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
const placeOrder = async(req, res) => {
    try {
        const userId = req.session.user_id;
        console.log("userId",userId)
        const { items, total, address, paymentMethod } = req.body;
        console.log("req.body",req.body)
        console.log("items",items)

        const status = 'Pending'; 
        const expectedDelivery = new Date(); 
        const date = new Date(); 
        if (paymentMethod !== 'cod' && paymentMethod !== 'paypal') {
            return res.status(400).json({ message: 'Invalid payment method.' });
        }

        // Check if the payment method is PayPal
        if (paymentMethod === 'paypal') {
        console.log("entered to paypal")
            
            // Setup PayPal environment
            const clientId = process.env.PAYPAL_CLIENT_ID;
        console.log("entered to clientId",clientId)

            const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
        console.log("entered to clientSecret",clientSecret)

            const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
            const client = new paypal.core.PayPalHttpClient(environment);

            // Create PayPal order
            const request = new paypal.orders.OrdersCreateRequest();
            request.prefer("return=representation");
            request.requestBody({
                intent: "CAPTURE",
                purchase_units: [{
                    amount: {
                        currency_code: "INR",
                        value: total
                    }
                }]
            });

            const response = await client.execute(request);

            const orderId = response.result.id;

            // Capture PayPal payment
            const captureRequest = new paypal.orders.OrdersCaptureRequest(orderId);
            const captureResponse = await client.execute(captureRequest);

            // Save order 
            const order = new Order({
                userId: userId,
                deliveryAddress: address,
                totalAmount: parseFloat(total),
                date: date, 
                expectedDelivery: expectedDelivery,
                status: status,
                paymentMethod: paymentMethod,
                paymentId: captureResponse.result.purchase_units[0].payments.captures[0].id,
                payerId: captureResponse.result.payer.payer_id,
                items: CartItems.map((item) => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total,
                    orderStatus: status,
                    cancellationReason: item.cancellationReason,
                  })),

            });
            const orderDeatil=await order.save();
            console.log("orderDeatil",orderDeatil)


            // Clear cart
            await CartItems.deleteMany({ user: userId });

            return res.status(200).json({
                status: true,
                orderId: order._id,
                paymentId: captureResponse.result.purchase_units[0].payments.captures[0].id,
                payerId: captureResponse.result.payer.payer_id
            });
        } else if (paymentMethod === 'cod') {
        console.log("entered to cod")

            const order = new Order({
                status: status, 
                expectedDelivery: expectedDelivery, 
                date: date,
                user: userId,
                items: items, 
                total: parseFloat(total),
                deliveryAddress: address,
                paymentMethod: paymentMethod, 
            });
            await order.save();

            // Clear cart
            await CartItems.deleteMany({ user: userId });

            return res.status(200).json({
                status: true,
                orderId: order._id,
                message: 'Order placed successfully. Payment will be collected upon delivery.'
            });
        }

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


