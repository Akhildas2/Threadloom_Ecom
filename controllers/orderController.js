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
            item.subtotal = item.price * item.quantity;
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
const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user_id;
        console.log("userId", userId)
        const { items, total, addressId, paymentMethod } = req.body;
        console.log("req.body", req.body)
        console.log("items", items)
        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found.' });
        }
        const expectedDelivery = new Date();
        if (paymentMethod !== 'cod' && paymentMethod !== 'paypal') {
            return res.status(400).json({ message: 'Invalid payment method.' });
        }

        // Check if the payment method is PayPal
        if (paymentMethod === 'paypal') {
            console.log("entered to paypal")
            // Calculate the total amount of all items in the order
            const itemTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
            // Create PayPal environment
            const environment = new paypal.core.SandboxEnvironment(
             process.env.PAYPAL_CLIENT_ID,
                process.env.PAYPAL_CLIENT_SECRET
            );
            
            const client = new paypal.core.PayPalHttpClient(environment);

            // Create PayPal payment request
            const create_payment_json = {
                "intent": "CAPTURE",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3434/paymentSuccess",
                    "cancel_url": "http://localhost:3434/paymentCancel"
                },
                "purchase_units": [{
                    "amount": {
                        "currency_code": "USD",
                        "value": itemTotal.toString(),
                        "breakdown": {
                            "item_total": {
                                "currency_code": "USD",
                                "value": itemTotal.toString() // Convert to string as required by PayPal API
                            }
                        }
                    },
                    "items": items.map(item => ({
                        "name": item.productId.name,
                        "description": truncateDescription(item.productId.description),
                        "quantity": item.quantity,
                        "unit_amount": {
                            "currency_code": "USD",
                            "value": item.price.toString()
                        },
                        "category": item.category
                    }))
                }]
            };
            
            // Create a request object
            const request = new paypal.orders.OrdersCreateRequest();
            request.prefer("return=representation");
            request.requestBody(create_payment_json);

            // Assuming this is inside your placeOrder function, after setting up the PayPal payment request

            let payment;
            try {
                // Execute the payment request
                payment = await client.execute(request);
                console.log("PayPal Payment Response:", payment);
            } catch (error) {
                console.error("Error creating PayPal payment:", error);
                return res.status(500).json({ message: 'Error processing PayPal payment', error: error.message });
            }

            // Check if the payment object and its result property are defined
            if (!payment || !payment.result) {
                console.error("PayPal payment response is undefined or missing the 'result' property.");
                return res.status(500).json({ message: 'Error processing PayPal payment', error: 'PayPal payment response is invalid' });
            }



            // Save order 
            const order = new Order({
                userId: userId,
                deliveryAddress: address.toObject(),
                totalAmount: parseFloat(total),
                expectedDelivery: expectedDelivery,
                paymentMethod: paymentMethod,
                items: items.map((item) => ({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.price * item.quantity,
                    cancellationReason: item.cancellationReason,
                })),

            });
            const orderDeatil = await order.save();
            console.log("orderDeatil", orderDeatil)

            // Clear cart
            await CartItems.deleteMany({ user: userId });
            console.log("PayPal Payment Response Result:", payment.result);

            // Assuming 'payment' is the variable holding the PayPal payment response
            const approvalLink = payment.result.links.find(link => link.rel === 'approve');


            console.log("approvalLink URL:", approvalLink);

            if (!approvalLink) {
                console.error("Approval URL not found in PayPal payment response.");
                // Handle the error appropriately, e.g., by sending a response with an error message
                return res.status(500).json({ message: 'Error processing PayPal payment', error: 'Approval URL not found' });
            }
            console.log("PayPal Links:", payment.result.links);

            const approvalUrl = approvalLink.href;
            console.log("Approval URL:", approvalUrl);

            return res.status(200).json({ approvalUrl: approvalUrl });
        } else if (paymentMethod === 'cod') {
            console.log("entered to cod")

            const order = new Order({
                userId: userId,
                deliveryAddress: address.toObject(),
                totalAmount: parseFloat(total),
                expectedDelivery: expectedDelivery,
                paymentMethod: paymentMethod,
                items: items.map((item) => ({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.price * item.quantity,
                    cancellationReason: item.cancellationReason,
                })),
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
        res.render('orderConfirmation', { req, order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


//this is for oder cancellation
const cancelOrder = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        console.log("req", req.params);

        const order = await Order.findById(orderId).populate('items');
        console.log("order", order);

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

// Function to truncate description if it exceeds PayPal's limits
function truncateDescription(description) {
    const maxLength = 127; // Maximum length allowed by PayPal
    if (description.length > maxLength) {
        return description.substring(0, maxLength); // Truncate description
    }
    return description;
}



module.exports = {
    checkout,
    placeOrder,
    orderDetails,
    orderConfirmation,
    cancelOrder
}


