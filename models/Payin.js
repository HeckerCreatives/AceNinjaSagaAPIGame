const mongoose = require("mongoose");

const PayinSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            index: true // Automatically creates an index on 'amount'
        },
        character: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            index: true // Automatically creates an index on 'amount'
        },
        processby: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Staffusers",
            index: true // Automatically creates an index on 'amount'
        },
        status: {
            type: String,
            index: true // Automatically creates an index on 'amount'
        },
        value: {
            type: Number
        }
    },
    {
        timestamps: true
    }
)

const Payin = mongoose.model("Payin", PayinSchema);
module.exports = Payin