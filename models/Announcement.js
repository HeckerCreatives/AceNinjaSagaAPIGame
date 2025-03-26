const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema(
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
        },
        announcementtype: {
            type: String,
        }
    },
    {
        timestamps: true
    }
)

const Announcement = mongoose.model("Announcement", AnnouncementSchema)
module.exports = Announcement