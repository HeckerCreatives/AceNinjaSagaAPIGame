const mongoose = require("mongoose");

// Battlepass Season Schema
const BattlepassSeasonSchema = new mongoose.Schema(
    {
        seasonName: {
            type: String,
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        tierCount: {
            type: Number,
            required: true,
            min: 1
        },
        premiumCost: {
            type: Number,
            required: true
        },
        tiers: [
            {
                tierNumber: {
                    type: Number,
                    required: true
                },
                freeReward: {
                    type: Object,
                    required: true
                },
                premiumReward: {
                    type: Object,
                    required: true
                },
                xpRequired: {
                    type: Number,
                    required: true
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

// Player Battlepass Progress Schema
const BattlepassProgressSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true
        },
        season: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BattlepassSeason",
            required: true
        },
        currentTier: {
            type: Number,
            default: 1,
            min: 1
        },
        currentXP: {
            type: Number,
            default: 0,
            min: 0
        },
        hasPremium: {
            type: Boolean,
            default: false
        },
        claimedRewards: [
            {
                tier: Number,
                rewardType: {
                    type: String,
                    enum: ['free', 'premium']
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

// Indexes
BattlepassProgressSchema.index({ owner: 1, season: 1 }, { unique: true });

// Models
const BattlepassSeason = mongoose.model("BattlepassSeason", BattlepassSeasonSchema);
const BattlepassProgress = mongoose.model("BattlepassProgress", BattlepassProgressSchema);

module.exports = { BattlepassSeason, BattlepassProgress };