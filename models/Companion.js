const { default: mongoose } = require("mongoose");


const CompanionSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true
        },
        name: {
            type: String
        },
        isEquipped: {
            type: Boolean,
            default: false
        },
        activedescription: {
            type: String
        },
        passiveDescription: {
            type: String
        },
        passiveeffects: {
            type: Map, 
            of: Number 
        },
        activeeffects: {
            type: Map, 
            of: Number 
        },
        imageUrl: {
            type: String
        },
        locked: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
)

const Companion = mongoose.model("Companion", CompanionSchema);
module.exports = Companion;