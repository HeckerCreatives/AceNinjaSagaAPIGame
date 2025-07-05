const { default: mongoose } = require("mongoose");


const TitleSchema = new mongoose.Schema(
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
        timestamps: true
    }
)

const Title = mongoose.model("Title", TitleSchema);
module.exports = Title;