const mongoose = require("mongoose");

const NewsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            index: true
        },
        content: [
            {
                type: {
                    type: String
                }, // video  description  image
                value: {
                    type: String
                }
            }
        ]
    },
    {
        timestamps: true
    }
)

const News = mongoose.model("News", NewsSchema)
module.exports = News