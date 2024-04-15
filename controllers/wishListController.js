//for the whishlist
const loadWishlist = async(req,res)=>{
    try {
      res.render('wishList',{req})
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }


  const addToWishList = async(req,res)=>{
    try {
      
    } catch (error) {
      
    }
  }







  module.exports={
    loadWishlist,
  }