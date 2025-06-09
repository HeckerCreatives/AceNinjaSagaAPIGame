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

const NewsReadSchema = new mongoose.Schema({
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Characterdata', 
        required: true 
    },
    news: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'News', 
    },
    itemNews: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ItemNews' 
    },
    readAt: { 
        type: Date, 
        default: Date.now 
    }
});

const NewsRead = mongoose.model("NewsRead", NewsReadSchema);
const News = mongoose.model("News", NewsSchema)
const ItemNews = mongoose.model("ItemNews", ItemNewsSchema)

module.exports = {
    News,
    ItemNews,
    NewsRead
};