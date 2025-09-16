const { default: mongoose } = require("mongoose")
const Characterdata = require("../models/Characterdata")
const Characterwallet = require("../models/Characterwallet")
const { DailyExpSpin, DailySpin, WeeklyLogin, MonthlyLogin, CharacterDailySpin, CharacterMonthlyLogin, CharacterWeeklyLogin } = require("../models/Rewards")
const { checkcharacter } = require("../utils/character")
const { checkmaintenance } = require("../utils/maintenance")
const CharacterStats = require("../models/Characterstats")
const { CharacterSkillTree } = require("../models/Skills")
const { progressutil } = require("../utils/progress")
const { addanalytics } = require("../utils/analyticstools")
const { addreset, existsreset } = require("../utils/reset")
const { addXPAndLevel } = require("../utils/leveluptools")
const { addwallet, checkwallet, reducewallet } = require("../utils/wallettools")
const { CharacterInventory } = require("../models/Market")

// #region  USER

exports.getdailyspin = async (req, res) => {
    const { id } = req.user
    const { characterid } = req.query


    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized", 
            data: "You are not authorized to view this page. Please login the right account to view the page."
     });
    }   
    
    const maintenance = await checkmaintenance("dailyspin")

    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The daily spin is currently under maintenance. Please try again later."
        });
    }


    const dailyspin = await DailySpin.find({}).sort({ slot: 1 })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding dailyspin data: ${err}`)
        return
    })

    if(!dailyspin){
        return res.status(400).json({ message: "failed", data: "Daily spin data not found." })
    }

    const userdailyspin = await CharacterDailySpin.findOne({ owner: characterid })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding user dailyspin data: ${err}`)
        return
    })

    if(!userdailyspin){
        return res.status(400).json({ message: "failed", data: "User dailyspin data not found." })
    }

    const dailyspindata = dailyspin.reduce((acc, spin, index) => {
        acc[spin.slot] = {
            id: spin._id,
            slot: spin.slot,
            type: spin.type,
            amount: spin.amount,
            chance: spin.chance
        };
        return acc;
    }, {})


    // Get current time in UTC+8 (Philippines time)
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


    return res.status(200).json({ 
        message: "success", 
        data: {
            dailyspindata: dailyspindata,
            dailyspin: userdailyspin.spin,
            resetin: {
                hours: hoursRemaining,
                minutes: minutesRemaining
            }
        }
    });
}

exports.spindaily = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const { id } = req.user;
        const { characterid } = req.body;

        const checker = await checkcharacter(id, characterid);

        if (checker === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        const maintenance = await checkmaintenance("dailyspin");

        if (maintenance === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "The daily spin is currently under maintenance. Please try again later."
            });
        }

        const userdailyspin = await CharacterDailySpin.findOne({ owner: characterid }).session(session);

        if (!userdailyspin) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "User dailyspin data not found." });
        }

        if (userdailyspin.spin === false) {
           const wallet = await checkwallet(characterid, "crystal", session);
           
           if (wallet === "failed") {
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "Failed to check wallet amount." });
            }

            if (wallet < 100){
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "You need at least 100 crystals to spin." });
            }

            const walletReduce = await reducewallet(characterid, "crystal", 100, session);
            if (walletReduce === "failed") {
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "Failed to reduce wallet amount." });
            }
        }

        const dailyspin = await DailySpin.find().session(session);

        if (!dailyspin || dailyspin.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Daily spin data not found." });
        }

        // Calculate weighted random selection
        const totalChance = dailyspin.reduce((sum, spin) => sum + spin.chance, 0);
        const random = Math.random() * totalChance;

        let cumulativeChance = 0;
        let selectedSpin = null;

        for (const spin of dailyspin) {
            cumulativeChance += spin.chance;
            if (random <= cumulativeChance) {
                selectedSpin = spin;
                break;
            }
        }

        if (!selectedSpin) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Failed to select a spin reward." });
        }

        const walletResult = await addwallet(characterid, selectedSpin.type, selectedSpin.amount, session);
        if (walletResult === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "Failed to add wallet amount."
            });
        }

        // Update user spin status
        userdailyspin.spin = false;
        await userdailyspin.save({ session });

        const progress = await progressutil('dailyspin', characterid, 1)

        if(progress.message !== "success") {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Failed to update progress." });
        }

        
        const analyticresponse = await addanalytics(
            characterid.toString(),
            userdailyspin._id.toString(),
            "spin", 
            "rewards",
            'Daily Spin',
            `Claimed reward: ${selectedSpin.amount} ${selectedSpin.type}`,
            selectedSpin.amount
        );
    
        if (analyticresponse === "failed") {
            await session.abortTransaction();
            return res.status(500).json({
                message: "failed",
                data: "Failed to log analytics for daily spin"
            });
        }
        
        await session.commitTransaction();

        return res.status(200).json({
            message: "success",
            data: {
                id: selectedSpin._id,
                slot: selectedSpin.slot,
                type: selectedSpin.type,
                amount: selectedSpin.amount,
                chance: selectedSpin.chance
            }
        });
    } catch (error) {
        await session.abortTransaction();
        console.error(`Error occurred during daily spin: ${error}`);
        return res.status(500).json({ message: "failed", data: "Internal server error" });
    } finally {
        session.endSession();
    }
};

