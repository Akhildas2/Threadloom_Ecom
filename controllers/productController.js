const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel');
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");



// Load Product
const loadAddProduct = async (req, res, next) => {
    try {
        const categories = await Category.find({ isUnlisted: false })
        res.render('addProduct', { categories });

    } catch (error) {
        next(error);
    }
};



//for adding the product
const addProduct = async (req, res, next) => {
    try {
        let { name, description, price, brand, gender, category, stockCount, size, fit, fabric, sleeve, pattern, color, fabricCare, origin, productStatus } = req.body;
        // Trim name and description
        name = name.trim();
        description = description.trim();

        const unique = await Product.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
        if (unique) {
            return res.status(400).json({ success: false, message: 'Name already exists. Please use a different name.' });
        }

        const existingProduct = await Product.findOne({ name, category, size, gender });
        if (existingProduct) {
            return res.status(400).json({ success: false, message: 'Product with the same name,category, size, and gender already exists.' });
        }
        if (!req.files || req.files.length < 3) {
            return res.status(400).json({ success: false, message: 'At least 3 photos are required.' });
        }
        if (req.files.length > 6) {
            return res.status(400).json({ success: false, message: 'You can only upload up to 6 images' });
        }

        const productImages = []; // Array to store resized image filenames

        // Resize images and generate filenames
        const resizePromises = req.files.map(async (file, index) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const uniqueFilename = `${Date.now()}_${index}_${Math.round(Math.random() * 1000)}${ext}`;
            const resizedImagePath = `uploads/product/resized/resized_${uniqueFilename}`;

            // Resize the image
            await sharp(file.path)
                .resize({ width: 1000, height: 1000, fit: 'fill' })
                .toFile(resizedImagePath);

            // Add resized filename to array
            const resizedImageFilename = path.basename(resizedImagePath);
            productImages.push(resizedImageFilename);
        });

        // Wait for all image processing to finish
        await Promise.all(resizePromises);

        const isHot = productStatus === 'isHot';
        const isNewArrival = productStatus === 'isNewArrival';
        const isBestSeller = productStatus === 'isBestSeller';

        // Create a new product instance
        const newProduct = new Product({
            name,
            description,
            price,
            brand,
            gender,
            category,
            stockCount,
            size,
            fit,
            fabric,
            sleeve,
            pattern,
            color,
            fabricCare,
            origin,
            isHot,
            isNewArrival,
            isBestSeller,
            productImage: productImages // Assign the array of resized image filenames to productImage field
        });
        // Save the new product to the database
        await newProduct.save();

        return res.status(200).json({
            status: true,
            url: '/admin/product/listProduct'
        });

    } catch (error) {
        next(error);
    }
}



//for listing the products 
const productListPage = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

        let query = {};
        const selectedCategory = req.query.category || '';
        const search = req.query.search ? req.query.search.trim() : "";

        if (selectedCategory) {
            query.category = selectedCategory;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } },
                { gender: { $regex: search, $options: "i" } },
                { color: { $regex: search, $options: "i" } }
            ];
        }

        const products = await Product.find(query)
            .populate('category')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const offers = await Offer.find({});
        const totalCount = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const categories = await Category.find();

        res.render('listProduct', { products, categories, currentPage: page, totalPages, selectedCategory, offers, selectedLimit: limit, search, totalCount });

    } catch (error) {
        next(error);
    }
};



//for load edit page
const loadEditProduct = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        const product = await Product.findById(productId).populate('category')
        const categories = await Category.find({ isUnlisted: false })
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.render('editProduct', { product, categories });

    } catch (error) {
        next(error);
    }
}



