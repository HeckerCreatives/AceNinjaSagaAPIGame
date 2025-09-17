const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadpics');
const apikey = require('../middleware/apikey');
const { 
    getFolderStructure, 
    uploadFiles, 
    deleteFile, 
    getFileDetails, 
    updateFileMetadata,
    listFolder
} = require('../controllers/patchnotes');

// Middleware (you can add authentication middleware here if needed)
// const { verifytoken } = require('../middleware/middleware');

router.use(apikey);

router
 .get('/structure', getFolderStructure)
 .get('/list', listFolder)
 .post('/upload', upload.array('addressableFile', 50), uploadFiles)
 .get('/file', getFileDetails)
 .post('/fileupdate', updateFileMetadata)
 .post('/filedelete', deleteFile);

module.exports = router;