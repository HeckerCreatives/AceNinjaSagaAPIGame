const mongoose = require("mongoose");

const PvpStatsSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true,
            required: true
        },
        win: {
            type: Number,
            default: 0
        },
        lose: {
            type: Number,
            default: 0
        },
        totalMatches: {
            type: Number,
            default: 0
        },
        winRate: {
            type: Number,
            default: 0
        },
        rank: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Rankings"
        }
    },
    { timestamps: true }
);

PvpStatsSchema.pre("save", function (next) {
    this.totalMatches = this.win + this.lose;
    this.winRate = this.totalMatches > 0 ? (this.win / this.totalMatches) * 100 : 0;
    next();
});

const PvpStats = mongoose.model("PvpStats", PvpStatsSchema);
module.exports = PvpStats;

