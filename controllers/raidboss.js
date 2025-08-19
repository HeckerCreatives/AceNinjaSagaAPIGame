const { default: mongoose } = require("mongoose");
const Raidboss = require("../models/Raidboss")
const RaidbossFight = require("../models/Raidbossfight")
const Characterdata = require("../models/Characterdata")
const { awardBattlepassReward, determineRewardType } = require("../utils/battlepassrewards")
const { gethairbundle } = require("../utils/bundle");
const { getCharacterGenderString } = require("../utils/character");

exports.getraidboss = async (req, res) => {
    const { id } = req.user;

    const {characterid} = req.query

    if (!characterid) {
        return res.status(400).json({ 
            message: "failed", 
            data: "Character ID is required" 
        });
    }

    // Get character gender (await because the util is async)
    const charactergender = await getCharacterGenderString(characterid);

    try {
        const bossdatas = await Raidboss.find({})
            .lean(); // Return plain objects instead of Mongoose docs for performance

        const bossfightdatas = await RaidbossFight.findOne({owner: new mongoose.Types.ObjectId(characterid)})
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching boss fight data: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

        const data = {
            boss: {},
            timeremaining: 0,
            status: bossfightdatas ? bossfightdatas.status : "pending"
        };

        bossdatas.forEach(tempdata => {
            const { bossname, rewards, status } = tempdata;
            let filteredrewards = []
            rewards.forEach(data => {
                if (data.type === "skin"){
                    if (charactergender.toLowerCase() === "male"){
                        filteredrewards.push({
                            type: data.type,
                            name: data.name,
                            amount: data.amount,
                            itemid: data.id,
                            gender: "male",
                            _id: data._id
                        })
                    } else {
                        filteredrewards.push({
                            type: data.type,
                            name: data.name,
                            amount: data.amount,
                            itemid: data.id,
                            gender: "female",
                            _id: data._id
                        })
                    }
                } else {
                    filteredrewards.push({
                        type: data.type,
                        name: data.name,
                        amount: data.amount,
                        itemid: data.id,
                        gender: "unisex",
                        _id: data._id
                    })
                }
            })
            data.boss[bossname] = {
                id: tempdata._id, // Use Mongoose ID for reference
                bossname: bossname,
                rewards: filteredrewards,    // rewards array with type, amount, id, gender
                status
            };
        });
        
        const now = new Date();
        const phTime = new Date(now.getTime());

        // Calculate time until next midnight (00:00) in UTC+8
        const midnight = new Date(phTime);
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);

        const timeUntilMidnight = midnight - phTime;
        const secondsRemaining = Math.floor(timeUntilMidnight / 1000);

        data.timeremaining = secondsRemaining

        return res.json({ message: "success", data });
    } catch (err) {
        console.error(`Error fetching boss datas: ${err}`);
        return res.status(400).json({
            message: "bad-request",
            data: "There's a problem with the server. Please try again later."
        });
    }
};



exports.awardRaidbossRewards = async (req, res) => {
    const { characterid, bossid } = req.body;

    if (!characterid || !bossid) {
        return res.status(400).json({ 
            message: "failed", 
            data: "Character ID and Boss ID are required" 
        });
    }

    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        // Get character data
        const character = await Characterdata.findById(characterid).session(session);
        if (!character) {
            await session.abortTransaction();
            return res.status(404).json({ 
                message: "failed", 
                data: "Character not found" 
            });
        }

        // Get raid boss data
        const boss = await Raidboss.findById(bossid)
            .session(session);

        if (!boss) {
            await session.abortTransaction();
            return res.status(404).json({ 
                message: "failed", 
                data: "Raid boss not found" 
            });
        }

        const results = [];

        console.log(`Awarding rewards for boss: ${boss.bossname}, character: ${characterid}`);

        // Award all rewards from boss.rewards array using determineRewardType
        if (boss.rewards && boss.rewards.length > 0) {
            console.log(`Processing ${boss.rewards.length} rewards:`, boss.rewards);
            for (const reward of boss.rewards) {
                // Use the determineRewardType function to properly process the reward
                const processedReward = determineRewardType(reward, character.gender);
                
                if (processedReward.type !== 'invalid' && processedReward.type !== 'unknown') {
                    const result = await awardBattlepassReward(characterid, processedReward, session);
                    results.push(result);
                    console.log(`Reward result:`, result);
                } else {
                    console.warn(`Skipping invalid reward:`, reward);
                }
            }
        } else {
            console.log('No rewards found for this boss');
        }

        // Mark raid boss fight as done for this character
        await RaidbossFight.findOneAndUpdate(
            { owner: characterid },
            { status: "done" },
            { upsert: true, session }
        );

        await session.commitTransaction();

        return res.status(200).json({ 
            message: "success", 
            data: {
                boss: boss.bossname,
                results: results.filter(r => r.success)
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.error(`Error awarding raid boss rewards: ${err}`);
        return res.status(500).json({ 
            message: "error", 
            data: "Failed to award raid boss rewards" 
        });
    } finally {
        session.endSession();
    }
};
