const { BattlepassSeason, BattlepassProgress, BattlepassMissionProgress } = require("../models/Battlepass");
const Characterwallet = require("../models/Characterwallet");
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
                missionId: new mongoose.Types.ObjectId(),
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
                missionId: new mongoose.Types.ObjectId(),
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
    
    const formattedResponse = {
        battlepass: {
            id: currentSeason._id,
            name: currentSeason.seasonName,
            startdate: currentSeason.startDate,
            enddate: currentSeason.endDate,
            status: currentSeason.status,
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
                acc[index + 1] = {
                    tierNumber: tier.tierNumber,
                    freeReward: tier.freeReward,
                    premiumReward: tier.premiumReward,
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
            acc[index + 1] = {
                id: mission._id,
                missionName: mission.missionName,
                type: mission.type,
                progress: mission.progress,
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
    let { characterid, tier } = req.body;

    if (!characterid || !tier) {
        return res.status(400).json({ message: "failed", data: "Character ID and tier(s) are required." });
    }

    // Support both single tier and array of tiers
    const tiersToClaim = Array.isArray(tier) ? tier : [tier];

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

    const results = {};

    for (const t of tiersToClaim) {
        if (t < 1 || t > currentSeason.tiers.length) {
            results[t] = { status: "failed", reason: "Invalid tier number." };
            continue;
        }

        const alreadyClaimedTypes = claimedRewards.filter(r => r.tier === t).map(r => r.rewardType);
        const tierDetails = currentSeason.tiers[t - 1];
        if (!tierDetails) {
            results[t] = { status: "failed", reason: "Tier not found." };
            continue;
        }

        // Prepare rewards to claim
        const rewardsToClaim = [];
        if (!alreadyClaimedTypes.includes("free")) {
            rewardsToClaim.push({ rewardType: "free", reward: tierDetails.freeReward });
        }
        if (hasPremium && !alreadyClaimedTypes.includes("premium")) {
            rewardsToClaim.push({ rewardType: "premium", reward: tierDetails.premiumReward });
        }

        if (rewardsToClaim.length === 0) {
            results[t] = { status: "failed", reason: "All rewards for this tier already claimed." };
            continue;
        }

        // Process rewards and update wallet
        for (const rewardObj of rewardsToClaim) {
            const reward = rewardObj.reward;
            if (reward.type === "currency") {
                await Characterwallet.updateOne(
                    { owner: characterid, type: reward.itemId },
                    { $inc: { amount: reward.quantity } },
                    { upsert: true }
                );
            }
        }

        // Update claimedRewards
        for (const rewardObj of rewardsToClaim) {
            battlepassData.claimedRewards.push({
                tier: t,
                rewardType: rewardObj.rewardType,
                reward: rewardObj.reward
            });
        }

        results[t] = {
            status: "success",
            claimed: rewardsToClaim.reduce((acc, r, index) => {
                acc[index + 1] = {
                    rewardType: r.rewardType,
                    reward: r.reward
                };
                return acc;
            }, {})
        };
    }

    await battlepassData.save();

    return res.status(200).json({
        message: "success",
        data: results
    });
};

exports.buypremiumbattlepass = async (req, res) => {
    
}