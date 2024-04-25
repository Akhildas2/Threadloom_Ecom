const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    offerName: {
        type: String,
        required: true
    },
    startingDate: {
        type: Date,
        required: true,
    },
    endingDate: {
        type: Date,
        required: true,
    },
    discount: {
        type: Number,
        required: true,
    },
   
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
