const mongoose = require("mongoose");

const RaidbossFightSchema = new mongoose.Schema(
    {
        owner: {
            type:  mongoose.Schema.Types.ObjectId, 
            ref: 'Users'
        },
        status: {
            type: String,
            enum: ["done", "notdone"],
            default: "notdone"
        }
    },
    {
        timestamps: true
    }
);

const RaidbossFight = mongoose.model("RaidbossFight", RaidbossFightSchema);
module.exports = RaidbossFight;
