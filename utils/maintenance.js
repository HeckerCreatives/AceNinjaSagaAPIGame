const Maintenance = require("../models/Maintenance");



exports.checkmaintenance = async (type) => {

    try {
        const maintenance = await Maintenance.findOne({ type: type });
        
        if (maintenance.value === "1") {
            return "success"; // Maintenance is active
        }
        return "failed"; // Maintenance is not active
    } catch (err) {
        console.error(`Failed to check maintenance status for ${type}, error:`, err);
        return false;
    }
    
}