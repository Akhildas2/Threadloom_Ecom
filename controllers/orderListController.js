const Order = require("../models/orderModel")
const Wallet = require("../models/walletModel")
const Product = require("../models/productModel")
const { generateSalesReportPDF } = require('../services/pdfService')
const { generateSalesReportExcel } = require('../services/excelService')



const loadOrderList = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;
        let { sort = 'date', order = 'desc' } = req.query;
        const sortOrder = order === 'asc' ? 1 : -1;

        let query = {};
        const orderStatus = req.query.status || '';
        const search = req.query.search ? req.query.search.trim() : "";

        // Filter by order status 
        if (orderStatus) {
            query.items = { $elemMatch: { orderStatus } };
        }

        // search across multiple fields
        if (search) {
            const products = await Product.find(
                { name: { $regex: search, $options: "i" } },
                { _id: 1 }
            );
            const productIds = products.map(p => p._id);
            query.$or = [
                { ordersId: { $regex: search, $options: "i" } },
                { paymentMethod: { $regex: search, $options: "i" } },
                { status: { $regex: search, $options: "i" } },
                { 'items.productId': { $in: productIds } }
            ];
        }

        const sortOptions = {
            'ordersId': { ordersId: sortOrder },
            'date': { date: sortOrder },
            'paymentMethod': { paymentMethod: sortOrder },
            'totalAmount': { totalAmount: sortOrder }
        };

        const orders = await Order.find(query)
            .populate('items.productId')
            .populate('userId')
            .sort(sortOptions[sort] || { date: -1 })
            .skip(skip)
            .limit(limit);

        const ordersCount = await Order.countDocuments(query);
        const totalPages = Math.ceil(ordersCount / limit);

        res.render('orderList', {
            orders,
            totalPages,
            currentPage: page,
            selectedLimit: limit,
            search,
            orderStatus,
            sortField: sort,
            sortOrder: order,
            ordersCount
        });

    } catch (error) {
        next(error);
    }
};




//for deatil order list
const deatilOrderList = async (req, res, next) => {
    try {
        const id = req.params.id
        const order = await Order.findById(id).populate('items.productId').populate("userId");
        res.render('orderDetails', { order });

    }
    catch (error) {
        next(error);
    }
}



//change order status
const updateStatus = async (req, res, next) => {
    try {
        const { orderId, productId, newStatus } = req.body;
        const order = await Order.findById(orderId).populate('items.productId');

        if (!order) return res.status(404).json({ message: 'Order not found' });

        const item = order.items.find(item => item.productId._id.toString() === productId);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        item.orderStatus = newStatus;
        if (newStatus === 'delivered') {
            item.deliveryDate = new Date();
            item.paid = true;
        }

        // Check overall order payment status
        const allDeliveredPaid = order.items.every(item => item.orderStatus === 'delivered' && item.paid);
        const someDeliveredPaid = order.items.some(item => item.orderStatus === 'delivered' && item.paid);
        if (allDeliveredPaid) {
            order.status = 'paid';
        } else if (someDeliveredPaid) {
            order.status = 'partially paid';
        }


        // Update product stock for returned or canceled items
        if (newStatus === 'returned' || newStatus === 'cancelled') {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });

            product.stockCount += item.quantity;
            await product.save();
        }

        if (newStatus === 'refunded' && item.paid) {
            item.refundDate = new Date();
            const userId = order.userId;
            const wallet = await Wallet.findOne({ userId });

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
                        itemId: item._id,
                        description: `Refund for order return`
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
                    itemId: item._id,
                    description: `Refund for order return`
                });
                await wallet.save();
            }
        }

        await order.save();

        res.status(200).json({ message: 'success', order });

    } catch (error) {
        next(error);
    }
}



