const { default: mongoose } = require("mongoose");


const MonthlyLoginSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
        },
        month: {
            type: String,
            required: true,
        },
        year: {
            type: String,
            required: true,
        },
        login: {
            type: Number,
            default: 0,
        },
        isClaimed: {
            type: String,
            enum: ["1", "0"],
            default: "0",
        },
        lastClaimed: {
            type: Date,
            default: Date.now,
        }
    },
    {
        timestamps: true,
    }
)

const SpinnerRewardsSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
        },
        daily: {
            type: Number,
            default: 0,
        },
        isClaimed: {
            type: String,
            enum: ["1", "0"],
            default: "0",
        },
        lastClaimed: {
            type: Date,
            default: Date.now,
        }
    },
    {
        timestamps: true,
    }
)


const MonthlyLogin = mongoose.model("MonthlyLogin", MonthlyLoginSchema)
const SpinnerRewards = mongoose.model("SpinnerRewards", SpinnerRewardsSchema)

module.exports = { MonthlyLogin, SpinnerRewards }