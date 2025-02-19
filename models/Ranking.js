const mongoose = require("mongoose");

const RankingSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true
        },
        mmr: {
            type: Number,
            index: true
        }
    },
    {
        timestamps: true
    }
)

const Rankings = mongoose.model("Rankings", RankingSchema)
module.exports = Rankings