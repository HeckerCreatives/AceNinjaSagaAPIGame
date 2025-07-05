const { default: mongoose } = require("mongoose");


const BadgeSchema = new mongoose.Schema(
    {
        index: {
            type: Number,
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            index: true
        },
        description: {
            type: String,
            required: true,
            index: true
        }
    },
    {

    }
)

const Badge = mongoose.model("Badge", BadgeSchema);
module.exports = Badge;