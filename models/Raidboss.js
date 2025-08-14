const mongoose = require("mongoose");

const RaidbossSchema = new mongoose.Schema(
    {
        bossname: {
            type: String,
            index: true
        },
        rewards: [{
            type: Map, 
            of: Number 
        }],
        itemrewards: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
        }],
        skillrewards: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Skill',
        }],
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        }
    },
    {
        timestamps: true
    }
);

const Raidboss = mongoose.model("Raidboss", RaidbossSchema);
module.exports = Raidboss;
