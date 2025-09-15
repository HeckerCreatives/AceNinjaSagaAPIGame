const Chest = require('../models/Chests');
const { CharacterInventory } = require('../models/Market');
const Characterdata = require('../models/Characterdata');

/**
 * Select a random reward based on probability weights
 * @param {Array} rewards - Array of reward objects with probability
 * @returns {Object} Selected reward object
 */
exports.selectRandomReward = (rewards) => {
    const totalProbability = rewards.reduce((sum, reward) => sum + reward.probability, 0);
    let random = Math.random() * totalProbability;
    
    for (const reward of rewards) {
        random -= reward.probability;
        if (random <= 0) {
            return reward;
        }
    }
    
    // Fallback to first reward if something goes wrong
    return rewards[0];
};

/**
 * Award chest reward using existing rank reward system
 * @param {String} characterId - Character ID
 * @param {Object} reward - Single reward object from chest
 * @param {Object} session - Mongoose session for transaction
 * @returns {Promise<Array>} - Array with single reward result (compatible with awardRankRewards)
 */
exports.awardChestReward = async (characterId, reward, session = null) => {
    const { awardRankRewards } = require('./rankrewards');
    
    // Get character data for gender
    const character = await Characterdata.findById(characterId).session(session);
    if (!character) {
        return [{ success: false, message: "Character not found" }];
    }

    // Create a mock player object compatible with awardRankRewards
    const mockPlayer = {
        owner: characterId,
        rank: 'chest', // dummy rank
        character: {
            gender: character.gender === 0 ? "male" : "female"
        }
    };

    // Prevent chests from awarding chests (avoid infinite chest granting)
    if (reward.rewardtype === 'chest') {
        return [{ success: false, message: 'Chest rewards cannot grant additional chests' }];
    }

    // Create mock rank reward data with single reward
    const mockRankRewardData = [{
        rank: 'chest',
        rewards: [reward]
    }];

    // Use existing rank reward system
    const results = await awardRankRewards(mockPlayer, mockRankRewardData, session);
    return results;
};

/**
 * Remove chest from character inventory
 * @param {String} characterId - Character ID
 * @param {String} chestItemId - Chest item ID
 * @param {Number} quantity - Quantity to remove
 * @param {Object} session - Mongoose session for transaction
 */
exports.removeChestFromInventory = async (characterId, chestItemId, quantity = 1, session = null) => {
    const inventory = await CharacterInventory.findOne({
        owner: characterId,
        type: 'chests',
        'items.item': chestItemId
    }).session(session);

    if (!inventory) {
        throw new Error('Chest inventory not found');
    }

    const chestItem = inventory.items.find(item => item.item.toString() === chestItemId.toString());
    if (!chestItem || chestItem.quantity < quantity) {
        throw new Error('Insufficient chest quantity');
    }

    chestItem.quantity -= quantity;
    if (chestItem.quantity <= 0) {
        inventory.items = inventory.items.filter(item => item.item.toString() !== chestItemId.toString());
    }

    await inventory.save({ session });
    return inventory;
};

/**
 * Get chest data with rewards by chest ID
 * @param {String} chestId - Chest ID
 * @param {Object} session - Mongoose session for transaction
 * @returns {Promise<Object>} - Chest document with rewards
 */
exports.getChestById = async (chestId, session = null) => {
    const chest = await Chest.findById(chestId).session(session);
    if (!chest) {
        throw new Error('Chest data not found');
    }
    return chest;
};

/**
 * Get enhanced chest preview data for inventory or market display
 * @param {Object} chestItem - Basic chest item data
 * @returns {Promise<Object>} - Enhanced chest data with reward preview
 */
exports.getEnhancedChestData = async (chestItem) => {
    try {
        const chest = await Chest.findById(chestItem._id || chestItem.itemId);
        
        return {
            itemId: chestItem._id || chestItem.itemId,
            name: chestItem.name,
            rarity: chestItem.rarity,
            quantity: chestItem.quantity,
            imageUrl: chestItem.imageUrl,
            description: chestItem.description,
            price: chestItem.price,
            currency: chestItem.currency,
            acquiredAt: chestItem.acquiredAt,
            isOpenable: chestItem.isOpenable || true,
            rewards: chest ? chest.rewards : [],
            totalProbability: chest ? chest.rewards.reduce((sum, r) => sum + r.probability, 0) : 0,
        };
    } catch (error) {
        console.error('Error getting enhanced chest data:', error);
        return {
            ...chestItem,
            rewards: [],
            totalProbability: 0,
            rewardPreview: []
        };
    }
};