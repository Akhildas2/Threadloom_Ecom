const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Offer = require('../models/offerModel')
const multer = require('multer');
const fs = require('fs')
const path = require('path');
const sharp = require('sharp');

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/product/original')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});


const upload = multer({ storage: storage });




// Load Product
const loadAddProduct = async (req, res) => {
    try {
        const categories = await Category.find({ isUnlisted: false })
        res.render('addProduct', { categories });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};






//for adding the product
const addProduct = async (req, res) => {
    try {
        const { name, description, price, gender, category, stockCount, size } = req.body;
        const unique = await Product.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });

        if (unique) {
            return res.status(400).json({ success: false, message: 'Name already exists. Please use a different name.' });
        }
        const existingProduct = await Product.findOne({ category, size, gender });
        if (existingProduct) {
            return res.status(400).json({ success: false, message: 'Product with the same category, size, and gender already exists.' });
        }

        if (!req.files || req.files.length < 3) {
            return res.status(400).json({ success: false, message: 'At least 3 photos are required.' });
        }
        if (req.files.length > 6) {
            return res.status(400).json({ success: false, message: 'You can only upload up to 6 images' });
        }

        const productImages = []; // Array to store resized image filenames

        // Loop through uploaded files to resize and save images
        for (const file of req.files) {
            const resizedImagePath = `uploads/product/resized/resized_${file.filename}`;
            await sharp(file.path)
                .resize({ width: 1000, height: 1000, fit: 'fill' })
                .toFile(resizedImagePath);

            // Extract the filename from the resized image path
            const resizedImageFilename = path.basename(resizedImagePath);
            // Push the filename to the array
            productImages.push(resizedImageFilename);
        }

        // Check for duplicate filenames in productImages
        const uniqueProductImages = new Set(productImages);
        if (uniqueProductImages.size !== productImages.length) {
            return res.status(400).json({ success: false, message: 'Duplicate photos detected. Please ensure all photos are unique.' });
        }

        // Create a new product instance
        const newProduct = new Product({
            name,
            description,
            price,
            gender,
            category,
            stockCount,
            size,
            productImage: productImages // Assign the array of resized image filenames to productImage field
        });

        // Save the new product to the database
        await newProduct.save();
        console.log("Product added successfully");

        return res.status(200).json({
            status: true,
            url: '/admin/product/listproduct'
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}







//for listing the products 
const productListPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        let query = {};

        let selectedCategory = req.query.category || '';

        if (req.query.category) {
            query.category = req.query.category;
        }

        const products = await Product.find(query)
            .populate('category')
            .skip(skip)
            .limit(limit);
        const offers= await Offer.find({});
        const totalCount = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const categories = await Category.find();
        res.render('listProduct', { products, categories, currentPage: page, totalPages, selectedCategory ,offers});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};







//for load edit page
const loadEditProduct = async (req, res) => {
    try {
        const productId = req.params.productId;

        const product = await Product.findById(productId).populate('category')

        const categories = await Category.find({ isUnlisted: false })

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.render('editProduct', { product, categories });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
}






//for editing product
const editProduct = async (req, res) => {
    const productId = req.params.productId;
    const { name, description, price, gender, category, stockCount, size } = req.body;

    const updateFields = {};
    try {
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            console.error('Product not found');
            return res.status(404).json({ error: 'Product not found' });
        }



        const allowedExtensions = ['.jpg', '.jpeg', '.png'];

        for (const file of req.files) {
            const extension = path.extname(file.originalname).toLowerCase();
            if (!allowedExtensions.includes(extension)) {

                return res.status(400).json({ success: false, message: 'Invalid file type. Please upload only JPG, JPEG, or PNG files.' });
            }
        }


        if (name) updateFields.name = name;
        if (description) updateFields.description = description;
        if (price) updateFields.price = price;
        if (gender) updateFields.gender = gender;
        if (category) updateFields.category = category;
        if (stockCount) updateFields.stockCount = stockCount;
        if (size) updateFields.size = size;

        // Check if new images are uploaded
        if (req.files && req.files.length > 0) {
            const productImages = [];

            for (const file of req.files) {
                const resizedImagePath = `uploads/product/resized/resized_${file.filename}`;
                await sharp(file.path)
                    .resize({ width: 1000, height: 1000, fit: 'fill' })
                    .toFile(resizedImagePath);

                const resizedImageFilename = path.basename(resizedImagePath);
                productImages.push(resizedImageFilename);
            }


            updateFields.productImage = [...existingProduct.productImage, ...productImages];

        } else {

            updateFields.productImage = existingProduct.productImage;
        }


        const updatedProduct = await Product.findByIdAndUpdate(productId, updateFields, { new: true });


        if (!updatedProduct) {
            console.error('Product not found');
            return res.status(404).json({ error: 'Product not found' });
        }

        console.log("Product edited successfully");
        return res.status(200).json({
            status: true,
            url: '/admin/product/listproduct'
        });

    } catch (err) {
        console.error('Error updating product:', err);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
};






//for delete 
const deletePhoto = async (req, res) => {
    const { productId, photoName } = req.params;

    try {
        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Remove the photo from the product's photo array
        const index = product.productImage.indexOf(photoName);
        if (index !== -1) {
            product.productImage.splice(index, 1);
            await product.save();

            // Delete the photo from the server storage
            fs.unlink(`uploads/product/resized/${photoName}`, (err) => {
                if (err) {
                    console.error('Error deleting photo:', err);
                    return res.status(500).json({ success: false, message: 'Failed to delete photo' });
                }
                console.log("Photo deleted successfully");
                res.json({ success: true, message: 'Photo deleted successfully' });
            });
        } else {
            return res.status(404).json({ success: false, message: 'Photo not found in product' });
        }
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};






// for updating unlist the product
const unlistProduct = async (req, res) => {
    try {
        const productId = req.params.productId;

        const product = await Product.findByIdAndUpdate(productId, { isUnlisted: true }, { new: true });

        if (!product) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        console.log("Unlisted successful");
        res.status(200).json({
            status: true,
            url: '/admin/product/listProduct'
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).json('Internal Server Error');
    }
};







// for updating listing the category
const listProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await Product.findByIdAndUpdate(productId, { isUnlisted: false }, { new: true });

        if (!productId) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        console.log("Listed successful");
        res.status(200).json({
            status: true,
            url: '/admin/product/listProduct'
        });


    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};




module.exports = {
    loadAddProduct,
    upload,
    addProduct,
    productListPage,
    loadEditProduct,
    editProduct,
    unlistProduct,
    listProduct,
    deletePhoto

};