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

const Rankings = mongoose.model("Rankings", RankingSchema);
module.exports = Rankings;




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