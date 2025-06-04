const mongoose = require("mongoose");

const BattlepassSeasonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        season: {
            type: Number,
            required: true,
            unique: true,
            min: 1
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "inactive"
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
        freeMissions: [
            {
                missionName: {
                    type: String,
                    required: true
                },
                description: {
                    type: String,
                    required: true
                },
                xpReward: {
                    type: Number,
                    required: true
                },
                requirements: {
                    type: Object,
                    required: true
                },
                daily: {
                    type: Boolean,
                    default: false
                }
            }
        ],
        premiumMissions: [
            {
                missionName: {
                    type: String,
                    required: true
                },
                description: {
                    type: String,
                    required: true
                },
                xpReward: {
                    type: Number,
                    required: true
                },
                requirements: {
                    type: Object,
                    required: true
                },
                daily: {
                    type: Boolean,
                    default: false
                }
            }
        ],
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
        ],
        grandreward: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item",
        }
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



const MissionProgressSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
            index: true
        },
        season: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BattlepassSeason",
            required: true
        },
        missionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        missionName: {
            type: String,
            required: true
        },
        progress: {
            type: Number,
            default: 0,
            min: 0
        },
        isCompleted: {
            type: Boolean,
            default: false
        },
        isLocked: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            enum: ["free", "premium"],
            required: true
        },
        daily: {
            type: Boolean,
            default: false
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

const BattlepassHistorySchema = new mongoose.Schema(
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
        tier: {
            type: Number,
            required: true,
        },
        claimedrewards: {
            type: {
                type: String,
                enum: ['free', 'premium'],
                required: true
            },
            item: {
                type: String,
                required: true
            },
            amount: {
                type: Number,
            }
        }
    },
    {
        timestamps: true
    }
)

// Pre-save middleware to lock premium missions if user doesn't have premium
MissionProgressSchema.pre('save', async function(next) {
    if (this.type === 'premium') {
        const battlepassProgress = await mongoose.model('BattlepassProgress').findOne({
            owner: this.owner,
            season: this.season
        });
        this.isLocked = !battlepassProgress?.hasPremium;
    }
    next();
});
// Add middleware to BattlepassProgressSchema to unlock premium missions when premium is bought
BattlepassProgressSchema.pre('save', async function(next) {
    if (this.isModified('hasPremium') && this.hasPremium) {
        await mongoose.model('BattlepassMissionProgress').updateMany(
            {
                owner: this.owner,
                season: this.season,
                type: 'premium'
            },
            {
                isLocked: false
            }
        );
    }
    next();
});

// Indexes
MissionProgressSchema.index({ owner: 1, season: 1, missionId: 1 }, { unique: true });




// Indexes
BattlepassProgressSchema.index({ owner: 1, season: 1 }, { unique: true });

// Models
const BattlepassHistory = mongoose.model("BattlepassHistory", BattlepassHistorySchema);
const BattlepassSeason = mongoose.model("BattlepassSeason", BattlepassSeasonSchema);
const BattlepassProgress = mongoose.model("BattlepassProgress", BattlepassProgressSchema);
const BattlepassMissionProgress = mongoose.model("BattlepassMissionProgress", MissionProgressSchema);

module.exports = { BattlepassSeason, BattlepassProgress, BattlepassMissionProgress, BattlepassHistory };