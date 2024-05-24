

const paypal = require('paypal-rest-sdk');

const configurePayPal = () => {
    paypal.configure({
        'mode': process.env.PAYPAL_MODE,
        'client_id': process.env.PAYPAL_CLIENT_ID,
        'client_secret': process.env.PAYPAL_CLIENT_SECRET
    });
};

module.exports = {
    configurePayPal
};
