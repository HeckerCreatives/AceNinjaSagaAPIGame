const mongoose = require("mongoose");

const CharacterInventorySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true
        },
        type: {
            type: String,
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

const Characterinventory = mongoose.model("Characterinventory", CharacterInventorySchema)
module.exports = Characterinventory