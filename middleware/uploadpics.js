const path = require('path');
const multer = require('multer');
const fs = require('fs');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'uploads/';

        if (file.fieldname === "imageUrl") {
            folder = 'uploads/market/';
        } else if (file.fieldname === "addressableFile") {
            // For addressable files, use the platform folder from request body
            const platform = req.body.platform || 'Android'; // default to Android
            const obj = JSON.parse(JSON.stringify(req.body));

            folder = `addressables/${platform}/`;
        }

        fs.mkdirSync(folder, { recursive: true });

        cb(null, folder);
    },
    filename: function (req, file, cb) {
        if (file.fieldname === "addressableFile") {
            // Keep original filename for addressable files to allow overwriting
            cb(null, file.originalname);
        } else {
            let ext = path.extname(file.originalname);
            cb(null, Date.now() + ext);
        }
    }
});

var upload = multer({
    storage: storage,
    fileFilter: function (req, file, callback) {
        let allowedMimeTypes = [];
        let allowedExtensions = [];

        if (file.fieldname === "imageUrl") {
            allowedMimeTypes = [
                "image/png",
                "image/jpg",
                "image/jpeg",
                "video/mp4",
                "video/quicktime", // for .mov files
                "video/x-msvideo"  // for .avi files
            ];
        } else if (file.fieldname === "addressableFile") {
            // For addressable files, check by extension since MIME types vary
            allowedExtensions = [
                '.bundle',
                '.hash',
                '.json',
                '.manifest',
                '.catalog',
                '.dat',
                '.unity3d',
                '.assetbundle',
                '.bytes',
                '.txt',
                // for testing purposes only
                "image/png",
                "image/jpg",
                "image/jpeg",
                "video/mp4",
                "video/quicktime", // for .mov files
                "video/x-msvideo"  // for .avi files
            ];
            
            const fileExt = path.extname(file.originalname).toLowerCase();
            if (allowedExtensions.includes(fileExt)) {
                callback(null, true);
                return;
            } else {
                console.log(`${fileExt} is not supported for addressable files. Allowed extensions: ${allowedExtensions.join(', ')}`);
                callback(new Error('Invalid addressable file type'));
                return;
            }
        }
        
        if (allowedMimeTypes.length > 0 && allowedMimeTypes.includes(file.mimetype)) {
            callback(null, true);
        } else if (allowedMimeTypes.length > 0) {
            console.log(`${file.mimetype} is not supported. Only image and video files are allowed.`);
            callback(new Error('Invalid file type'));
        }
    }
});

module.exports = upload;
