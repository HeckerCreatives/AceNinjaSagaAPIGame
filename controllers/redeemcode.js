const { default: mongoose } = require("mongoose");
const CharacterStats = require("../models/Characterstats");
const Characterwallet = require("../models/Characterwallet");
const { Redeemcode, CodesRedeemed } = require("../models/Redeemcode");
const { CharacterSkillTree } = require("../models/Skills");
const { checkcharacter } = require("../utils/character");
const Characterdata = require("../models/Characterdata");
const { CharacterInventory } = require("../models/Market");

exports.redeemcode = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.user;
        const { code, characterid } = req.body;

        const checker = await checkcharacter(id, characterid);
        if (checker === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        if (!code || !characterid) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "Please input the code and character id."
            });
        }

        const redeemCode = await Redeemcode.findOne({ code: code })
            .populate("itemrewards")
            .populate("skillrewards")
            .session(session);

        if (!redeemCode) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "The code you entered is invalid or does not exist."
            });
        }

        const checkifisredeemed = await CodesRedeemed.findOne({
            owner: characterid,
            code: redeemCode._id
        }).session(session);

        if (checkifisredeemed) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "This code has already been redeemed by this character."
            });
        }

        if (redeemCode.status === "inactive") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "This code is currently inactive."
            });
        }

        if (redeemCode.expiration && new Date() > redeemCode.expiration) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "This code has expired."
            });
        }

        // Process rewards (use .get for Map fields)
        const coinsReward = redeemCode.rewards?.get('coins') || 0;
        const crystalReward = redeemCode.rewards?.get('crystal') || 0;
        const expReward = redeemCode.rewards?.get('exp') || 0;

        if (coinsReward > 0) {
            await Characterwallet.updateOne(
                { owner: characterid, type: "coins" },
                { $inc: { amount: coinsReward } },
                { upsert: true, session }
            );
        }

        if (crystalReward > 0) {
            await Characterwallet.updateOne(
                { owner: characterid, type: "crystal" },
                { $inc: { amount: crystalReward } },
                { upsert: true, session }
            );
        }

        if (expReward > 0) {
            const character = await Characterdata.findOne({ _id: characterid }).session(session);
            if (!character) {
                await session.abortTransaction();
                return res.status(404).json({
                    message: "failed",
                    data: "Character not found"
                });
            }

            character.experience += expReward;

            let currentLevel = character.level;
            let currentXP = character.experience;
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
                await CharacterStats.updateOne(
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

                await CharacterSkillTree.updateOne(
                    { owner: characterid },
                    { $inc: { skillPoints: 4 * levelsGained } },
                    { session }
                );
            }

            character.level = currentLevel;
            character.experience = currentXP;
            await character.save({ session });
        }

        // Create CodesRedeemed entry
        await CodesRedeemed.create([{
            owner: characterid,
            code: redeemCode._id,
        }], { session });

        // Award item rewards if present
        let itemResults = [];
        if (redeemCode.itemrewards && redeemCode.itemrewards.length > 0) {
            const character = await Characterdata.findById(characterid).session(session);
            if (!character) throw new Error("Character not found");

            for (const item of redeemCode.itemrewards) {
                if ((item.gender === 'male' && character.gender !== 0) || (item.gender === 'female' && character.gender !== 1)) {
                    itemResults.push({
                        status: 'failed',
                        message: `Item is not compatible with character's gender`,
                        name: item.name,
                        gender: item.gender,
                        inventorytype: item.inventorytype
                    });
                    continue;
                }

                const inventory = await CharacterInventory.findOne(
                    { owner: characterid, 'items.item': item._id },
                    { 'items.$': 1 }
                ).session(session);

                if (inventory?.items[0]) {
                    itemResults.push({
                        status: 'failed',
                        message: 'Item already exists in inventory',
                        name: item.name,
                        gender: item.gender,
                        inventorytype: item.inventorytype
                    });
                } else {
                    await CharacterInventory.findOneAndUpdate(
                        { owner: characterid, type: item.inventorytype },
                        {
                            $push: {
                                items: {
                                    item: item._id,
                                    quantity: 1
                                }
                            }
                        },
                        {
                            upsert: true,
                            new: true,
                            session
                        }
                    );
                    itemResults.push({
                        status: 'success',
                        name: item.name,
                        gender: item.gender,
                        inventorytype: item.inventorytype
                    });
                }
            }
        }

        // Award skill rewards if present
        let skillResults = [];
        if (redeemCode.skillrewards && redeemCode.skillrewards.length > 0) {
            for (const skill of redeemCode.skillrewards) {
                const existingSkill = await CharacterSkillTree.findOne({
                    owner: characterid,
                    "skills.skill": skill._id
                }).session(session);

                if (existingSkill) {
                    skillResults.push({
                        status: 'failed',
                        message: `Skill ${skill.name} already exists in character's skill tree`,
                        name: skill.name
                    });
                } else {
                    await CharacterSkillTree.findOneAndUpdate(
                        { owner: characterid },
                        { $push: { skills: { skill: skill._id, level: 1 } } },
                        { upsert: true, new: true, session }
                    );
                    skillResults.push({
                        status: 'success',
                        name: skill.name,
                        description: skill.description
                    });
                }
            }
        }

        // Fetch updated wallet and character for accurate response
        const walletCoins = await Characterwallet.findOne({ owner: characterid, type: "coins" }).session(session);
        const walletCrystal = await Characterwallet.findOne({ owner: characterid, type: "crystal" }).session(session);
        const character = await Characterdata.findOne({ _id: characterid }).session(session);

        // Build reward summary
        const rewardSummary = [];
        if (redeemCode.itemrewards && redeemCode.itemrewards.length > 0) {
            rewardSummary.push(`${redeemCode.itemrewards.length} item(s) rewarded`);
        }
        if (redeemCode.skillrewards && redeemCode.skillrewards.length > 0) {
            rewardSummary.push(`${redeemCode.skillrewards.length} skill(s) rewarded`);
        }
        if (coinsReward) rewardSummary.push(`${coinsReward} coins`);
        if (crystalReward) rewardSummary.push(`${crystalReward} crystal`);
        if (expReward) rewardSummary.push(`${expReward} experience`);

        // Build response
        const rewardDetails = {
            rewards: {
            coins: coinsReward,
            crystal: crystalReward,
            exp: expReward,
            itemrewards: redeemCode.itemrewards ? redeemCode.itemrewards.length : 0,
            skillrewards: redeemCode.skillrewards ? redeemCode.skillrewards.length : 0
            },
            summary: rewardSummary.join(', '),
            timestamp: new Date(),
            characterId: characterid,
            codeUsed: code,
            itemRewards: itemResults,
            skillRewards: skillResults
        };

        await session.commitTransaction();

        res.status(200).json({
            message: "success",
            data: rewardDetails
        });
    } catch (error) {
        await session.abortTransaction();
        console.error(`Error processing code redemption: ${error}`);
        res.status(500).json({
            message: "failed",
            data: "An error occurred while processing the code redemption."
        });
    } finally {
        session.endSession();
    }
}

