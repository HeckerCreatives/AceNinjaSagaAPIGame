const mongoose = require("mongoose");

const CharacterTitleSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true
        },
        items: [
            {
                itemid: {
                    type: String,
                    index: true
                }
            }
        ]
    },
    {
        timestamps: true
    }
)

const Charactertitle = mongoose.model("Charactertitle", CharacterTitleSchema)
module.exports = Charactertitle