const mongoose = require('mongoose');



const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [
        {
            type: {
                type: String,
                enum: ['credit', 'debit'],
                required: true
            },
            amount: {
                type: Number,
                required: true
            },
            description: {
                type: String,
                required: true
            },
            orderId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Order',
            },
            itemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ]
});



const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;