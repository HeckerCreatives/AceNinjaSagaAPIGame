const Characterwallet = require('../models/Characterwallet');
const { CharacterInventory } = require('../models/Market');
const Badge = require('../models/Badge');
const Title = require('../models/Title');
const Characterbadge = require('../models/Characterbadges');
const Charactertitle = require('../models/Charactertitles');
const { CharacterSkillTree } = require('../models/Skills');
const { Companion, CharacterCompanion } = require('../models/Companion');
const Chapter = require('../models/Chapter');
const { gethairbundle, getCorrelatedHairByOutfitId } = require('./bundle');
const { addXPAndLevel } = require('./leveluptools');
const { addwallet } = require('./wallettools');
const Characterdata = require('../models/Characterdata');
const { validatePackReward } = require('./packtools');

/**
 * Award currency (coins/crystals) to character wallet
 * @param {String} characterid - Character ID  
 * @param {String} type - Currency type ('coins' or 'crystal')
 * @param {Number} amount - Amount to award
 * @param {Object} session - Mongoose session for transaction
 * @returns {String} - 'success' or 'failed'
 */
exports.awardCurrency = async (characterid, type, amount, session = null) => {
    try {
        const result = await addwallet(characterid, type, amount, session);
        return result; // Returns 'success' or 'failed'
    } catch (error) {
        return 'failed';
    }
};

/**
 * Award experience points to character
 * @param {String} characterid - Character ID
 * @param {Number} amount - XP amount to award
 * @param {Object} session - Mongoose session for transaction
 * @returns {String|Object} - 'failed' or level up details object
 */
exports.awardExperience = async (characterid, amount, session = null) => {
    try {
        const xpResult = await addXPAndLevel(characterid, amount, session);
        return xpResult; // Returns 'failed' or level up details
    } catch (error) {
        return 'failed';
    }
};

/**
 * Award badge to character
 * @param {String} characterid - Character ID
 * @param {String|Number} badgeId - Badge ID or index
 * @param {Object} session - Mongoose session for transaction
 * @returns {String|Object} - 'success', 'failed', 'already_owned', or badge object if success
 */
exports.awardBadge = async (characterid, badgeId, session = null) => {
    try {
        // Try to find badge by ID first, then by index
        let badge;
        if (typeof badgeId === 'string' && badgeId.length === 24) {
            // Looks like MongoDB ObjectId
            const q = Badge.findById(badgeId);
            if (session) q.session(session);
            badge = await q;
        } else {
            // Assume it's an index
            const q = Badge.findOne({ index: Number(badgeId) });
            if (session) q.session(session);
            badge = await q;
        }

        if (!badge) {
            return 'failed';
        }

        // Check if character already has this badge
        const q2 = Characterbadge.findOne({ owner: characterid, index: badge.index });
        if (session) q2.session(session);
        const exists = await q2;
        
        if (exists) {
            return badge; // Return badge object even if already owned
        }

        await Characterbadge.create([{
            owner: characterid,
            badge: badge._id,
            index: badge.index,
            name: badge.title
        }], { session });

        return badge; // Return badge object for original processing
    } catch (error) {
        return 'failed';
    }
};

/**
 * Award title to character
 * @param {String} characterid - Character ID
 * @param {String|Number} titleId - Title ID or index
 * @param {Object} session - Mongoose session for transaction
 * @returns {String|Object} - 'success', 'failed', 'already_owned', or title object if success
 */
exports.awardTitle = async (characterid, titleId, session = null) => {
    try {
        // Try to find title by ID first, then by index
        let title;
        if (typeof titleId === 'string' && titleId.length === 24) {
            // Looks like MongoDB ObjectId
            const q = Title.findById(titleId);
            if (session) q.session(session);
            title = await q;
        } else {
            // Assume it's an index
            const q = Title.findOne({ index: Number(titleId) });
            if (session) q.session(session);
            title = await q;
        }

        if (!title) {
            return 'failed';
        }

        // Check if character already has this title
        const q2 = Charactertitle.findOne({ owner: characterid, index: title.index });
        if (session) q2.session(session);
        const exists = await q2;
        
        if (exists) {
            return title; // Return title object even if already owned
        }

        await Charactertitle.create([{
            owner: characterid,
            title: title._id,
            index: title.index,
            name: title.title
        }], { session });

        return title; // Return title object for original processing
    } catch (error) {
        return 'failed';
    }
};

/**
 * Award skill to character skill tree
 * @param {String} characterid - Character ID
 * @param {String} skillId - Skill ID
 * @param {Object} session - Mongoose session for transaction
 * @returns {String} - 'success', 'failed', 'already_owned', or 'new_skilltree'
 */
