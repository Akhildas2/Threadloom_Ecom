const express = require("express");
const bannerRoute = express();
const bannerController = require("../controllers/bannerController");
const auth = require("../middleware/adminAuth");
const upload = require("../utils/multerConfig");



bannerRoute.use(express.static('admin'));
bannerRoute.set('view engine', 'ejs');
bannerRoute.set('views', './views/admin');


bannerRoute.get('/listBanner', auth.isLogin, bannerController.loadBanner);
bannerRoute.get('/addBanner', auth.isLogin, bannerController.loadAddBanner);
bannerRoute.get('/:id', auth.isLogin, bannerController.loadUpdateBanner);
bannerRoute.post('/addBanner', auth.isLogin, upload.single("bannerImage"), bannerController.addBanner);
bannerRoute.get('/updateBanner', auth.isLogin, bannerController.loadUpdateBanner);
bannerRoute.put('/updateBanner/:id', auth.isLogin, upload.single("bannerImage"), bannerController.updateBanner);
bannerRoute.delete('/delete/:id', auth.isLogin, bannerController.deleteBanner);



module.exports = bannerRoute;