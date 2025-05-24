
const mongoose = require("mongoose");

const ClanwarsHistorySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true
        },
        status: {
            type: String
        },
        opponent: {
            type: String
        }
    },
    {
        timestamps: true
    }
)


const ClanwarsHistory = mongoose.model("ClanwarsHistory", ClanwarsHistorySchema)
module.exports = ClanwarsHistory