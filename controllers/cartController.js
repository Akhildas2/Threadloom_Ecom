const CartItem = require('../models/cartModel')
const Product = require('../models/productModel');



//for loading cart
const loadCart = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const today = new Date();
    let totalPrice = 0;
    let totalCount = 0;

    //for finding CartItem
    const cartItems = await CartItem.find({ user: userId })
      .populate({
        path: "products.productId",
        match: { isUnlisted: false }
      });

    // Filter out products that are null
    cartItems.forEach(item => {
      item.products = item.products.filter(product => product.productId);
    });

    // products offer
    const productsWithOffers = await Product.find({ isUnlisted: false })
      .populate({ path: "category", populate: { path: "offer" } })
      .populate('offer');

    // Calculate discounts and total price
    cartItems.forEach(item => {
      item.products.forEach(product => {
        const productWithOffer = productsWithOffers.find(p => p._id.equals(product.productId._id));
        if (!productWithOffer) return;

        let originalPrice = product.price;
        let productDiscount = 0;
        let categoryDiscount = 0;

        // Check product offer
        if (productWithOffer.offer && productWithOffer.offer.endingDate >= today) {
          productDiscount = productWithOffer.offer.discount;
        }

        // Check category offer
        if (productWithOffer.category.offer && productWithOffer.category.offer.endingDate >= today) {
          categoryDiscount = productWithOffer.category.offer.discount;
        }

        // Apply the maximum discount
        let finalDiscount = Math.max(productDiscount, categoryDiscount);
        let discountedPrice = originalPrice - (originalPrice * finalDiscount) / 100;

        let productTotal = discountedPrice * product.quantity;
        product.price = discountedPrice;
        product.total = productTotal;
        totalPrice += productTotal;

        // Count total items in cart
        totalCount += product.quantity;
      });
    });

    res.render('cart', { req: req, cartItems, totalPrice, totalCount });

  } catch (error) {
    next(error);
  }
};



//for add product to cart 
const addToCart = async (req, res, next) => {
  try {
    const { productId, name, quantity, price } = req.body;

    if (!productId || !name || !quantity || !price) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userId = req.session.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'You must be logged in to add items to your cart.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (quantity > product.stockCount) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    let cartItem = await CartItem.findOne({ user: userId });
    if (!cartItem) {
      cartItem = new CartItem({
        user: userId,
        products: [{ productId, name, price, quantity, total: price * quantity }],
      })
      await cartItem.save();
    } else {
      const existingProductIndex = cartItem.products.findIndex(p => p.productId.equals(productId));
      if (existingProductIndex !== -1) {
        const existingProduct = cartItem.products[existingProductIndex];
        if (existingProduct.quantity + quantity > product.stockCount) {
          return res.status(400).json({ message: 'Insufficient stock' });
        }
        existingProduct.quantity += quantity;
        existingProduct.total += price * quantity;
        await cartItem.save();
      } else {
        cartItem.products.push({ productId, name, price, quantity, total: price * quantity });
        await cartItem.save();
      }
    }

    res.status(200).json({
      status: true,
      message: 'Product added to cart successfully'
    });

  } catch (error) {
    next(error);
  }
};



//for listing product in cart
const listProductsInCart = async (req, res, next) => {
  try {
    const cartItems = await CartItem.find().populate('productId')
    res.status(200).json(cartItems)

  } catch (error) {
    next(error);
  }
}



//for removeing  product from the cart
const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.session.user_id;

    const cartItem = await CartItem.findOneAndUpdate(
      { user: userId },
      { $pull: { products: { _id: id } } },
      { new: true }
    );
    if (!cartItem) {
      return res.status(404).send('Item not found in cart');
    }

    const remainingItems = cartItem.products.length;
    if (remainingItems === 0) {
      await CartItem.deleteMany({ user: userId });
    }

    res.status(200).json({ status: true, message: 'Cart item removed successfully' });

  } catch (error) {
    next(error);
  }
};



//for clear all product in the cart
const clearCart = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const result = await CartItem.deleteMany({ user: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No cart items found to clear' });
    }

    res.status(200).json({ status: true, message: 'Cart cleared successfully' });

  } catch (error) {
    next(error);
  }
};



//update the quantity
const updateQuantity = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cartItem = await CartItem.findOne({ 'products._id': itemId }).populate('products.productId');
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Check product stock count
    const product = cartItem.products.find(p => p._id.toString() === itemId);
    // Check if product is available
    if (!product || !product.productId) {
      return res.status(400).json({ message: 'Product not found' });
    }
    // Check if quantity is greater than the product stock count
    if (quantity > product.productId.stockCount) {
      return res.status(400).json({ message: 'Requested quantity exceeds available stock' });
    }

    product.quantity = quantity;
    product.total = quantity * product.price;

    await cartItem.save();
    return res.status(200).json({ status: true });

  } catch (error) {
    next(error);
  }
}



//for apply coupon
const applyCoupon = async (req, res, next) => {
  try {
    const userId = req.session.user_id
    const { couponId } = req.body;

    const cartItem = await CartItem.findOneAndUpdate(
      { user: userId },
      { $set: { coupondiscount: couponId } },
      { new: true }
    );
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    return res.status(200).json({ status: true });

  } catch (error) {
    next(error);
  }
}



//for remove the coupon
const removeCoupon = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const { couponId } = req.body;

    // Find the cart item by user ID and coupon ID
    const cartItem = await CartItem.findOne({ user: userId, coupondiscount: couponId });
    if (!cartItem) {
      return res.status(404).send('Cart item not found');
    }

    // Remove the coupon discount
    cartItem.coupondiscount = null;
    await cartItem.save();

    return res.status(200).json({ status: true });

  } catch (error) {
    next(error);
  }
}



module.exports = {
  addToCart,
  loadCart,
  listProductsInCart,
  removeFromCart,
  clearCart,
  updateQuantity,
  applyCoupon,
  removeCoupon
} 