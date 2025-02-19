const mongoose = require("mongoose");

const CharacterWalletSchema = new mongoose.Schema(
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
        amount: {
            type: Number
        }
    },
    {
        timestamps: true
    }
)

const Characterwallet = mongoose.model("Characterwallet", CharacterWalletSchema)
module.exports = Characterwallet