const { default: mongoose } = require("mongoose");

// This module manages the patch notes files for the game
const PatchNotesFMSchema = new mongoose.Schema(
    {
        filename: {
            type: String,
            required: true,
            index: true
        },
        originalname: {
            type: String,
            required: true
        },
        path: {
            type: String,
            required: true,
            index: true
        },
        platform: {
            type: String,
            required: true,
            enum: ['Android', 'iOS', 'StandaloneWindows64'],
            index: true
        },
        folder: {
            type: String,
            required: true,
            index: true
        },
        filesize: {
            type: Number,
            required: true
        },
        mimetype: {
            type: String,
            required: true
        },
        extension: {
            type: String,
            required: true
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
            required: false
        },
        version: {
            type: String,
            default: '1.0.0'
        },
        description: {
            type: String,
            default: ''
        }
    }, 
    {
        timestamps: true
    }
)

// Index for efficient querying by platform and folder
PatchNotesFMSchema.index({ platform: 1, folder: 1 });
PatchNotesFMSchema.index({ filename: 1, platform: 1 }, { unique: true });

const PatchNotesFileManager = mongoose.model("PatchNotesFileManager", PatchNotesFMSchema)
module.exports = PatchNotesFileManager