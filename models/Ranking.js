const mongoose = require("mongoose");

const RankingSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true,
            required: true
        },
        mmr: {
            type: Number,
            index: true,
            default: 0
        },
         rank: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RankTier"
        },
        season: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Season",
            required: true
        }
    },
    { timestamps: true }
);

const RankingHistorySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true,
            required: true
        },
        mmr: {
            type: Number,
            index: true,
            default: 0
        },
        rank: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RankTier"
        },
        season: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Season",
            required: true
        },
        index: {
            type: Number,
            required: true
        },
    },
    { timestamps: true }
);

const RankRewardSchema = new mongoose.Schema(
    {
        rank: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RankTier",
            required: true
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
                }
            }
        ]
        
    },
    {
        timestamps: true
    }
)

const RankingHistory = mongoose.model("RankingHistory", RankingHistorySchema);
const Rankings = mongoose.model("Rankings", RankingSchema);
const RankReward = mongoose.model("RankReward", RankRewardSchema);

module.exports = {
    Rankings,
    RankingHistory,
    RankReward
};

// {
//     "rank": "64f8b2c3d1e4a5b6c7d8e9f0",
//     "rewards": [
//         {
//             "rewardtype": "skin",
//             "amount": 1,
//             "reward": {
//                 "id": "male_skin_id",
//                 "fid": "female_skin_id",
//             }
//         },
//         {
//             "rewardtype": "crystal",
//             "amount": 500,
//             "reward": {
//                 "amount": 500
//             }
//         }
//     ]
// }


// const mongoose = require("mongoose");

// const RankingSchema = new mongoose.Schema(
//     {
//         owner: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: "Characterdata",
//             index: true
//         },
//         mmr: {
//             type: Number,
//             index: true
//         },
//         rank: {
//             type: Number,
//             index: true
//         }
//     },
//     {
//         timestamps: true
//     }
// )

// const Rankings = mongoose.model("Rankings", RankingSchema)
// module.exports = Rankings