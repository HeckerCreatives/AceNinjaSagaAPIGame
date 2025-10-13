const mongoose = require("mongoose");

const PvpStatsSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true,
            required: true
        },
        // Total stats (all matches)
        win: {
            type: Number,
            default: 0
        },
        lose: {
            type: Number,
            default: 0
        },
        draw: {
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
        // Ranked match stats
        rankedWin: {
            type: Number,
            default: 0
        },
        rankedLose: {
            type: Number,
            default: 0
        },
        rankedDraw: {
            type: Number,
            default: 0
        },
        rankedTotalMatches: {
            type: Number,
            default: 0
        },
        rankedWinRate: {
            type: Number,
            default: 0
        },
        // Normal match stats
        normalWin: {
            type: Number,
            default: 0
        },
        normalLose: {
            type: Number,
            default: 0
        },
        normalDraw: {
            type: Number,
            default: 0
        },
        normalTotalMatches: {
            type: Number,
            default: 0
        },
        normalWinRate: {
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
    // Calculate total stats
    this.totalMatches = this.win + this.lose + this.draw;
    this.winRate = this.totalMatches > 0 ? (this.win / this.totalMatches) * 100 : 0;
    
    // Calculate ranked stats
    this.rankedTotalMatches = this.rankedWin + this.rankedLose + this.rankedDraw;
    this.rankedWinRate = this.rankedTotalMatches > 0 ? (this.rankedWin / this.rankedTotalMatches) * 100 : 0;
    
    // Calculate normal stats
    this.normalTotalMatches = this.normalWin + this.normalLose + this.normalDraw;
    this.normalWinRate = this.normalTotalMatches > 0 ? (this.normalWin / this.normalTotalMatches) * 100 : 0;
    
    next();
});

const PvpStats = mongoose.model("PvpStats", PvpStatsSchema);
module.exports = PvpStats;

