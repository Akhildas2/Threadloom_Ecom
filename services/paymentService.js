const paypal = require('paypal-rest-sdk');
const { truncateDescription } = require('../utils/orderHelper');
require("dotenv").config();



const createPayPalPayment = async (orderId, items, exchangeRate) => {
    // Prepare item list for PayPal
    const itemList = items.flatMap(item => {
        return item.products.map(productDetail => ({
            "name": productDetail.productId.name,
            "description": truncateDescription(productDetail.productId.description),
            "quantity": productDetail.quantity,
            "price": (productDetail.price * exchangeRate).toFixed(2),
            "currency": "USD"
        }));
    });

    // Calculate the total amount for all items
    const itemTotal = itemList.reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
    }, 0).toFixed(2);

    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": `${process.env.BASE_URL}/order/paymentSuccess/${orderId}`,
            "cancel_url": `${process.env.BASE_URL}/order/paymentCancel/${orderId}`
        },
        "transactions": [{
            "item_list": {
                "items": itemList
            },
            "amount": {
                "currency": "USD",
                "total": itemTotal
            },
            "description": "Order summary of the product."
        }],
        "application_context": {
            "shipping_preference": "NO_SHIPPING",
            "brand_name": "threadloom"
        }
    };


    return new Promise((resolve, reject) => {
        paypal.payment.create(create_payment_json, (error, payment) => {
            if (error) {
                reject(error);
            } else {
                const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
                resolve(approvalUrl);
            }
        });
    });
};



module.exports = {
    createPayPalPayment
};
