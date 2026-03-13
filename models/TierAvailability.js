const mongoose = require("mongoose");

const TierAvailabilitySchema = new mongoose.Schema(
    {
        tier: {
            type: String,
            enum: ["platinum", "gold", "silver"],
            required: true,
            unique: true,
            index: true
        },
        idRange: {
            min: { type: Number, required: true },
            max: { type: Number, required: true }
        },
        // available: sorted ascending list of unclaimed IDs (used for atomic $pop)
        available: {
            type: [Number],
            default: []
        },
        taken: {
            type: [Number],
            default: []
        }
    },
    {
        timestamps: true
    }
);

TierAvailabilitySchema.index({ tier: 1 });

const TierAvailability = mongoose.model("TierAvailability", TierAvailabilitySchema);
module.exports = TierAvailability;
