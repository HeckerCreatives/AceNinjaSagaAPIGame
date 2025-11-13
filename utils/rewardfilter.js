const Badge = require("../models/Badge");
const Title = require("../models/Title");

/**
 * Filters and transforms rewards based on character gender and reward type
 * @param {Object} reward - The reward object to filter
 * @param {String} characterGender - The character's gender ('male' or 'female')
 * @returns {Promise<Object>} - The filtered reward object
 */
const filterRewardByGender = async (reward, characterGender) => {
    if (!reward || !characterGender) return reward;
    
    // Handle badge rewards - lookup index from Badge model
    if (reward.type === 'badge') {
        try {
            const badge = await Badge.findById(reward.id);
            if (badge) {
                return {
                    type: reward.type,
                    amount: reward.amount || 1,
                    id: badge.index // Use badge index instead of ObjectId
                };
            }
        } catch (error) {
            console.error('Error looking up badge:', error);
        }
        return {
            type: reward.type,
            amount: reward.amount || 1,
            id: reward.id // Fallback to original id
        };
    }
    
    // Handle title rewards - lookup index from Title model
    if (reward.type === 'title') {
        try {
            const title = await Title.findById(reward.id);
            if (title) {
                return {
                    type: reward.type,
                    amount: reward.amount || 1,
                    id: title.index // Use title index instead of ObjectId
                };
            }
        } catch (error) {
            console.error('Error looking up title:', error);
        }
        return {
            type: reward.type,
            amount: reward.amount || 1,
            id: reward.id // Fallback to original id
        };
    }
    
    // Only filter outfit/skin type rewards for gender
    if (!['outfit', 'skin'].includes(reward.type)) {
        return reward;
    }
    
    // If reward has both id and fid (male/female variants)
    if (reward.id && reward.fid) {
        return {
            type: reward.type,
            amount: reward.amount || 1,
            id: characterGender === 'male' ? reward.id : reward.fid
        };
    }
    
    // If reward has gender-specific variants
    if (reward.variants && Array.isArray(reward.variants)) {
        const appropriateVariant = reward.variants.find(v => v.gender === characterGender);
        if (appropriateVariant) {
            return {
                type: reward.type,
                amount: reward.amount || 1,
                id: appropriateVariant.itemId
            };
        }
    }
    
    // Return original reward if no gender filtering needed
    return reward;
};

module.exports = {
    filterRewardByGender
};
