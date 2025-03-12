const express = require('express');
const reviewRoute = express();
const reviewController = require("../controllers/reviewController");
const auth = require("../middleware/userAuth");



reviewRoute.post('/add-review', auth.isLogin, reviewController.addReview);
reviewRoute.post('/add-rating', auth.isLogin, reviewController.addRating);



module.exports = reviewRoute;