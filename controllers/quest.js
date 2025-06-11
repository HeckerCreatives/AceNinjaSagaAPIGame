const mongoose = require('mongoose');
const { QuestDetails, QuestProgress } = require('../models/Quest');
const { checkcharacter } = require('../utils/character');
const Characterdata = require('../models/Characterdata');
const { CharacterSkillTree } = require('../models/Skills');
const CharacterStats = require('../models/Characterstats');
const { progressutil } = require('../utils/progress');
const { getSeasonRemainingTimeInMilliseconds } = require('../utils/datetimetools');
const Season = require('../models/Season');

exports.getdailyquest = async (req, res) => {

    const { id } = req.user;
    const { characterid } = req.query;

    if (!characterid) {
        return res.status(400).json({
            message: "failed",
            data: "Please input the character id."
        });
    }

    const checker = await checkcharacter(id, characterid);
    
        if (checker === "failed") {
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }
    
        const sortOrder = [
            "storychapters",
            "dailyspin",
            "dailyloginclaimed",
            "friendsadded",
            "enemiesdefeated",
            "totaldamage",
            "selfheal",
            "pvpwins",
            "pvpparticipated",
            "raidparticipated"
        ]

    const Dailyquestdata = await QuestDetails.find()
        .sort({ createdAt: -1 })
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching daily quests: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    const dailyquestprogressdata = await QuestProgress.find({ owner: characterid })
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching daily quest progress: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    const now = new Date();
    const phTime = new Date(now.getTime() 
    // + (8 * 60 * 60 * 1000)
    ); // Convert to UTC+8
    
            // Calculate time until next midnight (00:00) in UTC+8
    const midnight = new Date(phTime);
    midnight.setDate(midnight.getDate() + 1); // Move to next day
    midnight.setHours(0, 0, 0, 0); // Set to midnight
    
    const timeUntilMidnight = midnight - phTime;
    const hoursRemaining = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));

    const currentSeason = await Season.findOne({ isActive: 'active' });

    if (!currentSeason) {
        return res.status(404).json({ message: "not-found", data: "No current season found." });
    }

    const timeleft = getSeasonRemainingTimeInMilliseconds(currentSeason.startedAt, currentSeason.duration);

    const finaldata = Dailyquestdata.reduce((acc, quest, index) => {
        const questProgress = dailyquestprogressdata.find(progress => 
            progress.quest.toString() === quest._id.toString()
        );

        acc[quest.missionName] = {
            id: quest._id,
            missionName: quest.missionName,
            description: quest.description,
            xpReward: quest.xpReward,
            requirements: Object.values(quest.requirements)[0],
            requirementType: Object.keys(quest.requirements)[0],
            daily: quest.daily,
            progress: questProgress ? {
                current: questProgress.progress,
                isCompleted: questProgress.isCompleted,
                lastUpdated: questProgress.lastUpdated
            } : {
                current: 0,
                isCompleted: false,
                lastUpdated: null
            }
        };
        return acc;
    }, {});

    const sortedEntries = Object.entries(finaldata).sort(([, a], [, b]) => {
        // 1. Sort by requirement type (sortOrder)
        const reqTypeA = a.requirementType;
        const reqTypeB = b.requirementType;
        const indexA = reqTypeA ? sortOrder.indexOf(reqTypeA) : -1;
        const indexB = reqTypeB ? sortOrder.indexOf(reqTypeB) : -1;


        if (indexA >= 0 && indexB >= 0 && indexA !== indexB) {
            return indexA - indexB;
        }
        if (indexA < 0 && indexB >= 0) return 1;
        if (indexA >= 0 && indexB < 0) return -1;

        return 0;
    });

    const sortedFinalData = Object.fromEntries(sortedEntries);
    return res.status(200).json({
        message: "success",
        data: {
            quest: sortedFinalData,
            resetin: {
                hours: hoursRemaining,
                minutes: minutesRemaining
            },
            season: {
                name: currentSeason.name,
                startedAt: currentSeason.startedAt,
                duration: currentSeason.duration,
                timeleft: timeleft
            }
        }
    });
}

exports.claimdailyquest = async (req, res) => {
    const { id } = req.user;
    const { characterid, questid } = req.body;

    if (!characterid || !questid) {
        return res.status(400).json({
            message: "failed",
            data: "Please input the character id and quest id."
        });
    }

    const checker = await checkcharacter(id, characterid);
    
    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const quest = await QuestDetails.findById(questid)
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching quest: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    if (!quest) {
        return res.status(404).json({
            message: "failed",
            data: "Quest not found."
        });
    }

    const questProgress = await QuestProgress.findOne(
        { owner: characterid, quest: questid }
    ).then(data => data)
      .catch(err => {
          console.error(`Error updating quest progress: ${err}`);
          return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
      });

    if (!quest.requirements || !questProgress) {
        return res.status(400).json({
            message: "failed",
            data: "Invalid quest requirements or progress"
        });
    }

    const requirementType = Object.keys(quest.requirements)[0];
    const requiredAmount = quest.requirements[requirementType];


    if (questProgress.progress >= requiredAmount) {
        const character = await Characterdata.findOne({ _id: characterid })
            .then(data => data)
            .catch(err => {
                console.error(`Error finding character: ${err}`);
                return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
            });

        if (!character) {
            return res.status(404).json({
                message: "failed",
                data: "Character not found."
            });
        }

        let currentLevel = character.level;
        let currentXP = character.experience + quest.xpReward;
        let levelsGained = 0;
        let xpNeeded = 80 * currentLevel;

        while (currentXP >= xpNeeded && xpNeeded > 0) {
            const overflowXP = currentXP - xpNeeded;
            currentLevel++;
            levelsGained++;
            currentXP = overflowXP;
            xpNeeded = 80 * currentLevel;
        }

        if (levelsGained > 0) {
            await CharacterStats.findOneAndUpdate(
                { owner: characterid },
                {
                    $inc: {
                        health: 10 * levelsGained,
                        energy: 5 * levelsGained,
                        armor: 2 * levelsGained,
                        magicresist: 1 * levelsGained,
                        speed: 1 * levelsGained,
                        attackdamage: 1 * levelsGained,
                        armorpen: 1 * levelsGained,
                        magicpen: 1 * levelsGained,
                        magicdamage: 1 * levelsGained,
                        critdamage: 1 * levelsGained
                    }
                }
            ).then().catch(err => {
                console.error(`Error updating character stats: ${err}`);
                return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
            });

            await CharacterSkillTree.findOneAndUpdate(
                { owner: characterid },
                { $inc: { skillPoints: 4 * levelsGained } }
            ).then().catch(err => {
                console.error(`Error updating skill tree: ${err}`);
                return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
            });
        }

        character.level = currentLevel;
        character.experience = currentXP;
        await character.save()
            .then()
            .catch(err => {
                console.error(`Error saving character: ${err}`);
                return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
            });

        questProgress.isCompleted = true;
        await questProgress.save()
            .then()
            .catch(err => {
                console.error(`Error saving quest progress: ${err}`);
                return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
            });
    } else {
        return res.status(400).json({
            message: "failed",
            data: `You need to complete ${requiredAmount - questProgress.progress} more ${requirementType} to claim this quest.`
        });
    }

    const progress = await progressutil('dailyquests', characterid, 1)
    
    if(progress.message !== "success") {
        return res.status(400).json({ message: "failed", data: "Failed to update progress." });
    }

    return res.status(200).json({
        message: "success",
    });
}