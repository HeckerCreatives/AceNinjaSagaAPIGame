const { default: mongoose } = require("mongoose");
const Packs = require("../models/Packs");
const { Item } = require("../models/Market");

/**
 * Get pack by item ID from Market collection
 * @param {String} itemId - Market item ID (_id from Market.items)
 * @param {Object} session - Mongoose session for transaction
 * @returns {Object|null} - Pack document with rewards or null if not found
 */
exports.getPackByItemId = async (itemId, session = null) => {
    try {
        // The pack _id in Packs collection should match the Market.items._id
        const query = Packs.findById(itemId);
        if (session) query.session(session);
        
        const pack = await query;
        return pack;
    } catch (error) {
        console.error(`Error fetching pack by item ID ${itemId}:`, error);
        return null;
    }
};

/**
 * Validate pack reward structure
 * @param {Object} reward - Single reward object from pack
 * @returns {Boolean} - True if valid, false otherwise
 */
exports.validatePackReward = (reward) => {
    if (!reward || typeof reward !== 'object') {
        return false;
    }

    // Must have rewardtype
    if (!reward.rewardtype || typeof reward.rewardtype !== 'string') {
        return false;
    }

    // For currency/exp types, must have positive amount
    const currencyTypes = ['crystal', 'coins', 'exp'];
    if (currencyTypes.includes(reward.rewardtype)) {
        if (!reward.amount || typeof reward.amount !== 'number' || reward.amount <= 0) {
            return false;
        }
        return true;
    }

    // For item types, must have reward object with id
    const itemTypes = ['weapon', 'outfit', 'hair', 'face', 'eyes', 'skincolor', 'skins', 'chest', 'chests'];
    if (itemTypes.includes(reward.rewardtype)) {
        if (!reward.reward || !reward.reward.id) {
            return false;
        }
        return true;
    }

    // For title/badge, must have reward object with id
    const specialTypes = ['title', 'badge', 'skill', 'companion'];
    if (specialTypes.includes(reward.rewardtype)) {
        if (!reward.reward || (reward.reward.id === undefined && reward.reward.id !== 0)) {
            return false;
        }
        return true;
    }

    // Unknown reward type - accept it but log warning
    console.warn(`Unknown reward type in pack: ${reward.rewardtype}`);
    return true;
};
