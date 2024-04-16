const WishList = require('../models/wishListModel')



//for the whishlist
const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    console.log("userId", userId);
    const wishlist = await WishList.find({ user: userId }).populate('productId');
    console.log("wishlist", wishlist);

    res.render('wishList', { req, wishlist })
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}


const addToWishList = async (req, res) => {
  console.log("entered");

  const userId = req.session.user_id;
  console.log("userId", userId);
  const { productId } = req.params;
  console.log("productId", productId);

  if (!userId) {
    return res.status(401).json({ message: 'You must be logged in to add items to your cart.' });
  }
  try {

    const existingItem = await WishList.findOne({ user: userId, item: productId })
    if (existingItem) {
      return res.status(400).json({ message: 'Item already in wishlist' });
    }
    const wishListItem = new WishList({
      user: userId,
      item: productId
    })
    await wishListItem.save()
    return res.status(201).json({ status: true, message: "Item added to wishlist successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}







module.exports = {
  loadWishlist,
  addToWishList
}