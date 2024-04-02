
//for admin login  middleware 
const isLogin = async (req, res, next) => {
    try {
        if (req.session.admin_id) {
            return next()
        }
        else {
            return  res.redirect('/admin');
        }

    }
    catch (error) {
        console.log(error.message);

    }
}


//for admin logout  middleware 
const isLogout = async (req, res, next) => {
    try {
      
        if (!req.session.admin_id) {
            return next();  
       
        }else {
            return res.redirect('/admin/adminhome');
        }
    }
    catch (error) {
        console.log(error.message);

    }
}





module.exports = {
    isLogout,
    isLogin
   
}