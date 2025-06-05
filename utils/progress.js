const { BattlepassMissionProgress } = require("../models/Battlepass")
const { QuestProgress } = require("../models/Quest")



exports.progressutil = async (requirementtype, characterid, amount) => {

    // find all battlepass mission and quest progress for the character
    const battlepassProgress = await BattlepassMissionProgress.find({ owner: characterid, requirementtype: requirementtype })
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching battlepass progress: ${err}`);
            return [];
        });
    const questProgress = await QuestProgress.find({ owner: characterid, requirementtype: requirementtype })
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching quest progress: ${err}`);
            return [];
        });

    // Update battlepass progress

    for (const progress of battlepassProgress) {
        if (progress.requirementtype === requirementtype) {
            progress.progress += amount;
            await progress.save().catch(err => {
                console.error(`Error updating battlepass progress: ${err}`);
            });
        }
    }

    // Update quest progress
    for (const progress of questProgress) {
        if (progress.requirementtype === requirementtype) {
            progress.progress += amount;
            await progress.save().catch(err => {
                console.error(`Error updating quest progress: ${err}`);
            });
        }
    }

    return {
        message: "success",
    };

    
}

// to do tommorow
exports.multipleprogressutil = async (characterid, requiements) => {

    // data in requirements is an array of objects with requirementtype and amount
    for (const requirement of requiements) {
        const { requirementtype, amount } = requirement;
        await this.progressutil(requirementtype, characterid, amount);
    }
    return {
        message: "success",
    };
}