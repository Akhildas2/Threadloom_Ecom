const Offer = require('../models/offerModel')



//for add offer page loading
const addOffer = async (req, res) => {
    try {
        res.render('addOffer')
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}


// for insert offer
const insertOffer = async (req, res) => {
    try {
        const { offerName, startingDate, endingDate, discount } = req.body;
        console.log("req", req.body);

        // for checking 
        const existingOffer = await Offer.findOne({ offerName: { $regex: new RegExp(offerName, 'i') }});
        if (existingOffer) {
            return res.status(400).json({ success: false, message: 'Offer name already exists' });
        }

        if (new Date(startingDate) <= new Date() || new Date(endingDate) <= new Date()) {
            return res.status(400).json({ success: false, message: 'Dates must be greater than today' });
        }

        if (new Date(startingDate) >= new Date(endingDate)) {
            return res.status(400).json({ success: false, message: 'Starting date must be less than ending date' });
        }

        const newOffer = new Offer({
            offerName,
            startingDate,
            endingDate,
            discount
        });
        const result = await newOffer.save();
        console.log("result", result);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};






module.exports = {
    addOffer,
    insertOffer
}