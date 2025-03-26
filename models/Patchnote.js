const { default: mongoose } = require("mongoose");



const PatchnoteSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        version: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['upcoming', 'live', 'archived'],
            default: 'upcoming'
        }
    },
    {
        timestamps: true
    }
)

const Patchnote = mongoose.model("Patchnote", PatchnoteSchema)
module.exports = Patchnote