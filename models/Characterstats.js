const mongoose = require("mongoose");

const CharacterStatsSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true
        },
        health: {
            type: Number
        },
        energy: {
            type: Number
        },
        armor: {
            type: Number
        },
        magicresist: {
            type: Number
        },
        speed: {
            type: Number
        },
        attackdamage: {
            type: Number
        },
        armorpen: {
            type: Number
        },
        magicpen: {
            type: Number
        },
        critchance: {
            type: Number
        },
        magicdamage: {
            type: Number
        },
        lifesteal: {
            type: Number
        },
        omnivamp: {
            type: Number
        },
        healshieldpower: {
            type: Number
        },
        critdamage: {
            type: Number
        }
    },
    {
        timestamps: true
    }
)

const CharacterStats = mongoose.model("CharacterStats", CharacterStatsSchema)
module.exports = CharacterStats