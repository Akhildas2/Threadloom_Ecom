const mongoose = require('mongoose');



const orderSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ordersId: {
        type: String,
        required: true
    },
    deliveryAddress: {
        type: Object,
        required: true
    },
    totalAmount: {
        type: Number,
        default: 0,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    expectedDelivery: {
        type: Date,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentId: {
        type: String
    },
    payerId: {
        type: String
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        total: {
            type: Number,
            required: true
        },
        orderStatus: {
            type: String,
            enum: [
                'pending',
                'confirmed',
                'processing',
                'shipped',
                'out for delivery',
                'delivered',
                'awaiting cancellation approval',
                'cancelled',
                'rejected',
                'returned',
                'refund initiated',
                'refunded',
                'failed'
            ],
            default: 'pending'
        },
        paid: {
            type: Boolean,
            default: false
        },
        cancellationReason: {
            type: String
        },
    }],
    status: {
        type: String,
        enum: ['pending', 'paid', 'retry', 'partially paid'],
        default: 'pending'
    },
    shippingCharge: {
        type: Number,
        default: 0
    },
    offerDiscount: {
        type: Number,
        default: 0
    },
    couponDiscount: {
        type: Number,
        default: 0
    }
}, { timestamps: true })



const Order = mongoose.model('Order', orderSchema);
module.exports = Order;