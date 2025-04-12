const { default: mongoose } = require("mongoose");


const CompanionSchema = new mongoose.Schema(
    {
        name: {
            type: String
        },
        levelrequirement: {
            type: Number
        },
        price: {
            type: Number
        },
        currency: {
            type: String
        },
        activedescription: {
            type: String
        },
        passivedescription: {
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
    },
    {
        timestamps: true
    }
)

const CharacterCompanionSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true
        },
        companion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Companion",
            index: true
        },
        isEquipped: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
)


const CharacterCompanion = mongoose.model("CharacterCompanion", CharacterCompanionSchema)
const Companion = mongoose.model("Companion", CompanionSchema);
module.exports = {
    Companion,
    CharacterCompanion
};