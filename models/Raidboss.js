const mongoose = require("mongoose");

const RaidbossSchema = new mongoose.Schema(
    {
        bossname: {
            type: String,
            index: true
        },
        rewards: [
            {
                type: Object,
                required: true,
                // type: {
                //     type: String,
                //     required: true
                // },
                // name: {
                //     type: String,
                //     required: true
                // },
                // amount: {
                //     type: Number,
                //     required: false
                // },
                // id: {
                //     type: String,
                //     required: false
                // },
                // gender: {
                //     type: String,
                //     required: false
                // }
            }
        ],
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
