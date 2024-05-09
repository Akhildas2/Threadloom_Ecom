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
        console.log(" req.body", req.body)
        // Check if starting date is greater than or equal to today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(startingDate) < today) {
            return res.status(400).json({ success: false, message: 'Starting date must be greater than or equal to today' });
        }

        // Check if ending date is greater than or equal to today
        if (new Date(endingDate) < today) {
            return res.status(400).json({ success: false, message: 'Ending date must be greater than or equal to today' });
        }

        // Check if starting date is less than or equal to ending date
        if (new Date(startingDate) > new Date(endingDate)) {
            return res.status(400).json({ success: false, message: 'Starting date must be less than or equal to ending date' });
        }
        // Adjust ending date to midnight (23:59:59)
        let adjustedEndingDate = new Date(endingDate);
        adjustedEndingDate.setHours(23, 59, 59, 0);
        console.log("adjustedEndingDate",adjustedEndingDate)

        // Check if offer name already exists
        const existingOffer = await Offer.findOne({ offerName: { $regex: new RegExp(offerName, 'i') } });
        if (existingOffer) {
            return res.status(400).json({ success: false, message: 'Offer name already exists' });
        }

        // Create new offer
        const newOffer = new Offer({
            offerName,
            startingDate,
            endingDate:adjustedEndingDate,
            discount
        });

        // Save the offer
        await newOffer.save();
        console.log("newOffer",newOffer)
        return res.status(200).json({ success: true, url: '/admin/offer/listOffer' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};


//for listing offers
const listOffer = async (req, res) => {
    try {
        const offers = await Offer.find()
        res.render("listOffer", { offers })

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}

//for delete offer 
const deleteOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const result = await Offer.deleteOne({ _id: offerId })
        if (result.deletedCount === 1) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(404).json({ success: false, message: 'Offer not found.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}



//for edit offer
const editOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const { offerName, startingDate, endingDate, discount } = req.body;

        // Check if an offer with the same name already exists, excluding the current offer
        const existingOffer = await Offer.findOne({
            $and: [
                { _id: { $ne: offerId } },
                { offerName: { $regex: new RegExp('^' + offerName + '$', 'i') } }
            ]
        });

        if (existingOffer) {
            return res.status(400).json({ success: false, message: 'An offer with the same name already exists.' });
        }

        // Check if starting date is greater than or equal to today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(startingDate) < today) {
            return res.status(400).json({ success: false, message: 'Starting date must be greater than or equal to today.' });
        }

        // Check if ending date is greater than or equal to starting date
        if (new Date(endingDate) < new Date(startingDate)) {
            return res.status(400).json({ success: false, message: 'Ending date must be greater than or equal to starting date.' });
        }

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found.' });
        }

        // Update offer details
        offer.offerName = offerName;
        offer.startingDate = startingDate;
        offer.endingDate = endingDate;
        offer.discount = discount;

        // Save updated offer
        const result = await offer.save();
        return res.status(200).json({ success: true, message: 'Offer updated successfully.', data: result });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};


module.exports = {
    addOffer,
    insertOffer,
    listOffer,
    deleteOffer,
    editOffer
}