const { default: mongoose } = require("mongoose");
const { BattlepassSeason, BattlepassProgress, BattlepassMissionProgress, BattlepassHistory } = require("../models/Battlepass");
const Characterdata = require("../models/Characterdata");
const CharacterStats = require("../models/Characterstats");
const Characterwallet = require("../models/Characterwallet");
const { CharacterSkillTree } = require("../models/Skills");
const { checkcharacter } = require("../utils/character")


exports.getbattlepass = async (req, res) => {
    const { id } = req.user;
    const { characterid } = req.query;
    if (!characterid) {
        return res.status(400).json({ message: "failed", data: "Character ID is required." });
    }

    
    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }
    
    // get current battle pass season 
    const currentdate = new Date();

    const currentSeason = await BattlepassSeason.findOne({
        startDate: { $lte: currentdate },
        endDate: { $gte: currentdate }
    });



    if (!currentSeason) {
        return res.status(404).json({ message: "failed", data: "No active battle pass season found." });
    }

    // get battle pass data for the character
    let battlepassData = await BattlepassProgress.findOne({
        owner: characterid,
        season: currentSeason._id
    });

    if (!battlepassData) {
        // Initialize battlepass progress for new user
        battlepassData = await BattlepassProgress.create({
            owner: characterid,
            season: currentSeason._id,
            currentTier: 1,
            currentXP: 0,
            hasPremium: false,
            claimedRewards: []
        });

        // Initialize free missions
        for (const mission of currentSeason.freeMissions) {
            await BattlepassMissionProgress.create({
                owner: characterid,
                season: currentSeason._id,
                missionName: mission.missionName,
                type: "free",
                missionId: new mongoose.Types.ObjectId(mission._id),
                progress: 0,
                isCompleted: false,
                isLocked: false,
                daily: mission.daily,
                lastUpdated: new Date()
            });
        }

        // Initialize premium missions
        for (const mission of currentSeason.premiumMissions) {
            await BattlepassMissionProgress.create({
                owner: characterid,
                season: currentSeason._id,
                missionName: mission.missionName,
                type: "premium",
                missionId: new mongoose.Types.ObjectId(mission._id),
                progress: 0,
                isCompleted: false,
                isLocked: true,
                daily: mission.daily,
                lastUpdated: new Date()
            });
        }
    }

    const bpmp = await BattlepassMissionProgress.find({ owner: characterid, season: currentSeason._id })

    // const formattedResponse = redeemedCodes.reduce((acc, code, index) => {
    //         acc[index + 1] = {
    //             id: code._id,
    //             code: code.code.code,
    //             title: code.code.title,
    //             description: code.code.description,
    //             rewards: code.code.rewards,
    //             redeemedAt: code.createdAt
    //         };
    //         return acc;
    //     }, {});

    const enddate = currentSeason.endDate;
    const currentDate = new Date();

    const remainingMilliseconds = enddate - currentDate;
    const remainingSeconds = Math.floor(remainingMilliseconds / 1000);
    
    const formattedResponse = {
        battlepass: {
            id: currentSeason._id,
            name: currentSeason.title,
            timeleft: remainingSeconds,
            status: currentSeason.status,
            premiumCost: currentSeason.premiumCost,
            freeMissions: currentSeason.freeMissions.reduce((acc, mission, index) => {
                acc[index + 1] = {
                    id: mission._id,
                    missionName: mission.missionName,
                    type: "free",
                    daily: mission.daily
                };
                return acc;
            }, {}),
            premiumMissions: currentSeason.premiumMissions.reduce((acc, mission, index) => {
                acc[index + 1] = {
                    id: mission._id,
                    missionName: mission.missionName,
                    type: "premium",
                    daily: mission.daily
                };
                return acc;
            }, {}),
            tiers: currentSeason.tiers.reduce((acc, tier, index) => {
                const tierNumber = index + 1;
                const freeClaimed = battlepassData.claimedRewards.some(r => r.tier === tierNumber && r.rewardType === "free");
                const premiumClaimed = battlepassData.claimedRewards.some(r => r.tier === tierNumber && r.rewardType === "premium");
                
                acc[tierNumber] = {
                    tierNumber: tier.tierNumber,
                    freeReward: {
                        ...tier.freeReward,
                        hasclaimed: freeClaimed
                    },
                    premiumReward: {
                        ...tier.premiumReward,
                        hasclaimed: premiumClaimed
                    },
                    xpRequired: tier.xpRequired,
                };
                return acc;
            }, {})
        },
        progress: {
            currentTier: battlepassData.currentTier,
            currentXP: battlepassData.currentXP,
            hasPremium: battlepassData.hasPremium,
            claimedRewards: battlepassData.claimedRewards
        },
        missions: bpmp.reduce((acc, mission, index) => {
            const matchingFreeMission = currentSeason.freeMissions.find(m => m._id.equals(mission.missionId));
            const matchingPremiumMission = currentSeason.premiumMissions.find(m => m._id.equals(mission.missionId));
            const originalMission = matchingFreeMission || matchingPremiumMission;
            const requirementType = Object.keys(originalMission.requirements)[0];
            const requiredAmount = originalMission.requirements[requirementType];


            acc[index + 1] = {
                id: mission._id,
                missionName: originalMission ? originalMission.missionName : mission.missionName,
                type: mission.type,
                progress: mission.progress,
                requirements: requiredAmount || null,
                xpReward: originalMission ? originalMission.xpReward : 0,
                isCompleted: mission.isCompleted,
                isLocked: mission.isLocked,
                daily: mission.daily,
                lastUpdated: mission.lastUpdated
            };
            return acc;
        }, {})
    };
    

  
    return res.status(200).json({
        message: "success",
        data: formattedResponse
    });
}


