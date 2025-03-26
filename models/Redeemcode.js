const { default: mongoose } = require("mongoose");


const RedeemCodeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            index: true
        },
        title: {
            type: String,
            // required: true
        },
        description: {
            type: String
        },
        rewards: {
            type: Map, 
            of: Number 
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },
        expiration: {
            type: Date
        }
    },
    {
        timestamps: true
    }
)

const CodesRedeemedSchema = new mongoose.Schema( 
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Characterdata',
            required: true
        }, 
        code: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Redeemcode',
            required: true
        },
    },
    {
        timestamps: true
    }
)


const Redeemcode = mongoose.model("Redeemcode", RedeemCodeSchema)
const CodesRedeemed = mongoose.model("CodesRedeemed", CodesRedeemedSchema)

module.exports = { Redeemcode, CodesRedeemed }