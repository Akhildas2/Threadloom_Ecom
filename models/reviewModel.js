const mongoose = require("mongoose");



const reviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orders: [
        {
            orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
            rating: { type: Number, min: 1, max: 5 }
        }
    ],
    avgRating: { type: Number, default: 0 },
    comment: { type: String },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now }
});



// Function to calculate the average rating
reviewSchema.pre("save", function (next) {
    if (this.orders.length > 0) {
        const totalRating = this.orders.reduce((sum, order) => sum + order.rating, 0);
        this.avgRating = (totalRating / this.orders.length).toFixed(1);
    } else {
        this.avgRating = 0;
    }
    next();
});




module.exports = mongoose.model("Review", reviewSchema);
