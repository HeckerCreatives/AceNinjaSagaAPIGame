const mongoose = require("mongoose");
const bcrypt = require('bcrypt');

const UsersSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            index: true
        },
        password: {
            type: String
        },
        email: {
            type: String
        },
        gametoken: {
            type: String
        },
        webtoken: {
            type: String
        },
        bandate: {
            type: String
        },
        banreason: {
            type: String
        },
        status: {
            type: String,
            default: "active",
            index: true
        },
        auth: {
            type: String
        }
        ,
        // Number of character slots available to this user (default 1, max 4 enforced in controller)
        characterSlots: {
            type: Number,
            default: 1
        },
        slotsunlocked: [Number] // Array to track which slots are unlocked (e.g., [1, 2] means slots 1 and 2 are unlocked)
    },
    {
        timestamps: true
    }
)

UsersSchema.pre("save", async function (next) {
    if (!this.isModified){
        next();
    }

    this.password = await bcrypt.hashSync(this.password, 10)
})

UsersSchema.methods.matchPassword = async function(password){
    return await bcrypt.compare(password, this.password)
}

const Users = mongoose.model("Users", UsersSchema)
module.exports = Users