exports.getexpdailyspin = async (req, res) => {
    const { id } = req.user
    const { characterid } = req.query


    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized", 
            data: "You are not authorized to view this page. Please login the right account to view the page."
     });
    }   
    
    const maintenance = await checkmaintenance("dailyxpspin")

    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The daily exp spin is currently under maintenance. Please try again later."
        });
    }


    const dailyspin = await DailyExpSpin.find({}).sort({ slot: 1 })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding dailyspin data: ${err}`)
        return
    })

    if(!dailyspin){
        return res.status(400).json({ message: "failed", data: "Daily spin data not found." })
    }

    const userdailyspin = await CharacterDailySpin.findOne({ owner: characterid })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding user dailyspin data: ${err}`)
        return
    })

    if(!userdailyspin){
        return res.status(400).json({ message: "failed", data: "User dailyspin data not found." })
    }

    const dailyspindata = dailyspin.reduce((acc, spin, index) => {
        acc[spin.slot] = {
            id: spin._id,
            slot: spin.slot,
            type: spin.type,
            amount: spin.amount,
            chance: spin.chance
        };
        return acc;
    }, {})

    // Get current time in UTC+8 (Philippines time)
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

    return res.status(200).json({ 
        message: "success", 
        data: {
            dailyspindata: dailyspindata,
            dailyspin: userdailyspin.expspin,
            resetin: {
                hours: hoursRemaining,
                minutes: minutesRemaining
            }
        }
    });
}

