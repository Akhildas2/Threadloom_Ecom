const multer = require('multer');
const path = require('path');



// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folder = req.params.type === 'category' ? 'uploads/category/original' : 'uploads/product/original';
        cb(null, folder);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});



const upload = multer({ storage: storage });



module.exports = upload;
