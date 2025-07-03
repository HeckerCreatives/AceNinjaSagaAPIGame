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
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "You already spinned today." });
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

        await Characterwallet.updateOne(
            { owner: characterid, type: selectedSpin.type },
            { $inc: { amount: selectedSpin.amount } },
            { new: true, upsert: true, session }
        );

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
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "You already spinned today." });
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

        let currentLevel = character.level;
        let currentXP = character.experience + selectedSpin.amount;
        let levelsGained = 0;
        let xpNeeded = 80 * currentLevel;

        while (currentXP >= xpNeeded && xpNeeded > 0){
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
                },
                { session }
            );

            await CharacterSkillTree.findOneAndUpdate(
                { owner: characterid }, 
                {
                    $inc: {
                        skillPoints: 4 * levelsGained
                    }
                },
                { session }
            );
        }

        character.level = currentLevel;
        character.experience = currentXP;
        await character.save({ session });

        // Update user spin status
        userdailyspin.expspin = false;
        await userdailyspin.save({ session });

        await session.commitTransaction();

                const analyticresponse = await addanalytics(
                characterid.toString(),
                userdailyspin._id.toString(),
                "spin", 
                "rewards",
                'Daily Experience Spin',
                `Claimed reward: ${selectedSpin.amount} ${selectedSpin.type}`,
                selectedSpin.amount
            );
        
                if (analyticresponse === "failed") {
                    return res.status(500).json({
                        message: "failed",
                        data: "Failed to log analytics for daily exp spin"
                    });
                }

        return res.status(200).json({
            message: "success",
            data: {
                id: selectedSpin._id,
                slot: selectedSpin.slot,
                type: selectedSpin.type,
                amount: selectedSpin.amount,
                chance: selectedSpin.chance,
                levelsGained,
                newLevel: currentLevel,
                newXP: currentXP
            }
        });
    } catch (error) {
        await session.abortTransaction();
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

    const daytoday = new Date().getDay()
    const lastclaimed = await existsreset(
        characterid.toString(),
        "weeklylogin",
        "claim"
    );

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

        if (userweeklylogin.currentDay === "day7") {
            userweeklylogin.currentDay = "day1";
        } else {
            const currentDayNumber = parseInt(userweeklylogin.currentDay.replace("day", ""));
            const nextDayNumber = currentDayNumber + 1;
            userweeklylogin.currentDay = `day${nextDayNumber}`;
        }

        userweeklylogin.lastClaimed = new Date();
        userweeklylogin.daily[userweeklylogin.currentDay] = true;
        await userweeklylogin.save({ session });

        if (weeklylogin.type === "exp") {
            const character = await Characterdata.findOne({ 
                _id: new mongoose.Types.ObjectId(characterid)
            }).session(session);

            if(!character) {
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "Character not found." });
            }

            let currentLevel = character.level;
            let currentXP = character.experience + weeklylogin.amount;
            let levelsGained = 0;
            let xpNeeded = 80 * currentLevel;

            while (currentXP >= xpNeeded && xpNeeded > 0){
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
                    },
                    { session }
                );

                await CharacterSkillTree.findOneAndUpdate(
                    { owner: characterid }, 
                    {
                        $inc: {
                            skillPoints: 4 * levelsGained
                        }
                    },
                    { session }
                );
            }

            character.level = currentLevel;
            character.experience = currentXP;
            await character.save({ session });
        } else {
            await Characterwallet.updateOne(
                { owner: characterid, type: weeklylogin.type },
                { $inc: { amount: weeklylogin.amount } },
                { new: true, upsert: true, session }
            );
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
            today: dayOfMonth,
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

        // Get today's day number (1-28)
        const today = new Date();
        const dayOfMonth = cmlogin.currentDay || today.getDate();
        const todayObj = cmlogin.days.find(d => d.day === dayOfMonth);

        if (!todayObj) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Invalid day for monthly login." });
        }

        // // Check if already checked in today
        // if (todayObj.loggedIn) {
        //     await session.abortTransaction();
        //     return res.status(400).json({ message: "failed", data: "You already checked in today." });
        // }

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

        if (!cmlogin.currentDay || cmlogin.currentDay === 0) {
            cmlogin.currentDay = dayOfMonth + 1; // Start from next day
        } else {
            cmlogin.currentDay = cmlogin.currentDay >= 28 ? 1 : cmlogin.currentDay + 1;
        }

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
                const character = await Characterdata.findOne({ _id: characterid }).session(session);
                if (!character) continue;
                let currentLevel = character.level;
                let currentXP = character.experience + reward.amount;
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
                        },
                        { session }
                    );
                    await CharacterSkillTree.findOneAndUpdate(
                        { owner: characterid },
                        { $inc: { skillPoints: 4 * levelsGained } },
                        { session }
                    );
                }
                character.level = currentLevel;
                character.experience = currentXP;
                await character.save({ session });
            } else {
                await Characterwallet.updateOne(
                    { owner: characterid, type: reward.type },
                    { $inc: { amount: reward.amount } },
                    { new: true, upsert: true, session }
                );
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
