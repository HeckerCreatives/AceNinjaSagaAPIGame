const mongoose = require("mongoose");

const BattlepassSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
            index: true
        },
        season: {
            type: Number,
            required: true,
            index: true
        },
        level: {
            type: Number,
            default: 1,
            min: 1,
            max: 100 // Add max level
        },
        experience: {
            type: Number,
            default: 0,
            min: 0
        },
        requiredExperience: {
            type: Number,
            default: 1000 // Base XP needed for first level
        },
        premium: {
            type: Boolean,
            default: false
        },
        claimedRewards: [{
            level: {
                type: Number,
                required: true
            },
            type: {
                type: String,
                enum: ['free', 'premium'],
                required: true
            },
            rewardId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'BattlepassRewards',
                required: true
            },
            claimed: {
                type: Boolean,
                default: false
            },
            claimedAt: {
                type: Date
            }
        }],
        seasonStart: {
            type: Date,
            required: true
        },
        seasonEnd: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'expired'],
            default: 'active'
        }
    },
    {
        timestamps: true
    }
);

// Improved experience and level calculation
BattlepassSchema.methods.addExperience = async function(amount) {
    this.experience += amount;
    
    while (this.experience >= this.requiredExperience && this.level < 100) {
        this.experience -= this.requiredExperience;
        this.level += 1;
        this.requiredExperience = Math.floor(this.requiredExperience * 1.1); // 10% increase per level
    }

    if (this.level >= 100) {
        this.status = 'completed';
        this.experience = this.requiredExperience;
    }

    await this.save();
    return this;
};

BattlepassSchema.methods.claimReward = async function(level, type) {
    if (type === 'premium' && !this.premium) {
        throw new Error('Premium pass required to claim premium rewards');
    }

    const reward = this.claimedRewards.find(r => r.level === level && r.type === type);
    if (!reward) {
        throw new Error('Reward not found');
    }

    if (reward.claimed) {
        throw new Error('Reward already claimed');
    }

    if (this.level < level) {
        throw new Error('Level requirement not met');
    }

    reward.claimed = true;
    reward.claimedAt = new Date();
    await this.save();
    return true;
};
const BattlepassRewardsSchema = new mongoose.Schema(
    {
        season: {
            type: Number,
            required: true,
            index: true
        },
        level: {
            type: Number,
            required: true,
            min: 1,
            max: 100
        },
        type: {
            type: String,
            enum: ['free', 'premium'],
            required: true
        },
        rewardType: {
            type: String,
            enum: ['currency', 'item', 'cosmetic'],
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 1
        },
        itemId: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Indexes
BattlepassSchema.index({ owner: 1, season: 1 }, { unique: true });
BattlepassRewardsSchema.index({ season: 1, level: 1, type: 1 }, { unique: true });

// Pre-save middleware
BattlepassSchema.pre('save', function(next) {
    const now = new Date();
    if (now > this.seasonEnd) {
        this.status = 'expired';
    } else if (now >= this.seasonStart && now <= this.seasonEnd) {
        this.status = 'active';
    }
    next();
});

const BattlepassRewards = mongoose.model("BattlepassRewards", BattlepassRewardsSchema);
const Battlepass = mongoose.model("Battlepass", BattlepassSchema);

module.exports = { Battlepass, BattlepassRewards };