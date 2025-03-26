const mongoose = require("mongoose");

const MaintenanceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            index: true
        },
        type: {
            type: String
        },
        value: {
            type: String,
            enum: ["0", "1"],
            default: "0"
        }
    },
    {
        timestamps: true
    }
)

const Maintenance = mongoose.model("Maintenance", MaintenanceSchema)
module.exports = Maintenance