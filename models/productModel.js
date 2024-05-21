
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    
    gender: {
        type: String,
        required: true
    },
    category: {
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
        required: true,
    },
    size: {
        type: String,
        required: true
    },
    stockCount: {
        type: Number,
        required: true
    },
    productImage: {
        type: Array,
        required: true
    },
    isUnlisted: {
        type: Boolean,
        default: false
    },
    offer: {
        type:mongoose.Schema.Types.ObjectId,
        ref:"Offer",
    }
});

module.exports = mongoose.model('Product', productSchema);
