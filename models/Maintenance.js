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
            type: Boolean
        }
    },
    {
        timestamps: true
    }
)

const Maintenance = mongoose.model("Maintenance", MaintenanceSchema)
module.exports = Maintenance