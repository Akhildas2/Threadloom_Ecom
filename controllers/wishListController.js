const WishList = require('../models/wishListModel')



//for the whishlist
const loadWishlist = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const wishlist = await WishList.find({ user: userId }).populate('productId');
    res.render('wishList', { req, wishlist })

  } catch (error) {
    next(error);
  }
}



//for add to wish  list 
const addToWishList = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const { productId } = req.params;
    if (!userId) {
      return res.status(401).json({ message: 'You must be logged in to add items to your cart.' });
    }

    const existingItem = await WishList.findOne({ user: userId, productId: productId })
    if (existingItem) {
      return res.status(400).json({ message: 'Item already in wishlist' });
    }

    const wishListItem = new WishList({
      user: userId,
      productId: productId
    })
    await wishListItem.save()

    return res.status(201).json({ status: true, message: "Item added to wishlist successfully" });

  } catch (error) {
    next(error);
  }
}



//for delete from wish list
const RemoveFromWishList = async (req, res, next) => {
  try {
    const userId = req.session.user_id
    const { productId } = req.params
    const whishlist = await WishList.deleteOne({ user: userId, productId: productId })
    if (whishlist.deletedCount === 0) {
      return res.status(404).json({ message: 'whishlist item not found or not removed' });
    }

    res.status(200).json({ status: true, message: 'whishlist item removed successfully' });

  } catch (error) {
    next(error);
  }
}



//fro clear all wishlist
const clearWishList = async (req, res, next) => {
  try {
    const userId = req.session.user_id;
    const result = await WishList.deleteMany({ user: userId })
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No cart items found to clear' });
    }

    res.status(200).json({ status: true, message: 'Cart cleared successfully' });

  } catch (error) {
    next(error);
  }
}




module.exports = {
  loadWishlist,
  addToWishList,
  RemoveFromWishList,
  clearWishList
}