const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads', 'profile-pictures');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (!file || !file.mimetype) {
        return cb(new Error('Invalid upload'), false);
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
        return cb(new Error('Only JPG, PNG, or WEBP images are allowed'), false);
    }

    cb(null, true);
};

const uploadProfilePicture = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = uploadProfilePicture;
