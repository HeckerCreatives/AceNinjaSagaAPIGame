const { default: mongoose } = require("mongoose");
const CharacterStats = require("../models/Characterstats");
const Characterwallet = require("../models/Characterwallet");
const { Redeemcode, CodesRedeemed } = require("../models/Redeemcode");
const { CharacterSkillTree } = require("../models/Skills");
const { checkcharacter } = require("../utils/character");
const Characterdata = require("../models/Characterdata");
const { CharacterInventory } = require("../models/Market");
const { gethairbundle } = require("../utils/bundle");
const { addwallet } = require("../utils/wallettools");
const { addXPAndLevel } = require("../utils/leveluptools");

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
            const coinsResult = await addwallet(characterid, coinsReward, 'coins', session);
            if (coinsResult === "failed") {
                await session.abortTransaction();
                return res.status(400).json({
                    message: "failed",
                    data: "Failed to add coins to wallet."
                });
            }
        }

        if (crystalReward > 0) {
            const crystalResult = await addwallet(characterid, crystalReward, 'crystal', session);
            if (crystalResult === "failed") {
                await session.abortTransaction();
                return res.status(400).json({
                    message: "failed",
                    data: "Failed to add crystals to wallet."
                });
            }
        }

        if (expReward > 0) {
            const xpResult = await addXPAndLevel(characterid, expReward, session);
            if (xpResult === "failed") {
                await session.abortTransaction();
                return res.status(400).json({
                    message: "failed",
                    data: "Failed to add experience points."
                });
            }
        }

        // Create CodesRedeemed entry
        await CodesRedeemed.create([{
            owner: characterid,
            code: redeemCode._id,
        }], { session });

        // Award item rewards if present
        let itemResults = [];

        // if item inventory type is outfit then check its corresponding hair item and push it into redeemCode.itemrewards
        for (const item of redeemCode.itemrewards || []) {
            if (item.inventorytype === 'outfit') {
                let hairItem = await gethairbundle(item._id.toString());
                if (hairItem) {
                    redeemCode.itemrewards.push({
                        _id: hairItem,
                    })
                } else {
                    return res.status(400).json({
                        message: "failed",
                        data: "Hair item not found for the outfit."
                    });
                }

                console.log(`Hair item added for outfit: ${hairItem}`);
            }
        }
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
        // Convert itemResults and skillResults arrays to objects with index keys
        const itemResultsObj = itemResults.length > 0 ? itemResults[0] : {}
        const skillResultsObj = skillResults.reduce((acc, skill, idx) => {
            acc[idx + 1] = skill;
            return acc;
        }, {});

        const rewardDetails = {
            rewards: {
            coins: coinsReward,
            crystal: crystalReward,
            exp: expReward,
            itemrewards: itemResultsObj, // now an object
            skillrewards: skillResultsObj // now an object
            },
            summary: rewardSummary.join(', '),
            timestamp: new Date(),
            characterId: characterid,
            codeUsed: code
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