const { default: mongoose } = require("mongoose")
const Characterdata = require("../models/Characterdata")
const Characterwallet = require("../models/Characterwallet")
const { DailyExpSpin, DailySpin, WeeklyLogin, MonthlyLogin, CharacterDailySpin, CharacterMonthlyLogin, CharacterWeeklyLogin } = require("../models/Rewards")
const { checkcharacter } = require("../utils/character")
const { checkmaintenance } = require("../utils/maintenance")
const CharacterStats = require("../models/Characterstats")
const { CharacterSkillTree } = require("../models/Skills")

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

    const formattedResponse = {
        data: dailyspin.reduce((acc, spin, index) => {
            acc[spin.slot] = {
                id: spin._id,
                slot: spin.slot,
                type: spin.type,
                amount: spin.amount,
                chance: spin.chance
            };
            return acc;
        }, {}),
        dailyspin: userdailyspin.spin
    };

    return res.status(200).json({ 
        message: "success", 
        ...formattedResponse
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

        if (userdailyspin.spin === true) {
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
        userdailyspin.spin = true;
        await userdailyspin.save({ session });

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

    const formattedResponse = {
        data: dailyspin.reduce((acc, spin, index) => {
            acc[spin.slot] = {
                id: spin._id,
                slot: spin.slot,
                type: spin.type,
                amount: spin.amount,
                chance: spin.chance
            };
            return acc;
        }, {}),
        dailyspin: userdailyspin.spin
    };

    return res.status(200).json({ 
        message: "success", 
        ...formattedResponse
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

        if (userdailyspin.expspin === true) {
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
        userdailyspin.expspin = true;
        await userdailyspin.save({ session });

        await session.commitTransaction();

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
    const lastclaimed = userweeklylogin.lastClaimed.getDay()
    let claimed 
    if (daytoday === lastclaimed) {
        claimed = true
    } else {
        claimed = false
    }
    console.log(daytoday, lastclaimed)

    const formattedResponse = {
        data: weeklylogin.reduce((acc, login, index) => {
            acc[login.day] = {
                id: login._id,
                day: login.day,
                type: login.type,
                amount: login.amount
            };
            return acc;
        }, {}),
        claimed: claimed,
        currentDay: userweeklylogin.currentDay
    };

    return res.status(200).json({ 
        message: "success", 
        ...formattedResponse
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

        if (userweeklylogin.lastClaimed.getDay() === new Date().getDay()) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "You already claimed your weekly login today." });
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

    const { id } = req.user
    const { characterid } = req.query

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized", 
            data: "You are not authorized to view this page. Please login the right account to view the page."
     });
    }

    const maintenance = await checkmaintenance("monthlylogin")

    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The monthly login is currently under maintenance. Please try again later."
        });
    }


    const monthlylogin = await MonthlyLogin.find().sort({ day: 1 })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding monthly login data: ${err}`)
        return
    })

    if(!monthlylogin){
        return res.status(400).json({ message: "failed", data: "Monthly login data not found." })
    }

    // sort data by day its like this day1, day2, day3, etc...

    monthlylogin.sort((a, b) => {
        const dayA = parseInt(a.day.replace("day", ""))
        const dayB = parseInt(b.day.replace("day", ""))

        return dayA - dayB
    })

    const cmlogin = await CharacterMonthlyLogin.findOne({ owner: characterid })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding Character monthly login data: ${err}`)
        return
    })

    if(!cmlogin){
        return res.status(400).json({ message: "failed", data: "Character Monthly login data not found." })
    }

    const daytoday = new Date().getDay()
    const lastclaimed = cmlogin.lastClaimed.getDay()
    let claimed 
    if (daytoday === lastclaimed) {
        claimed = true
    } else {
        claimed = false
    }

    const formattedResponse = {
        data: monthlylogin.reduce((acc, login, index) => {
            acc[login.day] = {
                id: login._id,
                day: login.day,
                type: login.type,
                amount: login.amount
            };
            return acc;
        }, {}),
        claimed: claimed,
        currentDay: cmlogin.currentDay
    };

    return res.status(200).json({ 
        message: "success", 
        ...formattedResponse
    });
}

exports.claimmonthlylogin = async (req, res) => {
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

        const maintenance = await checkmaintenance("monthlylogin")

        if (maintenance === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "The monthly login is currently under maintenance. Please try again later."
            });
        }

        const charactermonthlylogin = await CharacterMonthlyLogin.findOne({ owner: characterid }).session(session);
        if(!charactermonthlylogin){
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "User monthly login data not found." });
        }

        const monthlylogin = await MonthlyLogin.findOne({ day: charactermonthlylogin.currentDay }).session(session);
        if(!monthlylogin){
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Monthly login data not found." });
        }

        if (charactermonthlylogin.lastClaimed.getDay() === new Date().getDay()) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "You already claimed your monthly login today." });
        }

        if (charactermonthlylogin.currentDay === "day7") {
            charactermonthlylogin.currentDay = "day1";
        } else {
            const currentDayNumber = parseInt(charactermonthlylogin.currentDay.replace("day", ""));
            const nextDayNumber = currentDayNumber + 1;
            charactermonthlylogin.currentDay = `day${nextDayNumber}`;
        }

        charactermonthlylogin.lastClaimed = new Date();
        charactermonthlylogin.daily[charactermonthlylogin.currentDay] = true;
        await charactermonthlylogin.save({ session });

        if (monthlylogin.type === "exp") {
            const character = await Characterdata.findOne({ 
                _id: new mongoose.Types.ObjectId(characterid)
            }).session(session);

            if(!character) {
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "Character not found." });
            }

            let currentLevel = character.level;
            let currentXP = character.experience + monthlylogin.amount;
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
                { owner: characterid, type: monthlylogin.type },
                { $inc: { amount: monthlylogin.amount } },
                { new: true, upsert: true, session }
            );
        }

        await session.commitTransaction();
        return res.status(200).json({
            message: "success",
            data: {
                id: monthlylogin._id,
                day: monthlylogin.day,
                type: monthlylogin.type,
                amount: monthlylogin.amount
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error(`Error in claimmonthlylogin: ${error}`);
        return res.status(500).json({ message: "failed", data: "Internal server error" });
    } finally {
        session.endSession();
    }
}