exports.spinexpdaily = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const { id } = req.user;
        const { characterid } = req.body;

        const checker = await checkcharacter(id, characterid);

        if (checker === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        const maintenance = await checkmaintenance("dailyxpspin");

        if (maintenance === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "The daily exp spin is currently under maintenance. Please try again later."
            });
        }

        const userdailyspin = await CharacterDailySpin.findOne({ owner: characterid }).session(session);

        if (!userdailyspin) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "User dailyspin data not found." });
        }

        if (userdailyspin.expspin === false) {
           const wallet = await checkwallet(characterid, "crystal", session);
           
           if (wallet === "failed") {
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "Failed to check wallet amount." });
            }

            if (wallet < 100){
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "You need at least 100 crystals to spin." });
            }

            const walletReduce = await reducewallet(characterid, "crystal", 100, session);
            if (walletReduce === "failed") {
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "Failed to reduce wallet amount." });
            }
        }

        const dailyspin = await DailyExpSpin.find().session(session);

        if (!dailyspin || dailyspin.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Daily spin data not found." });
        }

        // Calculate weighted random selection
        const totalChance = dailyspin.reduce((sum, spin) => sum + spin.chance, 0);
        const random = Math.random() * totalChance;

        let cumulativeChance = 0;
        let selectedSpin = null;

        for (const spin of dailyspin) {
            cumulativeChance += spin.chance;
            if (random <= cumulativeChance) {
                selectedSpin = spin;
                break;
            }
        }

        if (!selectedSpin) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Failed to select a spin reward." });
        }

        const character = await Characterdata.findOne({ 
            _id: new mongoose.Types.ObjectId(characterid)
        }).session(session);

        if(!character) {
            await session.abortTransaction();
            return res.status(400).json({ 
                message: "failed", 
                data: "Character not found."
            });
        }


        // NEW: Calculate percentage-based XP reward
        const currentLevel = character.level;
        const xpPerLevel = 80 * currentLevel; // XP needed for current level
        const percentageReward = selectedSpin.amount; // This is now the percentage (e.g., 50 for 50%)
        const actualXpReward = Math.floor((xpPerLevel * percentageReward) / 100);

        const xpResult = await addXPAndLevel(characterid, actualXpReward, session);
        if (xpResult === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "Failed to add experience points."
            });
        }
        // Update user spin status
        userdailyspin.expspin = false;
        await userdailyspin.save({ session });

        // Add analytics before committing transaction
        const analyticresponse = await addanalytics(
            characterid.toString(),
            userdailyspin._id.toString(),
            "spin", 
            "rewards",
            'Daily Experience Spin',
            `Claimed reward: ${percentageReward}% XP (${actualXpReward} XP)`,
            actualXpReward
        );
    
        if (analyticresponse === "failed") {
            await session.abortTransaction();
            return res.status(500).json({
                message: "failed",
                data: "Failed to log analytics for daily exp spin"
            });
        }

        await session.commitTransaction();

        return res.status(200).json({
            message: "success",
            data: {
                id: selectedSpin._id,
                slot: selectedSpin.slot,
                type: selectedSpin.type,
                amount: actualXpReward,    // Show the calculated XP amount instead of percentage
                chance: selectedSpin.chance
            }
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        return res.status(500).json({ message: "failed", data: "Internal server error" });
    } finally {
        session.endSession();
    }
};


exports.getweeklylogin = async (req, res) => {

    const { id } = req.user
    const { characterid } = req.query

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized", 
            data: "You are not authorized to view this page. Please login the right account to view the page."
     });
    }

    const maintenance = await checkmaintenance("weeklylogin")

    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The weekly login is currently under maintenance. Please try again later."
        });
    }


    const weeklylogin = await WeeklyLogin.find().sort({ day: 1 })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding weekly login data: ${err}`)
        return
    })

    if(!weeklylogin){
        return res.status(400).json({ message: "failed", data: "Monthly login data not found." })
    }

    // sort data by day its like this day1, day2, day3, etc...

    weeklylogin.sort((a, b) => {
        const dayA = parseInt(a.day.replace("day", ""))
        const dayB = parseInt(b.day.replace("day", ""))

        return dayA - dayB
    })

    const userweeklylogin = await CharacterWeeklyLogin.findOne({ owner: characterid })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding user weekly login data: ${err}`)
        return
    })

    if(!userweeklylogin){
        return res.status(400).json({ message: "failed", data: "User weekly login data not found." })
    }


    const lastclaimed = await existsreset(
        characterid.toString(),
        "weeklylogin",
        "claim"
    );

    let claimed 
    if (lastclaimed) {
        claimed = true
    } else {
        claimed = false
    }
      // Get current time in UTC+8 (Philippines time)
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

    const daydata = weeklylogin.reduce((acc, login, index) => {
        acc[login.day] = {
            id: login._id,
            day: login.day,
            type: login.type,
            amount: login.amount
        };
        return acc;
    }, {})

    return res.status(200).json({ 
        message: "success", 
        data: {
            days: daydata,
            claimed: claimed,
            currentDay: userweeklylogin.currentDay,
            resetin: {
                hours: hoursRemaining,
                minutes: minutesRemaining
            }
        }
    });
}

