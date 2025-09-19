const Characterdata = require("../models/Characterdata");
const CharacterStats = require("../models/Characterstats");
const { CharacterSkillTree } = require("../models/Skills");


exports.addXPAndLevel = async (characterid, xpToAdd, session = null) => {
    const updateOptions = session ? { session } : {};
    const character = await Characterdata.findOne({ _id: characterid }, null, updateOptions);

    if (!character) {
        return "failed";
    }

    let currentLevel = character.level;
    let currentXP = character.experience + xpToAdd;
    let levelsGained = 0;
    let baseXP = 100;
    let growth = 1.35;
    const LEVEL_CAP = 40;
    let xpNeeded = Math.round(baseXP * Math.pow(currentLevel, growth));

    // If already at max level, don't gain any more XP or levels
    if (currentLevel >= LEVEL_CAP) {
        return {
            newLevel: LEVEL_CAP,
            levelsGained: 0,
            currentXP: xpNeeded,
            nextLevelXP: xpNeeded
        };
    }
        

    while (currentXP >= xpNeeded && xpNeeded > 0 && currentLevel < LEVEL_CAP) {
        currentXP -= xpNeeded; // instead of using overflowXP, just subtract
        currentLevel++;
        levelsGained++;
        
        // Stop if we reach the level cap
        if (currentLevel >= LEVEL_CAP) {
            currentLevel = LEVEL_CAP;
            currentXP = xpNeeded; // Reset XP at max level
            break;
        }
        
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

    // Calculate next level XP (0 if at max level)
    const nextLevelXP = currentLevel >= LEVEL_CAP ? 0 : Math.round(baseXP * Math.pow(currentLevel, growth));

    return {
        newLevel: currentLevel,
        levelsGained,
        currentXP,
        nextLevelXP
    };
};

exports.levelupplayer = async (characterid, levelsGained, currentLevel, session = null) => { 
    const updateOptions = session ? { session } : {};

    try {
        // await CharacterStats.findOneAndUpdate(
        //     { owner: characterid },
        //     {
        //         $inc: {
        //             health: 50 * levelsGained,
        //             energy: 30 * levelsGained,
        //             armor: 3 * levelsGained,
        //             magicresist: 3 * levelsGained,
        //             speed: 3 * levelsGained,
        //             attackdamage: 1 * levelsGained,
        //             armorpen: 0,
        //             magicpen: 0,
        //             magicdamage: 1 * levelsGained,
        //             critdamage: 1 * levelsGained
        //         }
        //     },
        //     updateOptions
        // );

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