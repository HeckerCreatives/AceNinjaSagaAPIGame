const mongoose = require("mongoose");

const CharacterBadgesSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true
        },
        badge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Badge",
        },
        index: {
            type: Number,
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            index: true
        },
    },
    {
        timestamps: true
    }
)

const Characterbadge = mongoose.model("Characterbadge", CharacterBadgesSchema)
module.exports = Characterbadge