exports.claimbattlepassreward = async (req, res) => {
    const { id } = req.user;
    const { characterid } = req.body;

    if (!characterid) {
        return res.status(400).json({ message: "failed", data: "Character ID is required." });
    }

    const checker = await checkcharacter(id, characterid);
    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const currentdate = new Date();
    const currentSeason = await BattlepassSeason.findOne({
        startDate: { $lte: currentdate },
        endDate: { $gte: currentdate }
    });

    if (!currentSeason) {
        return res.status(404).json({ message: "failed", data: "No active battle pass season found." });
    }

    let battlepassData = await BattlepassProgress.findOne({
        owner: characterid,
        season: currentSeason._id
    });

    if (!battlepassData) {
        return res.status(404).json({ message: "failed", data: "Battle pass progress not found for this character." });
    }

    const claimedRewards = battlepassData.claimedRewards || [];
    const hasPremium = battlepassData.hasPremium;
    const maxTier = battlepassData.currentTier;

    const claimed = {};

    const walletUpdates = [];
    const claimedRewardsList = [];
    const historyEntries = [];
    const characterUpdates = new Map();

    for (let t = 1; t <= maxTier; t++) {
        const alreadyClaimedTypes = claimedRewards.filter(r => r.tier === t).map(r => r.rewardType);
        const tierDetails = currentSeason.tiers[t - 1];
        if (!tierDetails) continue;

        const rewardsToClaim = [];
        if (!alreadyClaimedTypes.includes("free")) {
            rewardsToClaim.push({ rewardType: "free", reward: tierDetails.freeReward });
        }
        if (hasPremium && !alreadyClaimedTypes.includes("premium")) {
            rewardsToClaim.push({ rewardType: "premium", reward: tierDetails.premiumReward });
        }

        if (rewardsToClaim.length === 0) continue;

        historyEntries.push(
            ...rewardsToClaim.map(reward => ({
                insertOne: {
                    document: {
                        owner: characterid,
                        season: currentSeason._id,
                        tier: t,
                        claimedrewards: {
                            type: reward.rewardType, // 'free' or 'premium'
                            item: reward.reward.type, // e.g. 'coins', 'crystal', etc.
                            amount: reward.reward.amount
                        }
                    }
                }
            }))
        );

        for (const rewardObj of rewardsToClaim) {
            const reward = rewardObj.reward;
            if (reward.type === "coins") {
                walletUpdates.push({
                    updateOne: {
                        filter: { owner: characterid, type: "coins" },
                        update: { $inc: { amount: reward.amount } },
                    }
                });
            } else if (reward.type === "crystal" || reward.type === "crystals") {
                walletUpdates.push({
                    updateOne: {
                        filter: { owner: characterid, type: "crystal" },
                        update: { $inc: { amount: reward.amount } },
                    }
                });
            } else if (reward.type === "exp") {
                const charKey = characterid.toString();
                let charUpdate = characterUpdates.get(charKey) || { xp: 0 };
                charUpdate.xp += reward.amount;
                characterUpdates.set(charKey, charUpdate);
            }

            claimedRewardsList.push({
                tier: t,
                rewardType: rewardObj.rewardType,
                reward: rewardObj.reward
            });

            claimed[t] = claimed[t] || {};
            claimed[t][rewardObj.rewardType] = {
                rewardType: rewardObj.rewardType,
                reward: rewardObj.reward
            };
        }
    }

    // Execute all bulk operations
    if (historyEntries.length > 0) {
        await BattlepassHistory.bulkWrite(historyEntries);
    }
    if (walletUpdates.length > 0) {
        await Characterwallet.bulkWrite(walletUpdates);
    }
    
    // Handle character XP updates
    if (characterUpdates.size > 0) {
        const character = await Characterdata.findOne({ _id: characterid });
        if (character) {
            const update = characterUpdates.get(characterid.toString());
            character.experience += update.xp;

            let currentLevel = character.level;
            let currentXP = character.experience;
            let levelsGained = 0;
            let xpNeeded = 80 * currentLevel;

            while (currentXP >= xpNeeded && xpNeeded > 0) {
                currentLevel++;
                levelsGained++;
                currentXP -= xpNeeded;
                xpNeeded = 80 * currentLevel;
            }

            if (levelsGained > 0) {
                await Promise.all([
                    CharacterStats.updateOne(
                        { owner: characterid },
                        {
                            $inc: {
                                health: 10 * levelsGained,
                                energy: 5 * levelsGained,
                                armor: 2 * levelsGained,
                                magicresist: levelsGained,
                                speed: levelsGained,
                                attackdamage: levelsGained,
                                armorpen: levelsGained,
                                magicpen: levelsGained,
                                magicdamage: levelsGained,
                                critdamage: levelsGained
                            }
                        }
                    ),
                    CharacterSkillTree.updateOne(
                        { owner: characterid },
                        { $inc: { skillPoints: 4 * levelsGained } }
                    )
                ]);
            }

            character.level = currentLevel;
            character.experience = currentXP;
            await character.save();
        }
    }

    battlepassData.claimedRewards.push(...claimedRewardsList);

    if (Object.keys(claimed).length === 0) {
        return res.status(400).json({ message: "failed", data: "No rewards to claim for the current tier." });
    }

    await battlepassData.save();

    return res.status(200).json({
        message: "success",
        data: claimed
    });
};