exports.claimweeklylogin = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const { id } = req.user
        const { characterid } = req.body

        const checker = await checkcharacter(id, characterid);

        if (checker === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "Unauthorized", 
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        const maintenance = await checkmaintenance("weeklylogin")

        if (maintenance === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "The weekly login is currently under maintenance. Please try again later."
            });
        }

        const claimexist = await existsreset(
            characterid.toString(),
            "weeklylogin",
            "claim"
        );

        if (claimexist){
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "You already claimed your weekly login today." });
        }

        const userweeklylogin = await CharacterWeeklyLogin.findOne({ owner: characterid }).session(session);
        if(!userweeklylogin){
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "User weekly login data not found." });
        }

        const weeklylogin = await WeeklyLogin.findOne({ day: userweeklylogin.currentDay }).session(session);
        if(!weeklylogin){
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Weekly login data not found." });
        }

        userweeklylogin.lastClaimed = new Date();
        userweeklylogin.daily[userweeklylogin.currentDay] = true;
        await userweeklylogin.save({ session });

        if (weeklylogin.type === "exp") {
           const xpResult = await addXPAndLevel(characterid, weeklylogin.amount, session);
            if (xpResult === "failed") {
                await session.abortTransaction();
                return res.status(400).json({
                    message: "failed",
                    data: "Failed to add experience points."
                });
            }
        } else if (weeklylogin.type === "coins" || weeklylogin.type === "crystal") {
           const walletResult = await addwallet(characterid, weeklylogin.type, weeklylogin.amount, session);
            if (walletResult === "failed") {
                await session.abortTransaction();
                return res.status(400).json({
                    message: "failed",
                    data: "Failed to add wallet amount."
                });
            }
        } else if (weeklylogin.type === "chest") {
            const chestId = weeklylogin.amount; // Assuming amount holds the chest ID
            let chestToAdd = chestId;
            const existsChestQ = CharacterInventory.findOne({ owner: characterid, type: 'chests', 'items.item': chestToAdd });
            if (session) existsChestQ.session(session);
            const existsChest = await existsChestQ;
            if (existsChest) {
                await CharacterInventory.updateOne(
                    { owner: characterid, type: 'chests', 'items.item': chestToAdd },
                    { $inc: { 'items.$.quantity': 1 } },
                    { session }
                )
            } else {
                await CharacterInventory.findOneAndUpdate({ owner: characterid, type: 'chests' }, { $push: { items: { item: chestToAdd, quantity: 1 } } }, { upsert: true, session });
            }
        } else {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Invalid reward type." });
        }

        const analyticresponse = await addanalytics(
            characterid.toString(),
            userweeklylogin._id.toString(),
            "claim", 
            "rewards",
            'Weekly Login Rewards Claimed',
            `Claimed reward: ${weeklylogin.amount} ${weeklylogin.type} for day ${userweeklylogin.currentDay}`,
            weeklylogin.amount
        );
        
        if (analyticresponse === "failed") {
            return res.status(500).json({
                message: "failed",
                data: "Failed to log analytics for weekly login claim"
            });
        }
        const addresetexist = await addreset(
        characterid.toString(),
        "weeklylogin",
        "claim"
        );

        if (addresetexist === "failed") {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Failed to add reset for weekly login claim." });
        }
        
        const progress = await progressutil('dailyloginclaimed', characterid, 1);
        if (progress.message !== "success") {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Failed to update progress." });
        }
        
        await session.commitTransaction();
        return res.status(200).json({
            message: "success",
            data: {
                id: weeklylogin._id,
                day: weeklylogin.day,
                type: weeklylogin.type,
                amount: weeklylogin.amount
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error(`Error in claimweeklylogin: ${error}`);
        return res.status(500).json({ message: "failed", data: "Internal server error" });
    } finally {
        session.endSession();
    }
}


exports.getmonthlylogin = async (req, res) => {
    const { id } = req.user;
    const { characterid } = req.query;

    const checker = await checkcharacter(id, characterid);
    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const maintenance = await checkmaintenance("monthlylogin");
    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The monthly login is currently under maintenance. Please try again later."
        });
    }

    // Get all reward days (for calendar display)
    const monthlylogin = await MonthlyLogin.find().sort({ day: 1 });
    if (!monthlylogin) {
        return res.status(400).json({ message: "failed", data: "Monthly login data not found." });
    }

    // Get character's monthly login progress
    const cmlogin = await CharacterMonthlyLogin.findOne({ owner: characterid });
    if (!cmlogin) {
        return res.status(400).json({ message: "failed", data: "Character Monthly login data not found." });
    }

    // Prepare calendar data
    const calendar = cmlogin.days.reduce((acc, dayObj) => {
        const dayOfMonth = cmlogin.currentDay

        acc[dayObj.day] = {
            day: dayObj.day,
            loggedIn: dayObj.loggedIn,
            missed: dayObj.day < dayOfMonth && !dayObj.loggedIn ? true : dayObj.missed,
        };
        return acc;
    }, {});


    let rewarddays = monthlylogin.reduce((acc, login) => {
        const dayNumber = login.day.split("day")[1];
        const dayNum = parseInt(dayNumber);
        
        // Find the corresponding day in cmlogin.days
        const claimedDay = cmlogin.days.find(d => d.day === dayNum);
        
        acc[dayNum] = {
            id: login._id,
            day: dayNum,
            type: login.type,
            amount: login.amount,
            claimed: claimedDay ? claimedDay.claimed : false
        };
        return acc;
    }, {});


    const sortedRewardDays = Object.values(rewarddays).sort((a, b) => a.day - b.day);
    rewarddays = Object.fromEntries(sortedRewardDays.map(r => [r.day, r]));

    // Find today's day number (1-28)
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Check if user has unclaimed rewards at milestone days
    const canClaim = Object.values(rewarddays).some(reward => {
        const day = reward.day;
        // Check if this is a milestone day (1, 5, 10, 15, 20, 25)
        const isMilestoneDay = [1, 5, 10, 15, 20, 25].includes(day);
        // Check if user has enough logged in days and hasn't claimed this reward yet
        const dayEntry = cmlogin.days.find(d => d.day === day);

        return isMilestoneDay && cmlogin.totalLoggedIn >= day && dayEntry && !dayEntry.claimed;
    });

    const existingcheckin = await existsreset(
        characterid.toString(),
        "monthlylogin",
        "checkin"
    );

    const canCheckin = !existingcheckin

    let isMonthlyTrue = false;
    if (cmlogin.currentDay < 28  && dayOfMonth < 28) {
        isMonthlyTrue = true;
    }

          // Get current time in UTC+8 (Philippines time)
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

    return res.status(200).json({
        message: "success",
        data: {
            calendar,
            rewarddays,
            totalloggedin: cmlogin.totalLoggedIn,
            today: cmlogin.currentDay || dayOfMonth,
            canCheckin: isMonthlyTrue ? false : canCheckin,
            canClaim,
            resetin: {
                hours: hoursRemaining,
                minutes: minutesRemaining
            }
        }
    });
};

