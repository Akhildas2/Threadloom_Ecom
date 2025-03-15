const express = require('express');
const reviewRoute = express();
const reviewController = require("../controllers/reviewController");
const auth = require("../middleware/userAuth");



reviewRoute.post('/add-review', auth.isLogin, reviewController.addReview);
reviewRoute.post('/add-rating', auth.isLogin, reviewController.addRating);
reviewRoute.post('/like', auth.isLogin, reviewController.likeReview);
reviewRoute.get('/get-rating/:productId/:orderId', auth.isLogin, reviewController.getRating);
reviewRoute.put('/edit-review/:reviewId', auth.isLogin, reviewController.editReview);



module.exports = reviewRoute;