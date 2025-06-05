

const mongoose = require("mongoose");

const QuestDetailsSchema = new mongoose.Schema(
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
    },
    {
        timestamps: true
    }
)
const QuestProgressSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
            index: true
        },
        quest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestDetails",
            required: true,
            index: true
        },
        requirementtype: {
            type: String,
            required: true,
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

const QuestDetails = mongoose.model("QuestDetails", QuestDetailsSchema);
const QuestProgress = mongoose.model("QuestProgress", QuestProgressSchema);
module.exports = {
    QuestDetails,
    QuestProgress
};