exports.checkinmonthlylogin = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const { id } = req.user;
        const { characterid } = req.body;

        const checker = await checkcharacter(id, characterid);
        if (checker === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        const maintenance = await checkmaintenance("monthlylogin");
        if (maintenance === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "The monthly login is currently under maintenance. Please try again later."
            });
        }

        const claimexist = await existsreset(
            characterid.toString(),
            "monthlylogin",
            "checkin"
        );

        if (claimexist) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "You already checked in today." });
        }
        const cmlogin = await CharacterMonthlyLogin.findOne({ owner: characterid }).session(session);
        if (!cmlogin) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "User monthly login data not found." });
        }

        if (cmlogin.currentDay && cmlogin.currentDay >= 29) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "Monthly login cycle completed. Please wait for the next cycle to start."
            });
        }

        // Get today's day number (1-28)
        const today = new Date();
        const dayOfMonth = cmlogin.currentDay || today.getDate();
        const todayObj = cmlogin.days.find(d => d.day === dayOfMonth);

        if (!todayObj) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Invalid day for monthly login." });
        }

        // Mark missed days (if user skipped days)
        for (let i = 0; i < cmlogin.days.length; i++) {
            const dayEntry = cmlogin.days[i];
            if (dayEntry.day < dayOfMonth && !dayEntry.loggedIn && !dayEntry.missed) {
                dayEntry.missed = true;
            }
        }

        // Mark today as logged in (but not claimed)
        todayObj.loggedIn = true;
        cmlogin.lastLogin = today;
        cmlogin.totalLoggedIn = cmlogin.days.filter(d => d.loggedIn).length;


        // Add reset for monthly login checkin
        const addresetexist = await addreset(
            characterid.toString(),
            "monthlylogin",
            "checkin"
        );

        if (addresetexist === "failed") {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Failed to add reset for monthly login checkin." });
        }

        await cmlogin.save({ session });
        await session.commitTransaction();

        return res.status(200).json({
            message: "success",
            data: { day: dayOfMonth, checkedIn: true }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error(`Error in checkinmonthlylogin: ${error}`);
        return res.status(500).json({ message: "failed", data: "Internal server error" });
    } finally {
        session.endSession();
    }
};

