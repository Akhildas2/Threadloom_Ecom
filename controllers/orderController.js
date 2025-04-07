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

        //for finding expiry
        const today = new Date();
        const coupons = await Coupon.find({ expiryDate: { $gte: today } });

        let totalPrice = 0;
        let originalTotalPrice = 0;
        let offerDiscount = 0;
        let couponDiscount = 0;
        let appliedCouponId = null;

        // products offer
        const productsWithOffers = await Product.find({ isUnlisted: false })
            .populate({ path: "category", populate: { path: "offer" } })
            .populate('offer');

        for (const cartItem of cartItems) {
            for (const product of cartItem.products) {
                const productWithOffer = productsWithOffers.find(p => p._id.equals(product.productId._id));
                if (!productWithOffer) continue;

                originalTotalPrice += product.price * product.quantity;

                let productPricePerUnit = product.price;
                let productDiscount = productWithOffer.offer && productWithOffer.offer.endingDate >= today
                    ? productWithOffer.offer.discount
                    : 0;
                let categoryDiscount = productWithOffer.category.offer && productWithOffer.category.offer.endingDate >= today
                    ? productWithOffer.category.offer.discount
                    : 0;

                // Apply the higher of the product or category discount
                let finalDiscount = Math.max(productDiscount, categoryDiscount);
                let discountedPrice = productPricePerUnit - (productPricePerUnit * finalDiscount) / 100;

                let productTotal = discountedPrice * product.quantity;
                totalPrice += productTotal;

                // Store applied offer discount
                offerDiscount += (product.price * product.quantity) - productTotal;

                product.price = discountedPrice;
                product.total = productTotal;
            }
        }

        // Apply coupon discount if available
        for (const cartItem of cartItems) {
            if (cartItem.coupondiscount) {
                const coupon = await Coupon.findById(cartItem.coupondiscount);
                if (coupon) {
                    appliedCouponId = coupon;
                    couponDiscount += cartItem.coupondiscount.discountAmount;
                }
            }
        }
        totalPrice -= couponDiscount;

        // Fetch user address
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

        if (parseFloat(totalAmount) !== 10000) {
            return res.status(400).json({ message: 'Orders can only be placed for a total amount of exactly ₹10,000.' });
        }
        
        if (paymentMethod !== 'cod' && paymentMethod !== 'paypal' && paymentMethod !== 'wallet') {
            return res.status(400).json({ message: 'Invalid payment method.' });
        }

        for (const item of items) {
            for (const productDetail of item.products) {
                // Ensure productDetail.productId is defined before accessing its _id
                if (!productDetail.productId) {
                    return res.status(400).json({ message: `Product is undefined for item ${item._id}.` });
                }

                const productId = productDetail.productId._id;
                const product = await Product.findById(productId);
                if (!product) {
                    return res.status(404).json({ message: `Product not found.` });
                }
                if (productDetail.quantity > 3) {
                    return res.status(400).json({ message: `You can only buy a maximum of 3 quantities for product ${product.name}.` });
                }
                if (product.stockCount < productDetail.quantity) {
                    return res.status(400).json({ message: `Insufficient stock for product ${product.name}.` });
                }

                product.stockCount -= productDetail.quantity;
                await product.save();
            }
        }


        if (paymentMethod === 'wallet') {
            const wallet = await Wallet.findOne({ userId });

            if (!wallet || wallet.balance < totalAmount) {
                return res.status(400).json({ message: 'Insufficient wallet balance.' });
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

        if (orderItems.length > 5) { return res.status(400).json({ message: 'You can only place up to 5 products per order.' }); }

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


        if (paymentMethod === 'wallet') {

            const wallet = await Wallet.findOne({ userId });

            wallet.balance -= totalAmount;
            wallet.transactions.push({
                type: 'debit',
                amount: totalAmount,
                description: `Payment for Order #${order.ordersId}`,
                orderId: new mongoose.Types.ObjectId(order._id),
                itemId: new mongoose.Types.ObjectId(orderItems._id)
            })

            await wallet.save();

            const order = await Order.findById(order._id);
            order.status = 'paid';
            order.payerId = userId;
            await order.save();

            // Clear cart
            await CartItems.deleteMany({ user: userId });

            return res.status(200).json({
                status: true,
                orderId: order._id,
                message: 'Order placed successfully using wallet payment.'
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

        const deliveryDate = new Date(order.expectedDelivery);
        const currentDate = new Date();

        if (currentDate > deliveryDate) {
            return res.status(400).json({
                success: false,
                message: `Cancellation period expired. You can only cancel before ${deliveryDate.toDateString()}.`,
                expectedDelivery: deliveryDate.toDateString()
            });
        }

        item.cancellationReason = cancellationReason;
        item.orderStatus = 'cancelled';
        item.cancellationDate = new Date();
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
                        description: `Refund for ${item.productId.name} order cancellation`
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
                    description: `Refund for ${item.productId.name} order cancellation`
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
        const purchaseDate = new Date(item.purchaseDate);
        const currentDate = new Date();
        const daysDifference = Math.floor((currentDate - purchaseDate) / (1000 * 60 * 60 * 24));

        if (daysDifference > 14) {
            return res.status(400).json({ success: false, message: 'Return period expired. You can only return within 14 days of purchase.' });
        }

        item.cancellationReason = cancellationReason;
        item.orderStatus = 'awaiting cancellation approval';
        item.cancellationDate = new Date();
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



const getCheckoutBalance = async (req, res, next) => {
    try {
        const userId = req.session.user_id;
        const wallet = await Wallet.findOne({ userId });
        const walletBalance = wallet ? wallet.balance : 0;

        res.json({ walletBalance })

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
    downloadInvoice,
    getCheckoutBalance
}