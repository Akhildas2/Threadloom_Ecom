const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Wishlist = require('../models/wishListModel');



async function loadCategories(req, res, next) {
    try {
        // Load categories (converted to plain objects)
        const categories = await Category.find({ isUnlisted: false }).limit(10).lean();
        res.locals.categories = categories;

        const topOfferCategory = await Category.findOne({ isUnlisted: false, offer: { $ne: null } })
            .populate("offer")
            .sort({ "offer.discount": -1 })
            .lean();

        res.locals.topOfferCategory = topOfferCategory;

        const userId = req.session?.user_id;
        let NavbarCartItems = [];
        let cartTotalItem = 0;
        let moreItemsCount = 0;

        if (userId) {
            // Find the cart and populate productId in each item
            const cart = await Cart.findOne({ user: userId }).populate("products.productId").lean();
            if (cart && Array.isArray(cart.products) && cart.products.length > 0) {
                // Calculate total quantity
                cartTotalItem = cart.products.reduce((total, item) => total + item.quantity, 0);
                // Show only first 3 items in the navbar
                if (cart.products.length > 3) {
                    NavbarCartItems = cart.products.slice(0, 3);
                    moreItemsCount = cart.products.length - 3;
                } else {
                    NavbarCartItems = cart.products;
                }
            }
            res.locals.NavbarCartItems = NavbarCartItems;
            res.locals.cartTotalItem = cartTotalItem;
            res.locals.moreItemsCount = moreItemsCount;

            const wishlist = await Wishlist.find({ user: userId }).populate({
                path: "productId",
                match: { isUnlisted: false }, 
              });
              // Remove entries where productId is null (meaning the product was unlisted)
              const filteredWishlist = wishlist.filter(item => item.productId !== null);
              
              res.locals.wishListTotalItem = filteredWishlist.length;

        } else {
            res.locals.NavbarCartItems = [];
            res.locals.cartTotalItem = 0;
            res.locals.moreItemsCount = 0;
            res.locals.wishListTotalItem = 0;
        }

        next();

    } catch (error) {
        next(error);
    }
}



module.exports = loadCategories;