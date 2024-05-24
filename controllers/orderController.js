const CartItems = require('../models/cartModel');
const Address = require('../models/addressModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel')
const mongoose = require('mongoose')
const Wallet = require('../models/walletModel')
const Coupon = require("../models/couponModel")
const { fetchExchangeRate, generateRandomString } = require('../utils/orderHelper');
const { createPayPalPayment } = require('../services/paymentService');





//for checkout process
const checkout = async (req, res) => {
    const userId = req.session.user_id;
    try {
        const cartItems = await CartItems.find({ user: userId }).populate('products.productId').populate('coupondiscount');
        let appliedCouponId = null;
        for (const cartItem of cartItems) {
            if (cartItem.coupondiscount) {
                const coupon = await Coupon.findById(cartItem.coupondiscount);
                appliedCouponId = coupon;
                break;
            }
        }

        //for finding expiry
        const today = new Date();
        const coupons = await Coupon.find({ expiryDate: { $gte: today } });

        let totalPrice = 0;
        let originalTotalPrice = 0;
        // products offer
        const productsWithOffers = await Product.find({ isUnlisted: false })
            .populate({ path: "category", populate: { path: "offer" } })
            .populate('offer');

        // cart items
        for (const item of cartItems) {
            // products
            for (const product of item.products) {

                // Find  offer and category offer
                const productWithOffer = productsWithOffers.find(p => p._id.equals(product.productId._id));
                // console.log("productWithOffer", productWithOffer);

                if (!productWithOffer) {
                    console.error("Product not found in products:", product.productId._id);
                    continue;
                }
                let productTotal = 0;
                originalTotalPrice += (product.price * product.quantity);

                let productPricePerUnit = product.price;

                // Check product offer
                if (productWithOffer.offer && productWithOffer.offer.endingDate >= today) {

                    // Apply product offer
                    productPricePerUnit -= (productPricePerUnit * productWithOffer.offer.discount) / 100;
                }
                //check  category  offer
                if (productWithOffer.category.offer && productWithOffer.category.offer.endingDate >= today) {

                    // Apply category offer
                    productPricePerUnit -= (productPricePerUnit * productWithOffer.category.offer.discount) / 100;

                }
                productTotal = productPricePerUnit * product.quantity;
                product.price = productPricePerUnit;
                product.total = productTotal;

                // Add the discounted price to the total
                totalPrice += productTotal;
            }
        }

        let offerDiscount = originalTotalPrice - totalPrice


        // Iterate over each cart item
        for (const cartItem of cartItems) {

            // Check if coupondiscount exists
            if (cartItem.coupondiscount) {
                // Access the discountAmount
                const discountAmount = cartItem.coupondiscount.discountAmount;
                totalPrice -= discountAmount


            }
        }


        const address = await Address.find({ userId: userId });

        res.render('checkout', { req, cartItems, totalPrice, address, coupons, appliedCouponId, offerDiscount });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};



//for place order
const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { items, total, addressId, paymentMethod } = req.body;

        if (paymentMethod === 'cod' && total >= 1000) {
            return res.status(400).json({ message: 'Cash on delivery is only available for purchases below 1000.' });
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found.' });
        }
        const couponDiscount = req.body.couponDiscount || 0;
        const offerDiscount = req.body.offerDiscount || 0;
        const expectedDelivery = new Date();
        expectedDelivery.setDate(expectedDelivery.getDate() + 7);
        const randomOrderId = generateRandomString(5);
        if (paymentMethod !== 'cod' && paymentMethod !== 'paypal') {
            return res.status(400).json({ message: 'Invalid payment method.' });
        }



        for (const item of items) {
            for (const productDetail of item.products) {
                // Ensure productDetail.productId is defined before accessing its _id
                if (!productDetail.productId) {
                    return res.status(400).json({ message: `Product ID is undefined for item ${item._id}.` });
                }
                const productId = productDetail.productId._id;
                const product = await Product.findById(productId);

                if (!product) {
                    return res.status(404).json({ message: `Product with ID ${productId} not found.` });
                }

                if (product.stockCount < productDetail.quantity) {
                    return res.status(400).json({ message: `Insufficient stock for product ${product.name}.` });
                }

                product.stockCount -= productDetail.quantity;
                await product.save();
                console.log("Quantity decreased");
            }
        }


        const orderItems = items.flatMap((item) => {
            return item.products.map(productDetail => ({
                productId: productDetail.productId._id,
                quantity: productDetail.quantity,
                price: productDetail.price,
                total: productDetail.price * productDetail.quantity,
            }));
        });

        //create order
        const order = new Order({
            userId: userId,
            ordersId: randomOrderId,
            deliveryAddress: address.toObject(),
            totalAmount: parseFloat(total),
            expectedDelivery: expectedDelivery,
            paymentMethod: paymentMethod,
            total: total,
            items: orderItems,
            couponDiscount,
            offerDiscount
        });
        const savedOrder = await order.save();
        console.log("Order saved");

        // Check if the payment method is PayPal
        if (paymentMethod === 'paypal') {

            const exchangeRate = await fetchExchangeRate();
            const approvalUrl = await createPayPalPayment(savedOrder._id, items, exchangeRate);
            return res.status(200).json({ approvalUrl });

        }

        if (paymentMethod === 'cod') {

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





// For payment success
const paymentSuccess = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const orderId = req.params.orderId;
        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order Id is missing.' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(400).json({ success: false, message: 'Order is not found.' });
        }
        order.status = 'paid';

        const paymentId = req.query.paymentId;
        const payerId = req.query.PayerID;
        order.paymentId = paymentId;

        // Check if payerId is provided
        if (payerId) {
            order.payerId = payerId;
        } else {
            console.log("payerId not provided");

        }

        await order.save();

        console.log("Paypal order Sucessfull.",);
        // Clear cart
        await CartItems.deleteMany({ user: userId });
        res.render('paymentSuccess', { req, orderId });

    } catch (error) {
        console.error('Error in payment success:', error);
        res.status(500).send('Server Error');
    }
};







