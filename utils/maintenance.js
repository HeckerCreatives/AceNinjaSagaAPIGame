const Maintenance = require("../models/Maintenance");

exports.checkmaintenance = async (type) => {
    try {
        const maintenance = await Maintenance.findOne({ type: type });
        if (!maintenance) {
            console.error(`Maintenance record for ${type} not found.`);
            return "success";
        }
        if (maintenance.value === "1") {
            console.log(`Maintenance value for ${type} is active: ${maintenance.value}.`);
            return "failed"; // Maintenance is active
        }
        return "success"; // Maintenance is not active
    } catch (err) {
        console.error(`Failed to check maintenance status for ${type}, error:`, err);
        return false;
    }
}