//for loading sales report
const loadSalesReport = async (req, res, next) => {
    try {
        let { startDate, endDate, period, format, sort = 'createdAt', order = 'desc' } = req.query;
        const sortOrder = order === 'asc' ? 1 : -1;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const orderStatus = req.query.status || '';
        const search = req.query.search ? req.query.search.trim() : "";
        let query = {};

        // Filter by order status 
        if (orderStatus) {
            query.paymentMethod = orderStatus;
        }

        // search across multiple fields
        let productIds = [];
        if (search) {
            const products = await Product.find(
                { name: { $regex: search, $options: "i" } },
                { _id: 1 }
            );
            productIds = products.map(p => p._id);
            query.$or = [
                { ordersId: { $regex: search, $options: "i" } },
                { paymentMethod: { $regex: search, $options: "i" } },
                { 'items.productId': { $in: productIds } }
            ];
        }

        if (endDate && startDate) {
            startDate = new Date(startDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(endDate);
            endDate.setHours(23, 59, 59, 999);
        }

        // Main order filter: only delivered
        query['items.orderStatus'] = 'delivered';

        if (period !== undefined && startDate && endDate) {
            query['items.deliveryDate'] = {
                $gte: startDate,
                $lt: endDate
            };
        }

        const sortOptions = {
            'ordersId': { ordersId: sortOrder },
            'deliveryDate': { 'items.deliveryDate': sortOrder },
            'customer': { 'deliveryAddress.fullName': sortOrder },
            'paymentMethod': { paymentMethod: sortOrder },
            'totalAmount': { totalAmount: sortOrder },
            'createdAt': { createdAt: sortOrder }
        };

        let orders = await Order.find(query)
            .sort(sortOptions[sort])
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('items.productId')
            .populate('userId');

        // Filter items inside each order based on date, status, and product name
        orders.forEach(order => {
            order.items = order.items.filter(item => {
                const matchStatus = item.orderStatus === 'delivered';
                const matchDate = (!startDate || !endDate) || (
                    item.deliveryDate >= startDate && item.deliveryDate <= endDate
                );
                const matchProduct = !search || productIds.includes(item.productId._id);
                return matchStatus && matchDate && matchProduct;
            });

            // Recalculate 
            let total = 0;
            let offerDiscount = 0;
            let couponDiscount = order.couponDiscount || 0;

            order.items.forEach(item => {
                total += item.total;
                offerDiscount += item.offerDiscount || 0;
            });

            order.totalAmount = total;
            order.offerDiscount = offerDiscount;
            order.couponDiscount = couponDiscount;
        });


        // Remove orders with no matching items
        const filteredOrders = orders.filter(order => order.items.length > 0);
        const totalOrders = filteredOrders.length;
        const totalPages = Math.ceil(totalOrders / limit);


        let totalSalesCount = 0;
        let totalSalesAmount = 0;
        let totalDiscountAmount = 0;

        filteredOrders.forEach(order => {
            totalSalesCount += order.items.length;
            totalSalesAmount += order.totalAmount;
            const offerDiscount = order.offerDiscount || 0;
            const couponDiscount = order.couponDiscount || 0;
            totalDiscountAmount += offerDiscount + couponDiscount;
        });

        // PDF/Excel export
        if (format === 'pdf' || format === 'excel') {
            let fullOrders = await Order.find(query)
            .populate('items.productId')
            .populate('userId');

            fullOrders.forEach(order => {
                order.items = order.items.filter(item => {
                    const matchStatus = item.orderStatus === 'delivered';
                    const matchDate = (!startDate || !endDate) || (
                        item.deliveryDate >= startDate && item.deliveryDate <= endDate
                    );
                    const matchProduct = !search || productIds.includes(item.productId._id);
                    return matchStatus && matchDate && matchProduct;
                });
            
                //  Recalculate based on filtered items
                let total = 0;
                let offerDiscount = 0;
                let couponDiscount = order.couponDiscount || 0;
            
                order.items.forEach(item => {
                    total += item.total;
                    offerDiscount += item.offerDiscount || 0;
                });
            
                order.totalAmount = total;
                order.offerDiscount = offerDiscount;
                order.couponDiscount = couponDiscount;
            });
            
           if (format === 'pdf') {
                return generateSalesReportPDF(fullOrders, startDate, endDate, res);
            } else {
                return generateSalesReportExcel(fullOrders, res);
            }
        }

        res.render('salesReport', {
            orders: filteredOrders,
            totalSalesCount,
            totalSalesAmount,
            totalDiscountAmount,
            currentPage: page,
            totalPages: totalPages,
            limit: limit,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            period: req.query.period,
            sortField: sort,
            sortOrder: order,
            search,
            orderStatus,
            totalOrders
        });

    } catch (error) {
        next(error);
    }
};



module.exports = {
    loadOrderList,
    deatilOrderList,
    updateStatus,
    loadSalesReport
}