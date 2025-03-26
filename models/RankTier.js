const mongoose = require("mongoose");

const RankingTierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            index: true,
        },
        requiredmmr:{
            type: String
        },
        icon:{
            type: String
        }
    },
    { timestamps: true }
);

const RankTier = mongoose.model("RankTier", RankingTierSchema);
module.exports = RankTier;