exports.userredeemedcodeshistory = async (req, res) => {
    const { id } = req.user;
    const { characterid, page, limit } = req.query;

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

    const pageOptions = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
    }
    try {
        const redeemedCodes = await CodesRedeemed.find({ owner: characterid })
            .populate('code')
            .sort({ createdAt: -1 })
            .skip((pageOptions.page - 1) * pageOptions.limit)
            .limit(pageOptions.limit)
            .then(data => data.filter(item => item.code !== null))
            .catch(err => {
                console.log(`Error fetching redeemed codes: ${err}`);
                return res.status(500).json({
                    message: "bad-request",
                    data: "An error occurred while fetching redeemed codes. Please contact support."
                });
            })

        if (!redeemedCodes || redeemedCodes.length === 0) {
            return res.status(404).json({
                message: "failed",
                data: "No redeemed codes found for this character."
            });
        }

        const totaldocuments = await CodesRedeemed.countDocuments({ owner: characterid });

        const totalPages = Math.ceil(totaldocuments / pageOptions.limit);

        const formattedResponse = redeemedCodes.reduce((acc, code, index) => {
            acc[index + 1] = {
                id: code._id,
                code: code.code.code,
                title: code.code.title,
                description: code.code.description,
                rewards: code.code.rewards,
                redeemedAt: code.createdAt
            };
            return acc;
        }, {});
        
        return res.status(200).json({
            message: "success",
            data: formattedResponse,
            totalPages: totalPages,
            currentPage: pageOptions.page,
        });
    } catch (error) {
        console.error(`Error fetching redeemed codes: ${error}`);
        return res.status(500).json({
            message: "bad-request",
            data: "An error occurred while fetching redeemed codes. Please contact support."
        });
    }

}