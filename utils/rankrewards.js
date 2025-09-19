
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
                        await Characterwallet.findOneAndUpdate(
                            { owner: userId, type: reward.rewardtype },
                            { $inc: { amount: reward.amount } },
                            { upsert: true, session }
                        );
                        results.push({ success: true, type: reward.rewardtype, amount: reward.amount });
                        break;
                    }

                    case 'exp': {
                        // Use centralized XP/level utility to handle level ups and caps
                        const xpResult = await addXPAndLevel(userId, reward.amount, session);
                        if (xpResult === 'failed') {
                            results.push({ success: false, type: 'exp', message: 'Failed to add experience' });
                        } else {
                            results.push({ success: true, type: 'exp', amount: reward.amount, details: xpResult });
                        }
                        break;
                    }

                    case 'title': {
                        const q = Title.findOne({ index: reward.reward.id });
                        if (session) q.session(session);
                        const title = await q;
                        if (title) {
                            const q2 = Charactertitle.findOne({ owner: userId, index: title.index });
                            if (session) q2.session(session);
                            const exists = await q2;
                            if (!exists) {
                                await Charactertitle.create([{ owner: userId, title: title._id, index: title.index, name: title.title }], { session });
                                results.push({ success: true, type: 'title', id: title.index, name: title.title });
                            } else {
                                results.push({ success: false, type: 'title', message: 'Title already owned' });
                            }
                        } else {
                            results.push({ success: false, type: 'title', message: 'Title not found' });
                        }
                        break;
                    }

                    case 'badge': {
                        const q = Badge.findOne({ index: reward.reward.id });
                        if (session) q.session(session);
                        const badge = await q;
                        if (badge) {
                            const q2 = Characterbadge.findOne({ owner: userId, index: badge.index });
                            if (session) q2.session(session);
                            const exists = await q2;
                            if (!exists) {
                                await Characterbadge.create([{ owner: userId, badge: badge._id, index: badge.index, name: badge.title }], { session });
                                results.push({ success: true, type: 'badge', id: badge.index, name: badge.title });
                            } else {
                                results.push({ success: false, type: 'badge', message: 'Badge already owned' });
                            }
                        } else {
                            results.push({ success: false, type: 'badge', message: 'Badge not found' });
                        }
                        break;
                    }

                    case 'outfit': {
                        // Handle gendered outfits and prevent duplicates
                        let outfitId = reward.reward.id;
                        if (userGender === 'female' && reward.reward.fid) outfitId = reward.reward.fid;

                        const existsOutfitQ = CharacterInventory.findOne({ owner: userId, type: 'outfit', 'items.item': outfitId });
                        if (session) existsOutfitQ.session(session);
                        const existsOutfit = await existsOutfitQ;
                        if (existsOutfit) {
                            results.push({ success: false, type: 'outfit', message: 'Outfit already owned' });
                            break;
                        }

                        await CharacterInventory.findOneAndUpdate({ owner: userId, type: 'outfit' }, { $push: { items: { item: outfitId, quantity: 1 } } }, { upsert: true, session });
                        results.push({ success: true, type: 'outfit', id: outfitId });

                        const hairId = gethairbundle(outfitId);
                        if (hairId) {
                            const existsHairQ = CharacterInventory.findOne({ owner: userId, type: 'hair', 'items.item': hairId });
                            if (session) existsHairQ.session(session);
                            const existsHair = await existsHairQ;
                            if (!existsHair) {
                                await CharacterInventory.findOneAndUpdate({ owner: userId, type: 'hair' }, { $push: { items: { item: hairId, quantity: 1 } } }, { upsert: true, session });
                                results.push({ success: true, type: 'hair', id: hairId });
                            } else {
                                results.push({ success: true, type: 'hair', message: 'Hair already owned' });
                            }
                        }
                        break;
                    }

                    case 'chest': {
                        // Reward is a chest item (stackable). Add to character chests inventory.
                        const chestId = reward.reward.id;
                        // If gender-specific chest variants exist, honor fid
                        let chestToAdd = chestId;
                        if (userGender === 'female' && reward.reward.fid) chestToAdd = reward.reward.fid;

                        const existsChestQ = CharacterInventory.findOne({ owner: userId, type: 'chests', 'items.item': chestToAdd });
                        if (session) existsChestQ.session(session);
                        const existsChest = await existsChestQ;
                        if (existsChest) {
                            // increment quantity
                            await CharacterInventory.updateOne(
                                { owner: userId, type: 'chests', 'items.item': chestToAdd },
                                { $inc: { 'items.$.quantity': 1 } },
                                { session }
                            );
                            results.push({ success: true, type: 'chest', id: chestToAdd, message: 'Chest quantity incremented' });
                        } else {
                            await CharacterInventory.findOneAndUpdate({ owner: userId, type: 'chests' }, { $push: { items: { item: chestToAdd, quantity: 1 } } }, { upsert: true, session });
                            results.push({ success: true, type: 'chest', id: chestToAdd, message: 'Chest granted' });
                        }
                        break;
                    }

                    case 'weapon': {
                        const existsWeaponQ = CharacterInventory.findOne({ owner: userId, type: 'weapon', 'items.item': reward.reward.id });
                        if (session) existsWeaponQ.session(session);
                        const existsWeapon = await existsWeaponQ;
                        if (existsWeapon) {
                            results.push({ success: false, type: 'weapon', message: 'Weapon already owned' });
                            break;
                        }
                        await CharacterInventory.findOneAndUpdate({ owner: userId, type: 'weapon' }, { $push: { items: { item: reward.reward.id, quantity: 1 } } }, { upsert: true, session });
                        results.push({ success: true, type: 'weapon', id: reward.reward.id });
                        break;
                    }

                    case 'skill': {
                        // Award a skill to the character's skill tree
                        try {
                            const skillId = reward.reward.id;
                            const skillTreeQ = CharacterSkillTree.findOne({ owner: userId });
                            if (session) skillTreeQ.session(session);
                            const skillTree = await skillTreeQ;
                            if (!skillTree) {
                                // Create a new skill tree if it doesn't exist
                                await CharacterSkillTree.create([{ owner: userId, skills: [{ skill: skillId, level: 1, isEquipped: false }], skillPoints: 0, unlockedSkills: [] }], { session });
                                results.push({ success: true, type: 'skill', id: skillId, message: 'Skill awarded (new skilltree created)' });
                            } else {
                                const exists = skillTree.skills.some(s => String(s.skill) === String(skillId));
                                if (exists) {
                                    results.push({ success: false, type: 'skill', message: 'Skill already owned' });
                                } else {
                                    skillTree.skills.push({ skill: skillId, level: 1, isEquipped: false });
                                    await skillTree.save({ session });
                                    results.push({ success: true, type: 'skill', id: skillId });
                                }
                            }
                        } catch (err) {
                            results.push({ success: false, type: 'skill', error: err.message });
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