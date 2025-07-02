const { default: mongoose } = require("mongoose")
const Characterwallet = require("../models/Characterwallet")
const { Market, CharacterInventory, Item } = require("../models/Market")
const Characterdata = require("../models/Characterdata")
const { CharacterSkillTree, Skill } = require("../models/Skills")
const { checkmaintenance } = require("../utils/maintenance")
const { addanalytics } = require("../utils/analyticstools")
const Analytics = require("../models/Analytics")
const CharacterStats = require("../models/Characterstats")
const { checkcharacter } = require("../utils/character")
const { gethairbundle } = require("../utils/bundle")
const { addreset, existsreset } = require("../utils/reset")

exports.getMarketItems = async (req, res) => {
    const { page, limit, type, rarity, search, markettype, gender, characterid } = req.query

    const pageOptions = {
        page: parseInt(page, 10) || 0,
        limit: parseInt(limit, 10) || 10
    }

    if (!markettype){

        const maintenance = await checkmaintenance("market")
        
        if (maintenance === "failed") {
            return res.status(400).json({
                    message: "failed",
                    data: "The market is currently under maintenance. Please try again later."
                });
            }
        
        const smaintenance = await checkmaintenance("store")
        
        if (smaintenance === "failed") {
            return res.status(400).json({
                    message: "failed",
                    data: "The store is currently under maintenance. Please try again later."
                });
            }
    } else if (markettype === "market") {
        const maintenance = await checkmaintenance("market")
        
        if (maintenance === "failed") {
            return res.status(400).json({
                    message: "failed",
                    data: "The market is currently under maintenance. Please try again later."
                });
            }
    } else if (markettype === "shop") {
        const smaintenance = await checkmaintenance("store")
        
        if (smaintenance === "failed") {
            return res.status(400).json({
                    message: "failed",
                    data: "The market is currently under maintenance. Please try again later."
                });
            }
    }
            
    try {
        // Build pipeline stages
        const pipeline = [
            {
                $match: {
                    marketType: markettype || { $in: ['market', 'shop'] }
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'skills',
                    localField: 'items.skill',
                    foreignField: '_id',
                    as: 'skill'
                }
            },
            { $unwind: { path: '$skill', preserveNullAndEmptyArrays: true } }
        ];

        // Initialize match conditions
        const matchConditions = [];

        // Add search conditions if search parameter exists
        if (search) {
            matchConditions.push({
                $or: [
                    { 'items.type': { $regex: new RegExp(search, "i") } },
                    { 'items.rarity': { $regex: new RegExp(search, "i") } },
                    { 'items.name': { $regex: new RegExp(search, "i") } }
                ]
            });
        }

        // Add type filter if specified
        if (type) {
            matchConditions.push({ 'items.type': type });
        }

        // Add rarity filter if specified
        if (rarity) {
            matchConditions.push({ 'items.rarity': rarity });
        }

        // Add match stage only if there are conditions
        if (matchConditions.length > 0) {
            pipeline.push({
                $match: {
                    $and: matchConditions
                }
            });
        }
        
        if (gender){
            matchConditions.push({ 'items.gender': gender})
        }

        // Add pagination
        pipeline.push(
            { $skip: pageOptions.page * pageOptions.limit },
            { $limit: pageOptions.limit },
            {
                $project: {
                    _id: 0,
                    itemId: '$items._id',
                    name: '$items.name',
                    type: '$items.type',
                    rarity: '$items.rarity',
                    price: '$items.price',
                    currency: '$items.currency',
                    description: '$items.description',
                    stats: '$items.stats',
                    imageUrl: '$items.imageUrl',
                    gender: '$items.gender',
                    isOpenable: '$items.isOpenable',
                    rewardtype: {
                        $cond: [
                            { $gt: ['$items.crystals', 0] }, 'crystals',
                            {
                                $cond: [
                                    { $gt: ['$items.coins', 0] }, 'coins',
                                    {
                                        $cond: [
                                            { $gt: ['$items.exp', 0] }, 'exp',
                                            null
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    rewardsamount: {
                        crystals: {
                            $cond: [
                                { $gt: ['$items.crystals', 0] },
                                '$items.crystals',
                                '$$REMOVE'
                            ]
                        },
                        coins: {
                            $cond: [
                                { $gt: ['$items.coins', 0] },
                                '$items.coins',
                                '$$REMOVE'
                            ]
                        },
                        exp: {
                            $cond: [
                                { $gt: ['$items.exp', 0] },
                                '$items.exp',
                                '$$REMOVE'
                            ]
                        }
                    },                    
                    crystals: {
                        $cond: {
                        if: { $or: [
                                    { $eq: ['$items.type', 'crystalpacks'] },
                                    { $eq: ['$items.type', 'freebie'] }
                                    ]},                            
                        then: '$items.crystals',
                        else: '$$REMOVE'
                        }
                    },
                    coins: {
                        $cond: {
                        if: { $or: [
                                    { $eq: ['$items.type', 'crystalpacks'] },
                                    { $eq: ['$items.type', 'freebie'] }
                                    ]},                              
                        then: '$items.coins',
                        else: '$$REMOVE'
                        }
                    },
                    exp: {
                        $cond: {
                            if: { $eq: ['$items.type', 'freebie'] },
                            then: '$items.exp',
                            else: '$$REMOVE'
                        }
                    },
                    skill: {
                        $cond: {
                            if: { $eq: ['$items.type', 'skills'] },
                            then: '$skill',
                            else: '$$REMOVE'
                        }
                    }
                }
            }
        );

        // Execute aggregation
        const items = await Market.aggregate(pipeline);


        // Get total count for pagination
        const countPipeline = [...pipeline];
        countPipeline.splice(-3, 3); // Remove skip, limit, and project stages
        countPipeline.push({ $count: 'total' });
        const totalItems = await Market.aggregate(countPipeline);

        // Format response
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of the day
    const existingClaim = await Analytics.find({
            owner: characterid,
            createdAt: { $gte: today }
        })

        const formattedResponse = {
            data: items.reduce((acc, item, index) => {
            // If item type is freebie and there's an existing claim with matching transactionid, add timer
            if (item.type === 'freebie') {

                    const now = new Date();
                    const phTime = new Date(now.getTime()); 
                    const midnight = new Date(phTime);
                    midnight.setDate(midnight.getDate() + 1);
                    midnight.setHours(0, 0, 0, 0);
                    
                    const timer = midnight - phTime;
                    const hours = Math.floor(timer / (1000 * 60 * 60));
                    const minutes = Math.floor((timer % (1000 * 60 * 60)) / (1000 * 60));
                    
                    item.timer = timer;
                    item.hoursLeft = hours;
                    item.minutesLeft = minutes;

                        if (
                    item.type === "freebie" &&
                    Array.isArray(existingClaim) &&
                    existingClaim.length > 0 &&
                    existingClaim.some(claim => claim.transactionid?.toString() === item.itemId?.toString())
                ) {
                    item.timer = timer;
                    item.hoursLeft = hours;
                    item.minutesLeft = minutes;
                } else {
                    item.timer = 0;
                    item.hoursLeft = 0;
                    item.minutesLeft = 0;
                }
            }
            acc[index + 1] = item;
            return acc;
            }, {}),
            pagination: {
            total: totalItems[0]?.total || 0,
            page: pageOptions.page,
            limit: pageOptions.limit,
            pages: Math.ceil((totalItems[0]?.total || 0) / pageOptions.limit)
            }
        };

        return res.status(200).json({
            message: "success",
            data: formattedResponse.data,
            pagination: formattedResponse.pagination
        });

    } catch (err) {
        console.log(`Error in market items aggregation: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "There's a problem with the server! Please try again later."
        });
    }
}

exports.buyitem = async (req, res) => {
    const { id } = req.user
    const { itemid, characterid } = req.body

        const maintenance = await checkmaintenance("market")
        
        if (maintenance === "failed") {
            return res.status(400).json({
                    message: "failed",
                    data: "The market is currently under maintenance. Please try again later."
                });
            }
        
        const smaintenance = await checkmaintenance("store")
        
        if (smaintenance === "failed") {
            return res.status(400).json({
                    message: "failed",
                    data: "The store is currently under maintenance. Please try again later."
                });
            }
        const checker = await checkcharacter(id, characterid);

        if (checker === "failed") {
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        const hairbundle = await gethairbundle(itemid)
    try {
        // Start transaction
        const session = await mongoose.startSession();
        await session.startTransaction();

        try {
            // Find item in market
            const item = await Market.findOne(
                { 'items._id': itemid },
                { 'items.$': 1 }
            ).session(session);

            if (!item?.items[0]) {
                await session.abortTransaction();
                return res.status(404).json({ message: "failed", data: "Item not found" });
            }

            if(item.type === "freebie") {
                return res.status(400).json({
                    message: "failed", 
                    data: "This item is a freebie and cannot be purchased."
                });
            }
            let itemData1
            if (mongoose.Types.ObjectId.isValid(hairbundle)) {
                itemData1 = await Item.findOne({ _id: hairbundle }
                ).session(session);
            }


            const itemData = item.items[0];
            // check character gender 0 for male 1 for female
            if ((itemData.gender === 'male' && checker.gender !== 0) || (itemData.gender === 'female' && checker.gender !== 1)) {
                return res.status(400).json({
                    message: "failed", 
                    data: "This item is not available for your character. Please choose a different item."
                });
            }
            // Check if item already exists in inventory
            const inventory = await CharacterInventory.findOne(
                { owner: characterid, 'items.item': itemid },
                { 'items.$': 1 }
            ).session(session);

            if (inventory?.items[0]) {
                return res.status(400).json({ message: "failed", data: "Item already exists in inventory" });
            } 
            
            // Check wallet balance
            const wallet = await Characterwallet.findOne({ 
                owner: new mongoose.Types.ObjectId(characterid), 
                type: itemData.currency 
            }).session(session);

            if (!wallet) {
                await session.abortTransaction();
                return res.status(404).json({ message: "failed", data: "Wallet not found" });
            }

            let totalprice = itemData.price;

            if (wallet.amount < totalprice) {
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "Insufficient balance" });
            }

            // Update wallet
            await Characterwallet.findOneAndUpdate(
                { owner: characterid, type: itemData.currency },
                { $inc: { amount: -totalprice } },
                { new: true, session }
            );


            // if item type is skill then store it in Characterskills

            if (itemData.type === "skills") {

                const skill = await Skill.findById(itemData.skill).session(session);
                if (!skill) {
                    return res.status(404).json({
                            message: "failed",
                            data: "Skill not found"
                    });
                }
                // Get character's skill tree
                  let skillTree = await CharacterSkillTree.findOne({ owner: characterid }).session(session)
                  .populate('skills.skill');

              if (!skillTree) {
                  skillTree = await CharacterSkillTree.create({
                      owner: characterid,  // Fixed: changed characterid to owner
                      skills: []
                  });
              }

              // Check prerequisites are maxed
              if (skill.prerequisites && skill.prerequisites.length > 0) {
                  const hasMaxedPrerequisites = skill.prerequisites.every(prereqId => {
                      const prereqSkill = skillTree.skills.find(s => 
                          s.skill._id.toString() === prereqId.toString()
                      );
                      return prereqSkill && prereqSkill.level >= prereqSkill.skill.maxLevel;
                  });

                  if (!hasMaxedPrerequisites) {
                      return res.status(400).json({
                          message: "failed",
                          data: "Prerequisites must be at maximum level"
                      });
                  }
              }

              // Check if character already has this skill
              const existingSkill = skillTree.skills.find(s => 
                  s.skill._id.toString() === itemData.skill.toString()
              );

              if (existingSkill && existingSkill.level >= skill.maxLevel) {
                  return res.status(400).json({
                      message: "failed",
                      data: "Skill already at maximum level"
                  });
              }

                if (existingSkill) {
                    existingSkill.level += 1;
                } else {
                    skillTree.skills.push({
                        skill: itemData.skill,
                        level: 1,
                    });
                    if (!skillTree.unlockedSkills.includes(itemData.skill)) {
                        skillTree.unlockedSkills.push(itemData.skill);
                    }
                }

                await skillTree.save({ session });

            } else if (itemData.type === "crystalpacks") {
                await Characterwallet.findOneAndUpdate(
                    { owner: characterid, type: 'crystal' },
                    { $inc: { amount: itemData.crystals } },
                    { new: true, session }
                );

            } else if (itemData.type === "goldpacks") {
                await Characterwallet.findOneAndUpdate(
                    { owner: characterid, type: 'coins' },
                    { $inc: { amount: itemData.coins } },
                    { new: true, session }
                );
            } else {
                await CharacterInventory.findOneAndUpdate(
                    { owner: characterid, type: itemData.inventorytype },
                    { $push: { items: { item: itemData._id } } },
                { upsert: true, new: true, session }

            );
            if (itemData1) {
                await CharacterInventory.findOneAndUpdate(
                    { owner: characterid, type: itemData1.inventorytype },
                    { $push: { items: { item: itemData1._id } } },
                    { upsert: true, new: true, session }
                );
            }
            }
            
            // Commit transaction
            await session.commitTransaction();
            return res.status(200).json({ 
                message: "success",
                data: {
                    item: itemData.name,
                    price: itemData.price,
                    type: itemData.type,
                    item1: itemData1 ? itemData1.name : null,
                    item1price: itemData1 ? itemData1.price : null,
                    item1type: itemData1 ? itemData1.type : null
                }
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (err) {
        console.log(`Error in buy item transaction: ${err}`);
        return res.status(500).json({ 
            message: "failed", 
            data: "Failed to complete purchase" 
        });
    }
}

// ...existing code...
exports.claimfreebie = async (req, res) => {
    const { itemid, characterid } = req.body

    if (!itemid || !characterid) {
        return res.status(400).json({ message: "failed", data: "Item ID and Character ID are required" });
    }

    const maintenance = await checkmaintenance("market")
        
    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The market is currently under maintenance. Please try again later."
        });
    }
        
    const smaintenance = await checkmaintenance("store")
        
    if (smaintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The store is currently under maintenance. Please try again later."
        });
    }    

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const item = await Item.findOne({ _id: itemid }).session(session);
        console.log(itemid)
        console.log(item)
        if (!item) {
            await session.abortTransaction();
            return res.status(404).json({ message: "failed", data: "Freebie item not found" });
        }

        const claimexist = await existsreset(
            characterid.toString(),
            "freebie",
            "claim"
        );

        if (claimexist) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "You have already claimed your freebie today. Please try again tomorrow."
            });
        }

        // Determine reward type and amount
        let rewardType = null;
        let rewardAmount = 0;
        let rewardDesc = "";

        if (item.exp) {
            rewardType = "exp";
            rewardAmount = item.exp;
            rewardDesc = `Claimed ${rewardAmount} EXP from freebie`;
        } else if (item.crystals) {
            rewardType = "crystal";
            rewardAmount = item.crystals;
            rewardDesc = `Claimed ${rewardAmount} crystals from freebie`;
        } else if (item.coins) {
            rewardType = "coins";
            rewardAmount = item.coins;
            rewardDesc = `Claimed ${rewardAmount} coins from freebie`;
        } else {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "Freebie item has no reward" });
        }

        // Give reward
        if (rewardType === "exp") {
            const character = await Characterdata.findOne({ _id: characterid }).session(session);
            if (!character) {
                await session.abortTransaction();
                return res.status(404).json({ message: "failed", data: "Character not found" });
            }
            let currentLevel = character.level;
            let currentXP = character.experience + rewardAmount;
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
                { owner: characterid, type: rewardType },
                { $inc: { amount: rewardAmount } },
                { new: true, upsert: true, session }
            );
        }

        // Create analytics for claiming freebie
        const analyticresponse = await addanalytics(
            characterid.toString(),
            itemid.toString(),
            "claim",
            "freebie",
            rewardType,
            rewardDesc,
            rewardAmount
        );

        if (analyticresponse === "failed") {
            await session.abortTransaction();
            return res.status(500).json({
                message: "failed",
                data: "Failed to log analytics for claiming freebie"
            });
        }

        const addclaimreset = await addreset(
            characterid.toString(),
            "freebie",
            "claim",
        )

        // Calculate time left until next claim (next claim is at 12am midnight UTC+8)
        const now = new Date();
        const phTime = new Date(
            // now.getTime() + (8 * 60 * 60 * 1000)
    ); // Convert to UTC+8

        // Calculate time until next midnight (00:00) in UTC+8
        const midnight = new Date(phTime);
        midnight.setDate(midnight.getDate() + 1); // Move to next day
        midnight.setHours(0, 0, 0, 0); // Set to midnight

        const timer = midnight - phTime;
        const hours = Math.floor(timer / (1000 * 60 * 60));
        const minutes = Math.floor((timer % (1000 * 60 * 60)) / (1000 * 60));

        await session.commitTransaction();
        return res.status(200).json({
            message: "success",
            data: {
            rewardType,
            rewardAmount,
            item: item.name,
            timer,
            hoursLeft: hours,
            minutesLeft: minutes
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.log(`Error in claim freebie: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "Failed to claim freebie"
        });
    } finally {
        session.endSession();
    }
}
exports.sellitem = async (req, res) => {

    const { itemid, characterid, quantity } = req.body

    try {
        // Find item in inventory
            const item = await CharacterInventory.findOne(
                { 'items.item': itemid },
                { 'items.$': 1 }
            )
            .populate('items.item')


            if (!item?.items[0]) {
                await session.abortTransaction();
                return res.status(404).json({ message: "failed", data: "Item not found" });
            }

            const itemData = item.items[0];

            let coinsamount = itemData.item.price * 0.5

            if (itemData.item.currency === "coins") {
                await Characterwallet.findOneAndUpdate(
                    { owner: characterid, type: 'coins' },
                    { $inc: { amount: coinsamount } }
                );

            } else if(itemData.item.currency === "crystal") {
                await Characterwallet.findOneAndUpdate(
                    { owner: characterid, type: 'crystal' },
                    { $inc: { amount: coinsamount } }
                );
            } else {
                return res.status(400).json({ message: "failed", data: "Invalid currency" });
            }

            // Update wallet

            // Update inventory

            await CharacterInventory.findOneAndUpdate(
                { owner: characterid, 'items.item': itemid  },
                { $pull: { items: { item: itemid } } }
            );
            
        // const analyticresponse = await addanalytics(
        //     characterid.toString(),
        //     battlepassData._id.toString(),
        //     "buy",
        //     "battlepass",
        //     "premium",
        //     `Bought premium battlepass for ${currentSeason.premiumCost} crystals`,
        //     currentSeason.premiumCost
        // )

        // if (analyticresponse === "failed") {
        //     console.log("Failed to log analytics for premium battlepass purchase");
        //     await session.abortTransaction();
        //     return res.status(500).json({
        //         message: "failed",
        //         data: "Failed to log analytics for premium battlepass purchase"
        //     });
        // }
            
            // create analytics history for selling item
            const analyticresponse = await addanalytics(
                characterid.toString(),
                itemData.item._id.toString(),
                "sell",
                "market",
                itemData.item.type,
                `Sold item ${itemData.item.name} for ${coinsamount} coins`,
                coinsamount
            )

            if (analyticresponse === "failed") {
                console.log("Failed to log analytics for item sale");
                return res.status(500).json({
                    message: "failed",
                    data: "Failed to log analytics for item sale"
                });
            }
            return res.json({ 
                message: "success",
            });


        } catch (err) {
        console.log(`Error in sell item transaction: ${err}`);
        return res.status(500).json({ 
            message: "failed", 
            data: "Failed to complete sale"
        });

    }
}


exports.equipitem = async (req, res) => {


    const { itemid, characterid, hairid } = req.body


    const session = await mongoose.startSession();
    try {
        // Start transaction
        await session.startTransaction();

        // Find item in inventory
        const item = await CharacterInventory.findOne(
            { 'items.item': itemid }
        ).session(session);

        if (!item?.items[0]) {
            await session.abortTransaction();
            return res.status(404).json({ message: "failed", data: "Item not found" });
        }

        // check player level if he can equip the item
        const player = await Characterdata.findOne({ _id: characterid }).session(session);

        if (player.level < item.items[0].item.level) {
            await session.abortTransaction();
            return res.status(400).json({ message: "failed", data: "You need to be at least level " + item.items[0].item.level + " to equip this item" });
        }

        // check if item is already equipped

        const hasEquipped = await CharacterInventory.findOne(
            { owner: characterid, type: item.type }
        ).session(session);

        let equippeditem = ""

        hasEquipped.items.forEach(temp => {
            const {item, isEquipped} = temp

            if (isEquipped && itemid != item) equippeditem = item
        })

        if (equippeditem) {
            await CharacterInventory.findOneAndUpdate(
                {
                    owner: characterid,
                    type: hasEquipped.type,
                    items: {
                    $elemMatch: {
                            item: new mongoose.Types.ObjectId(equippeditem)
                        }
                    }
                },
                {
                    $set: {
                    'items.$.isEquipped': false
                    }
                },
                {
                    session,
                    new: true
                }
            );
        }


        // Update inventory
        await CharacterInventory.findOneAndUpdate(
            {
                owner: characterid,
                type: hasEquipped.type,
                items: {
                $elemMatch: {
                        item: new mongoose.Types.ObjectId(itemid)
                    }
                }
            },
            {
                $set: {
                'items.$.isEquipped': true
                }
            },
            {
                session,
                new: true
            }
        );

        if (item.items[0].item.type === "hair") {
            player.hair = hairid

            await player.save({ session });
        }

        // Commit transaction
        await session.commitTransaction();
        return res.status(200).json({ 
            message: "success",
        });

    } catch (err) {
        await session.abortTransaction();
        console.log(`Error in equip item transaction: ${err}`);
    
        return res.status(500).json({ 
            message: "failed", 
            data: "Failed to equip item" 
        });

    } finally {
        session.endSession();
    }

}

exports.unequipitem = async (req, res) => {

    const { itemid, characterid } = req.body

    const session = await mongoose.startSession();
    try {

        // Start transaction


        await session.startTransaction();

        // Find item in inventory

        const item = await CharacterInventory.findOne(
            { 'items.item': itemid },
            { 'items.$': 1 }
        ).session(session);

        if (!item?.items[0]) {
            await session.abortTransaction();
            return res.status(404).json({ message: "failed", data: "Item not found" });
        }

        const itemData = item.items[0];

        // Update inventory

        await CharacterInventory.findOneAndUpdate(
            { 'items.item': itemid, owner: characterid },
            { $set: { 'items.$[elem].isEquipped': false } },
            { arrayFilters: [{ 'elem.item': itemid }], session }
        );

        // Commit transaction

        await session.commitTransaction();

        return res.status(200).json({
            message: "success",
            data: {
                item: itemData.item.name,
                type: itemData.item.type
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.log(`Error in unequip item transaction: ${err}`);
    
        return res.status(500).json({ 
            message: "failed", 
            data: "Failed to unequip item" 
        });

    } finally {
        session.endSession();
    }
}

exports.listequippeditems = async (req, res) => {
    const { characterid } = req.query

    try {
        const items = await CharacterInventory.aggregate([
            { $match: { owner: new mongoose.Types.ObjectId(characterid) } },
            { $unwind: '$items' },
            { $match: { 'items.isEquipped': true } },
            {
                $lookup: {
                    from: 'items',
                    localField: 'items.item',
                    foreignField: '_id',
                    as: 'item'
                }
            },
            { $unwind: '$item' },
            {
                $project: {
                    _id: 0,
                    itemId: '$item._id',
                    name: '$item.name',
                    type: '$item.type',
                    rarity: '$item.rarity',
                    price: '$item.price',
                    description: '$item.description',
                    stats: '$item.stats',
                    imageUrl: '$item.imageUrl'
                }
            }
        ]);

        // Format response by item type
        const formattedResponse = items.reduce((acc, item) => {
            // Initialize category if it doesn't exist
            if (!acc[item.type]) {
                acc[item.type] = {}
            }
            
            // Add item to its category
            acc[item.type] = {
                itemId: item.itemId,
                name: item.name,
                rarity: item.rarity,
                price: item.price,
                description: item.description,
                stats: item.stats,
                imageUrl: item.imageUrl
            }
            
            return acc
        }, {});

        return res.status(200).json({ 
            message: "success", 
            data: formattedResponse 
        });

    } catch (err) {
        console.log(`Error finding equipped items: ${err}`);
        return res.status(400).json({ 
            message: "failed", 
            data: "There's a problem with the server! Please try again later." 
        });
    }
}