exports.awardSkill = async (characterid, skillId, session = null) => {
    try {
        const skillTreeQ = CharacterSkillTree.findOne({ owner: characterid });
        if (session) skillTreeQ.session(session);
        const skillTree = await skillTreeQ;
        
        if (!skillTree) {
            // Create a new skill tree if it doesn't exist
            await CharacterSkillTree.create([{ 
                owner: characterid, 
                skills: [{ skill: skillId, level: 1, isEquipped: false }], 
                skillPoints: 0, 
                unlockedSkills: [] 
            }], { session });
            return 'new_skilltree';
        } else {
            const exists = skillTree.skills.some(s => String(s.skill) === String(skillId));
            if (exists) {
                return 'success'; // Return success even if already owned
            } else {
                skillTree.skills.push({ skill: skillId, level: 1, isEquipped: false });
                await skillTree.save({ session });
                return 'success';
            }
        }
    } catch (error) {
        return 'failed';
    }
};

/**
 * Award inventory item (outfit, weapon, hair, chest, etc.)
 * @param {String} characterid - Character ID
 * @param {String} itemType - Type of item ('outfit', 'weapon', 'hair', 'chest', etc.)
 * @param {String} itemId - Item ID
 * @param {Number} quantity - Quantity to award (default: 1)
 * @param {String} gender - Character gender for gendered items ('male' or 'female')
 * @param {Object} genderedId - Object with fid property for female variant
 * @param {Object} session - Mongoose session for transaction
 * @returns {String|Object} - 'success', 'failed', 'already_owned', 'incremented', or hair bundle info
 */
exports.awardInventoryItem = async (characterid, itemType, itemId, quantity = 1, gender = 'male', genderedId = null, session = null) => {
    try {
        // Handle gender-specific items
        let finalItemId = itemId;
        if (gender === 'female' && genderedId && genderedId.fid) {
            finalItemId = genderedId.fid;
        }

        // Map item types to inventory types
        const inventoryTypeMap = {
            'outfit': 'outfit',
            'skin': 'outfit',
            'weapon': 'weapon', 
            'hair': 'hair',
            'chest': 'chests',
            'chests': 'chests',
            'generic': 'item',
            'item': 'item',
            'freebie': 'freebie',
            'chapter': 'chapter'
        };

        const inventoryType = inventoryTypeMap[itemType] || itemType;

        // For non-stackable items, check if already owned
        const nonStackableTypes = ['outfit', 'weapon', 'hair'];
        if (nonStackableTypes.includes(itemType)) {
            const existingQ = CharacterInventory.findOne({ 
                owner: characterid, 
                type: inventoryType, 
                'items.item': finalItemId 
            });
            if (session) existingQ.session(session);
            const existing = await existingQ;
            
            if (existing) {
                return 'success'; // Return success even if already owned
            }
        }

        // For stackable items (chests), increment quantity if exists
        if (itemType === 'chest' || itemType === 'chests') {
            const existingChestQ = CharacterInventory.findOne({ 
                owner: characterid, 
                type: 'chests', 
                'items.item': finalItemId 
            });
            if (session) existingChestQ.session(session);
            const existingChest = await existingChestQ;
            
            if (existingChest) {
                await CharacterInventory.updateOne(
                    { owner: characterid, type: 'chests', 'items.item': finalItemId },
                    { $inc: { 'items.$.quantity': quantity } },
                    { session }
                );
                return 'incremented';
            }
        }

        // Add item to inventory
        await CharacterInventory.findOneAndUpdate(
            { owner: characterid, type: inventoryType },
            { $push: { items: { item: finalItemId, quantity } } },
            { upsert: true, session }
        );

        // Handle hair bundle for outfits/skins
        if ((itemType === 'outfit' || itemType === 'skin') && gethairbundle) {
            const hairId = gethairbundle(finalItemId);
            if (hairId && hairId !== "failed" && hairId !== "") {
                const existingHairQ = CharacterInventory.findOne({ 
                    owner: characterid, 
                    type: 'hair', 
                    'items.item': hairId 
                });
                if (session) existingHairQ.session(session);
                const existingHair = await existingHairQ;
                
                if (!existingHair) {
                    await CharacterInventory.findOneAndUpdate(
                        { owner: characterid, type: 'hair' },
                        { $push: { items: { item: hairId, quantity: 1 } } },
                        { upsert: true, session }
                    );
                    return { awarded: finalItemId, hairAwarded: hairId };
                } else {
                    return { awarded: finalItemId, hairAlreadyOwned: true };
                }
            }
        }

        return 'success';
    } catch (error) {
        return 'failed';
    }
};

/**
 * Award companion to character
 * @param {String} characterid - Character ID
 * @param {String} companionId - Companion ID
 * @param {Object} session - Mongoose session for transaction
 * @returns {String|Object} - 'success', 'failed', 'already_owned', or companion object if success
 */
exports.awardCompanion = async (characterid, companionId, session = null) => {
    try {
        const companionQ = Companion.findById(companionId);
        if (session) companionQ.session(session);
        const companion = await companionQ;
        
        if (!companion) {
            return 'failed';
        }

        const hasCompanionQ = CharacterCompanion.findOne({ owner: characterid, companion: companion._id });
        if (session) hasCompanionQ.session(session);
        const hasCompanion = await hasCompanionQ;
        
        if (hasCompanion) {
            return companion; // Return companion object even if already owned
        }

        await CharacterCompanion.create([{
            owner: characterid,
            companion: companion._id,
            name: companion.name
        }], { session });

        return companion; // Return companion object for original processing
    } catch (error) {
        return 'failed';
    }
};

