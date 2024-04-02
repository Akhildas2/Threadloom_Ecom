const mongoose=require("mongoose")


const addressSchema = new mongoose.Schema({
    fullName: 
    { 
        type: String, 
        required: true 
    },
    mobileNumber: 
    { 
        type: String, 
        required: true 
    },
    pincode:
     { 
        type: String, 
        required: true
     },
    houseNo: 
    {
         type: String,
          required: true
         },
    area:
     { 
        type: String, 
        required: true 
    },
    city:
     { 
        type: String,
         required: true 
    },
    state: 
    { 
        type: String,
         required: true 
    },
    userId: 
    { 
        type: String,
         required: true 
    }
});
module.exports= mongoose.model('Address',addressSchema);