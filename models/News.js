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

const ItemNewsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            index: true
        },
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item"
        },
        itemtype: {
            type: String,
            index: true
        }
    },
    {
        timestamps: true
    }
)

const News = mongoose.model("News", NewsSchema)
const ItemNews = mongoose.model("ItemNews", ItemNewsSchema)

module.exports = {
    News,
    ItemNews,
};