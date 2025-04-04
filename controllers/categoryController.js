const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel');
const sharp = require('sharp');
const fs = require("fs");
const path = require('path');



// Load Category
const loadAddCategory = async (req, res, next) => {
    try {
        res.render('addCategory');

    } catch (error) {
        next(error);
    }
};



// To Add Category
const addCategory = async (req, res, next) => {
    try {
        const categoryName = req.body.categoryName.trim();

        const existingCategory = await Category.findOne({
            categoryName: {
                $regex: new RegExp('^' + categoryName + '$', 'i')
            }
        });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: "Category already exists" });
        }

        // Check if files are present
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image uploaded" });
        }

        // Process image using Sharp
        const resizedImagePath = `uploads/category/resized/resized_${req.file.filename}`;
        await sharp(req.file.path)
            .resize({ width: 800, height: 800, fit: 'fill' })
            .toFile(resizedImagePath);

        // Extract only the filename from the resizedImagePath
        const resizedImageFileName = path.basename(resizedImagePath);
        const category = new Category({
            categoryName,
            categoryPhoto: resizedImageFileName,
        });
        await category.save();

        res.status(200).json({
            status: true,
            url: '/admin/category/listCategories'
        });

    } catch (error) {
        next(error);
    }
};



// Load List Category
const loadListCategory = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

        let query = {};
        const categoryStatus = req.query.categoryStatus || "";
        const search = req.query.search ? req.query.search.trim() : "";

        if (categoryStatus === "list") {
            query.isUnlisted = false;
        } else if (categoryStatus === "unlist") {
            query.isUnlisted = true;
        }

        if (search) {
            query.categoryName = { $regex: search, $options: "i" };
        }

        const categories = await Category.find(query).skip(skip).limit(limit);
        const categoriesCount = await Category.countDocuments(query)
        const totalPages = Math.ceil(categoriesCount / limit)
        const offers = await Offer.find();


        res.render('listCategories', { categories, offers, currentPage: page, totalPages, categoryStatus, selectedLimit: limit, search, categoriesCount });

    } catch (error) {
        next(error);
    }
};



// Load Edit Category
const loadEditCategory = async (req, res, next) => {
    try {
        const categoryId = req.params.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).render('error', { message: 'Category not found' });
        }

        res.render('editCategories', { category });

    } catch (error) {
        next(error);
    }
};



//for Editing Category
const editCategory = async (req, res, next) => {
    try {
        const categoryId = req.params.categoryId;
        const updateFields = {};

        // Fetch the existing category 
        const existingCategory = await Category.findById(categoryId);
        if (!existingCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        if (req.body.categoryName) {
            const trimmedCategoryName = req.body.categoryName.trim();
            updateFields.categoryName = trimmedCategoryName;

            // Check if a category with the same name already exists
            const duplicateCategory = await Category.findOne({
                categoryName: { $regex: new RegExp('^' + trimmedCategoryName + '$', 'i') },
                _id: { $ne: categoryId }
            });
            if (duplicateCategory) {
                return res.status(400).json({ success: false, message: "Category already exists" });
            }
        }

        if (req.file) {
            // Process image using Sharp - Crop and Resize
            const resizedImagePath = `uploads/category/resized/resized_${req.file.filename}`;
            await sharp(req.file.path)
                .resize({ width: 800, height: 800, fit: 'fill' })
                .toFile(resizedImagePath);

            updateFields.categoryPhoto = path.basename(resizedImagePath);

            // Delete the old image if it exists
            if (existingCategory.categoryPhoto) {
                // Assume existingCategory.categoryPhoto is the name used for the resized image
                const resizedFileName = existingCategory.categoryPhoto;
                // Remove the "resized_" prefix to get the original file name.
                const originalFileName = resizedFileName.replace(/^resized_/, "");

                const oldResizedImagePath = path.join(__dirname, "../uploads/category/resized", resizedFileName);
                const oldOriginalImagePath = path.join(__dirname, "../uploads/category/original", originalFileName);

                if (fs.existsSync(oldResizedImagePath)) {
                    fs.unlinkSync(oldResizedImagePath);
                }

                if (fs.existsSync(oldOriginalImagePath)) {
                    fs.unlinkSync(oldOriginalImagePath);
                }
            }
        }

        // Update the category
        const category = await Category.findByIdAndUpdate(categoryId, updateFields, { new: true });
        if (!category) {
            return res.status(404).render('error', { message: 'Category not found' });
        }

        res.status(200).json({
            status: true,
            url: '/admin/category/listCategories'
        });

    } catch (error) {
        next(error);
    }
};



// for updating unlist the category
const unlistCategory = async (req, res, next) => {
    try {
        const categoryId = req.params.categoryId;
        //for update 
        const category = await Category.findByIdAndUpdate(categoryId, { isUnlisted: true }, { new: true });
        if (!category) {
            return res.status(404).render('error', { message: 'Category not found' });
        }

        res.status(200).json({
            status: true,
            url: '/admin/category/listCategories'
        });

    } catch (error) {
        next(error);
    }
};



// for  listing the category
const listCategory = async (req, res, next) => {
    try {
        const categoryId = req.params.categoryId;
        // Find the category by ID and update 
        const category = await Category.findByIdAndUpdate(categoryId, { isUnlisted: false }, { new: true });
        if (!category) {
            return res.status(404).render('error', { message: 'Category not found' });
        }

        res.status(200).json({
            status: true,
            url: '/admin/category/listCategories'
        });

    } catch (error) {
        next(error);
    }
};



//for add offer 
const addOffer = async (req, res, next) => {
    try {
        const categoryId = req.params.categoryId;
        const offerId = req.body.offerId;

        const category = await Category.findById(categoryId)
        // Check if the category exists
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        category.offer = offerId;
        await category.save()

        res.status(200).json({
            status: true,
            url: '/admin/category/listCategories'
        });

    } catch (error) {
        next(error);
    }
}



//for remove offer 
const removeOffer = async (req, res, next) => {
    try {
        const categoryId = req.params.categoryId;

        const category = await Category.findById(categoryId)
        // Check if the category exists
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        category.offer = undefined;
        await category.save()

        res.status(200).json({
            status: true,
            url: '/admin/category/listCategories'
        });

    } catch (error) {
        next(error);
    }
}



module.exports = {
    loadAddCategory,
    addCategory,
    loadListCategory,
    loadEditCategory,
    editCategory,
    unlistCategory,
    listCategory,
    removeOffer,
    addOffer
};
