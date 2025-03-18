const Coupon = require('../models/couponModel')



const listCoupon = async (req, res, next) => {
    try {
        const page = (req.query.page || 1);
        const limit = 5;

        const couponsCount = await Coupon.find({}).countDocuments();
        const totalPages = Math.ceil(couponsCount / limit);
        const coupons = await Coupon.find({}).skip((page - 1) * limit).limit(limit);

        res.render('listCoupon', { coupons, currentPage: page, totalPages })

    } catch (error) {
        next(error);
    }
}



//for loading the add coupon page 
const addCoupon = async (req, res, next) => {
    try {
        res.render('addCoupon')

    } catch (error) {
        next(error);
    }
}



//for adding coupon
const insertCoupon = async (req, res, next) => {
    try {
        const { couponName, couponCode, discountAmount, expiryDate, criteriaAmount } = req.body;

        const existingCoupon = await Coupon.findOne({
            $or: [
                { couponName: { $regex: new RegExp(couponName, 'i') } },
                { couponCode: { $regex: new RegExp(couponCode, 'i') } },

            ]
        });

        // ending date to midnight (23:59:59)
        var dateMidnight = new Date(expiryDate);
        dateMidnight.setUTCHours(23, 59, 59);

        if (existingCoupon) {
            // If a coupon with the same couponName or couponCode already exists, return an error
            return res.status(400).json({ success: false, message: 'Coupon name or Coupon code already exists' });
        }

        const newCoupon = new Coupon({
            couponName,
            couponCode,
            discountAmount,
            expiryDate: dateMidnight,
            criteriaAmount,
        });
        // Save the new coupon to the database
        await newCoupon.save();

        return res.status(200).json({ success: true, url: '/admin/coupon/listCoupon' });

    } catch (error) {
        next(error);
    }
};



//for delete coupon 
const deleteCoupon = async (req, res, next) => {
    try {
        const { couponId } = req.params;

        const result = await Coupon.deleteOne({ _id: couponId });
        if (result.deletedCount === 1) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }

    } catch (error) {
        next(error);
    }
}



//for editing the coupon 
const editcoupon = async (req, res, next) => {
    try {
        const { couponId } = req.params;
        const { couponName, couponCode, discountAmount, expiryDate, criteriaAmount } = req.body;

        const existingCoupon = await Coupon.findOne({
            $and: [
                { $or: [{ couponName: { $regex: new RegExp('^' + couponName + '$', 'i') } }, { couponCode: { $regex: new RegExp('^' + couponCode + '$', 'i') } }] },
                { _id: { $ne: couponId } }
            ]
        });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: 'coupon with the same name or same coupon code already exists ' });
        }

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        // ending date to midnight (23:59:59)
        var dateMidnight = new Date(expiryDate);
        dateMidnight.setUTCHours(23, 59, 59);

        coupon.couponName = couponName;
        coupon.couponCode = couponCode;
        coupon.discountAmount = discountAmount;
        coupon.expiryDate = dateMidnight;
        coupon.criteriaAmount = criteriaAmount;
        await coupon.save();

        return res.status(200).json({ success: true });

    } catch (error) {
        next(error);
    }
}



module.exports = {
    listCoupon,
    addCoupon,
    insertCoupon,
    deleteCoupon,
    editcoupon
}