const mongoose = require("mongoose");



const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ""
    },
    bannerImage: {
        type: String,
        required: true
    },
    bannerType: {
        type: String,
        required: true,
        enum: ["homepage", "category", "offer", "shop", "ads", "promotion"],
        default: "homepage"
    },
    status: {
        type: String,
        enum: ["active", "inactive", "archived"],
        default: "active"
    }
}, { timestamps: true });



// Indexing for faster queries
bannerSchema.index({ status: 1, bannerType: 1 });
const Banner = mongoose.model("Banner", bannerSchema);
module.exports = Banner;