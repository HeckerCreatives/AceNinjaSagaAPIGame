const { default: mongoose } = require("mongoose");

const PacksSchema = new mongoose.Schema( 
    {
        name: {
            type: String,
            required: true,
            index: true
        },

        // amount or price
        amount: {
            type: Number,
            required: true,
            index: true
        },

        currency: {
            type: String,
            required: true,
            index: true,
            default: "topupcredit"
        },
        rewards: [
            {
                type: Object,
                required: true,
            }
        ]
    },
    {
        timestamps: true
    }
)


const Packs = mongoose.model("Packs", PacksSchema);
module.exports = Packs;