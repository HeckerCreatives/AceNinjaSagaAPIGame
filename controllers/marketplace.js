const { default: mongoose } = require("mongoose")
const Characterwallet = require("../models/Characterwallet")
const { Market, CharacterInventory, Item } = require("../models/Market")
const Characterdata = require("../models/Characterdata")
const { CharacterSkillTree, Skill } = require("../models/Skills")
const { checkmaintenance } = require("../utils/maintenance")
const { addanalytics, addanalyticsTransactional } = require("../utils/analyticstools")
const Analytics = require("../models/Analytics")
const CharacterStats = require("../models/Characterstats")
const { checkcharacter } = require("../utils/character")
const { gethairbundle } = require("../utils/bundle")
const { addreset, existsreset } = require("../utils/reset")
const { addXPAndLevel } = require("../utils/leveluptools")
const { addwallet, checkwallet, reducewallet } = require("../utils/wallettools")
const { getEnhancedChestData } = require('../utils/chesttools')
const { getPackByItemId } = require('../utils/packtools')
const { applyPackRewards } = require('../utils/rewardtools')

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

        // Enhance chest items with reward previews where applicable
        const enhancedItems = await Promise.all(items.map(async (item) => {
            if (item.type === 'chests') {
                try {
                    const enhanced = await getEnhancedChestData(item);
                    // Preserve original response shape and only add rewards + totalProbability
                    return Object.assign({}, item, {
                        rewards: enhanced.rewards || [],
                        totalProbability: enhanced.totalProbability || 0
                    });
                } catch (error) {
                    console.error('Failed to enhance chest item:', error);
                    return Object.assign({}, item, { rewards: [], totalProbability: 0 });
                }
            }
            // For non-chest items, preserve original item
            return item;
        }));

        const formattedResponse = {
            data: enhancedItems.reduce((acc, item, index) => {
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
    const { itemid, characterid, quantity = 1 } = req.body

    // Normalize quantity and enforce sensible cap
    const qtyToBuy = Math.max(1, Math.floor(Number(quantity) || 1));
    const MAX_QTY = 100; // protect from very large buys
    if (qtyToBuy > MAX_QTY) {
        return res.status(400).json({ message: 'failed', data: `Requested quantity exceeds maximum limit of ${MAX_QTY}` });
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

            // Types that are stackable (we allow quantity for these)
            const stackableTypes = new Set(['chests', 'crystalpacks', 'goldpacks', 'topupcredit', 'packs']);

            if (inventory?.items[0] && !stackableTypes.has(itemData.type)) {
                // Non-stackable item already owned
                return res.status(400).json({ message: "failed", data: "Item already exists in inventory" });
            }
            
            // Check wallet balance
            const wallet = await checkwallet(characterid, itemData.currency, session);
            if (wallet === "failed") {
                await session.abortTransaction();
                return res.status(404).json({ message: "failed", data: "Wallet not found" });
            }

            // Calculate total price for requested quantity
            let totalprice = (Number(itemData.price) || 0) * qtyToBuy;

            if (wallet < totalprice) {
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "Insufficient balance" });
            }

            // Deduct wallet amount
            const walletReduce = await reducewallet(characterid, totalprice, itemData.currency, session);
            if (walletReduce === "failed") {
                await session.abortTransaction();
                return res.status(400).json({
                    message: "failed",
                    data: "Failed to deduct wallet amount."
                });
            }

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
                // Multiply crystals by quantity
                const crystalAmount = (Number(itemData.crystals) || 0) * qtyToBuy;
                const crystalResult = await addwallet(characterid, 'crystal', crystalAmount, session);
                if (crystalResult === "failed") {
                    await session.abortTransaction();
                    return res.status(500).json({
                        message: "failed",
                        data: "Failed to add crystals to wallet"
                    });
                }   
            } else if (itemData.type === "goldpacks") {
                // Multiply coins by quantity
                const coinsAmount = (Number(itemData.coins) || 0) * qtyToBuy;
                const coinsResult = await addwallet(characterid, 'coins', coinsAmount, session);
                if (coinsResult === "failed") {
                    await session.abortTransaction();
                    return res.status(500).json({
                        message: "failed",
                        data: "Failed to add coins to wallet"
                    });
                }
            } else if (itemData.type === "packs") {
                // Handle pack purchases - apply all rewards from the pack
                const pack = await getPackByItemId(itemData._id, session);
                if (!pack) {
                    await session.abortTransaction();
                    return res.status(404).json({
                        message: "failed",
                        data: "Pack data not found"
                    });
                }

                if (!pack.rewards || pack.rewards.length === 0) {
                    await session.abortTransaction();
                    return res.status(400).json({
                        message: "failed",
                        data: "Pack has no rewards configured"
                    });
                }

                // Apply all pack rewards with quantity multiplier
                const rewardsResult = await applyPackRewards(characterid, pack.rewards, qtyToBuy, session);
                
                if (!rewardsResult.success) {
                    await session.abortTransaction();
                    const errorMsg = rewardsResult.failedReward 
                        ? `Failed to apply reward: ${rewardsResult.failedReward.error}` 
                        : 'Failed to apply pack rewards';
                    return res.status(500).json({
                        message: "failed",
                        data: errorMsg
                    });
                }

                // Add pack to inventory for tracking
                const invType = itemData.inventorytype || 'packs';
                const existingInv = await CharacterInventory.findOne({ owner: characterid, type: invType, 'items.item': itemData._id }).session(session);
                if (existingInv) {
                    await CharacterInventory.updateOne(
                        { owner: characterid, type: invType, 'items.item': itemData._id },
                        { $inc: { 'items.$.quantity': qtyToBuy } },
                        { session }
                    );
                } else {
                    await CharacterInventory.findOneAndUpdate(
                        { owner: characterid, type: invType },
                        { $push: { items: { item: itemData._id, quantity: qtyToBuy } } },
                        { upsert: true, new: true, session }
                    );
                }

                // Log analytics for each reward type granted
                for (const rewardResult of rewardsResult.results) {
                    if (rewardResult.success) {
                        const rewardDesc = `Pack reward: ${rewardResult.message} from ${itemData.name}`;
                        const analyticResult = await addanalyticsTransactional(
                            characterid.toString(),
                            itemData._id.toString(),
                            "grant",
                            "pack",
                            rewardResult.rewardtype,
                            rewardDesc,
                            rewardResult.details?.amount || 0,
                            session
                        );

                        if (analyticResult === "failed") {
                            await session.abortTransaction();
                            return res.status(500).json({
                                message: "failed",
                                data: "Failed to log analytics for pack reward"
                            });
                        }
                    }
                }
            } else {
                // Add to inventory respecting quantity: if existing item (stackable) increment, else push with quantity
                const invType = itemData.inventorytype;
                const existingInv = await CharacterInventory.findOne({ owner: characterid, type: invType, 'items.item': itemData._id }).session(session);
                if (existingInv) {
                    await CharacterInventory.updateOne(
                        { owner: characterid, type: invType, 'items.item': itemData._id },
                        { $inc: { 'items.$.quantity': qtyToBuy } },
                        { session }
                    );
                } else {
                    await CharacterInventory.findOneAndUpdate(
                        { owner: characterid, type: invType },
                        { $push: { items: { item: itemData._id, quantity: qtyToBuy } } },
                        { upsert: true, new: true, session }
                    );
                }

                if (itemData1) {
                    // Bundled item: add with same quantity or increment
                    const bundledInvType = itemData1.inventorytype;
                    const existingB = await CharacterInventory.findOne({ owner: characterid, type: bundledInvType, 'items.item': itemData1._id }).session(session);
                    if (existingB) {
                        await CharacterInventory.updateOne(
                            { owner: characterid, type: bundledInvType, 'items.item': itemData1._id },
                            { $inc: { 'items.$.quantity': qtyToBuy } },
                            { session }
                        );
                    } else {
                        await CharacterInventory.findOneAndUpdate(
                            { owner: characterid, type: bundledInvType },
                            { $push: { items: { item: itemData1._id, quantity: qtyToBuy } } },
                            { upsert: true, new: true, session }
                        );
                    }
                }
            }

        // Log analytics for purchase (aggregate over quantity)
        const rewardType = itemData.currency === 'crystal' ? 'crystal' : itemData.currency === 'coins' ? 'coins' : itemData.currency || null;
        const rewardAmount = (Number(itemData.price) || 0) * qtyToBuy;
        const description = `Bought ${qtyToBuy}x ${itemData.name} for ${rewardAmount} ${itemData.currency}`;

        const analyticresponse = await addanalytics(
            characterid.toString(),
            itemid.toString(),
            "buy",
            "market",
            rewardType,
            description,
            rewardAmount
        );

        if (analyticresponse === "failed") {
            await session.abortTransaction();
            return res.status(500).json({
            message: "failed",
            data: "Failed to log analytics for purchase"
            });
        }

        // If purchase granted an additional bundled item, log that as well
        if (itemData1) {
            const bundleRewardType = itemData1.currency === 'crystal' ? 'crystal' : itemData1.currency === 'coins' ? 'coins' : itemData1.currency || itemData1.type || null;
            const bundleAmount = (Number(itemData1.price) || 0) * qtyToBuy;
            const bundleDesc = `Granted bundle item ${itemData1.name} x${qtyToBuy} from purchase of ${itemData.name}`;

            const analyticresponse2 = await addanalytics(
                characterid.toString(),
                itemData1._id.toString(),
                "grant",
                "market",
                bundleRewardType,
                bundleDesc,
                bundleAmount
            );

            if (analyticresponse2 === "failed") {
                await session.abortTransaction();
                return res.status(500).json({ message: "failed", data: "Failed to log analytics for bundle item" });
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

        const claimexist = await existsreset(
            characterid.toString(),
            `freebie${rewardType}`,
            "claim"
        );

        if (claimexist) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "You have already claimed your freebie today. Please try again tomorrow."
            });
        }

        // Give reward
        if (rewardType === "exp") {
            const xpResult = await addXPAndLevel(characterid, rewardAmount, session);
            if (xpResult === "failed") {
                await session.abortTransaction();
                return res.status(500).json({
                    message: "failed",
                    data: "Failed to add experience points"
                });
            }
        } else {
            const walletResult = await addwallet(characterid, rewardType, rewardAmount, session);
            if (walletResult === "failed") {
                await session.abortTransaction();
                return res.status(500).json({
                    message: "failed",
                    data: `Failed to add ${rewardType} to wallet`
                });
            }
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
            `freebie${rewardType}`,
            "claim",
        )

        if (addclaimreset === "failed") {
            await session.abortTransaction();
            return res.status(500).json({
                message: "failed",
                data: "Failed to add reset for claiming freebie"
            });
        }

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
                return res.status(404).json({ message: "failed", data: "Item not found" });
            }

            const itemData = item.items[0];

            let coinsamount = itemData.item.price * 0.5

            if (itemData.item.currency === "coins") {
                const coinsResult = await addwallet(characterid, 'coins', coinsamount);
                if (coinsResult === "failed") {
                    return res.status(500).json({
                        message: "failed",
                        data: "Failed to add coins to wallet"
                    });
                }

            } else if(itemData.item.currency === "crystal") {
                const crystalsResult = await addwallet(characterid, 'crystal', coinsamount);
                if (crystalsResult === "failed") {
                    return res.status(500).json({
                        message: "failed",
                        data: "Failed to add crystals to wallet"
                    });
                }
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
                    isEquipped: '$items.isEquipped',
                    description: '$item.description',
                    stats: '$item.stats',
                    imageUrl: '$item.imageUrl'
                }
            }
        ]);
        // Format response by item type — accumulate arrays so multiple equipped items are preserved
        const formattedResponse = items.reduce((acc, item) => {
            if (!acc[item.type]) acc[item.type] = [];

            acc[item.type].push({
                itemId: item.itemId,
                name: item.name,
                rarity: item.rarity,
                price: item.price,
                description: item.description,
                stats: item.stats,
                imageUrl: item.imageUrl
            });

            return acc;
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

// Buy chests (supports purchasing multiple chests at once)
exports.buychest = async (req, res) => {
    const { id } = req.user;
    const { itemid, characterid, quantity = 1 } = req.body;

    // Basic validation
    if (!itemid || !characterid) {
        return res.status(400).json({ message: 'failed', data: 'Item ID and Character ID are required' });
    }

    const maintenance = await checkmaintenance('market');
    if (maintenance === 'failed') {
        return res.status(400).json({ message: 'failed', data: 'The market is currently under maintenance. Please try again later.' });
    }

    const smaintenance = await checkmaintenance('store');
    if (smaintenance === 'failed') {
        return res.status(400).json({ message: 'failed', data: 'The store is currently under maintenance. Please try again later.' });
    }

    const checker = await checkcharacter(id, characterid);
    if (checker === 'failed') {
        return res.status(400).json({ message: 'Unauthorized', data: 'You are not authorized to view this page. Please login the right account to view the page.' });
    }

    // Normalize quantity and enforce sensible cap
    const qtyToBuy = Math.max(1, Math.floor(Number(quantity) || 1));
    const MAX_QTY = 100; // protect from very large buys in a single request
    if (qtyToBuy > MAX_QTY) {
        return res.status(400).json({ message: 'failed', data: `Requested quantity exceeds maximum limit of ${MAX_QTY}` });
    }

    try {
        const session = await mongoose.startSession();
        await session.startTransaction();

        try {
            // Find chest item in market
            const item = await Market.findOne({ 'items._id': itemid }, { 'items.$': 1 }).session(session);
            if (!item?.items[0]) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'failed', data: 'Item not found' });
            }

            const itemData = item.items[0];
            if (itemData.type !== 'chests') {
                await session.abortTransaction();
                return res.status(400).json({ message: 'failed', data: 'This endpoint is only for chest purchases. Use /buyitem for other items.' });
            }

            // check character gender compatibility
            if ((itemData.gender === 'male' && checker.gender !== 0) || (itemData.gender === 'female' && checker.gender !== 1)) {
                await session.abortTransaction();
                return res.status(400).json({ message: 'failed', data: 'This item is not available for your character. Please choose a different item.' });
            }

            // Check wallet balance
            const wallet = await checkwallet(characterid, itemData.currency, session);
            if (wallet === 'failed') {
                await session.abortTransaction();
                return res.status(404).json({ message: 'failed', data: 'Wallet not found' });
            }

            const totalprice = (Number(itemData.price) || 0) * qtyToBuy;
            if (wallet < totalprice) {
                await session.abortTransaction();
                return res.status(400).json({ message: 'failed', data: 'Insufficient balance' });
            }

            // Deduct wallet amount
            const walletReduce = await reducewallet(characterid, totalprice, itemData.currency, session);
            if (walletReduce === 'failed') {
                await session.abortTransaction();
                return res.status(400).json({ message: 'failed', data: 'Failed to deduct wallet amount.' });
            }

            // Add chest(s) to inventory: increment quantity if exists otherwise push new item with quantity
            const invType = itemData.inventorytype || 'chests';
            const existing = await CharacterInventory.findOne({ owner: characterid, type: invType, 'items.item': itemData._id }).session(session);

            if (existing) {
                await CharacterInventory.updateOne(
                    { owner: characterid, type: invType, 'items.item': itemData._id },
                    { $inc: { 'items.$.quantity': qtyToBuy } },
                    { session }
                );
            } else {
                await CharacterInventory.findOneAndUpdate(
                    { owner: characterid, type: invType },
                    { $push: { items: { item: itemData._id, quantity: qtyToBuy } } },
                    { upsert: true, new: true, session }
                );
            }

            // If the market item grants an additional bundled item (hairbundle etc.), add that too in equal quantity
            const hairbundle = await gethairbundle(itemid);
            if (mongoose.Types.ObjectId.isValid(hairbundle)) {
                const bundled = await Item.findOne({ _id: hairbundle }).session(session);
                if (bundled) {
                    const existingB = await CharacterInventory.findOne({ owner: characterid, type: bundled.inventorytype, 'items.item': bundled._id }).session(session);
                    if (existingB) {
                        await CharacterInventory.updateOne(
                            { owner: characterid, type: bundled.inventorytype, 'items.item': bundled._id },
                            { $inc: { 'items.$.quantity': qtyToBuy } },
                            { session }
                        );
                    } else {
                        await CharacterInventory.findOneAndUpdate(
                            { owner: characterid, type: bundled.inventorytype },
                            { $push: { items: { item: bundled._id, quantity: qtyToBuy } } },
                            { upsert: true, new: true, session }
                        );
                    }
                }
            }

            // Log analytics for purchase (aggregate amount)
            const rewardType = itemData.currency === 'crystal' ? 'crystal' : itemData.currency === 'coins' ? 'coins' : itemData.currency || null;
            const description = `Bought ${qtyToBuy}x ${itemData.name} for ${totalprice} ${itemData.currency}`;

            const analyticresponse = await addanalytics(
                characterid.toString(),
                itemid.toString(),
                'buy',
                'market',
                rewardType,
                description,
                totalprice
            );

            if (analyticresponse === 'failed') {
                await session.abortTransaction();
                return res.status(500).json({ message: 'failed', data: 'Failed to log analytics for purchase' });
            }

            // If bundled item exists, log that grant as well
            if (mongoose.Types.ObjectId.isValid(hairbundle)) {
                const bundleItem = await Item.findById(hairbundle).session(session);
                if (bundleItem) {
                    const bundleRewardType = bundleItem.currency === 'crystal' ? 'crystal' : bundleItem.currency === 'coins' ? 'coins' : bundleItem.currency || bundleItem.type || null;
                    const bundleDesc = `Granted bundle item ${bundleItem.name} x${qtyToBuy} from purchase of ${itemData.name}`;
                    const analyticresponse2 = await addanalytics(
                        characterid.toString(),
                        bundleItem._id.toString(),
                        'grant',
                        'market',
                        bundleRewardType,
                        bundleDesc,
                        bundleItem.price || 0
                    );

                    if (analyticresponse2 === 'failed') {
                        await session.abortTransaction();
                        return res.status(500).json({ message: 'failed', data: 'Failed to log analytics for bundle item' });
                    }
                }
            }

            await session.commitTransaction();
            return res.status(200).json({ message: 'success', data: { item: itemData.name, price: itemData.price, type: itemData.type, quantity: qtyToBuy } });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (err) {
        console.log(`Error in buy chest transaction: ${err}`);
        return res.status(500).json({ message: 'failed', data: 'Failed to complete chest purchase' });
    }
};