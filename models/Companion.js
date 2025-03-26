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
        rarity: {
            type: String
        },
        skill: {
            type: String
        },
        effects: {
            type: Map, 
            of: Number 
        }
    },
    {
        timestamps: true
    }
)

const Companion = mongoose.model("Companion", CompanionSchema);
module.exports = Companion;