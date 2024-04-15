const express = require('express');
const dashboardRoute = express();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/userAuth');


dashboardRoute.set('view engine', 'ejs');
dashboardRoute.set('views', './views/user');




dashboardRoute.get('/',auth.isLogin,dashboardController.loadDashboard)
dashboardRoute.put("/:userId",auth.isLogin,dashboardController.updateUser)
dashboardRoute.put("/changePassword/:userId",auth.isLogin,dashboardController.changePassword)
dashboardRoute.post("/addAddress",auth.isLogin,dashboardController.addAddress);
dashboardRoute.put("/editAddress/:addressId", auth.isLogin, dashboardController.editAddress);
dashboardRoute.delete("/deleteAddress/:addressId",auth.isLogin,dashboardController.deleteAddress);



module.exports = dashboardRoute;