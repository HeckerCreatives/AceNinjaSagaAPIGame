const { getCorrelatedHairByOutfitId } = require('./bundle');
const Characterwallet = require('../models/Characterwallet');
const Characterdata = require('../models/Characterdata');
const { CharacterInventory, Item } = require('../models/Market');
const { CharacterSkillTree } = require('../models/Skills');
const Badge = require('../models/Badge');
const Title = require('../models/Title');
const { Companion, CharacterCompanion } = require('../models/Companion');
const Chapter = require('../models/Chapter');
const Characterbadges = require('../models/Characterbadges');
const Charactertitles = require('../models/Charactertitles');
const { gethairbundle } = require('./bundle');
const { addXPAndLevel } = require('./leveluptools');
const { 
    awardCurrency, 
    awardExperience, 
    awardBadge, 
    awardTitle, 
    awardSkill, 
    awardInventoryItem, 
    awardCompanion 
} = require('./rewardtools');
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

        case 'chest':
            // Chest reward: reference to a Chest item in the Market
            result.items.push({
                type: 'chest',
                itemId: reward.itemId || reward.id || reward._id,
                amount: reward.amount || 1
            });
            result.description = `Chest: ${reward.name || 'Unknown Chest'}`;
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


        case 'item':
        

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

    const validTypes = ['badge', 'title', 'weapon', 'skill', 'skin', 'exp', 'coins', 'crystal', 'chest', 'bundle'];
    
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

    // Handle chest rewards
    if (reward.type === 'chest') {
        return {
            type: 'chest',
            id: reward.id || reward._id || reward.itemId,
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

    // Handle item rewards (generic item type)
    if (reward.type === 'item') {
        return {
            type: 'item',
            id: reward.id || reward._id,
            itemType: 'generic', // Generic item
            amount: reward.amount || 1
        };
    }

    // Handle companion rewards
    if (reward.type === 'companion') {
        return {
            type: 'companion',
            id: reward.id || reward._id,
            amount: reward.amount || 1
        };
    }

    // Handle freebie rewards
    if (reward.type === 'freebie') {
        return {
            type: 'freebie',
            id: reward.id || reward._id,
            amount: reward.amount || 1
        };
    }

    // Handle skill rewards
    if (reward.type === 'skill') {
        return {
            type: 'skill',
            id: reward.id || reward._id,
            amount: reward.amount || 1
        };
    }

    // Handle chapter rewards
    if (reward.type === 'chapter') {
        return {
            type: 'chapter',
            id: reward.id || reward._id,
            amount: reward.amount || 1
        };
    }

    // Handle hair rewards
    if (reward.type === 'hair') {
        return {
            type: 'item',
            id: reward.id || reward._id,
            itemType: 'hair',
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
                // Use centralized XP/level utility to handle level ups and caps
                const xpResult = await awardExperience(characterid, processedReward.amount, session);
                if (xpResult === 'failed') return { success: false, message: 'Failed to award experience' };
                return { success: true, message: `Awarded ${processedReward.amount} experience`, details: xpResult };

            case 'coins':
            case 'crystal':
                // Use centralized currency utility
                const currencyResult = await awardCurrency(characterid, processedReward.type, processedReward.amount, session);
                if (currencyResult === 'success') {
                    return { success: true, message: `Awarded ${processedReward.amount} ${processedReward.type}` };
                } else {
                    return { success: false, message: `Failed to award ${processedReward.type}` };
                }

            case 'item':
                switch (processedReward.itemType) {
                    case 'chest':
                        // Award chest to character inventory (stackable)
                        const chestResult = await awardInventoryItem(characterid, 'chest', processedReward.id, processedReward.amount || 1, null, null, session);
                        if (chestResult === 'incremented') {
                            return { success: true, message: `Chest quantity incremented` };
                        } else if (chestResult === 'failed') {
                            return { success: false, message: `Failed to award chest` };
                        } else {
                            return { success: true, message: `Chest granted` };
                        }

                    case 'badge':
                        // Use centralized badge utility
                        const badgeResult = await awardBadge(characterid, processedReward.id, session);
                        if (badgeResult === 'failed') {
                            return { success: false, message: `Badge not found` };
                        } else if (badgeResult === 'already_owned') {
                            return { success: false, message: `Badge already owned` };
                        } else {
                            return { success: true, message: `Awarded badge` };
                        }

                    case 'title':
                        // Use centralized title utility
                        const titleResult = await awardTitle(characterid, processedReward.id, session);
                        if (titleResult === 'failed') {
                            return { success: false, message: `Title not found` };
                        } else if (titleResult === 'already_owned') {
                            return { success: false, message: `Title already owned` };
                        } else {
                            return { success: true, message: `Awarded title` };
                        }

                    case 'weapon':
                        // Award weapon to inventory
                        const weaponResult = await awardInventoryItem(characterid, 'weapon', processedReward.id, processedReward.amount || 1, null, null, session);
                        if (weaponResult === 'already_owned') {
                            return { success: false, message: `Weapon already owned` };
                        } else if (weaponResult === 'failed') {
                            return { success: false, message: `Failed to award weapon` };
                        } else {
                            return { success: true, message: `Awarded weapon` };
                        }

                    case 'skin':
                    case 'outfit':
                        // Award skin/outfit to inventory (includes hair bundle logic)
                        const outfitResult = await awardInventoryItem(characterid, processedReward.itemType, processedReward.id, processedReward.amount || 1, null, null, session);
                        if (outfitResult === 'already_owned') {
                            return { success: false, message: `Outfit already owned` };
                        } else if (outfitResult === 'failed') {
                            return { success: false, message: `Failed to award outfit` };
                        } else if (typeof outfitResult === 'object' && outfitResult.awarded) {
                            if (outfitResult.hairAwarded) {
                                console.log(`Awarded skin bundle (outfit + hair) for character ${characterid}`);
                                return { success: true, message: `Awarded skin bundle (outfit + hair)` };
                            } else if (outfitResult.hairAlreadyOwned) {
                                return { success: true, message: `Awarded skin bundle (outfit awarded, hair already owned)` };
                            }
                        } else {
                            return { success: true, message: `Awarded skin (no matching hair found)` };
                        }

                    case 'hair':
                        // Award hair to inventory
                        const hairResult = await awardInventoryItem(characterid, 'hair', processedReward.id, processedReward.amount || 1, null, null, session);
                        if (hairResult === 'already_owned') {
                            return { success: false, message: `Hair already owned` };
                        } else if (hairResult === 'failed') {
                            return { success: false, message: `Failed to award hair` };
                        } else {
                            return { success: true, message: `Awarded hair` };
                        }
                        
                    case 'generic':
                        // Award generic item to inventory
                        const genericResult = await awardInventoryItem(characterid, 'generic', processedReward.id, processedReward.amount || 1, null, null, session);
                        if (genericResult === 'failed') {
                            return { success: false, message: `Failed to award item` };
                        } else {
                            return { success: true, message: `Awarded item` };
                        }

                    default:
                        return { success: false, message: `Unknown item type: ${processedReward.itemType}` };
                }

            case 'chest':
                // Award chest to character inventory (stackable)
                const chestResult = await awardInventoryItem(characterid, 'chest', processedReward.id, processedReward.amount || 1, null, null, session);
                if (chestResult === 'incremented') {
                    return { success: true, message: `Chest quantity incremented` };
                } else if (chestResult === 'failed') {
                    return { success: false, message: `Failed to award chest` };
                } else {
                    return { success: true, message: `Chest granted` };
                }

            case 'badge':
                // Use centralized badge utility (direct badge reward, not item)
                const directBadgeResult = await awardBadge(characterid, processedReward.id, session);
                if (directBadgeResult === 'failed') {
                    console.warn(`Badge with index ${processedReward.id} not found`);
                    return { success: false, message: `Badge not found` };
                } else if (directBadgeResult === 'already_owned') {
                    return { success: false, message: `Badge already owned` };
                } else {
                    return { success: true, message: `Awarded badge` };
                }

            case 'title':
                // Use centralized title utility (direct title reward, not item)
                const directTitleResult = await awardTitle(characterid, processedReward.id, session);
                if (directTitleResult === 'failed') {
                    console.warn(`Title with index ${processedReward.id} not found`);
                    return { success: false, message: `Title not found` };
                } else if (directTitleResult === 'already_owned') {
                    return { success: false, message: `Title already owned` };
                } else {
                    return { success: true, message: `Awarded title` };
                }

            case 'companion':
                // Use centralized companion utility
                const companionResult = await awardCompanion(characterid, processedReward.id, session);
                if (companionResult === 'failed') {
                    return { success: false, message: `Companion not found` };
                } else if (companionResult === 'already_owned') {
                    return { success: false, message: `Companion already owned` };
                } else {
                    return { success: true, message: `Awarded companion` };
                }

            case 'freebie':
                // Award freebie to inventory
                const freebieResult = await awardInventoryItem(characterid, 'freebie', processedReward.id, processedReward.amount || 1, null, null, session);
                if (freebieResult === 'failed') {
                    return { success: false, message: `Failed to award freebie` };
                } else {
                    return { success: true, message: `Awarded freebie` };
                }

            case 'skill':
                // Use centralized skill utility
                const skillResult = await awardSkill(characterid, processedReward.id, session);
                if (skillResult === 'failed') {
                    return { success: false, message: `Skilltree not found` };
                } else if (skillResult === 'already_owned') {
                    return { success: false, message: `Skill already owned` };
                } else {
                    return { success: true, message: `Awarded skill` };
                }

            case 'chapter':
                // Award chapter to inventory
                const chapterResult = await awardInventoryItem(characterid, 'chapter', processedReward.id, processedReward.amount || 1, null, null, session);
                if (chapterResult === 'failed') {
                    return { success: false, message: `Failed to award chapter` };
                } else {
                    return { success: true, message: `Awarded chapter unlock` };
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




// exports.awardBattlepassReward = async (characterid, processedReward, session = null) => {
//     try {
//         switch (processedReward.type) {
//             case 'exp':
//                 // Award experience points
//                 const character = await Characterdata.findById(characterid).session(session);
//                 if (character) {
//                     character.experience = (character.experience || 0) + processedReward.amount;
//                     // Calculate level up if needed
//                     await character.save({ session });
//                 }
//                 return { success: true, message: `Awarded ${processedReward.amount} experience` };

//             case 'coins':
//             case 'crystal':
//                 // Award currency to wallet
//                 await Characterwallet.findOneAndUpdate(
//                     { owner: characterid, type: processedReward.type },
//                     { $inc: { amount: processedReward.amount } },
//                     { upsert: true, session }
//                 );
//                 return { success: true, message: `Awarded ${processedReward.amount} ${processedReward.type}` };

//             case 'item':
//                 switch (processedReward.itemType) {
//                     case 'badge':
//                         // Add badge to character's badge collection
//                         const badge = await Badge.findById(processedReward.id).session(session);
//                         if (badge) {
//                             // Check if character already has this badge
//                             const existingBadge = await Characterbadges.findOne({ 
//                                 owner: characterid, 
//                                 index: badge.index 
//                             }).session(session);
                            
//                             if (existingBadge) {
//                                 // Give 50% of badge value as currency instead
//                                 const compensationAmount = Math.floor((badge.price || 100) * 0.5);
//                                 await Characterwallet.findOneAndUpdate(
//                                     { owner: characterid, type: badge.currency || 'coins' },
//                                     { $inc: { amount: compensationAmount } },
//                                     { upsert: true, session }
//                                 );
//                                 return { success: true, message: `Badge already owned, awarded ${compensationAmount} ${badge.currency || 'coins'} instead` };
//                             }
                            
//                             await Characterbadges.create([{
//                                 owner: characterid,
//                                 badge: badge._id,
//                                 index: badge.index,
//                                 name: badge.title
//                             }], { session });
//                         }
//                         return { success: true, message: `Awarded badge` };

//                     case 'title':
//                         // Add title to character's title collection
//                         const title = await Title.findById(processedReward.id).session(session);
//                         if (title) {
//                             // Check if character already has this title
//                             const existingTitle = await Charactertitles.findOne({ 
//                                 owner: characterid, 
//                                 index: title.index 
//                             }).session(session);
                            
//                             if (existingTitle) {
//                                 // Give 50% of title value as currency instead
//                                 const compensationAmount = Math.floor((title.price || 150) * 0.5);
//                                 await Characterwallet.findOneAndUpdate(
//                                     { owner: characterid, type: title.currency || 'coins' },
//                                     { $inc: { amount: compensationAmount } },
//                                     { upsert: true, session }
//                                 );
//                                 return { success: true, message: `Title already owned, awarded ${compensationAmount} ${title.currency || 'coins'} instead` };
//                             }
                            
//                             await Charactertitles.create([{
//                                 owner: characterid,
//                                 title: title._id,
//                                 index: title.index,
//                                 name: title.title
//                             }], { session });
//                         }
//                         return { success: true, message: `Awarded title` };

//                     case 'weapon':
//                         // Add weapon to inventory
//                         const existingWeapon = await CharacterInventory.findOne({ owner: characterid, type: 'weapon', 'items.item': processedReward.id }).session(session);
//                         if (existingWeapon) {
//                             // Get weapon details and give 50% compensation
//                             const weaponItem = await Item.findById(processedReward.id).session(session);
//                             if (weaponItem) {
//                                 const compensationAmount = Math.floor((weaponItem.price || 200) * 0.5);
//                                 await Characterwallet.findOneAndUpdate(
//                                     { owner: characterid, type: weaponItem.currency || 'coins' },
//                                     { $inc: { amount: compensationAmount } },
//                                     { upsert: true, session }
//                                 );
//                                 return { success: true, message: `Weapon already owned, awarded ${compensationAmount} ${weaponItem.currency || 'coins'} instead` };
//                             }
//                             return { success: false, message: `Weapon already owned` };
//                         }
//                         await CharacterInventory.findOneAndUpdate(
//                             { owner: characterid, type: 'weapon' },
//                             {
//                                 $push: {
//                                     items: {
//                                         item: processedReward.id,
//                                         quantity: processedReward.amount || 1
//                                     }
//                                 }
//                             },
//                             { upsert: true, session }
//                         );
//                         return { success: true, message: `Awarded weapon` };

//                     case 'skin':
//                     case 'outfit':
//                         // Add skin/outfit to inventory
//                         const existingOutfit = await CharacterInventory.findOne({ owner: characterid, type: 'outfit', 'items.item': processedReward.id }).session(session);
//                         if (existingOutfit) {
//                             // Get outfit details and give 50% compensation
//                             const outfitItem = await Item.findById(processedReward.id).session(session);
//                             if (outfitItem) {
//                                 const compensationAmount = Math.floor((outfitItem.price || 300) * 0.5);
//                                 await Characterwallet.findOneAndUpdate(
//                                     { owner: characterid, type: outfitItem.currency || 'coins' },
//                                     { $inc: { amount: compensationAmount } },
//                                     { upsert: true, session }
//                                 );
//                                 return { success: true, message: `Outfit already owned, awarded ${compensationAmount} ${outfitItem.currency || 'coins'} instead` };
//                             }
//                             return { success: false, message: `Outfit already owned` };
//                         }
//                         await CharacterInventory.findOneAndUpdate(
//                             { owner: characterid, type: 'outfit' },
//                             {
//                                 $push: {
//                                     items: {
//                                         item: processedReward.id,
//                                         quantity: processedReward.amount || 1
//                                     }
//                                 }
//                             },
//                             { upsert: true, session }
//                         );

//                         // Check if skin has corresponding hair bundle
//                         const correspondingHairId = gethairbundle(processedReward.id);
                        
//                         if (correspondingHairId && correspondingHairId !== "failed" && correspondingHairId !== "") {
//                             // Award the corresponding hair as well
//                             const existingHair = await CharacterInventory.findOne({ owner: characterid, type: 'hair', 'items.item': correspondingHairId }).session(session);
//                             if (existingHair) {
//                                 // Hair already exists, give compensation for hair too
//                                 const hairItem = await Item.findById(correspondingHairId).session(session);
//                                 if (hairItem) {
//                                     const hairCompensation = Math.floor((hairItem.price || 150) * 0.5);
//                                     await Characterwallet.findOneAndUpdate(
//                                         { owner: characterid, type: hairItem.currency || 'coins' },
//                                         { $inc: { amount: hairCompensation } },
//                                         { upsert: true, session }
//                                     );
//                                     return { success: true, message: `Awarded skin bundle (outfit awarded, hair already owned - awarded ${hairCompensation} ${hairItem.currency || 'coins'} for hair)` };
//                                 }
//                                 return { success: true, message: `Awarded skin bundle (outfit awarded, hair already owned)` };
//                             }
//                             await CharacterInventory.findOneAndUpdate(
//                                 { owner: characterid, type: 'hair' },
//                                 {
//                                     $push: {
//                                         items: {
//                                             item: correspondingHairId,
//                                             quantity: 1
//                                         }
//                                     }
//                                 },
//                                 { upsert: true, session }
//                             );
//                             console.log(`Awarded skin bundle (outfit + hair) for character ${characterid}`);
//                             return { success: true, message: `Awarded skin bundle (outfit + hair)` };
//                         } else {
//                             // No corresponding hair found, just return skin success
//                             return { success: true, message: `Awarded skin (no matching hair found)` };
//                         }

//                     case 'hair':
//                         // Add hair to inventory
//                         const existingHair = await CharacterInventory.findOne({ owner: characterid, type: 'hair', 'items.item': processedReward.id }).session(session);
//                         if (existingHair) {
//                             // Get hair details and give 50% compensation
//                             const hairItem = await Item.findById(processedReward.id).session(session);
//                             if (hairItem) {
//                                 const compensationAmount = Math.floor((hairItem.price || 150) * 0.5);
//                                 await Characterwallet.findOneAndUpdate(
//                                     { owner: characterid, type: hairItem.currency || 'coins' },
//                                     { $inc: { amount: compensationAmount } },
//                                     { upsert: true, session }
//                                 );
//                                 return { success: true, message: `Hair already owned, awarded ${compensationAmount} ${hairItem.currency || 'coins'} instead` };
//                             }
//                             return { success: false, message: `Hair already owned` };
//                         }
                        
//                         await CharacterInventory.findOneAndUpdate(
//                             { owner: characterid, type: 'hair' },
//                             {
//                                 $push: {
//                                     items: {
//                                         item: processedReward.id,
//                                         quantity: processedReward.amount || 1
//                                     }
//                                 }
//                             },
//                             { upsert: true, session }
//                         );
//                         return { success: true, message: `Awarded hair` };                    case 'generic':
//                         // Handle generic items - add to general inventory
//                         await CharacterInventory.findOneAndUpdate(
//                             { owner: characterid, type: 'item' },
//                             {
//                                 $push: {
//                                     items: {
//                                         item: processedReward.id,
//                                         quantity: processedReward.amount || 1
//                                     }
//                                 }
//                             },
//                             { upsert: true, session }
//                         );
//                         return { success: true, message: `Awarded item` };

//                     default:
//                         return { success: false, message: `Unknown item type: ${processedReward.itemType}` };
//                 }

//             case 'badge':
//                 // Add badge to character's badge collection
//                 const badge = await Badge.findOne({ index: processedReward.id }).session(session);
//                 if (badge) {
//                     // Check if character already has this badge
//                     const existingBadge = await Characterbadges.findOne({ 
//                         owner: characterid, 
//                         index: badge.index 
//                     }).session(session);
                    
//                     if (existingBadge) {
//                         // Give 50% of badge value as currency instead
//                         const compensationAmount = Math.floor(100 * 0.5);
//                         await Characterwallet.findOneAndUpdate(
//                             { owner: characterid, type: badge.currency || 'coins' },
//                             { $inc: { amount: compensationAmount } },
//                             { upsert: true, session }
//                         );
//                         return { success: true, message: `Badge already owned, awarded ${compensationAmount} ${badge.currency || 'coins'} instead` };
//                     }
                    
//                     await Characterbadges.create([{
//                         owner: characterid,
//                         badge: badge._id,
//                         index: badge.index,
//                         name: badge.title
//                     }], { session });
//                 }
//                 return { success: true, message: `Awarded badge` };

//             case 'title':
//                 // Add title to character's title collection
//                 const title = await Title.findOne({ index: processedReward.id }).session(session);
//                 if (title) {
//                     // Check if character already has this title
//                     const existingTitle = await Charactertitles.findOne({ 
//                         owner: characterid, 
//                         index: title.index 
//                     }).session(session);
                    
//                     if (existingTitle) {
//                         // Give 50% of title value as currency instead
//                         const compensationAmount = Math.floor(150 * 0.5);
//                         await Characterwallet.findOneAndUpdate(
//                             { owner: characterid, type: title.currency || 'coins' },
//                             { $inc: { amount: compensationAmount } },
//                             { upsert: true, session }
//                         );
//                         return { success: true, message: `Title already owned, awarded ${compensationAmount} ${title.currency || 'coins'} instead` };
//                     }
                    
//                     await Charactertitles.create([{
//                         owner: characterid,
//                         title: title._id,
//                         index: title.index,
//                         name: title.title
//                     }], { session });
//                 }
//                 return { success: true, message: `Awarded title` };

//             case 'companion':
//                 // Add companion to character's companion collection
//                 const companion = await Companion.findById(processedReward.id).session(session);
//                 const hasCompanion = await CharacterCompanion.findOne({ owner: characterid, companion: companion._id}).session(session);
//                 if (hasCompanion){
//                     // Give 50% of companion value as currency instead
//                     const compensationAmount = Math.floor((companion.price || 500) * 0.5);
//                     await Characterwallet.findOneAndUpdate(
//                         { owner: characterid, type: companion.currency || 'coins' },
//                         { $inc: { amount: compensationAmount } },
//                         { upsert: true, session }
//                     );
//                     return { success: true, message: `Companion already owned, awarded ${compensationAmount} ${companion.currency || 'coins'} instead` };
//                 }
//                 if (companion) {
//                     await CharacterCompanion.create(
//                         {
//                             owner: characterid,
//                             companion: companion._id,
//                             name: companion.name
//                         }
//                     )
//                 }
//                 return { success: true, message: `Awarded companion` };

//             case 'freebie':
//                 // Handle freebie rewards (assuming they're like items)
//                 await CharacterInventory.findOneAndUpdate(
//                     { owner: characterid, type: 'freebie' },
//                     {
//                         $push: {
//                             items: {
//                                 item: processedReward.id,
//                                 quantity: processedReward.amount || 1
//                             }
//                         }
//                     },
//                     { upsert: true, session }
//                 );
//                 return { success: true, message: `Awarded freebie` };

//             case 'skill':
//                 // Award skill to character skill tree
//                 const skillTree = await CharacterSkillTree.findOne({ owner: characterid }).session(session);
//                 if (skillTree) {
//                     // Check if skill already exists
//                     const existingSkill = skillTree.skills.find(s => s.skill.toString() === processedReward.id);
//                     if (!existingSkill) {
//                         skillTree.skills.push({
//                             skill: processedReward.id,
//                             level: 1,
//                             isEquipped: false
//                         });
//                         await skillTree.save({ session });
//                     }
//                 }
//                 return { success: true, message: `Awarded skill` };

//             case 'chapter':
//                 // Handle chapter rewards (store as inventory item for now)
//                 const chapter = await Chapter.findById(processedReward.id).session(session);
//                 if (chapter) {
//                     // Add chapter unlock as inventory item
//                     await CharacterInventory.findOneAndUpdate(
//                         { owner: characterid, type: 'chapter' },
//                         {
//                             $push: {
//                                 items: {
//                                     item: processedReward.id,
//                                     quantity: processedReward.amount || 1
//                                 }
//                             }
//                         },
//                         { upsert: true, session }
//                     );
//                 }
//                 return { success: true, message: `Awarded chapter unlock` };

//             case 'bundle':
//                 // Process each item in bundle
//                 const results = [];
//                 for (const bundleItem of processedReward.items) {
//                     const result = await exports.awardBattlepassReward(characterid, bundleItem, session);
//                     results.push(result);
//                 }
//                 return { success: true, message: `Awarded bundle`, details: results };

//             default:
//                 return { success: false, message: `Unknown reward type: ${processedReward.type}` };
//         }
//     } catch (error) {
//         console.error('Error awarding battlepass reward:', error);
//         return { success: false, message: `Error awarding reward: ${error.message}` };
//     }
// };
