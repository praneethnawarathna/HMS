const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '..', 'uploads', 'backup-imports');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(uploadRoot)) {
                fs.mkdirSync(uploadRoot, { recursive: true });
            }
            cb(null, uploadRoot);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.json' && ext !== '.zip') {
        return cb(new Error('Only JSON and ZIP files are allowed'), false);
    }
    cb(null, true);
};

const backupUpload = multer({
    storage,
    fileFilter
});

module.exports = backupUpload;
