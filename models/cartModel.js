

const mongoose = require('mongoose');
const cartItemSchema = new mongoose.Schema({
   productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
   },
   quantity: {
      type: Number,
      default: 1,
      required: true
   },
   user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
   },
   price: {
      type: Number,
      require: true
   }
  

});


const CartItem = mongoose.model('CartItem', cartItemSchema);

module.exports = CartItem;
