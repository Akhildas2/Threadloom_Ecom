const Category = require('../models/categoryModel');
const Cart = require('../models/cartModel');
const Wishlist = require('../models/wishListModel');


async function loadCategories(req, res, next) {
    try {
        const categories = await Category.find({ isUnlisted: false }).limit(10);
        res.locals.categories = categories;

        const userId = req.session?.user_id;
        if (userId) {
            const cartItems = await Cart.findOne({ user: userId });
            let cartTotalItem = 0;
            if (cartItems && cartItems.products.length > 0) {
                cartTotalItem = cartItems.products.reduce((total, item) => total + item.quantity, 0);
            }
            res.locals.cartTotalItem = cartTotalItem;

            const wishListTotalItem = await Wishlist.countDocuments({ user: userId });
            res.locals.wishListTotalItem = wishListTotalItem;

        } else {
            res.locals.cartTotalItem = 0;
            res.locals.wishListTotalItem = 0;
        }

        next();

    } catch (error) {
        next(error);
    }
}



module.exports = loadCategories;