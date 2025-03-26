const mongoose = require("mongoose");

const NewsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            index: true
        },
        content: {
            type: String,
        },
        type: {
            type: String,
        },
        url: {
            type: String,
        }
    },
    {
        timestamps: true
    }
)

const News = mongoose.model("News", NewsSchema)
module.exports = News