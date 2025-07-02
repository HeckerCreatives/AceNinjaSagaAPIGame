const { default: mongoose } = require("mongoose");



const ResetSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true
        },
        type: {
            type: String,
            required: true
        },
        action: {
            type: String,
            required: true
        },
    },
    {
        timestamps: true,
    }
)

const Reset = mongoose.model("Reset", ResetSchema);
module.exports = Reset;