//for editing product
const editProduct = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        let { name, description, brand, price, gender, category, stockCount, size, fit, fabric, sleeve, pattern, color, fabricCare, origin, productStatus } = req.body;
        // Trim name and description
        name = name.trim();
        description = description.trim();

        const updateFields = {};
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Validate file extensions if new files are uploaded
        if (req.files && req.files.length > 0) {
            const allowedExtensions = ['.jpg', '.jpeg', '.png'];
            for (const file of req.files) {
                const extension = path.extname(file.originalname).toLowerCase();
                if (!allowedExtensions.includes(extension)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid file type. Please upload only JPG, JPEG, or PNG files.'
                    });
                }
            }
        }

        if (name) updateFields.name = name;
        if (description) updateFields.description = description;
        if (brand) updateFields.brand = brand;
        if (price) updateFields.price = price;
        if (gender) updateFields.gender = gender;
        if (category) updateFields.category = category;
        if (stockCount) updateFields.stockCount = stockCount;
        if (size) updateFields.size = size;
        if (fit) updateFields.fit = fit;
        if (fabric) updateFields.fabric = fabric;
        if (sleeve) updateFields.sleeve = sleeve;
        if (pattern) updateFields.pattern = pattern;
        if (color) updateFields.color = color;
        if (fabricCare) updateFields.fabricCare = fabricCare;
        if (origin) updateFields.origin = origin;
        updateFields.isHot = productStatus === 'isHot';
        updateFields.isNewArrival = productStatus === 'isNewArrival';
        updateFields.isBestSeller = productStatus === 'isBestSeller';


        // Updated image processing section
        if (req.files?.length > 0) {
            const productImages = [];

            try {
                for (const file of req.files) {
                    const ext = path.extname(file.originalname).toLowerCase();
                    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
                    const resizedImagePath = `uploads/product/resized/resized_${uniqueFilename}`;

                    // Process image with Sharp and await completion
                    await sharp(file.path)
                        .resize({ width: 1000, height: 1000, fit: 'fill' })
                        .toFile(resizedImagePath);

                    productImages.push(path.basename(resizedImagePath));
                }
            } catch (sharpError) {
                // Handle Sharp processing errors (e.g., corrupt files)
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image file. Please upload valid JPG, JPEG, or PNG images.'
                });
            }

            // Append new images to existing ones (or replace if intended)
            updateFields.productImage = [...existingProduct.productImage, ...productImages];
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updateFields },
            { new: true, runValidators: true }
        );
        if (!updatedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json({
            status: true,
            url: '/admin/product/listProduct'
        });

    } catch (error) {
        next(error);
    }
};



//for delete 
const deletePhoto = async (req, res, next) => {
    try {
        const { productId, photoName } = req.params;
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
                    return res.status(500).json({ success: false, message: 'Failed to delete photo' });
                }
                res.json({ success: true, message: 'Photo deleted successfully' });
            });

        } else {
            return res.status(404).json({ success: false, message: 'Photo not found in product' });
        }

    } catch (error) {
        next(error);
    }
};



// for updating unlist the product
const unlistProduct = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        const product = await Product.findByIdAndUpdate(productId, { isUnlisted: true }, { new: true });
        if (!product) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        res.status(200).json({
            status: true,
            url: '/admin/product/listProduct'
        });

    } catch (error) {
        next(error);
    }
};



// for updating listing the category
const listProduct = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        const product = await Product.findByIdAndUpdate(productId, { isUnlisted: false }, { new: true });
        if (!product) {
            return res.status(404).render('error', { message: 'Product not found' });
        }

        res.status(200).json({
            status: true,
            url: '/admin/product/listProduct'
        });

    } catch (error) {
        next(error);
    }
};



//for adding the offer
const addOffer = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        const offerId = req.body.offerId;
        // Find the product by productId
        const product = await Product.findById(productId);
        // Check if the product exists
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.offer = offerId;
        // Save the updated product
        await product.save();

        return res.status(200).json({
            status: true,
            url: '/admin/product/listProduct'
        });

    } catch (error) {
        next(error);
    }
}



//for offer remove
const removeOffer = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        const product = await Product.findById(productId)
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.offer = undefined;
        await product.save();

        return res.status(200).json({
            status: true,
            url: '/admin/product/listProduct'
        });

    } catch (error) {
        next(error);
    }
}



const updateImageOrder = async (req, res, next) => {
    try {
        const { productId, newOrder } = req.body;
        const imageOrderArray = newOrder.split(',');

        await Product.findByIdAndUpdate(productId, { productImage: imageOrderArray });

        res.status(200).json({ status: true });

    } catch (error) {
        next(error);
    }
}



module.exports = {
    loadAddProduct,
    addProduct,
    productListPage,
    loadEditProduct,
    editProduct,
    unlistProduct,
    listProduct,
    deletePhoto,
    addOffer,
    removeOffer,
    updateImageOrder
};