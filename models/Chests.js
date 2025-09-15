const { default: mongoose } = require("mongoose");

const ChestSchema = new mongoose.Schema( 
    {
        name: {
            type: String,
            required: true,
            index: true
        },

        // amount or price
        amount: {
            type: Number,
            required: true,
            index: true
        },

        currency: {
            type: String,
            required: true,
            index: true,
            default: "crystals"
        },
        rewards: [
            {
                rewardtype: {
                    type: String,
                    enum: ['badge', 'title', 'weapon', 'outfit', 'exp', 'coins', 'crystal'],
                    required: true
                },
                amount: {
                    type: Number,
                },
                reward: {
                    type: Object,
                },
                probability: {
                    type: Number,
                    required: true,
                    default: 100
                }
            }
        ]
    },
    {
        timestamps: true
    }
)

// dont allow more than 10 rewards per chest
ChestSchema.pre('save', function(next) {
    if (this.rewards.length > 10) {
        return next(new Error("A chest cannot have more than 10 rewards"));
    }
    next();
});

// dont allow more than 100 probability total
ChestSchema.pre('save', function(next) {
    const totalProbability = this.rewards.reduce((total, reward) => total + reward.probability, 0);
    if (totalProbability > 100) {
        return next(new Error("The total probability of rewards cannot exceed 100"));
    }
    next();
});


const Chest = mongoose.model("Chest", ChestSchema);
module.exports = Chest;