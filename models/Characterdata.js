const mongoose = require("mongoose");

const CharacterDataSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            index: true
        },
        username: {
            type: String,
            index: true,
        },
        gender: {
            type: Number,
            index: true
        },
        outfit: {
            type: Number,
            index: true
        },
        hair: {
            type: String,
            index: true
        },
        eyes: {
            type: Number,
            index: true
        },
        facedetails: {
            type: Number,
            index: true
        },
        weapon: {
            type: Number,
            index: true
        },
        color: {
            type: Number,
            index: true
        },
        title: {
            type: Number,
            index: true
        },
        experience: {
            type: Number
        },
        level: {
            type: Number
        },
        badge: {
            type: String
        },
        itemindex: {
            type: Number
        }
    },
    {
        timestamps: true
    }
)

const Characterdata = mongoose.model("CharacterData", CharacterDataSchema)
module.exports = Characterdata