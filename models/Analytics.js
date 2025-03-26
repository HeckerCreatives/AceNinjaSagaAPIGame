const mongoose = require("mongoose");

const AnalyticsSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            index: true // Automatically creates an index on 'amount'
        },
        transactionid: {
            type: String,
            default: "",
            index: true // Automatically creates an index on 'amount'
        },
        type: {
            type: String,
            index: true // Automatically creates an index on 'amount'
        },
        description: {
            type: String
        },
        amount: {
            type: Number,
        },
    },
    {
        timestamps: true
    }
)

const Analytics = mongoose.model("Analytics", AnalyticsSchema);
module.exports = Analytics