/**
 * Apply all rewards from a pack purchase
 * @param {String} characterId - Character ID
 * @param {Array} packRewards - Array of reward objects from Packs.rewards
 * @param {Number} quantity - Quantity of packs purchased (multiplier for stackable rewards)
 * @param {Object} session - Mongoose session for transaction
 * @returns {Object} - { success: boolean, results: Array, failedReward?: Object }
 */
exports.applyPackRewards = async (characterId, packRewards, quantity = 1, session = null) => {
    try {
        // Get character data for gender
        const character = await Characterdata.findById(characterId).session(session);
        if (!character) {
            return { 
                success: false, 
                results: [], 
                failedReward: { error: 'Character not found' } 
            };
        }
        
        const characterGender = character.gender === 0 ? 'male' : 'female';
        const results = [];

        // Process each reward
        for (const reward of packRewards) {
            // Validate reward structure
            if (!validatePackReward(reward)) {
                return {
                    success: false,
                    results,
                    failedReward: { reward, error: 'Invalid reward structure' }
                };
            }

            let rewardResult = {
                rewardtype: reward.rewardtype,
                success: false,
                message: '',
                details: null
            };

            try {
                // Handle different reward types
                switch (reward.rewardtype.toLowerCase()) {
                    case 'crystal':
                    case 'coins': {
                        const amount = (reward.amount || 0) * quantity;
                        const currencyType = reward.rewardtype === 'crystal' ? 'crystal' : 'coins';
                        const result = await exports.awardCurrency(characterId, currencyType, amount, session);
                        rewardResult.success = result === 'success';
                        rewardResult.message = result === 'success' ? `Awarded ${amount} ${currencyType}` : 'Failed to award currency';
                        rewardResult.details = { amount, type: currencyType };
                        break;
                    }

                    case 'exp': {
                        const amount = (reward.amount || 0) * quantity;
                        const result = await exports.awardExperience(characterId, amount, session);
                        rewardResult.success = result !== 'failed';
                        rewardResult.message = result !== 'failed' ? `Awarded ${amount} EXP` : 'Failed to award EXP';
                        rewardResult.details = { amount, levelUpInfo: result !== 'failed' ? result : null };
                        break;
                    }

                    case 'badge': {
                        // Badges are not stackable - award once regardless of quantity
                        const badgeId = reward.reward?.id;
                        if (!badgeId && badgeId !== 0) {
                            rewardResult.message = 'Invalid badge ID';
                            break;
                        }
                        const result = await exports.awardBadge(characterId, badgeId, session);
                        rewardResult.success = result !== 'failed';
                        rewardResult.message = result !== 'failed' ? 'Badge awarded' : 'Failed to award badge';
                        rewardResult.details = { badgeId, status: typeof result === 'object' ? 'awarded' : result };
                        break;
                    }

                    case 'title': {
                        // Titles are not stackable - award once regardless of quantity
                        const titleId = reward.reward?.id;
                        if (!titleId && titleId !== 0) {
                            rewardResult.message = 'Invalid title ID';
                            break;
                        }
                        const result = await exports.awardTitle(characterId, titleId, session);
                        rewardResult.success = result !== 'failed';
                        rewardResult.message = result !== 'failed' ? 'Title awarded' : 'Failed to award title';
                        rewardResult.details = { titleId, status: typeof result === 'object' ? 'awarded' : result };
                        break;
                    }

                    case 'skill': {
                        // Skills are not stackable - award once regardless of quantity
                        const skillId = reward.reward?.id;
                        if (!skillId) {
                            rewardResult.message = 'Invalid skill ID';
                            break;
                        }
                        const result = await exports.awardSkill(characterId, skillId, session);
                        rewardResult.success = result !== 'failed';
                        rewardResult.message = result === 'new_skilltree' ? 'Skill tree created with skill' 
                            : result === 'success' ? 'Skill awarded' : 'Failed to award skill';
                        rewardResult.details = { skillId, status: result };
                        break;
                    }

                    case 'companion': {
                        // Companions are not stackable - award once regardless of quantity
                        const companionId = reward.reward?.id;
                        if (!companionId) {
                            rewardResult.message = 'Invalid companion ID';
                            break;
                        }
                        const result = await exports.awardCompanion(characterId, companionId, session);
                        rewardResult.success = result !== 'failed';
                        rewardResult.message = result !== 'failed' ? 'Companion awarded' : 'Failed to award companion';
                        rewardResult.details = { companionId, status: typeof result === 'object' ? 'awarded' : result };
                        break;
                    }

                    case 'weapon':
                    case 'outfit':
                    case 'hair':
                    case 'face':
                    case 'eyes':
                    case 'skincolor':
                    case 'skins': {
                        // Non-stackable items - award once regardless of quantity
                        // Use quantity=1 for these items regardless of pack quantity
                        const itemId = reward.reward?.id;
                        if (!itemId) {
                            rewardResult.message = `Invalid ${reward.rewardtype} ID`;
                            break;
                        }
                        
                        // Handle gendered items
                        const genderedId = reward.reward?.fid ? { fid: reward.reward.fid } : null;
                        
                        const result = await exports.awardInventoryItem(
                            characterId,
                            reward.rewardtype,
                            itemId,
                            1, // Always 1 for non-stackable items
                            characterGender,
                            genderedId,
                            session
                        );
                        
                        rewardResult.success = result !== 'failed';
                        rewardResult.message = result !== 'failed' ? `${reward.rewardtype} awarded` : `Failed to award ${reward.rewardtype}`;
                        rewardResult.details = { 
                            itemId, 
                            itemType: reward.rewardtype,
                            status: typeof result === 'object' ? 'awarded_with_bundle' : result,
                            genderedId: characterGender === 'female' && genderedId ? genderedId.fid : itemId
                        };
                        break;
                    }

                    case 'chest':
                    case 'chests': {
                        // Chests are stackable - multiply by quantity
                        const itemId = reward.reward?.id;
                        if (!itemId) {
                            rewardResult.message = 'Invalid chest ID';
                            break;
                        }
                        const result = await exports.awardInventoryItem(
                            characterId,
                            'chests',
                            itemId,
                            quantity, // Multiply chests by pack quantity
                            characterGender,
                            null,
                            session
                        );
                        rewardResult.success = result !== 'failed';
                        rewardResult.message = result === 'incremented' 
                            ? `Added ${quantity} chest(s)` 
                            : result !== 'failed' ? 'Chest awarded' : 'Failed to award chest';
                        rewardResult.details = { itemId, quantity, status: result };
                        break;
                    }

                    default:
                        rewardResult.message = `Unknown reward type: ${reward.rewardtype}`;
                        console.warn(`Unhandled pack reward type: ${reward.rewardtype}`);
                        break;
                }

            } catch (error) {
                console.error(`Error applying pack reward ${reward.rewardtype}:`, error);
                rewardResult.message = `Exception during reward application: ${error.message}`;
            }

            // If any reward fails critically, abort the whole pack
            if (!rewardResult.success) {
                return {
                    success: false,
                    results,
                    failedReward: { reward, error: rewardResult.message }
                };
            }

            results.push(rewardResult);
        }

        return {
            success: true,
            results
        };

    } catch (error) {
        console.error('Error in applyPackRewards:', error);
        return {
            success: false,
            results: [],
            failedReward: { error: error.message }
        };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Rank Rewards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Award rank rewards to a player
 * @param {Object} player - Player object (must have .owner, .rank, .character with gender)
 * @param {Array} rankrewarddata - Array of rank reward definitions
 * @param {Object} session - Mongoose session for transaction
 * @returns {Promise<Array>} - Array of results for each reward
 */
exports.awardRankRewards = async (player, rankrewarddata, session = null) => {
    const results = [];
    const userId = player.owner;
    const userRank = player.rank;
    const userGender = player.character?.gender || 'male';

    try {
        const rewardSet = rankrewarddata.find(r => r.rank.toString() === userRank.toString());
        if (!rewardSet) return [{ success: false, message: 'No reward for this rank' }];

        for (const reward of rewardSet.rewards) {
            try {
                switch (reward.rewardtype) {
                    case 'coins':
                    case 'crystal': {
                        const currencyResult = await exports.awardCurrency(userId, reward.rewardtype, reward.amount, session);
                        if (currencyResult === 'success') {
                            results.push({ success: true, type: reward.rewardtype, amount: reward.amount });
                        } else {
                            results.push({ success: false, type: reward.rewardtype, message: 'Failed to award currency' });
                        }
                        break;
                    }
                    case 'exp': {
                        const xpResult = await exports.awardExperience(userId, reward.amount, session);
                        if (xpResult === 'failed') {
                            results.push({ success: false, type: 'exp', message: 'Failed to add experience' });
                        } else {
                            results.push({ success: true, type: 'exp', amount: reward.amount, details: xpResult });
                        }
                        break;
                    }
                    case 'title': {
                        const titleResult = await exports.awardTitle(userId, reward.reward.id, session);
                        if (titleResult === 'failed') {
                            results.push({ success: false, type: 'title', message: 'Title not found' });
                        } else if (titleResult === 'already_owned') {
                            results.push({ success: false, type: 'title', message: 'Title already owned' });
                        } else {
                            results.push({ success: true, type: 'title', id: titleResult.index, name: titleResult.title });
                        }
                        break;
                    }
                    case 'badge': {
                        const badgeResult = await exports.awardBadge(userId, reward.reward.id, session);
                        if (badgeResult === 'failed') {
                            results.push({ success: false, type: 'badge', message: 'Badge not found' });
                        } else if (badgeResult === 'already_owned') {
                            results.push({ success: false, type: 'badge', message: 'Badge already owned' });
                        } else {
                            results.push({ success: true, type: 'badge', id: badgeResult.index, name: badgeResult.title });
                        }
                        break;
                    }
                    case 'outfit': {
                        let outfitId = reward.reward.id;
                        if (userGender === 'female' && reward.reward.fid) outfitId = reward.reward.fid;
                        const outfitResult = await exports.awardInventoryItem(userId, 'outfit', outfitId, 1, null, reward.reward, session);
                        if (outfitResult === 'already_owned') {
                            results.push({ success: false, type: 'outfit', message: 'Outfit already owned' });
                        } else if (outfitResult === 'failed') {
                            results.push({ success: false, type: 'outfit', message: 'Failed to award outfit' });
                        } else if (typeof outfitResult === 'object' && outfitResult.awarded) {
                            results.push({ success: true, type: 'outfit', id: outfitResult.awarded });
                            if (outfitResult.hairAwarded) {
                                results.push({ success: true, type: 'hair', id: outfitResult.hairAwarded });
                            } else if (outfitResult.hairAlreadyOwned) {
                                results.push({ success: true, type: 'hair', message: 'Hair already owned' });
                            }
                        } else {
                            results.push({ success: true, type: 'outfit', id: outfitId });
                        }
                        break;
                    }
                    case 'chest': {
                        let chestToAdd = reward.reward.id;
                        if (userGender === 'female' && reward.reward.fid) chestToAdd = reward.reward.fid;
                        const chestResult = await exports.awardInventoryItem(userId, 'chest', chestToAdd, 1, null, reward.reward, session);
                        if (chestResult === 'incremented') {
                            results.push({ success: true, type: 'chest', id: chestToAdd, message: 'Chest quantity incremented' });
                        } else if (chestResult === 'failed') {
                            results.push({ success: false, type: 'chest', message: 'Failed to award chest' });
                        } else {
                            results.push({ success: true, type: 'chest', id: chestToAdd, message: 'Chest granted' });
                        }
                        break;
                    }
                    case 'weapon': {
                        const weaponResult = await exports.awardInventoryItem(userId, 'weapon', reward.reward.id, 1, null, null, session);
                        if (weaponResult === 'already_owned') {
                            results.push({ success: false, type: 'weapon', message: 'Weapon already owned' });
                        } else if (weaponResult === 'failed') {
                            results.push({ success: false, type: 'weapon', message: 'Failed to award weapon' });
                        } else {
                            results.push({ success: true, type: 'weapon', id: reward.reward.id });
                        }
                        break;
                    }
                    case 'skill': {
                        const skillResult = await exports.awardSkill(userId, reward.reward.id, session);
                        if (skillResult === 'failed') {
                            results.push({ success: false, type: 'skill', message: 'Failed to award skill' });
                        } else if (skillResult === 'already_owned') {
                            results.push({ success: false, type: 'skill', message: 'Skill already owned' });
                        } else if (skillResult === 'new_skilltree') {
                            results.push({ success: true, type: 'skill', id: reward.reward.id, message: 'Skill awarded (new skilltree created)' });
                        } else {
                            results.push({ success: true, type: 'skill', id: reward.reward.id });
                        }
                        break;
                    }
                    default:
                        results.push({ success: false, type: reward.rewardtype, message: 'Unknown reward type' });
                }
            } catch (err) {
                results.push({ success: false, type: reward.rewardtype, error: err.message });
            }
        }

        return results;
    } catch (err) {
        console.error('Error awarding rank rewards:', err);
        return [{ success: false, message: `Error awarding rank rewards: ${err.message}` }];
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Battlepass Reward Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the appropriate item ID based on user gender (shared private helper)
 */
function getGenderedItem(reward, userGender) {
    if (reward.male && reward.female) {
        return userGender === 'male' ? reward.male.itemId : reward.female.itemId;
    }
    if (reward.variants && Array.isArray(reward.variants)) {
        const variant = reward.variants.find(v => v.gender === userGender);
        return variant ? variant.itemId : reward.variants[0]?.itemId;
    }
    if (reward.baseItemId && reward.femaleCounterpart) {
        return userGender === 'female' ? reward.femaleCounterpart : reward.baseItemId;
    }
    return reward.itemId;
}

/**
 * Utility to process battlepass tier rewards and determine what to award the user
 * @param {Object} reward - The reward object from the tier
 * @param {String} userGender - User's gender ("male" or "female")
 * @param {Array} outfitData - Array of outfit data for hair correlation
 * @param {Array} hairData - Array of hair data for hair correlation
 * @returns {Object} - Processed reward with type and items to award
 */
exports.processBattlepassReward = (reward, userGender, outfitData = [], hairData = []) => {
    if (!reward || typeof reward !== 'object') {
        return { type: 'invalid', items: [] };
    }

    const result = {
        type: reward.type || 'unknown',
        items: [],
        description: ''
    };

    switch (reward.type) {
        case 'badge':
            result.items.push({ type: 'badge', itemId: reward.itemId, amount: reward.amount || 1 });
            result.description = `Badge: ${reward.name || 'Unknown Badge'}`;
            break;

        case 'title':
            result.items.push({ type: 'title', itemId: reward.itemId, amount: reward.amount || 1 });
            result.description = `Title: ${reward.name || 'Unknown Title'}`;
            break;

        case 'weapon': {
            const weaponId = getGenderedItem(reward, userGender);
            result.items.push({ type: 'weapon', itemId: weaponId, amount: reward.amount || 1 });
            result.description = `Weapon: ${reward.name || 'Unknown Weapon'}`;
            break;
        }

        case 'skill':
            result.items.push({ type: 'skill', itemId: reward.itemId, amount: reward.amount || 1 });
            result.description = `Skill: ${reward.name || 'Unknown Skill'}`;
            break;

        case 'skin': {
            const skinId = getGenderedItem(reward, userGender);
            result.items.push({ type: 'skin', itemId: skinId, amount: reward.amount || 1 });
            if (reward.includeHair !== false && outfitData.length > 0 && hairData.length > 0) {
                const correlatedHair = getCorrelatedHairByOutfitId(skinId, outfitData, hairData);
                if (correlatedHair) {
                    result.items.push({ type: 'hair', itemId: correlatedHair._id, amount: 1 });
                    result.description = `Skin Bundle: ${reward.name || 'Unknown Skin'} with matching hair`;
                } else {
                    result.description = `Skin: ${reward.name || 'Unknown Skin'}`;
                }
            } else {
                result.description = `Skin: ${reward.name || 'Unknown Skin'}`;
            }
            break;
        }

        case 'exp':
            result.items.push({ type: 'exp', amount: reward.amount || 0 });
            result.description = `Experience: ${reward.amount || 0} XP`;
            break;

        case 'coins':
            result.items.push({ type: 'coins', amount: reward.amount || 0 });
            result.description = `Coins: ${reward.amount || 0}`;
            break;

        case 'crystal':
            result.items.push({ type: 'crystal', amount: reward.amount || 0 });
            result.description = `Crystals: ${reward.amount || 0}`;
            break;

        case 'chest':
            result.items.push({ type: 'chest', itemId: reward.itemId || reward.id || reward._id, amount: reward.amount || 1 });
            result.description = `Chest: ${reward.name || 'Unknown Chest'}`;
            break;

        case 'bundle':
            if (reward.items && Array.isArray(reward.items)) {
                reward.items.forEach(bundleItem => {
                    const processedItem = exports.processBattlepassReward(bundleItem, userGender, outfitData, hairData);
                    result.items.push(...processedItem.items);
                });
                result.description = `Bundle: ${reward.name || 'Multiple Items'}`;
            }
            break;

        default:
            result.type = 'unknown';
            result.description = 'Unknown reward type';
            break;
    }

    return result;
};

/**
 * Validate if a reward can be processed
 * @param {Object} reward - The reward object to validate
 * @returns {Boolean} - True if valid, false otherwise
 */
exports.validateReward = (reward) => {
    if (!reward || typeof reward !== 'object') return false;
    const validTypes = ['badge', 'title', 'weapon', 'skill', 'skin', 'exp', 'coins', 'crystal', 'chest', 'bundle'];
    if (!validTypes.includes(reward.type)) return false;
    if (['exp', 'coins', 'crystal'].includes(reward.type) && (!reward.amount || reward.amount <= 0)) return false;
    if (['badge', 'title', 'weapon', 'skill'].includes(reward.type) && !reward.itemId) return false;
    if (reward.type === 'skin') {
        const hasBasicId = reward.itemId;
        const hasGenderedIds = (reward.male && reward.female) ||
                               (reward.variants && Array.isArray(reward.variants)) ||
                               (reward.baseItemId);
        if (!hasBasicId && !hasGenderedIds) return false;
    }
    return true;
};

/**
 * Get reward summary for display purposes
 * @param {Object} reward - The reward object
 * @param {String} userGender - User's gender
 * @returns {Object} - Summary with name, type, and count
 */
exports.getRewardSummary = (reward, userGender) => {
    const processed = exports.processBattlepassReward(reward, userGender);
    return {
        type: processed.type,
        description: processed.description,
        itemCount: processed.items.length,
        items: processed.items.map(item => ({ type: item.type, amount: item.amount || 1 }))
    };
};

/**
 * Simple utility to determine reward type and return essential data
 * @param {Object} reward - The reward object from premiumReward/freeReward
 * @param {String} userGender - User's gender (0 for male, 1 for female) or ("male"/"female")
 * @returns {Object} - Simple reward object with type and essential data
 */
exports.determineRewardType = (reward, userGender = null) => {
    if (!reward || typeof reward !== 'object') return { type: 'invalid' };

    let genderStr = userGender;
    if (typeof userGender === 'number') {
        genderStr = userGender === 0 ? 'male' : 'female';
    }

    if (reward.type === 'exp' && reward.amount) return { type: 'exp', amount: reward.amount };
    if (reward.type === 'coins' && reward.amount) return { type: 'coins', amount: reward.amount };
    if (reward.type === 'crystal' && reward.amount) return { type: 'crystal', amount: reward.amount };

    if (['skin', 'skins', 'weapon', 'weapons', 'outfit', 'outfits'].includes(reward.type)) {
        let itemId = reward.id || reward._id;
        if (genderStr) {
            if (reward.gender && reward.gender !== genderStr) return { type: 'invalid' };
            if (genderStr === 'female' && reward.fid) itemId = reward.fid;
            else if (genderStr === 'male' && reward.id) itemId = reward.id;
        }
        let normalizedType = reward.type;
        if (reward.type === 'skins') normalizedType = 'skin';
        if (reward.type === 'weapons') normalizedType = 'weapon';
        if (reward.type === 'outfits') normalizedType = 'outfit';
        const correspondingHairId = gethairbundle(itemId);
        const hasHairBundle = !!(correspondingHairId && correspondingHairId !== 'failed' && correspondingHairId !== '');
        return { type: 'item', id: itemId, itemType: normalizedType, amount: reward.amount || 1, hasHairBundle };
    }

    if (reward.type === 'badge') return { type: 'badge', id: reward.id || reward._id, amount: reward.amount || 1 };
    if (reward.type === 'chest') return { type: 'chest', id: reward.id || reward._id || reward.itemId, amount: reward.amount || 1 };
    if (reward.type === 'title') return { type: 'title', id: reward.id || reward._id, amount: reward.amount || 1 };
    if (reward.type === 'item') return { type: 'item', id: reward.id || reward._id, itemType: 'generic', amount: reward.amount || 1 };
    if (reward.type === 'companion') return { type: 'companion', id: reward.id || reward._id, amount: reward.amount || 1 };
    if (reward.type === 'freebie') return { type: 'freebie', id: reward.id || reward._id, amount: reward.amount || 1 };
    if (reward.type === 'skill') return { type: 'skill', id: reward.id || reward._id, amount: reward.amount || 1 };
    if (reward.type === 'chapter') return { type: 'chapter', id: reward.id || reward._id, amount: reward.amount || 1 };
    if (reward.type === 'hair') return { type: 'item', id: reward.id || reward._id, itemType: 'hair', amount: reward.amount || 1 };

    console.warn('Unknown reward type:', reward.type);
    return { type: 'unknown' };
};

/**
 * Award battlepass reward to character based on reward type
 * @param {String} characterid - Character ID
 * @param {Object} processedReward - Processed reward from determineRewardType
 * @param {Object} session - Mongoose session for transaction
 * @returns {Object} - Result with success/failure
 */
exports.awardBattlepassReward = async (characterid, processedReward, session = null) => {
    try {
        switch (processedReward.type) {
            case 'exp': {
                const xpResult = await exports.awardExperience(characterid, processedReward.amount, session);
                if (xpResult === 'failed') return { success: false, message: 'Failed to award experience' };
                return { success: true, message: `Awarded ${processedReward.amount} experience`, details: xpResult };
            }

            case 'coins':
            case 'crystal': {
                const currencyResult = await exports.awardCurrency(characterid, processedReward.type, processedReward.amount, session);
                if (currencyResult === 'success') return { success: true, message: `Awarded ${processedReward.amount} ${processedReward.type}` };
                return { success: false, message: `Failed to award ${processedReward.type}` };
            }

            case 'item': {
                switch (processedReward.itemType) {
                    case 'chest': {
                        const chestResult = await exports.awardInventoryItem(characterid, 'chest', processedReward.id, processedReward.amount || 1, null, null, session);
                        if (chestResult === 'incremented') return { success: true, message: 'Chest quantity incremented' };
                        if (chestResult === 'failed') return { success: false, message: 'Failed to award chest' };
                        return { success: true, message: 'Chest granted' };
                    }
                    case 'badge': {
                        const badgeResult = await exports.awardBadge(characterid, processedReward.id, session);
                        if (badgeResult === 'failed') return { success: false, message: 'Badge not found' };
                        if (badgeResult === 'already_owned') return { success: false, message: 'Badge already owned' };
                        return { success: true, message: 'Awarded badge' };
                    }
                    case 'title': {
                        const titleResult = await exports.awardTitle(characterid, processedReward.id, session);
                        if (titleResult === 'failed') return { success: false, message: 'Title not found' };
                        if (titleResult === 'already_owned') return { success: false, message: 'Title already owned' };
                        return { success: true, message: 'Awarded title' };
                    }
                    case 'weapon': {
                        const weaponResult = await exports.awardInventoryItem(characterid, 'weapon', processedReward.id, processedReward.amount || 1, null, null, session);
                        if (weaponResult === 'already_owned') return { success: false, message: 'Weapon already owned' };
                        if (weaponResult === 'failed') return { success: false, message: 'Failed to award weapon' };
                        return { success: true, message: 'Awarded weapon' };
                    }
                    case 'skin':
                    case 'outfit': {
                        const outfitResult = await exports.awardInventoryItem(characterid, processedReward.itemType, processedReward.id, processedReward.amount || 1, null, null, session);
                        if (outfitResult === 'already_owned') return { success: false, message: 'Outfit already owned' };
                        if (outfitResult === 'failed') return { success: false, message: 'Failed to award outfit' };
                        if (typeof outfitResult === 'object' && outfitResult.awarded) {
                            if (outfitResult.hairAwarded) return { success: true, message: 'Awarded skin bundle (outfit + hair)' };
                            if (outfitResult.hairAlreadyOwned) return { success: true, message: 'Awarded skin bundle (outfit awarded, hair already owned)' };
                        }
                        return { success: true, message: 'Awarded skin (no matching hair found)' };
                    }
                    case 'hair': {
                        const hairResult = await exports.awardInventoryItem(characterid, 'hair', processedReward.id, processedReward.amount || 1, null, null, session);
                        if (hairResult === 'already_owned') return { success: false, message: 'Hair already owned' };
                        if (hairResult === 'failed') return { success: false, message: 'Failed to award hair' };
                        return { success: true, message: 'Awarded hair' };
                    }
                    case 'generic': {
                        const genericResult = await exports.awardInventoryItem(characterid, 'generic', processedReward.id, processedReward.amount || 1, null, null, session);
                        if (genericResult === 'failed') return { success: false, message: 'Failed to award item' };
                        return { success: true, message: 'Awarded item' };
                    }
                    default:
                        return { success: false, message: `Unknown item type: ${processedReward.itemType}` };
                }
            }

            case 'chest': {
                const chestResult = await exports.awardInventoryItem(characterid, 'chest', processedReward.id, processedReward.amount || 1, null, null, session);
                if (chestResult === 'incremented') return { success: true, message: 'Chest quantity incremented' };
                if (chestResult === 'failed') return { success: false, message: 'Failed to award chest' };
                return { success: true, message: 'Chest granted' };
            }

            case 'badge': {
                const directBadgeResult = await exports.awardBadge(characterid, processedReward.id, session);
                if (directBadgeResult === 'failed') return { success: false, message: 'Badge not found' };
                if (directBadgeResult === 'already_owned') return { success: false, message: 'Badge already owned' };
                return { success: true, message: 'Awarded badge' };
            }

            case 'title': {
                const directTitleResult = await exports.awardTitle(characterid, processedReward.id, session);
                if (directTitleResult === 'failed') return { success: false, message: 'Title not found' };
                if (directTitleResult === 'already_owned') return { success: false, message: 'Title already owned' };
                return { success: true, message: 'Awarded title' };
            }

            case 'companion': {
                const companionResult = await exports.awardCompanion(characterid, processedReward.id, session);
                if (companionResult === 'failed') return { success: false, message: 'Companion not found' };
                if (companionResult === 'already_owned') return { success: false, message: 'Companion already owned' };
                return { success: true, message: 'Awarded companion' };
            }

            case 'freebie': {
                const freebieResult = await exports.awardInventoryItem(characterid, 'freebie', processedReward.id, processedReward.amount || 1, null, null, session);
                if (freebieResult === 'failed') return { success: false, message: 'Failed to award freebie' };
                return { success: true, message: 'Awarded freebie' };
            }

            case 'skill': {
                const skillResult = await exports.awardSkill(characterid, processedReward.id, session);
                if (skillResult === 'failed') return { success: false, message: 'Skilltree not found' };
                if (skillResult === 'already_owned') return { success: false, message: 'Skill already owned' };
                return { success: true, message: 'Awarded skill' };
            }

            case 'chapter': {
                const chapterResult = await exports.awardInventoryItem(characterid, 'chapter', processedReward.id, processedReward.amount || 1, null, null, session);
                if (chapterResult === 'failed') return { success: false, message: 'Failed to award chapter' };
                return { success: true, message: 'Awarded chapter unlock' };
            }

            case 'bundle': {
                const bundleResults = [];
                for (const bundleItem of processedReward.items) {
                    const result = await exports.awardBattlepassReward(characterid, bundleItem, session);
                    bundleResults.push(result);
                }
                return { success: true, message: 'Awarded bundle', details: bundleResults };
            }

            default:
                return { success: false, message: `Unknown reward type: ${processedReward.type}` };
        }
    } catch (error) {
        console.error('Error awarding battlepass reward:', error);
        return { success: false, message: `Error awarding reward: ${error.message}` };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Reward Filter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filters and transforms rewards based on character gender and reward type
 * @param {Object} reward - The reward object to filter
 * @param {String} characterGender - The character's gender ('male' or 'female')
 * @returns {Promise<Object>} - The filtered reward object
 */
exports.filterRewardByGender = async (reward, characterGender) => {
    if (!reward || !characterGender) return reward;

    if (reward.type === 'badge') {
        try {
            const badge = await Badge.findById(reward.id);
            if (badge) return { type: reward.type, amount: reward.amount || 1, id: badge.index };
        } catch (error) {
            console.error('Error looking up badge:', error);
        }
        return { type: reward.type, amount: reward.amount || 1, id: reward.id };
    }

    if (reward.type === 'title') {
        try {
            const title = await Title.findById(reward.id);
            if (title) return { type: reward.type, amount: reward.amount || 1, id: title.index };
        } catch (error) {
            console.error('Error looking up title:', error);
        }
        return { type: reward.type, amount: reward.amount || 1, id: reward.id };
    }

    if (!['outfit', 'skin'].includes(reward.type)) return reward;

    if (reward.id && reward.fid) {
        return { type: reward.type, amount: reward.amount || 1, id: characterGender === 'male' ? reward.id : reward.fid };
    }

    if (reward.variants && Array.isArray(reward.variants)) {
        const appropriateVariant = reward.variants.find(v => v.gender === characterGender);
        if (appropriateVariant) return { type: reward.type, amount: reward.amount || 1, id: appropriateVariant.itemId };
    }

    return reward;
};