// For payment cancellation
const paymentCancel = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user_id;

        if (!orderId) {
            return res.status(400).send('Order ID is missing.');
        }
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found.');
        }
        order.status = 'retry';
        await order.save();
        await CartItems.deleteMany({ user: userId });
        res.render('paymentCancel', { req, orderId });

    } catch (error) {
        console.error('Error in payment cancellation:', error);
        res.status(500).send('Server Error');
    }
};





//for retry payment 
const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.params
        console.log("enter ",orderId)
       const order = await Order.findById(orderId);
        console.log("order", order)
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }
         const orderItems = order.items.flatMap((item) => {
            return item.products.map(productDetail => ({
                productId: productDetail.productId._id,
                quantity: productDetail.quantity,
                price: productDetail.price,
                total: productDetail.price * productDetail.quantity,
            }));
        });
        const items=orderItem;
        const exchangeRate = await fetchExchangeRate();
        const approvalUrl = await createPayPalPayment(order._id,items, exchangeRate);
        return res.status(200).json({ approvalUrl });

    } catch (error) {
        console.error('Error in payment retry:', error);
        res.status(500).send('Server Error');
    }
}





//to show order deatils 
const orderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const productId = req.query.productId
        const productIdObject = new mongoose.Types.ObjectId(productId);
        const order = await Order.findById(orderId).populate('items.productId');

        let OtherOrders = []
        let selectedItem = null;
        for (const item of order.items) {
            if (productIdObject.toString() == item.productId._id.toString()) {
                selectedItem = item;

            } else {
                OtherOrders.push(item)

            }
        }

        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('orderDeatil', { req, order, OtherOrders, selectedItem });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};







//this is for order confirmation
const orderConfirmation = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('userId').populate('items.productId');
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
        const userId = req.session.user_id;
        const { orderId, itemId } = req.params;
        const { cancellationReason } = req.body;
        const order = await Order.findById(orderId).populate('items.productId');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        const item = order.items.find(item => item._id.toString() === itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found.' });
        }
        item.cancellationReason = cancellationReason;

        item.orderStatus = 'cancelled';

        await order.save();
        //for updating the product quantity
        const items = order.items;
        for (const item of items) {
            const product = await Product.findById(item.productId)

            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }

            product.stockCount += item.quantity;
            await product.save()
            console.log("Quantity increased")

        }
        if (order.status == 'paid') {
            const wallet = await Wallet.findOne({ userId })
            if (!wallet) {
                // If the wallet doesn't exist, create a new one
                const newWallet = new Wallet({
                    userId,
                    balance: item.total,
                    transactions: [{
                        type: 'credit',
                        amount: item.total,
                        date: new Date(),
                        orderId,
                        itemId,
                        description: `Refund for order cancellation`
                    }]
                });
                await newWallet.save();

            } else {
                wallet.balance += item.total;

                wallet.transactions.push({
                    type: 'credit',
                    amount: item.total,
                    date: new Date(),
                    orderId,
                    itemId,
                    description: `Refund for order cancellation`
                });
                await wallet.save();
            }


        }

        res.json({ success: true, message: 'Product cancelled successfully.' });
    } catch (error) {
        console.error('Error in /cancel/:orderId route:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};





//for order return 
const returnOrder = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { cancellationReason } = req.body;
        const order = await Order.findById(orderId).populate('items.productId');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        const item = order.items.find(item => item._id.toString() === itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found.' });
        }
        item.cancellationReason = cancellationReason;

        item.orderStatus = 'awaiting approval';

        await order.save();


        res.json({ success: true, message: 'Product return is awaiting approval.' });
    } catch (error) {
        console.error('Error in /return/:orderId route:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};





module.exports = {
    checkout,
    placeOrder,
    orderDetails,
    orderConfirmation,
    cancelOrder,
    returnOrder,
    paymentSuccess,
    paymentCancel,
    retryPayment
}


