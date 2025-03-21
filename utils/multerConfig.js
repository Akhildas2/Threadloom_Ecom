const multer = require('multer');
const path = require('path');
const fs = require('fs');



// Ensure the upload directories exist
const ensureDirExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};



// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'uploads/other'; // Default folder

        if (req.baseUrl.includes('category')) {
            folder = 'uploads/category/original';
        } else if (req.baseUrl.includes('product')) {
            folder = 'uploads/product/original';
        } else if (req.baseUrl.includes('banner')) {
            folder = 'uploads/banner';
        }

        ensureDirExists(folder);
        cb(null, folder);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});



// Multer upload middleware
const upload = multer({ storage: storage });
module.exports = upload;