const Banner = require('../models/bannerModel');
const fs = require("fs");
const path = require("path");



//For load list banner page
const loadBanner = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

       let query = {};
        const bannerStatus   = req.query.bannerStatus || "";
        const search = req.query.search ? req.query.search.trim() : "";
        
        if (["active", "inactive", "archived"].includes(bannerStatus)) {
            query.status = bannerStatus;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { bannerType: { $regex: search, $options: "i" } },
            ];
        }

        const [banners, totalCount] = await Promise.all([
            Banner.find(query).skip(skip).limit(limit),
            Banner.countDocuments(query), 
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.render("listBanner", { banners, currentPage: page, totalPages, totalCount, selectedLimit: limit, search, bannerStatus  });
    } catch (error) {
        next(error);
    }
};


// For load Add banner Ppage
const loadAddBanner = async (req, res, next) => {
    try {
        res.render("addBanner");

    } catch (error) {
        next(error);
    }
};



// Get banner by id 
const loadUpdateBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: "Invalid or missing Banner ID." });
        }

        const banner = await Banner.findById(id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found." });
        }

        res.status(200).json({ success: true, banner });

    } catch (error) {
        next(error);
    }
};



//For add new banner
const addBanner = async (req, res, next) => {
    try {
        const { title, description, bannerType, status, link } = req.body;

        if (!req.file) return res.status(400).json({ message: "Image is required." });

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
            return res.status(400).json({ message: "File size must be less than 10MB." });
        }

        if (!title || !bannerType) {
            return res.status(400).json({ message: "Title and Banner Type are required." });
        }

        const existingBanner = await Banner.findOne({ title });
        if (existingBanner) {
            return res.status(400).json({ success: false, message: "Title already exists." });
        }

        const newBanner = new Banner({
            title,
            description,
            bannerImage: req.file.filename,
            bannerType,
            status: status || "inactive",
            link
        });
        await newBanner.save();

        return res.status(200).json({
            status: true,
            url: '/admin/banner/listBanner'
        });

    } catch (error) {
        next(error);
    }
};



//For update banner 
const updateBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, bannerType, status, link } = req.body;

        // Find the existing banner
        const existingBanner = await Banner.findById(id);
        if (!existingBanner) {
            return res.status(404).json({ success: false, message: "Banner not found." });
        }

        // If a new image is uploaded, delete the old image
        if (req.file) {
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (req.file.size > maxSize) {
                return res.status(400).json({ message: "File size must be less than 10MB." });
            }

            const oldImagePath = path.join(__dirname, "../uploads/banner", existingBanner.bannerImage);
            if (fs.existsSync(oldImagePath)) {
                await fs.unlinkSync(oldImagePath);
            }
        }

        const updatedBanner = await Banner.findByIdAndUpdate(
            id,
            {
                title,
                description,
                bannerImage: req.file?.filename || existingBanner.bannerImage,
                bannerType,
                status,
                link
            },
            { new: true, runValidators: true }
        );


        res.status(200).json({ success: true, message: "Banner updated successfully", banner: updatedBanner });

    } catch (error) {
        next(error);
    }
};



// For delete banner
const deleteBanner = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Find the existing banner
        const existingBanner = await Banner.findById(id);
        if (!existingBanner) {
            return res.status(404).json({ success: false, message: "Banner not found." });
        }
        // Delete the banner image if it exists
        if (existingBanner.bannerImage) {
            const oldImagePath = path.join(__dirname, "../uploads/banner", existingBanner.bannerImage);
            if (fs.existsSync(oldImagePath)) {
                await fs.promises.unlink(oldImagePath);
            }
        }

        // Delete the banner document from the database
        await Banner.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "Banner deleted successfully." });

    } catch (error) {
        next(error);
    }
};




module.exports = {
    loadBanner,
    loadAddBanner,
    addBanner,
    loadUpdateBanner,
    updateBanner,
    deleteBanner,
};
