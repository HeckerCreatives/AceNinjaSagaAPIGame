const { default: mongoose } = require("mongoose");


const DownloadLinksSchema = new mongoose.Schema(
    {
        link: {
            type: String,
            index: true,
        },
        title: { // Playstore , Appstore & Steam
            type: String,
            index: true,
        },
        type: {
            type: String,
            index: true,
        },
    },
    {
        timestamps: true,
    }
)

const Downloadlinks = mongoose.model("Downloadlinks", DownloadLinksSchema)
module.exports = Downloadlinks