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
        let { startDate, endDate, period, format, sort = 'expectedDelivery', order = 'desc' } = req.query;
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

        if (endDate && startDate) {
            startDate = new Date(startDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(endDate);
            endDate.setHours(23, 59, 59, 999);
        }

        if (period != undefined) {
            query['items.orderStatus'] = 'delivered';
            if (startDate && endDate) {
                query.expectedDelivery = {
                    $gte: startDate,
                    $lt: endDate
                }
            }
        } else {
            query['items.orderStatus'] = 'delivered';
        }

        const sortOptions = {
            'ordersId': { ordersId: sortOrder },
            'expectedDelivery': { expectedDelivery: sortOrder },
            'customer': { 'deliveryAddress.fullName': sortOrder },
            'paymentMethod': { paymentMethod: sortOrder },
            'totalAmount': { totalAmount: sortOrder }
        };

        const orders = await Order.find(query)
            .sort(sortOptions[sort] || { expectedDelivery: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('items.productId')
            .populate('userId');

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);



        let totalSalesCount = 0;
        let totalSalesAmount = 0;
        let totalDiscountAmount = 0;

        orders.forEach(order => {
            totalSalesCount += order.items.length;
            totalSalesAmount += order.totalAmount;
            const offerDiscount = order.offerDiscount || 0;
            const couponDiscount = order.couponDiscount || 0;
            totalDiscountAmount += offerDiscount + couponDiscount;
        });
        if (format === 'pdf' || format === 'excel') {
            // Add conditions specific to PDF and Excel formats
            if (endDate && startDate) {
                query['items.orderStatus'] = 'delivered';
                query.expectedDelivery = {
                    $gte: startDate,
                    $lt: endDate
                };
            } else {
                query['items.orderStatus'] = 'delivered';
            }
            const fullOrders = await Order.find(query)
                .populate('items.productId')
                .populate('userId');
            if (format === 'pdf') {
                return generateSalesReportPDF(fullOrders, page, limit, res);

            } else if (format === 'excel') {
                return generateSalesReportExcel(fullOrders, res);
            }
        }

        res.render('salesReport', {
            orders,
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