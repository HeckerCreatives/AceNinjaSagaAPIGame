const { RankReward } = require("../models/Ranking");

exports.getRankRewards = async (req, res) => {

    const { id } = req.user
    

    const rewards = await RankReward.find()
        .populate("rank", "name")
        .sort({ createdAt: 1 });
    
    if (!rewards || rewards.length === 0) {
        return res.status(404).json({ message: "not-found", data: "No rank rewards found." });
    }

    const formattedRewards = rewards.reduce((acc, reward) => {
        acc[reward.rank.name] = {
            id: reward._id,
            rankid: reward.rank._id,
            rewards: reward.rewards.map(r => ({
                rewardType: r.rewardtype,
                amount: r.amount,
                reward: r.reward
            })),
            createdAt: reward.createdAt.toISOString().split('T')[0]
        };
        return acc;
    }, {});

    return res.status(200).json({ message: "success", data: formattedRewards });
}