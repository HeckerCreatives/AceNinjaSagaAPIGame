
const Characterwallet = require('../models/Characterwallet');
const Characterdata = require('../models/Characterdata');
const { CharacterInventory } = require('../models/Market');
const Badge = require('../models/Badge');
const Title = require('../models/Title');
const Characterbadge = require('../models/Characterbadges');
const Charactertitle = require('../models/Charactertitles');

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
    const userGender = player.character?.gender || "male"; // fallback to male

    // Find the reward set for this rank
    const rewardSet = rankrewarddata.find(r => r.rank.toString() === userRank.toString());
    if (!rewardSet) return [{ success: false, message: "No reward for this rank" }];

    for (const reward of rewardSet.rewards) {
        try {
            switch (reward.rewardtype) {
                case "coins":
                case "crystal":
                    await Characterwallet.findOneAndUpdate(
                        { owner: userId, type: reward.rewardtype },
                        { $inc: { amount: reward.amount } },
                        { upsert: true, session }
                    );
                    results.push({ success: true, type: reward.rewardtype, amount: reward.amount });
                    break;
                case "exp":
                    const character = await Characterdata.findById(userId).session(session);
                    if (character) {
                        character.experience = (character.experience || 0) + reward.amount;
                        await character.save({ session });
                        results.push({ success: true, type: "exp", amount: reward.amount });
                    }
                    break;
                case "title":
                    const title = await Title.findOne({ index: reward.reward.id }).session(session);
                    if (title) {
                        const exists = await Charactertitle.findOne({ owner: userId, index: title.index }).session(session);
                        if (!exists) {
                            await Charactertitle.create([{
                                owner: userId,
                                title: title._id,
                                index: title.index,
                                name: title.title
                            }], { session });
                        }
                        results.push({ success: true, type: "title", name: reward.reward.name });
                    }
                    break;
                case "badge":
                    const badge = await Badge.findOne({ index: reward.reward.id }).session(session);
                    if (badge) {
                        const exists = await Characterbadge.findOne({ owner: userId, index: badge.index }).session(session);
                        if (!exists) {
                            await Characterbadge.create([{
                                owner: userId,
                                badge: badge._id,
                                index: badge.index,
                                name: badge.title
                            }], { session });
                        }
                        results.push({ success: true, type: "badge", name: reward.reward.name });
                    }
                    break;
                case "outfit":
                    // Handle gendered outfits
                    let outfitId = reward.reward.id;
                    if (userGender === "female" && reward.reward.fid) {
                        outfitId = reward.reward.fid;
                    }
                    await CharacterInventory.findOneAndUpdate(
                        { owner: userId, type: "outfit" },
                        { $push: { items: { item: outfitId, quantity: 1 } } },
                        { upsert: true, session }
                    );
                    results.push({ success: true, type: "outfit", id: outfitId });
                    
                    const hairId = gethairbundle(outfitId);
                    if (hairId) {
                        await CharacterInventory.findOneAndUpdate(
                            { owner: userId, type: "hair" },
                            { $push: { items: { item: hairId, quantity: 1 } } },
                            { upsert: true, session }
                        );
                        results.push({ success: true, type: "hair", id: hairId });
                    }
                    break;
                case "weapon":
                    await CharacterInventory.findOneAndUpdate(
                        { owner: userId, type: "weapon" },
                        { $push: { items: { item: reward.reward.id, quantity: 1 } } },
                        { upsert: true, session }
                    );
                    results.push({ success: true, type: "weapon", id: reward.reward.id });
                    break;
                default:
                    results.push({ success: false, type: reward.rewardtype, message: "Unknown reward type" });
            }
        } catch (err) {
            results.push({ success: false, type: reward.rewardtype, error: err.message });
        }
    }
    return results;
};