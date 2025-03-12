const Review = require('../models/reviewModel');



const addReview = async (req, res, next) => {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.session.user_id;
        const review = new Review({ productId, userId, rating, comment });
        await review.save();

        res.status(201).json({ message: 'Review added successfully', review });

    } catch (error) {
        next(error);
    }
}

const addRating = async (req, res, next) => {
    try {
        const { productId, rating } = req.body;
        const userId = req.session.user_id;
        const review = new Review({ productId, userId, rating, comment: '' });
        await review.save();

        res.status(201).json({ message: 'Rating added successfully', review });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    addReview,
    addRating
}