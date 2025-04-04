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
        // Preserve the original file name and add a unique suffix (timestamp + random number) to avoid conflict
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); 
        const newFilename = file.originalname.split('.').slice(0, -1).join('.') + '-' + uniqueSuffix + path.extname(file.originalname);
        cb(null, newFilename);  // Generate a unique filename based on the original name
    }
});



const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'), false);
        }
    }
});



module.exports = upload;