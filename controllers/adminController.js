const User = require("../models/userModel")
const Admin = require("../models/adminModel")

const bcrypt = require('bcrypt');

//for secure password
const securePassword = async (password) => {
    try {
        const passwordHarsh = await bcrypt.hash(password, 10)
        return passwordHarsh
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}

//for admin register
const  registerAdmin = async(req,res)=>{
    try {
        const { name, email, mobile, password } = req.body;
        const spassword = await securePassword(password);
        const admin = new Admin({
            name,
            email,
            mobile,
            password: spassword,
        });

        const adminData = await admin.save();
if(adminData){
    console.log("admin register successfull");
}
        
    } catch (error) {
        console.log(error.message);
    }
}


//for load login function
const loadLogin = async (req, res) => {
    try {
        res.render('adminLogin')
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');

    }
}

// for loading admin home
const loadAdminHome= async(req,res)=>{
try {
 
    res.render('adminhome')
    
    }
catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');

}
}

//for verify admin login
const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const adminData = await Admin.findOne({ email });
        if (adminData && await bcrypt.compare(password, adminData.password) && adminData.isAdmin) {
            req.session.admin_id = adminData._id;
            return res.status(200).json({ status: true, url: '/admin/adminhome' });
        } else {
            return res.status(400).json({ success: false, message: 'Email and Password is incorrect.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}


//for logout
const logout = async (req, res) => {
    try {
      
        delete req.session.admin_id;
        res.redirect('/admin');
  
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');

    }
}





//for loading user list
const userList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        let query = { isVerified: true }; 

     
        if (req.query.category) {
            if (req.query.category === 'active') {
                query.isBlocked = false;
            } else if (req.query.category === 'blocked') {
                query.isBlocked = true;
            }
        }
        const users = await User.find(query)
        .skip(skip)
        .limit(limit);

    const totalCount = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    res.render('userList', { users, currentPage: page, totalPages, selectedStatus: req.query.category || '' });

    } catch (error) {
        console.log(error.message);
        // Handle errors appropriately
        res.status(500).send("Internal Server Error");
    }
}




//for block user 
const blockUser = async (req, res) => {
    try {
        const userId = req.params.id;  
       
        // Find the user by ID
        const user = await User.findById(userId);
     
        // Check if the user exists
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Check if the user being blocked is the admin
        if (user.isAdmin) {
            return res.status(403).send('Cannot block admin user');
        }
       

        //destroy only the user's session
        if (req.session.user_id === userId) {
            delete req.session.user_id; 
            req.session.save(err => {
                if (err) {
                    console.error('Error saving session:', err);
                    return res.status(500).send('Internal Server Error');
                }
               
            });
        }

        // Update the user to be blocked
        user.isBlocked = true;
        await user.save();
       
        console.log('User blocked successfully');
        res.status(200).json({
            status: true,
            url: '/admin/userList'
        });
       
    } catch (error) {
        console.error('Error blocking user:', error.message);
        res.status(500).send('Internal Server Error');
    }
}


//for unblock user 
const unblockUser = async (req, res) => {
    try {
        const userId = req.params.id;
     
        await User.findByIdAndUpdate(userId, { isBlocked: false });
        console.log('User unblocked successfully');
        res.status(200).json({
            status: true,
            url: '/admin/userList'
        });


       
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
}




module.exports = {
    securePassword,
    registerAdmin,
    loadLogin,
    verifyLogin,
    loadAdminHome,
    logout,
    userList,
    blockUser,
    unblockUser,
 
}