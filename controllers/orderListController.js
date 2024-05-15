const Order = require("../models/orderModel")
const Wallet = require("../models/walletModel")
const Product = require("../models/productModel")



//for loading order list 
const loadOrderList = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('items.productId').populate('userId');

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
        const id = req.params.id
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
        const { orderId, productId, newStatus } = req.body;
        const order = await Order.findById(orderId).populate('items.productId');

        if (!order) return res.status(404).json({ message: 'Order not found' });

        const item = order.items.find(item => item.productId._id.toString() === productId);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        item.orderStatus = newStatus;
        const ordersave = await order.save();

        //for updating the product quantity
        const items = order.items;
        if (item.orderStatus == 'returned' || item.orderStatus == 'cancelled') {
            for (const item of items) {
                const product = await Product.findById(item.productId)

                if (!product) {
                    return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
                }

                product.stockCount += item.quantity;
                await product.save()
                console.log("Quantity increased")
            }
        }

        const userId = order.userId;
        if (item.orderStatus == 'returned') {

            console.log("userId", userId)
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


        res.status(200).json({ message: 'success', order });

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');

    }
}



//for loading order list 
const loadSalesReport = async (req, res) => {
    try {
        let { startDate, endDate, period } = req.query;
        console.log("req.query", req.query);
        if (endDate && startDate) {
            startDate = new Date(startDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(endDate);
            endDate.setHours(23, 59, 59, 999);
        }

        let orders;
        if(period==='daily' || period==='weekly' || period==='monthly' || period==='yearly'  || period==='custom') {
        
             orders = await Order.find({ 
                    'items.orderStatus': 'delivered',
                    expectedDelivery: {
                        $gte: startDate,
                        $lt: endDate
                    }
                });
             
        }else{
             orders = await Order.find({ 'items.orderStatus': 'delivered' });

        }
        console.log("orders", orders);

        let totalSalesCount = 0;
        let totalSalesAmount = 0;
        let totalDiscountAmount = 0;

        orders.forEach(order => {
            totalSalesCount += order.items.length;
            totalSalesAmount += order.total;
            const offerDiscount = order.offerDiscount || 0;
            const couponDiscount = order.couponDiscount || 0;
            totalDiscountAmount += offerDiscount + couponDiscount;
        });

        res.render('salesReport', {
            orders,
            totalSalesCount,
            totalSalesAmount,
            totalDiscountAmount
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};









module.exports = {
    loadOrderList,
    deatilOrderList,
    updateStatus,
    loadSalesReport
}