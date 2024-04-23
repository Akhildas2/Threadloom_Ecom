const Coupon = require('../models/couponModel')

const addCoupon= async (req,res)=>{
    try {
        res.render('addCoupon')
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error'); 
    }
}

const insertCoupon = async (req, res) => {
    try {
        const { couponName, couponCode, discount, expiryDate, criteriaAmount } = req.body;
        console.log("req",req.body)
        const newCoupon = new Coupon({
            couponName,
            couponCode,
            discount,
            expiryDate,
            criteriaAmount,
        });

        // Save the new coupon to the database
       const a= await newCoupon.save();
       console.log("a",a)

        // Send a response back to the client
        res.status(200).send('Coupon added successfully!');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};







module.exports={
    addCoupon,
    insertCoupon
}