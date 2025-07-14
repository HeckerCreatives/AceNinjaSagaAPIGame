const Characterdata = require("../models/Characterdata");
const CharacterStats = require("../models/Characterstats");
const { CharacterSkillTree } = require("../models/Skills");


exports.addXPAndLevel = async (characterid, xpToAdd, session = null) => {
    const updateOptions = session ? { session } : {};
    const character = await Characterdata.findOne({ _id: characterid }, null, updateOptions);

    if (!character) {
        return "failed";
    }

    // let currentLevel = character.level;
    // let currentXP = character.experience + xpToAdd;
    // let levelsGained = 0;
    // let xpNeeded = 80 * currentLevel;
    // while (currentXP >= xpNeeded && xpNeeded > 0) {
    //     const overflowXP = currentXP - xpNeeded;
    //     currentLevel++;
    //     levelsGained++;
    //     currentXP = overflowXP;
    //     xpNeeded = 80 * currentLevel;
    // }

    let currentLevel = character.level;
    let currentXP = character.experience + xpToAdd;
    let levelsGained = 0;
    let baseXP = 100;
    let growth = 0.25;

    while (currentXP >= xpNeeded && xpNeeded > 0) {
        currentXP -= xpNeeded; // instead of using overflowXP, just subtract
        currentLevel++;
        levelsGained++;
        xpNeeded = Math.round(baseXP * Math.pow(currentLevel, growth));
    }

    // If levels were gained, update stats and skill points
    if (levelsGained > 0) {
        const levelupResult = await exports.levelupplayer(characterid, levelsGained, currentLevel, session);
        if (levelupResult === "failed") {
            return "failed";
        }
    }

    // Update character level and experience
    try {
        character.level = currentLevel;
        character.experience = currentXP;
        await character.save(updateOptions);
    } catch (err) {
        console.error("Error saving character:", err);
        return "failed";
    }

    return {
        newLevel: currentLevel,
        levelsGained,
        currentXP,
        nextLevelXP: 80 * currentLevel
    };
};

exports.levelupplayer = async (characterid, levelsGained, currentLevel, session = null) => { 
    const updateOptions = session ? { session } : {};

    try {
        await CharacterStats.findOneAndUpdate(
            { owner: characterid },
            {
                $inc: {
                    health: 5 * (levelsGained * currentLevel),
                    energy: 2 * (levelsGained * currentLevel),
                    armor: 2 * levelsGained,
                    magicresist: 1 * levelsGained,
                    speed: 1 * levelsGained,
                    attackdamage: 1 * levelsGained,
                    armorpen: 1 * levelsGained,
                    magicpen: 1 * levelsGained,
                    magicdamage: 1 * levelsGained,
                    critdamage: 1 * levelsGained
                }
            },
            updateOptions
        );

        await CharacterSkillTree.findOneAndUpdate(
            { owner: characterid },
            {
                $inc: {
                    skillPoints: 4 * levelsGained
                }
            },
            updateOptions
        );

        return "success";
    } catch (err) {
        console.error("Error updating character stats or skill tree:", err);
        return "failed";
    }
}