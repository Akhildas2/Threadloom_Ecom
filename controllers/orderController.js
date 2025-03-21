const CartItems = require('../models/cartModel');
const Address = require('../models/addressModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel')
const mongoose = require('mongoose')
const Wallet = require('../models/walletModel')
const Coupon = require("../models/couponModel")
const fs = require('fs');
const invoicePdfService = require('../services/invoicePdfService');
const { fetchExchangeRate, generateRandomString } = require('../utils/orderHelper');
const { createPayPalPayment } = require('../services/paymentService');



//for checkout process
const checkout = async (req, res, next) => {
    try {
        const userId = req.session.user_id;
        const cartItems = await CartItems.find({ user: userId }).populate('products.productId').populate('coupondiscount');

        // Check if there are products in the cart
        const hasProducts = cartItems.some(item => item.products.length > 0);
        if (!hasProducts) {
            return res.redirect('/'); // Redirect to home if no products exist
        }


        let appliedCouponId = null;
        let totalCouponDiscount = 0;
        for (const cartItem of cartItems) {
            if (cartItem.coupondiscount) {
                const coupon = await Coupon.findById(cartItem.coupondiscount);
                appliedCouponId = coupon;
                totalCouponDiscount += cartItem.coupondiscount.discountAmount;
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
                if (!productWithOffer) {
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
        let couponDiscount = totalCouponDiscount
        const address = await Address.find({ userId: userId });

        res.render('checkout', { req, cartItems, totalPrice, address, coupons, appliedCouponId, offerDiscount, couponDiscount });

    } catch (error) {
        next(error);
    }
};



//for place order
const placeOrder = async (req, res, next) => {
    try {
        const userId = req.session.user_id;
        const { items, total, addressId, paymentMethod, couponDiscount, offerDiscount, shippingCharge } = req.body;

        if (paymentMethod === 'cod' && total >= 1000) {
            return res.status(400).json({ message: 'Cash on delivery is only available for purchases below 1000.' });
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found.' });
        }

        const couponDiscountAmount = couponDiscount || 0;
        const shippingChargeAmount = shippingCharge || 0;
        const offerDiscountAmount = offerDiscount || 0;
        const expectedDelivery = new Date();
        expectedDelivery.setDate(expectedDelivery.getDate() + 7);
        const randomOrderId = generateRandomString(5);
        const totalAmount = parseFloat(total) + shippingChargeAmount;

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
            }
        }


        const orderItems = items.flatMap((item) => {
            return item.products.map(productDetail => ({
                productId: productDetail.productId._id,
                quantity: productDetail.quantity,
                price: productDetail.price,
                total: productDetail.price * productDetail.quantity
            }));
        });

        //create order
        const order = new Order({
            userId: userId,
            ordersId: randomOrderId,
            deliveryAddress: address.toObject(),
            totalAmount: parseFloat(totalAmount),
            expectedDelivery: expectedDelivery,
            paymentMethod: paymentMethod,
            items: orderItems,
            couponDiscount: couponDiscountAmount,
            offerDiscount: offerDiscountAmount,
            shippingCharge: shippingChargeAmount
        });
        const savedOrder = await order.save();

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
        next(error);
    }
}



// For payment success
const paymentSuccess = async (req, res, next) => {
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
        }

        await order.save();
        // Clear cart
        await CartItems.deleteMany({ user: userId });

        res.render('paymentSuccess', { req, orderId });

    } catch (error) {
        next(error);
    }
};



// For payment cancellation
const paymentCancel = async (req, res, next) => {
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
        res.render('PaymentCancel', { req, orderId });

    } catch (error) {
        next(error);
    }
};



//for retry payment 
const retryPayment = async (req, res, next) => {
    try {

        const { ordersId } = req.params;

        const order = await Order.findOne({ ordersId: ordersId }).populate('items.productId');
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }

        const orderItems = [{ products: order.items }]
        const items = orderItems;
        const exchangeRate = await fetchExchangeRate();
        const approvalUrl = await createPayPalPayment(order._id, items, exchangeRate);

        return res.status(200).json({ approvalUrl });

    } catch (error) {
        next(error);
    }
};



//to show order deatils 
const orderDetails = async (req, res, next) => {
    try {
        const orderId = req.params.id;
        const productId = req.query.productId
        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).send('Invalid Order ID or Product ID');
        }

        const productIdObject = new mongoose.Types.ObjectId(productId);
        const order = await Order.findById(orderId).populate('items.productId');
        if (!order) {
            return res.status(404).send('Order not found');
        }

        let OtherOrders = []
        let selectedItem = null;

        for (const item of order.items) {
            if (item.productId && productIdObject.toString() === item.productId._id.toString()) {
                selectedItem = item;
            } else {
                OtherOrders.push(item);
            }
        }


        res.render('orderDeatil', { req, order, OtherOrders, selectedItem });

    } catch (error) {
        next(error);
    }
};



//this is for order confirmation
const orderConfirmation = async (req, res, next) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('userId').populate('items.productId');
        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('orderConfirmation', { req, order });

    } catch (error) {
        next(error);
    }
};



//this is for oder cancellation
const cancelOrder = async (req, res, next) => {
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
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }
            product.stockCount += item.quantity;
            await product.save()
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
        next(error);
    }
};



//for order return 
const returnOrder = async (req, res, next) => {
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
        item.orderStatus = 'awaiting cancellation approval';
        await order.save();

        res.json({ success: true, message: 'Product return is awaiting cancellation approval.' });

    } catch (error) {
        next(error);
    }
};



const downloadInvoice = async (req, res, next) => {
    try {
        const orderId = req.params.orderId;

        // Fetch order details from the database using the orderId
        const order = await Order.findById(orderId).populate('userId').populate('items.productId');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Generate the PDF using the PDF service
        const invoicePath = await invoicePdfService.generateInvoicePDF(order);
        // Send the PDF file to the client
        res.download(invoicePath, `invoice-${order.ordersId}.pdf`, (err) => {
            if (err) {
                next(error);
            }
            // Optionally delete the file after sending it
            fs.unlink(invoicePath, (unlinkErr) => {
                if (unlinkErr) {
                    next(error);
                }
            });
        });

    } catch (error) {
        next(error);
    }
}



module.exports = {
    checkout,
    placeOrder,
    orderDetails,
    orderConfirmation,
    cancelOrder,
    returnOrder,
    paymentSuccess,
    paymentCancel,
    retryPayment,
    downloadInvoice
}