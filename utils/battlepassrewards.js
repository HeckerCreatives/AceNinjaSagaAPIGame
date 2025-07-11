const { getCorrelatedHairByOutfitId } = require('./bundle');
const Characterwallet = require('../models/Characterwallet');
const Characterdata = require('../models/Characterdata');
const { CharacterInventory } = require('../models/Market');
const { CharacterSkillTree } = require('../models/Skills');
const Badge = require('../models/Badge');
const Title = require('../models/Title');
const Characterbadge = require('../models/Characterbadges');
const Charactertitle = require('../models/Charactertitles');
const { gethairbundle } = require('./bundle');
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
            result.items.push({
                type: 'badge',
                itemId: reward.itemId,
                amount: reward.amount || 1
            });
            result.description = `Badge: ${reward.name || 'Unknown Badge'}`;
            break;

        case 'title':
            result.items.push({
                type: 'title',
                itemId: reward.itemId,
                amount: reward.amount || 1
            });
            result.description = `Title: ${reward.name || 'Unknown Title'}`;
            break;

        case 'weapon':
            // Check if gender-specific weapon
            const weaponId = getGenderedItem(reward, userGender);
            result.items.push({
                type: 'weapon',
                itemId: weaponId,
                amount: reward.amount || 1
            });
            result.description = `Weapon: ${reward.name || 'Unknown Weapon'}`;
            break;

        case 'skill':
            result.items.push({
                type: 'skill',
                itemId: reward.itemId,
                amount: reward.amount || 1
            });
            result.description = `Skill: ${reward.name || 'Unknown Skill'}`;
            break;

        case 'skin':
            // Get gender-specific skin
            const skinId = getGenderedItem(reward, userGender);
            result.items.push({
                type: 'skin',
                itemId: skinId,
                amount: reward.amount || 1
            });

            // Check if skin has correlated hair
            if (reward.includeHair !== false && outfitData.length > 0 && hairData.length > 0) {
                const correlatedHair = getCorrelatedHairByOutfitId(skinId, outfitData, hairData);
                if (correlatedHair) {
                    result.items.push({
                        type: 'hair',
                        itemId: correlatedHair._id,
                        amount: 1
                    });
                    result.description = `Skin Bundle: ${reward.name || 'Unknown Skin'} with matching hair`;
                } else {
                    result.description = `Skin: ${reward.name || 'Unknown Skin'}`;
                }
            } else {
                result.description = `Skin: ${reward.name || 'Unknown Skin'}`;
            }
            break;

        case 'exp':
            result.items.push({
                type: 'exp',
                amount: reward.amount || 0
            });
            result.description = `Experience: ${reward.amount || 0} XP`;
            break;

        case 'coins':
            result.items.push({
                type: 'coins',
                amount: reward.amount || 0
            });
            result.description = `Coins: ${reward.amount || 0}`;
            break;

        case 'crystal':
            result.items.push({
                type: 'crystal',
                amount: reward.amount || 0
            });
            result.description = `Crystals: ${reward.amount || 0}`;
            break;

        case 'bundle':
            // Handle multiple items in a bundle
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
 * Get the appropriate item ID based on user gender
 * @param {Object} reward - The reward object
 * @param {String} userGender - User's gender ("male" or "female")
 * @returns {String} - The appropriate item ID
 */
function getGenderedItem(reward, userGender) {
    // Option 1: Separate male/female fields
    if (reward.male && reward.female) {
        return userGender === 'male' ? reward.male.itemId : reward.female.itemId;
    }

    // Option 2: Variants array
    if (reward.variants && Array.isArray(reward.variants)) {
        const variant = reward.variants.find(v => v.gender === userGender);
        return variant ? variant.itemId : reward.variants[0]?.itemId;
    }

    // Option 3: Base item with counterpart
    if (reward.baseItemId && reward.femaleCounterpart) {
        return userGender === 'female' ? reward.femaleCounterpart : reward.baseItemId;
    }

    // Default: Return the main itemId
    return reward.itemId;
}

/**
 * Validate if a reward can be processed
 * @param {Object} reward - The reward object to validate
 * @returns {Boolean} - True if valid, false otherwise
 */