exports.buypremiumbattlepass = async (req, res) => {
    const { id } = req.user;
    const { characterid } = req.body;

    if (!characterid) {
        return res.status(400).json({ message: "failed", data: "Character ID is required." });
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const currentdate = new Date();
    const currentSeason = await BattlepassSeason.findOne({
        startDate: { $lte: currentdate },
        endDate: { $gte: currentdate }
    });

    if (!currentSeason) {
        return res.status(404).json({ message: "failed", data: "No active battle pass season found." });
    }

    let battlepassData = await BattlepassProgress.findOne({
        owner: characterid,
        season: currentSeason._id
    });

    if (!battlepassData) {
        return res.status(404).json({ message: "failed", data: "Battle pass progress not found for this character." });
    }

    if (battlepassData.hasPremium) {
        return res.status(400).json({ message: "failed", data: "This character already has a premium battle pass." });
    }

    // Check if user has enough currency to buy premium battle pass
    const wallet = await Characterwallet.findOne({ owner: characterid, type: 'crystal' });
    
    if (!wallet || wallet.amount < currentSeason.premiumCost) {
        return res.status(400).json({ message: "failed", data: "Not enough currency to buy premium battle pass." });
    }

    // Deduct the premium price from the wallet
    wallet.amount -= currentSeason.premiumCost;
    await wallet.save();

    // Update battle pass progress
    battlepassData.hasPremium = true;
    
    await battlepassData.save();

    return res.status(200).json({
        message: "success",
        data: `Premium battle pass purchased successfully for ${currentSeason.premiumCost} coins.`
    });
}

exports.claimbattlepassquest = async (req, res) => {
    const { id } = req.user;
    const { characterid, missionid } = req.body;

    if (!characterid || !missionid) {
        return res.status(400).json({
            message: "failed",
            data: "Please input the character id and mission id."
        });
    }

    const checker = await checkcharacter(id, characterid);
    
    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const quest = await BattlepassMissionProgress.findById(missionid)
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching quest: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    if (!quest) {
        return res.status(404).json({
            message: "failed",
            data: "Battlepass Mission not found."
        });
    }
    // get battle pass season

    const battlepassseason = await BattlepassSeason.findById(quest.season)
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching battle pass season: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    // check free  mission and premium mission
    const mission = battlepassseason.freeMissions.find(m => m._id.equals(quest.missionId)) ||
                    battlepassseason.premiumMissions.find(m => m._id.equals(quest.missionId));


    if (!mission) {
        return res.status(404).json({
            message: "failed",
            data: "Mission not found in the current battle pass season."
        });
    }

    // Check if the mission is already completed
    if (quest.isCompleted) {
        return res.status(400).json({
            message: "failed",
            data: "This mission has already been completed."
        });
    }

    // Check if the mission is locked
    if (quest.isLocked) {
        return res.status(400).json({
            message: "failed",
            data: "This mission is locked and cannot be claimed yet."
        });
    }

    const requirementType = Object.keys(mission.requirements)[0];
    const requiredAmount = mission.requirements[requirementType];

    console.log(`Required amount for mission: ${requiredAmount}, Current progress: ${quest.progress}`);
    // Check if the mission progress is sufficient
    if (quest.progress < requiredAmount) {
        return res.status(400).json({
            message: "failed",
            data: `You need to complete ${requiredAmount - quest.progress} more to claim this mission.`
        });
    }
    // Update the mission progress to completed
    quest.isCompleted = true;
    quest.lastUpdated = new Date();
    // add exp reward to battlepass progress
    const battlepassProgress = await BattlepassProgress.findOne({ owner: characterid, season: quest.season })
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching battle pass progress: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });
    if (!battlepassProgress) {
        // create battlepass progress if not exists
        await BattlepassProgress.create({
            owner: characterid,
            season: quest.season,
            currentTier: 1,
            currentXP: 0,
            hasPremium: false,
            claimedRewards: []
        });
    }

    const bptierlevelup = 1000; // example value, adjust as needed

    battlepassProgress.currentXP += mission.xpReward; // Add the mission reward to the battle pass progress
    // Check if the battle pass progress level up
    if (battlepassProgress.currentXP >= bptierlevelup) {
        let remainingXP = battlepassProgress.currentXP - bptierlevelup;
        battlepassProgress.currentXP = remainingXP; // Set the remaining XP for the next tier
        battlepassProgress.currentTier += 1; // Level up the battle pass tier
        
        if (battlepassProgress.currentXP < 0) {
            battlepassProgress.currentXP = 0; // Ensure XP doesn't go negative
        }
    }

    await battlepassProgress.save();
    
    await quest.save()

    return res.status(200).json({
        message: "success",
    });
}