
const CartItem = require('../models/cartModel')
const Product = require('../models/productModel');



//for loading cart
const loadCart = async (req, res) => {
  const userId = req.session.user_id;
  try {
    const cartItems = await CartItem.find({ user: userId }).populate('productId');
    let totalPrice = 0;
    cartItems.forEach(item => {
      item.subtotal = item.productId.price * item.quantity;
      totalPrice += item.subtotal;
    });
    res.render('cart', { req: req, cartItems, totalPrice });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};



//for add product to cart 

const addToCart = async (req, res) => {
  const { productId, quantity ,price} = req.body;
  const userId = req.session.user_id;
  if (!userId) {
    return res.status(401).json({ message: 'You must be logged in to add items to your cart.' });
  }
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    if (quantity > product.stockCount) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }
    let cartItem = await CartItem.findOne({ productId, user: userId });
    if (cartItem) {
      // Update the quantity
      cartItem.quantity += quantity;
      await cartItem.save();
    } else {
      // Create a new cart item
      cartItem = await CartItem.create({ productId, quantity, user: userId ,price: price});
    }
    console.log("Product added to cart successfully")
    res.status(200).json({
      status: true,
      message: 'Product added to cart successfully'
      
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//for listing product in cart
const listProductsInCart = async (req, res) => {
  try {
    const cartItems = await CartItem.find().populate('productId')
    res.status(200).json(cartItems)

  } catch (error) {
    res.status(500).json({ message: error.message });
  }

}


//for removeing  product from the cart
const removeFromCart = async (req, res) => {
  try {

    const { id } = req.params;

    const userId = req.session.user_id;

    const result = await CartItem.deleteOne({ _id: id, user: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Cart item not found or not removed' });
    }
    res.status(200).json({  status: true,message: 'Cart item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


//for clear all product in the cart
const clearCart = async (req, res) => {

  const userId = req.session.user_id;
  try {

    const result = await CartItem.deleteMany({ user: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No cart items found to clear' });
    }
    res.status(200).json({  status: true,message: 'Cart cleared successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


//update the quantity
const updateQuantity = async (req, res) => {
    const { itemId } = req.params;
    
    const { quantity } = req.body;
  

  try {
    const cartItem = await CartItem.findById(itemId).populate('productId');
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
     // Check product stock count
     const productStockCount = cartItem.productId.stockCount;

     // Check if quantity is greater than the product stock count
     if (quantity > productStockCount) {
         return res.status(400).json({ message: 'Requested quantity exceeds available stock' });
     }
    cartItem.quantity = quantity;
   await cartItem.save();

    return res.status(200).json({ status: true});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}




module.exports = {
  addToCart,
  loadCart,
  listProductsInCart,
  removeFromCart,
  clearCart,
  updateQuantity,
 

} 