const Coupon = require('../models/couponModel')



const listCoupon = async (req, res) => {
    try {
        const coupons = await Coupon.find({})
        res.render('listCoupon', { coupons })

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}




//for loading the add coupon page 
const addCoupon = async (req, res) => {
    try {
        res.render('addCoupon')
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}



//for adding coupon
const insertCoupon = async (req, res) => {
    try {
        const { couponName, couponCode, discount, expiryDate, criteriaAmount } = req.body;

        const existingCoupon = await Coupon.findOne({
            $or: [
                { couponName: { $regex: new RegExp(couponName, 'i') } },
                { couponCode: { $regex: new RegExp(couponCode, 'i') } },

            ]
        });


        if (existingCoupon) {
            // If a coupon with the same couponName or couponCode already exists, return an error
            return res.status(400).json({ success: false, message: 'Coupon name or Coupon code already exists' });
        }

        const newCoupon = new Coupon({
            couponName,
            couponCode,
            discount,
            expiryDate,
            criteriaAmount,
        });

        // Save the new coupon to the database
        await newCoupon.save();

        return res.status(200).json({ success: true, url: '/admin/coupon/listcoupon' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};

//for delete coupon 
const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const result = await Coupon.deleteOne({ _id: couponId });
        if (result.deletedCount === 1) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}


//for editing the coupon 
const editcoupon = async (req, res) => {
    try {
        console.log("entered")
        const { couponId } = req.params;
        console.log(" req.params", req.params)
        const { couponName, couponCode, discount, expiryDate, criteriaAmount } = req.body;
        console.log(" req.body", req.body)

        const existingCoupon = await Coupon.findOne({
            $and: [
                { $or: [{ couponName: { $regex: new RegExp('^' + couponName + '$', 'i') } }, { couponCode: { $regex: new RegExp('^' + couponCode + '$', 'i') } }] },
                { _id: { $ne: couponId } }
            ]
        });


        console.log("existingCoupon", existingCoupon)
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'A coupon with the same name or same coupon code already exists ' });
        }

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        coupon.couponName = couponName;
        coupon.couponCode = couponCode;
        coupon.discount = discount;
        coupon.expiryDate = expiryDate;
        coupon.criteriaAmount = criteriaAmount;
        await coupon.save();

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}


module.exports = {
    listCoupon,
    addCoupon,
    insertCoupon,
    deleteCoupon,
    editcoupon
}