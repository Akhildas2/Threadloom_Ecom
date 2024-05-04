const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      name: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
      quantity: {
        type: Number,
        default: 0
      },
      total: {
        type: Number,
        default: 0,
      }
    }
  ],
  coupondiscount: {
    type: mongoose.Types.ObjectId,
    ref: "Coupon",
    default: null,
  },
});

const CartItem = mongoose.model('CartItem', cartItemSchema);

module.exports = CartItem;

