
const Characterwallet = require('../models/Characterwallet');
const Characterdata = require('../models/Characterdata');
const { CharacterInventory } = require('../models/Market');
const Badge = require('../models/Badge');
const Title = require('../models/Title');
const Characterbadge = require('../models/Characterbadges');
const Charactertitle = require('../models/Charactertitles');
const { gethairbundle } = require('./bundle');
const { addXPAndLevel } = require('./leveluptools');
const { CharacterSkillTree } = require('../models/Skills');
const { 
    awardCurrency, 
    awardExperience, 
    awardBadge, 
    awardTitle, 
    awardSkill, 
    awardInventoryItem 
} = require('./rewardtools');

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
        // Find the reward set for this rank
        const rewardSet = rankrewarddata.find(r => r.rank.toString() === userRank.toString());
        if (!rewardSet) return [{ success: false, message: 'No reward for this rank' }];

        for (const reward of rewardSet.rewards) {
            try {
                switch (reward.rewardtype) {
                    case 'coins':
                    case 'crystal': {
                        // Use centralized currency utility
                        const currencyResult = await awardCurrency(userId, reward.rewardtype, reward.amount, session);
                        if (currencyResult === 'success') {
                            results.push({ success: true, type: reward.rewardtype, amount: reward.amount });
                        } else {
                            results.push({ success: false, type: reward.rewardtype, message: 'Failed to award currency' });
                        }
                        break;
                    }

                    case 'exp': {
                        // Use centralized XP/level utility to handle level ups and caps
                        const xpResult = await awardExperience(userId, reward.amount, session);
                        if (xpResult === 'failed') {
                            results.push({ success: false, type: 'exp', message: 'Failed to add experience' });
                        } else {
                            results.push({ success: true, type: 'exp', amount: reward.amount, details: xpResult });
                        }
                        break;
                    }

                    case 'title': {
                        // Use centralized title utility
                        const titleResult = await awardTitle(userId, reward.reward.id, session);
                        if (titleResult === 'failed') {
                            results.push({ success: false, type: 'title', message: 'Title not found' });
                        } else if (titleResult === 'already_owned') {
                            results.push({ success: false, type: 'title', message: 'Title already owned' });
                        } else {
                            // titleResult is the title object
                            results.push({ success: true, type: 'title', id: titleResult.index, name: titleResult.title });
                        }
                        break;
                    }

                    case 'badge': {
                        // Use centralized badge utility
                        const badgeResult = await awardBadge(userId, reward.reward.id, session);
                        if (badgeResult === 'failed') {
                            results.push({ success: false, type: 'badge', message: 'Badge not found' });
                        } else if (badgeResult === 'already_owned') {
                            results.push({ success: false, type: 'badge', message: 'Badge already owned' });
                        } else {
                            // badgeResult is the badge object
                            results.push({ success: true, type: 'badge', id: badgeResult.index, name: badgeResult.title });
                        }
                        break;
                    }

                    case 'outfit': {
                        // Handle gendered outfits using centralized utility
                        let outfitId = reward.reward.id;
                        if (userGender === 'female' && reward.reward.fid) outfitId = reward.reward.fid;
                        
                        const outfitResult = await awardInventoryItem(userId, 'outfit', outfitId, 1, null, reward.reward, session);
                        if (outfitResult === 'already_owned') {
                            results.push({ success: false, type: 'outfit', message: 'Outfit already owned' });
                        } else if (outfitResult === 'failed') {
                            results.push({ success: false, type: 'outfit', message: 'Failed to award outfit' });
                        } else if (typeof outfitResult === 'object' && outfitResult.awarded) {
                            // Handle hair bundle logic
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
                        // Handle gendered chests using centralized utility
                        let chestToAdd = reward.reward.id;
                        if (userGender === 'female' && reward.reward.fid) chestToAdd = reward.reward.fid;
                        
                        const chestResult = await awardInventoryItem(userId, 'chest', chestToAdd, 1, null, reward.reward, session);
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
                        // Use centralized inventory utility
                        const weaponResult = await awardInventoryItem(userId, 'weapon', reward.reward.id, 1, null, null, session);
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
                        // Use centralized skill utility
                        const skillResult = await awardSkill(userId, reward.reward.id, session);
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