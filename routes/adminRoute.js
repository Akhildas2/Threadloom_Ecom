const express = require("express");
const adminRoute = express();

const adminController = require("../controllers/adminController");
const auth = require("../middleware/adminAuth");




adminRoute.set('view engine', 'ejs');
adminRoute.set('views', './views/admin');



adminRoute.post('/register',adminController.registerAdmin);

adminRoute.get('/',auth.isLogout,adminController.loadLogin);
adminRoute.post('/', auth.isLogout, adminController.verifyLogin);
adminRoute.get('/adminhome', auth.isLogin, adminController.loadAdminHome);
adminRoute.get('/logout',auth.isLogin, adminController.logout);
adminRoute.get('/userlist', auth.isLogin, adminController.userList);
adminRoute.put('/block/:id', adminController.blockUser);
adminRoute.put('/unblock/:id', adminController.unblockUser);


module.exports = adminRoute