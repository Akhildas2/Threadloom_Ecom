const mongoose = require('mongoose');


const categorySchema = new mongoose.Schema({
  categoryName: {
        type: String,
        required: true,
      },
      categoryPhoto: {
        type: String, 
        require: true
       
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      isUnlisted: {
        type:Boolean,
        default: false
      }, 
      offer: {
        type:mongoose.Schema.Types.ObjectId,
        ref:"Offer",
    }
});


const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
