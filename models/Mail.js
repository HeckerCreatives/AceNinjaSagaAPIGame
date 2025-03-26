const { default: mongoose } = require("mongoose");


const MailSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Characterdata',
            required: true
        },  
        title: {
            type: String,
            index: true
        },
        description: {
            type: String
        },
        type: {
            type: String
        },
        status: {
            type: String,
            enum: ["unread", "read"],
            default: "unread"
        },
        rewards: {
            type: Map,
            of: Number
        },
    },
    {
        timestamps: true
    }
)

const Mail = mongoose.model("Mail", MailSchema)

module.exports = Mail