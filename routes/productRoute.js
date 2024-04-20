const express = require("express");
const productRoute = express();
const productController = require("../controllers/productController");
const auth = require("../middleware/adminAuth");
productRoute.use(express.static('admin'));
productRoute.set('view engine', 'ejs');
productRoute.set('views', './views/admin');




productRoute.get('/addproduct', auth.isLogin,  productController.loadAddProduct)
productRoute.post('/addproduct', auth.isLogin,  productController.upload.array('productImages', 8),  productController.addProduct);

productRoute.get('/listproduct', auth.isLogin,productController.productListPage);
productRoute.put('/listproduct/:productId', auth.isLogin, productController.listProduct);


productRoute.get('/editproduct/:productId',auth.isLogin,productController.loadEditProduct)
productRoute.put('/editproduct/:productId',auth.isLogin, productController.upload.array('productImages', 8), productController.editProduct);
productRoute.delete('/deletephoto/:productId/:photoName', productController.deletePhoto);

productRoute.put('/unlistproduct/:productId', auth.isLogin, productController.unlistProduct);




module.exports =productRoute;