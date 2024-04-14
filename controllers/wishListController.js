//for the whishlist
const loadWhislist = async(req,res)=>{
    try {
      res.render('wishList')
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }









  module.exports={
    loadWhislist,
  }