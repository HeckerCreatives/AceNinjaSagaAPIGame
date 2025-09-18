const { default: mongoose } = require("mongoose");
const PatchNotesFileManager = require("../models/Patch-Notes-File-Manager");
const fs = require('fs').promises;
const path = require('path');
const { checkmaintenance } = require("../utils/maintenance");
const { addanalytics } = require("../utils/analyticstools");
const socket = require("../socket/config");

// Get folder structure (like GitHub file explorer)
exports.getFolderStructure = async (req, res) => {
    const { platform, folderPath } = req.query;

    // Validate platform
    const validPlatforms = ['Android', 'iOS', 'StandaloneWindows64'];
    if (platform && !validPlatforms.includes(platform)) {
        return res.status(400).json({
            message: "failed",
            data: "Invalid platform. Must be one of: Android, iOS, StandaloneWindows64"
        });
    }

    const maintenance = await checkmaintenance("patchnotes");
    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "Patch notes system is currently under maintenance. Please try again later."
        });
    }

    try {
        let query = {};
        
        if (platform) {
            query.platform = platform;
        }
        
        if (folderPath) {
            // If folderPath is provided, filter by that specific folder
            query.folder = new RegExp(`^${folderPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
        }

        const files = await PatchNotesFileManager.find(query)
            .select('filename originalname path platform folder filesize extension version description createdAt updatedAt')
            .sort({ platform: 1, folder: 1, filename: 1 });

        // Group files by platform and folder for tree structure
        const structure = {};
        
        files.forEach(file => {
            if (!structure[file.platform]) {
                structure[file.platform] = {};
            }
            
            const folderParts = file.folder.split('/').filter(part => part);
            let current = structure[file.platform];
            
            // Build nested folder structure
            folderParts.forEach(folderName => {
                if (!current[folderName]) {
                    current[folderName] = { _files: [], _folders: {} };
                }
                current = current[folderName]._folders || current[folderName];
            });
            
            // Add file to the appropriate folder
            if (!current._files) {
                current._files = [];
            }
            
            current._files.push({
                id: file._id,
                filename: file.filename,
                originalname: file.originalname,
                path: file.path,
                filesize: file.filesize,
                extension: file.extension,
                version: file.version,
                description: file.description,
                createdAt: file.createdAt,
                updatedAt: file.updatedAt
            });
        });

        return res.status(200).json({
            message: "success",
            data: {
                structure,
                totalFiles: files.length,
                platforms: validPlatforms
            }
        });

    } catch (error) {
        console.error('Error getting folder structure:', error);
        return res.status(500).json({
            message: "failed",
            data: "Failed to get folder structure"
        });
    }
};


exports.uploadFiles = async (req, res) => {
    const { platform, version, description, socketId } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({
            message: "failed",
            data: "No files provided for upload"
        });
    }

    if (!platform || !['Android', 'iOS', 'StandaloneWindows64'].includes(platform)) {
        return res.status(400).json({
            message: "failed",
            data: "Valid platform is required (Android, iOS, or StandaloneWindows64)"
        });
    }

    const maintenance = await checkmaintenance("patchnotes");
    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "Patch notes system is currently under maintenance. Please try again later."
        });
    }

    const session = await mongoose.startSession();
    // Try to obtain server io if this process is running the Socket.IO server
    const io = req.app && req.app.get && req.app.get('io');

    // Helper to emit status updates. For the Game API we want to emit to the
    // Web API socket server so it can forward to frontend rooms. If this process
    // happens to also host the server (io present) we still emit directly.
    const emitStatus = (payload) => {
        if (!payload || !payload.socketId) return;
        try {
            if (io) {
                io.to(payload.socketId).emit('fileUploadStatus', {
                    file: payload.file,
                    status: payload.status,
                    progress: payload.progress
                });
                return;
            }

            // Use the socket client to send events to the Web API server
            if (socket && typeof socket.emit === 'function') {
                socket.emit('game:patchstatus', {
                    socketId: payload.socketId,
                    file: payload.file,
                    status: payload.status,
                    progress: payload.progress
                });
            }
        } catch (err) {
            console.warn('emitStatus error', err && err.message ? err.message : err);
        }
    };
    try {
        await session.startTransaction();

        const uploadResults = [];
        const errors = [];

        // Emit processing started status for each file (either directly to frontend room,
        // or as a game client event to the web API which will forward it)
        if (socketId) {
            for (const file of files) {
                emitStatus({ socketId, file: file.originalname, status: 'pending' });
            }
        }

        for (const file of files) {
            try {
                const fileExtension = path.extname(file.originalname).toLowerCase();
                const relativePath = file.path.replace(process.cwd(), '').replace(/\\/g, '/');
                const folderPath = path.dirname(relativePath).replace(/\\/g, '/');

                // Check if file already exists and remove old record
                const existingFile = await PatchNotesFileManager.findOne({
                    filename: file.originalname,
                    platform: platform
                }).session(session);

                if (existingFile) {
                    // Remove old file from filesystem if it exists and is different path
                    if (existingFile.path !== file.path) {
                        try {
                            await fs.unlink(existingFile.path);
                        } catch (unlinkError) {
                            console.log(`Warning: Could not delete old file ${existingFile.path}:`, unlinkError.message);
                        }
                    }
                    
                    // Remove old database record
                    await PatchNotesFileManager.deleteOne({ _id: existingFile._id }).session(session);
                }

                // Create new file record
                const newFileRecord = new PatchNotesFileManager({
                    filename: file.originalname,
                    originalname: file.originalname,
                    path: file.path,
                    platform: platform,
                    folder: folderPath,
                    filesize: file.size,
                    mimetype: file.mimetype,
                    extension: fileExtension,
                    version: version || '1.0.0',
                    description: description || '',
                    uploadedBy: req.user?.id || null
                });

                await newFileRecord.save({ session });

                // Emit completed status for this file
                if (socketId) {
                    emitStatus({ socketId, file: file.originalname, status: 'completed' });
                }

                // Log analytics
                if (req.user?.id) {
                    await addanalytics(
                        req.user.id.toString(),
                        newFileRecord._id.toString(),
                        "upload",
                        "patchnotes",
                        "file",
                        `Uploaded ${file.originalname} for ${platform}`,
                        file.size
                    );
                }

                uploadResults.push({
                    id: newFileRecord._id,
                    filename: file.originalname,
                    platform: platform,
                    path: relativePath,
                    filesize: file.size,
                    overwritten: !!existingFile
                });

            } catch (fileError) {
                console.error(`Error processing file ${file.originalname}:`, fileError);
                
                // Emit error status for this file
                if (socketId) {
                    emitStatus({ socketId, file: file.originalname, status: 'error' });
                }

                errors.push({
                    filename: file.originalname,
                    error: fileError.message
                });
            }
        }

        if (errors.length > 0 && uploadResults.length === 0) {
            // All files failed
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "All file uploads failed",
                errors: errors
            });
        }

        await session.commitTransaction();

        // After successful local commit, optionally forward files to Game API
        const gameApiUrl = process.env.GAME_API_URL;
        const patchnotesApiKey = process.env.PATCHNOTES_API_KEY;
        let gameResponseSummary = null;

        if (gameApiUrl && patchnotesApiKey && files && files.length > 0) {
            try {
                // Build form with files and metadata
                const forwardForm = new FormData();
                if (platform) forwardForm.append('platform', platform);
                if (version) forwardForm.append('version', version);
                if (description) forwardForm.append('description', description);
                if (socketId) forwardForm.append('socketId', socketId);

                for (const file of files) {
                    // Attach the actual file on disk
                    if (file && file.path) {
                        forwardForm.append('addressableFile', fs.createReadStream(file.path), { filename: file.originalname });
                    } else if (file && file.buffer) {
                        forwardForm.append('addressableFile', file.buffer, { filename: file.originalname, contentType: file.mimetype });
                    }
                }

                // Wrap form.getLength in a Promise
                const length = await new Promise((resolve, reject) => {
                    forwardForm.getLength((err, len) => {
                        if (err) return reject(err);
                        resolve(len);
                    });
                });

                const pass = new stream.PassThrough();
                let sent = 0;

                pass.on('data', (chunk) => {
                    sent += chunk.length;
                    if (socketId) {
                        const percent = Math.round((sent / length) * 100);
                        for (const file of files) {
                            emitStatus({ socketId, file: file.originalname, status: 'uploading', progress: percent });
                        }
                    }
                });

                forwardForm.pipe(pass);

                const headers = {
                    ...forwardForm.getHeaders(),
                    'content-length': length,
                    'x-api-key': patchnotesApiKey
                };

                const resp = await axios.post(`${gameApiUrl}/patchnotes/upload`, pass, {
                    headers,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 0
                });

                // Emit completed for each file based on game API response
                if (socketId && resp.status >= 200 && resp.status < 300) {
                    for (const file of files) {
                        emitStatus({ socketId, file: file.originalname, status: 'completed' });
                    }
                }

                gameResponseSummary = { status: resp.status, data: resp.data };
            } catch (forwardErr) {
                console.error('Error forwarding uploads to Game API:', forwardErr.message || forwardErr);
                if (socketId) {
                    for (const file of files) {
                        emitStatus({ socketId, file: file.originalname, status: 'error' });
                    }
                }
                // Keep local success but include forwarding error info
                gameResponseSummary = { error: forwardErr.message || String(forwardErr) };
            }
        }

        return res.status(200).json({
            message: "success",
            data: {
                uploaded: uploadResults,
                errors: errors,
                totalUploaded: uploadResults.length,
                totalErrors: errors.length,
                gameForward: gameResponseSummary
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error uploading files:', error);
        return res.status(500).json({
            message: "failed",
            data: "Failed to upload files"
        });
    } finally {
        session.endSession();
    }
};
// Delete file
exports.deleteFile = async (req, res) => {
    const { fileId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({
            message: "failed",
            data: "Invalid file ID"
        });
    }

    const maintenance = await checkmaintenance("patchnotes");
    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "Patch notes system is currently under maintenance. Please try again later."
        });
    }

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const file = await PatchNotesFileManager.findById(fileId).session(session);
        if (!file) {
            await session.abortTransaction();
            return res.status(404).json({
                message: "failed",
                data: "File not found"
            });
        }

        // Delete file from filesystem
        try {
            await fs.unlink(file.path);
        } catch (unlinkError) {
            console.log(`Warning: Could not delete file from filesystem ${file.path}:`, unlinkError.message);
        }

        // Delete file record from database
        await PatchNotesFileManager.deleteOne({ _id: fileId }).session(session);

        // Log analytics
        if (req.user?.id) {
            await addanalytics(
                req.user.id.toString(),
                fileId.toString(),
                "delete",
                "patchnotes",
                "file",
                `Deleted ${file.filename} from ${file.platform}`,
                file.filesize
            );
        }

        await session.commitTransaction();
        
        return res.status(200).json({
            message: "success",
            data: {
                deletedFile: {
                    id: file._id,
                    filename: file.filename,
                    platform: file.platform,
                    path: file.path
                }
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error deleting file:', error);
        return res.status(500).json({
            message: "failed",
            data: "Failed to delete file"
        });
    } finally {
        session.endSession();
    }
};

// Get file details
exports.getFileDetails = async (req, res) => {
    const { fileId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({
            message: "failed",
            data: "Invalid file ID"
        });
    }

    try {
        const file = await PatchNotesFileManager.findById(fileId)
            .populate('uploadedBy', 'username email')
            .select('-__v');

        if (!file) {
            return res.status(404).json({
                message: "failed",
                data: "File not found"
            });
        }

        return res.status(200).json({
            message: "success",
            data: file
        });

    } catch (error) {
        console.error('Error getting file details:', error);
        return res.status(500).json({
            message: "failed",
            data: "Failed to get file details"
        });
    }
};

// Update file metadata (version, description)
exports.updateFileMetadata = async (req, res) => {
    const { fileId, version, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({
            message: "failed",
            data: "Invalid file ID"
        });
    }

    try {
        const updateData = {};
        if (version) updateData.version = version;
        if (description !== undefined) updateData.description = description;

        const file = await PatchNotesFileManager.findByIdAndUpdate(
            fileId, 
            updateData, 
            { new: true }
        ).select('-__v');

        if (!file) {
            return res.status(404).json({
                message: "failed",
                data: "File not found"
            });
        }

        return res.status(200).json({
            message: "success",
            data: file
        });

    } catch (error) {
        console.error('Error updating file metadata:', error);
        return res.status(500).json({
            message: "failed",
            data: "Failed to update file metadata"
        });
    }
};

// Return immediate child folders and files as arrays for a given folder (easier for frontend)
exports.listFolder = async (req, res) => {
    const { platform, folderPath = '' } = req.query;

    const validPlatforms = ['Android', 'iOS', 'StandaloneWindows64'];
    if (!platform || !validPlatforms.includes(platform)) {
        return res.status(400).json({ message: 'failed', data: 'Invalid or missing platform' });
    }

    try {
        // Normalize folderPath: remove leading/trailing slashes
        const normalized = folderPath.replace(/^\/+|\/+$/g, '');

    // Build the base folder as stored in DB: '/addressables/<platform>/<normalized>' (no trailing slash)
    const baseFolderPosix = '/' + path.posix.join('addressables', platform, normalized).replace(/\\/g, '/');
    // Also support the variant without a leading slash (some older records may not have it)
    const baseFolderNoSlash = baseFolderPosix.replace(/^\//, '');

        // Escape helper for regex
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

        // Query DB for any files whose folder is the base folder or a descendant (so we can derive child folders)
    // Match folders that start with the base, with or without a leading slash
    const folderPrefixRegex = new RegExp(`^/?${escapeRegex(baseFolderNoSlash)}(?:/.*)?$`);

        const allDbFiles = await PatchNotesFileManager.find({ platform, folder: folderPrefixRegex })
            .select('filename originalname path folder filesize extension version createdAt updatedAt')
            .sort({ folder: 1, filename: 1 });
        // Also scan the filesystem under addressables/<platform>/<normalized> to include files that were manually copied
        const fsFiles = [];
        try {
            const baseDir = path.join(process.cwd(), 'addressables', platform, normalized);
            const dirents = await fs.readdir(baseDir, { withFileTypes: true });
            for (const d of dirents) {
                if (d.isFile()) {
                    const fullPath = path.join(baseDir, d.name);
                    try {
                        const stat = await fs.stat(fullPath);
                        fsFiles.push({ 
                            filename: d.name, 
                            path: fullPath,
                            size: stat.size,
                            createdAt: stat.birthtime,
                            updatedAt: stat.mtime
                        });
                    } catch (sErr) {
                        fsFiles.push({ filename: d.name, path: fullPath, size: null, createdAt: null, updatedAt: null });
                    }
                }
            }
        } catch (fsErr) {
            // ignore missing folder or permission errors; just no fs files
        }

        // Derive folders by inspecting folder paths of DB files under this base folder
        const foldersSet = new Set();

        // Direct DB files are those whose folder exactly equals baseFolderPosix or the no-slash variant
        const directDbFiles = allDbFiles.filter(f => f.folder === baseFolderPosix || f.folder === baseFolderNoSlash);

        // Any DB files whose folder starts with baseFolder (with or without leading slash) are descendants; use them to derive immediate child folders
        allDbFiles.forEach(f => {
            if (!f.folder) return;
            if (f.folder.startsWith(baseFolderPosix + '/')) {
                const remaining = f.folder.slice((baseFolderPosix + '/').length);
                const parts = remaining.split('/').filter(Boolean);
                if (parts.length >= 1) foldersSet.add(parts[0]);
            } else if (f.folder.startsWith(baseFolderNoSlash + '/')) {
                const remaining = f.folder.slice((baseFolderNoSlash + '/').length);
                const parts = remaining.split('/').filter(Boolean);
                if (parts.length >= 1) foldersSet.add(parts[0]);
            }
        });

        const folders = Array.from(foldersSet).sort();

        const toMB = (bytes) => (typeof bytes === 'number' ? +(bytes / (1024 * 1024)).toFixed(2) : null);
        const pretty = (bytes) => {
            if (typeof bytes !== 'number') return null;
            const mb = bytes / (1024 * 1024);
            if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
            return mb.toFixed(2) + ' MB';
        };

        const fileList = directDbFiles.map(f => ({
            id: f._id,
            filename: f.filename,
            originalname: f.originalname,
            path: f.path,
            folder: f.folder,
            filesize: f.filesize,
            filesizeMB: toMB(f.filesize),
            filesizeReadable: pretty(f.filesize),
            extension: f.extension,
            version: f.version,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
            source: 'db'
        }));

        // Merge in filesystem-only files (avoid duplicates)
        const existingFilenames = new Set(fileList.map(x => x.filename));
        for (const ff of fsFiles) {
            if (!existingFilenames.has(ff.filename)) {
                fileList.push({
                    id: null,
                    filename: ff.filename,
                    originalname: ff.filename,
                    path: ff.path,
                    folder: normalized || '',
                    filesize: ff.size,
                    filesizeMB: toMB(ff.size),
                    filesizeReadable: pretty(ff.size),
                    extension: path.extname(ff.filename).toLowerCase(),
                    version: null,
                    createdAt: ff.createdAt,
                    updatedAt: ff.updatedAt,
                    source: 'fs'
                });
            }
        }

        return res.status(200).json({ message: 'success', data: { folders, files: fileList } });

    } catch (err) {
        console.error('Error listing folder:', err);
        return res.status(500).json({ message: 'failed', data: 'Failed to list folder' });
    }
};