exports.validateReward = (reward) => {
    if (!reward || typeof reward !== 'object') {
        return false;
    }

    const validTypes = ['badge', 'title', 'weapon', 'skill', 'skin', 'exp', 'coins', 'crystal', 'bundle'];
    
    if (!validTypes.includes(reward.type)) {
        return false;
    }

    // Check if currency rewards have amounts
    if (['exp', 'coins', 'crystal'].includes(reward.type) && (!reward.amount || reward.amount <= 0)) {
        return false;
    }

    // Check if item rewards have itemId
    if (['badge', 'title', 'weapon', 'skill'].includes(reward.type) && !reward.itemId) {
        return false;
    }

    // Check if skin rewards have proper gender setup
    if (reward.type === 'skin') {
        const hasBasicId = reward.itemId;
        const hasGenderedIds = (reward.male && reward.female) || 
                              (reward.variants && Array.isArray(reward.variants)) ||
                              (reward.baseItemId);
        
        if (!hasBasicId && !hasGenderedIds) {
            return false;
        }
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
        items: processed.items.map(item => ({
            type: item.type,
            amount: item.amount || 1
        }))
    };
};

/**
 * Simple utility to determine reward type and return essential data
 * @param {Object} reward - The reward object from premiumReward/freeReward
 * @param {String} userGender - User's gender (0 for male, 1 for female) or ("male"/"female")
 * @returns {Object} - Simple reward object with type and essential data
 */
exports.determineRewardType = (reward, userGender = null) => {
    if (!reward || typeof reward !== 'object') {
        return { type: 'invalid' };
    }

    // Normalize gender to string for easier comparison
    let genderStr = userGender;
    if (typeof userGender === 'number') {
        genderStr = userGender === 0 ? 'male' : 'female';
    }

    // Check if it's a currency reward (exp, coins, crystal)
    if (reward.type === 'exp' && reward.amount) {
        return {
            type: 'exp',
            amount: reward.amount
        };
    }

    if (reward.type === 'coins' && reward.amount) {
        return {
            type: 'coins',
            amount: reward.amount
        };
    }

    if (reward.type === 'crystal' && reward.amount) {
        return {
            type: 'crystal',
            amount: reward.amount
        };
    }

    // Handle items (skin, weapon, etc.)
    if (['skin', 'skins', 'weapon', 'weapons', 'outfit', 'outfits'].includes(reward.type)) {
        let itemId = reward.id || reward._id;
        
        // Handle gendered items
        if (genderStr && ['skin', 'skins', 'weapon', 'weapons', 'outfit', 'outfits'].includes(reward.type)) {
            // If item has gender property, check if it matches character gender
            if (reward.gender) {
                if (reward.gender !== genderStr) {
                    // This item is for wrong gender, skip it
                    return { type: 'invalid' };
                }
            }
            
            // Handle id/fid structure for gender variants
            if (genderStr === 'female' && reward.fid) {
                itemId = reward.fid; // Use female ID
            } else if (genderStr === 'male' && reward.id) {
                itemId = reward.id; // Use male ID
            }
        }

        // Normalize type to singular form for consistent processing
        let normalizedType = reward.type;
        if (reward.type === 'skins') normalizedType = 'skin';
        if (reward.type === 'weapons') normalizedType = 'weapon';
        if (reward.type === 'outfits') normalizedType = 'outfit';

        // Check if skin has corresponding hair bundle
        let hasHairBundle = false;
        if (['skin', 'outfit'].includes(normalizedType)) {
            const correspondingHairId = gethairbundle(itemId);
            hasHairBundle = !!(correspondingHairId && correspondingHairId !== "failed" && correspondingHairId !== "");
        }

        return {
            type: 'item',
            id: itemId,
            itemType: normalizedType, // Use normalized singular form
            amount: reward.amount || 1,
            hasHairBundle: hasHairBundle
        };
    }

    // Handle badge rewards
    if (reward.type === 'badge') {
        return {
            type: 'badge',
            id: reward.id || reward._id,
            amount: reward.amount || 1
        };
    }

    // Handle title rewards
    if (reward.type === 'title') {
        return {
            type: 'title',
            id: reward.id || reward._id,
            amount: reward.amount || 1
        };
    }

    // If we reach here, it's an unknown reward type
    console.warn('Unknown reward type:', reward.type);
    return { type: 'unknown' };
};
/**
 * Helper function to get gendered item ID
 * @param {Object} reward - The reward object
 * @param {String} userGender - User's gender
 * @returns {String} - The appropriate item ID
 */
