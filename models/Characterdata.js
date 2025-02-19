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
            type: String,
            index: true
        },
        outfit: {
            type: String,
            index: true
        },
        hair: {
            type: String,
            index: true
        },
        eyes: {
            type: String,
            index: true
        },
        facedetails: {
            type: String,
            index: true
        },
        color: {
            type: String,
            index: true
        },
        title: {
            type: String,
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
        }
    },
    {
        timestamps: true
    }
)

const Characterdata = mongoose.model("CharacterData", CharacterDataSchema)
module.exports = Characterdata