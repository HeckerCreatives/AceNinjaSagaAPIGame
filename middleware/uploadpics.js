const path = require('path');
const multer = require('multer');
const fs = require('fs');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'uploads/';

        if (file.fieldname === "imageUrl") {
            folder = 'uploads/market/';
        }

        fs.mkdirSync(folder, { recursive: true });

        cb(null, folder);
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});

var upload = multer({
    storage: storage,
    fileFilter: function (req, file, callback) {
        const allowedMimeTypes = [
            "image/png",
            "image/jpg",
            "image/jpeg",
            "video/mp4",
            "video/quicktime", // for .mov files
            "video/x-msvideo"  // for .avi files
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            console.log(`${file.mimetype} is not supported. Only image and video files are allowed.`);
            callback(new Error('Invalid file type'));
        }
    }
});

module.exports = upload;