function getGenderedItemId(reward, userGender) {
    // Option 1: Separate male/female fields
    if (reward.male && reward.female) {
        return userGender === 'male' ? reward.male.itemId : reward.female.itemId;
    }

    // Option 2: Variants array
    if (reward.variants && Array.isArray(reward.variants)) {
        const variant = reward.variants.find(v => v.gender === userGender);
        return variant ? variant.itemId : reward.variants[0]?.itemId;
    }

    // Option 3: Base item with counterpart
    if (reward.baseItemId && reward.femaleCounterpart) {
        return userGender === 'female' ? reward.femaleCounterpart : reward.baseItemId;
    }

    // Default: Return the main itemId
    return reward.itemId;
}

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
            case 'exp':
                // Award experience points
                const character = await Characterdata.findById(characterid).session(session);
                if (character) {
                    character.experience = (character.experience || 0) + processedReward.amount;
                    // Calculate level up if needed
                    await character.save({ session });
                }
                return { success: true, message: `Awarded ${processedReward.amount} experience` };

            case 'coins':
            case 'crystal':
                // Award currency to wallet
                await Characterwallet.findOneAndUpdate(
                    { owner: characterid, type: processedReward.type },
                    { $inc: { amount: processedReward.amount } },
                    { upsert: true, session }
                );
                return { success: true, message: `Awarded ${processedReward.amount} ${processedReward.type}` };

            case 'skill':
                // Award skill to character skill tree
                const skillTree = await CharacterSkillTree.findOne({ owner: characterid }).session(session);
                if (skillTree) {
                    // Check if skill already exists
                    const existingSkill = skillTree.skills.find(s => s.skill.toString() === processedReward.id);
                    if (!existingSkill) {
                        skillTree.skills.push({
                            skill: processedReward.id,
                            level: 1,
                            isEquipped: false
                        });
                        await skillTree.save({ session });
                    }
                }
                return { success: true, message: `Awarded skill` };

            case 'item':
                switch (processedReward.itemType) {
                    case 'badge':
                        // Add badge to character's badge collection
                        const badge = await Badge.findById(processedReward.id).session(session);
                        if (badge) {
                            // Check if character already has this badge
                            const existingBadge = await Characterbadge.findOne({ 
                                owner: characterid, 
                                index: badge.index 
                            }).session(session);
                            
                            if (!existingBadge) {
                                await Characterbadge.create([{
                                    owner: characterid,
                                    badge: badge._id,
                                    index: badge.index,
                                    name: badge.title
                                }], { session });
                            }
                        }
                        return { success: true, message: `Awarded badge` };

                    case 'title':
                        // Add title to character's title collection
                        const title = await Title.findById(processedReward.id).session(session);
                        if (title) {
                            // Check if character already has this title
                            const existingTitle = await Charactertitle.findOne({ 
                                owner: characterid, 
                                index: title.index 
                            }).session(session);
                            
                            if (!existingTitle) {
                                await Charactertitle.create([{
                                    owner: characterid,
                                    title: title._id,
                                    index: title.index,
                                    name: title.title
                                }], { session });
                            }
                        }
                        return { success: true, message: `Awarded title` };

                    case 'weapon':
                        // Add weapon to inventory
                        await CharacterInventory.findOneAndUpdate(
                            { owner: characterid, type: 'weapon' },
                            {
                                $push: {
                                    items: {
                                        item: processedReward.id,
                                        quantity: processedReward.amount || 1
                                    }
                                }
                            },
                            { upsert: true, session }
                        );
                        return { success: true, message: `Awarded weapon` };

                    case 'skin':
                        // Add skin to inventory
                        await CharacterInventory.findOneAndUpdate(
                            { owner: characterid, type: 'outfit' },
                            {
                                $push: {
                                    items: {
                                        item: processedReward.id,
                                        quantity: processedReward.amount || 1
                                    }
                                }
                            },
                            { upsert: true, session }
                        );

                        // Check if skin has corresponding hair bundle
                        const correspondingHairId = gethairbundle(processedReward.id);
                        
                        if (correspondingHairId && correspondingHairId !== "failed" && correspondingHairId !== "") {
                            // Award the corresponding hair as well
                            await CharacterInventory.findOneAndUpdate(
                                { owner: characterid, type: 'hair' },
                                {
                                    $push: {
                                        items: {
                                            item: correspondingHairId,
                                            quantity: 1
                                        }
                                    }
                                },
                                { upsert: true, session }
                            );
                            console.log(`Awarded skin bundle (outfit + hair) for character ${characterid}`);
                            return { success: true, message: `Awarded skin bundle (outfit + hair)` };
                        } else {
                            // No corresponding hair found, just return skin success
                            return { success: true, message: `Awarded skin (no matching hair found)` };
                        }

                    default:
                        return { success: false, message: `Unknown item type: ${processedReward.itemType}` };
                }

            case 'bundle':
                // Process each item in bundle
                const results = [];
                for (const bundleItem of processedReward.items) {
                    const result = await exports.awardBattlepassReward(characterid, bundleItem, session);
                    results.push(result);
                }
                return { success: true, message: `Awarded bundle`, details: results };

            default:
                return { success: false, message: `Unknown reward type: ${processedReward.type}` };
        }
    } catch (error) {
        console.error('Error awarding battlepass reward:', error);
        return { success: false, message: `Error awarding reward: ${error.message}` };
    }
};
