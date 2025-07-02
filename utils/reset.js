const Reset = require('../models/Reset.js');

exports.addreset = async (owner, type, action) => {
    try {
        const reset = await Reset.create({ owner, type, action });
        if (!reset) {
            console.error(`Failed to create reset for owner ${owner} type: ${type} action: ${action}`);
            return "failed";
        }
        return reset;
    } catch (error) {
        console.error(`Failed to create reset for owner ${owner} type: ${type} action: ${action}, error: ${error}`);
        return "failed";
    }
}

exports.existsreset = async (owner, type, action) => {
    try {
        const reset = await Reset.findOne({ owner, type, action });
        return reset; 
    } catch (error) {
        console.error(`Failed to check reset for owner ${owner} type: ${type} action: ${action}, error: ${error}`);
        return false;
    }
}