const Characterwallet = require('../models/Characterwallet');
const { CharacterInventory } = require('../models/Market');
const Badge = require('../models/Badge');
const Title = require('../models/Title');
const Characterbadge = require('../models/Characterbadges');
const Charactertitle = require('../models/Charactertitles');
const { CharacterSkillTree } = require('../models/Skills');
const { Companion, CharacterCompanion } = require('../models/Companion');
const Chapter = require('../models/Chapter');
const { gethairbundle } = require('./bundle');
const { addXPAndLevel } = require('./leveluptools');
const { addwallet } = require('./wallettools');
const { validatePackReward } = require('./packtools');
const { awardChestReward } = require('./chesttools');
const Characterdata = require('../models/Characterdata');

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

// Note: Individual awarding functions above should be used directly in switch cases
// of battlepassrewards.js and rankrewards.js, similar to how addXPAndLevel is used