const mongoose = require("mongoose");

const PvPSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        opponent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata", 
            required: true
        },
        status: {
            type: Number, // 1 for Win, 0 for Lose
            enum: [0, 1],
            required: true
        },
        season: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Season",
            required: true
        }
    },
    { timestamps: true }
);

const PvP = mongoose.model("PvP", PvPSchema);
module.exports = PvP;
