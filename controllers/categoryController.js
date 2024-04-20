const Category = require('../models/categoryModel');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');


// Load Category
const loadAddCategory = async (req, res) => {
    try {

        res.render('addcategory');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};





// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/category/original');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });





// To Add Category
const addCategory = async (req, res) => {
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
            categoryPhoto:  resizedImageFileName,
        });

        const addedCategory = await category.save();
        console.log("Category added successfully");
        res.status(200).json({
            status: true,
            url: '/admin/category/listcategories'
        });
      
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Error adding category" });
    }
};





// Load List Category
const loadListCategory = async (req, res) => {
    try {
        const categories = await Category.find({});
        
        res.render('listCategories', { categories });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};





// Load Edit Category
const loadEditCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const category = await Category.findById(categoryId);
        
        if (!category) {
            return res.status(404).render('error', { message: 'Category not found' });
        }
        res.render('editCategories', { category });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};







//for Editing Category
const editCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const updateFields = {};

        if (req.body.categoryName) {
          
            const trimmedCategoryName = req.body.categoryName.trim();
            updateFields.categoryName = trimmedCategoryName;

            // Check if a category with the same name already exists
            const existingCategory = await Category.findOne({
                categoryName: { $regex: new RegExp('^' + trimmedCategoryName + '$', 'i') },
                _id: { $ne: categoryId } 
            });

            if (existingCategory) {
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
        }

        // Update the category
        const category = await Category.findByIdAndUpdate(categoryId, updateFields, { new: true });

        if (!category) {
            return res.status(404).render('error', { message: 'Category not found' });
        }

        console.log("Category edited successfully");
        res.status(200).json({
            status: true,
            url: '/admin/category/listcategories'
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};






// for updating unlist the category
const unlistCategory  = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        //for update 
        const category = await Category.findByIdAndUpdate(categoryId, { isUnlisted: true }, { new: true });

        if (!category) {
            return res.status(404).render('error', { message: 'Category not found' });
        }

        console.log("Unlisted successful");
        res.status(200).json({
            status: true,
            url: '/admin/category/listCategories'
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json('Internal Server Error');
    }
};






// for  listing the category
const listCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        // Find the category by ID and update 
        const category = await Category.findByIdAndUpdate(categoryId, { isUnlisted: false }, { new: true });

        if (!category) {
            return res.status(404).render('error', { message: 'Category not found' });
        }

        console.log("Listed successful");
        res.status(200).json({
            status: true,
            url: '/admin/category/listcategories'
        });
       
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};






module.exports = {
    loadAddCategory,
    addCategory,
    upload,
    loadListCategory,
    loadEditCategory,
    editCategory,
    unlistCategory ,
    listCategory ,
};
