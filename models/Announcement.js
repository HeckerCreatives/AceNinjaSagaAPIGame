const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema(
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

const Announcement = mongoose.model("Announcement", AnnouncementSchema)
module.exports = Announcement