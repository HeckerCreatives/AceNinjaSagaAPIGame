const mongoose = require("mongoose");

const SeasonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            index: true,
        },
        duration: {
            type: Number, // Number of days
            index: true,
        },
        isActive: {
            type: String,
            enum: ["active", "ended", "upcoming"],
            default: "upcoming",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

const Season = mongoose.model("Season", SeasonSchema);
module.exports = Season;