exports.claimmonthlylogin = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const { id } = req.user;
        const { characterid } = req.body;

        const checker = await checkcharacter(id, characterid);
        if (checker === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        const maintenance = await checkmaintenance("monthlylogin");
        if (maintenance === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "The monthly login is currently under maintenance. Please try again later."
            });
        }

        const cmlogin = await CharacterMonthlyLogin.findOne({ owner: characterid }).session(session);
        if (!cmlogin) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "User monthly login data not found." });
        }

        // Get all days that are logged in but not yet claimed
        const unclaimedDays = cmlogin.days.filter(d => cmlogin.totalLoggedIn >= d.day && !d.claimed);

        if (unclaimedDays.length === 0) {
            await session.commitTransaction();
            return res.status(200).json({
                message: "success",
                data: "No unclaimed rewards available." 
            });
        }

        // Get all rewards for those days
        const rewardDays = unclaimedDays.map(d => `day${d.day}`);
        const rewards = await MonthlyLogin.find({ day: { $in: rewardDays } }).session(session);

        // Prepare a map for quick lookup
        const rewardMap = {};

        for (const reward of rewards) {
            rewardMap[reward.day] = reward;
        }

        // Track claimed rewards for response
        const claimed = {}

        for (const dayObj of unclaimedDays) {
            const rewardKey = `day${dayObj.day}`;
            const reward = rewardMap[rewardKey];

            if (!reward) continue;

            // Mark as claimed
            dayObj.claimed = true;

            // Give reward
            if (reward.type === "exp") {
                const xpResult = await addXPAndLevel(characterid, reward.amount, session);
                if (xpResult === "failed") {
                    await session.abortTransaction();
                    return res.status(400).json({
                        message: "failed",
                        data: "Failed to add experience points."
                    });
                }
            } else if (reward.type === "coins" || reward.type === "crystal") {
                const walletResult = await addwallet(characterid, reward.type, reward.amount, session);
                if (walletResult === "failed") {
                    await session.abortTransaction();
                    return res.status(400).json({
                        message: "failed",
                        data: "Failed to add wallet amount."
                    });
                }
            } else if (reward.type === "chest") {
                const chestId = reward.amount; // Assuming amount holds the chest ID
                let chestToAdd = chestId;
                const existsChestQ = CharacterInventory.findOne({ owner: characterid, type: 'chests', 'items.item': chestToAdd });
                if (session) existsChestQ.session(session);
                const existsChest = await existsChestQ;
                if (existsChest) {
                    await CharacterInventory.updateOne(
                        { owner: characterid, type: 'chests', 'items.item': chestToAdd },
                        { $inc: { 'items.$.quantity': 1 } },
                        { session }
                    )
                } else {
                    await CharacterInventory.findOneAndUpdate({ owner: characterid, type: 'chests' }, { $push: { items: { item: chestToAdd, quantity: 1 } } }, { upsert: true, session });
                }
            }  else {
                console.log(`Unknown reward type: ${reward.type} for day ${dayObj.day}`);
                continue;
            }
            claimed[dayObj.day] = {
                type: reward.type,
                amount: reward.amount
            };
        }
        
        const analyticresponse = await addanalytics(
            characterid.toString(),
            cmlogin._id.toString(),
            "claim", 
            "rewards",
            'Monthly Login Rewards Claimed',
            `Claimed rewards: ${Object.entries(claimed).map(([day, reward]) => 
                `Day ${day}: ${reward.amount} ${reward.type}`
            ).join(', ')}`,
            0
        );
    
        if (analyticresponse === "failed") {
            return res.status(500).json({
                message: "failed",
                data: "Failed to log analytics for monthly login claim"
            });
        }
        

        await cmlogin.save({ session });
        await session.commitTransaction();
        return res.status(200).json({
            message: "success",
            data: { claimed }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error(`Error in claimmonthlylogin: ${error}`);
        return res.status(500).json({ message: "failed", data: "Internal server error" });
    } finally {
        session.endSession();
    }
}
