const { default: mongoose } = require("mongoose")
const Characterwallet = require("../models/Characterwallet")
const { Market, CharacterInventory } = require("../models/Market")
const Characterdata = require("../models/Characterdata")
const { CharacterSkillTree, Skill } = require("../models/Skills")
const { checkmaintenance } = require("../utils/maintenance")


exports.getMarketItems = async (req, res) => {
    const { page, limit, type, rarity, search, markettype, gender } = req.query

    const pageOptions = {
        page: parseInt(page, 10) || 0,
        limit: parseInt(limit, 10) || 10
    }

    if (!markettype){

        const maintenance = await checkmaintenance("market")
        
        if (maintenance === "success") {
            return res.status(400).json({
                    message: "failed",
                    data: "The market is currently under maintenance. Please try again later."
                });
            }
        
        const smaintenance = await checkmaintenance("store")
        
        if (smaintenance === "success") {
            return res.status(400).json({
                    message: "failed",
                    data: "The store is currently under maintenance. Please try again later."
                });
            }
    } else if (markettype === "market") {
        const maintenance = await checkmaintenance("market")
        
        if (maintenance === "success") {
            return res.status(400).json({
                    message: "failed",
                    data: "The market is currently under maintenance. Please try again later."
                });
            }
    } else if (markettype === "shop") {
        const smaintenance = await checkmaintenance("store")
        
        if (smaintenance === "success") {
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
                    crystals: {
                        $cond: {
                            if: { $eq: ['$items.type', 'crystalpacks'] },
                            then: '$items.crystals',
                            else: '$$REMOVE'
                        }
                    },
                    coins: {
                        $cond: {
                            if: { $eq: ['$items.type', 'goldpacks'] },
                            then: '$items.coins',
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
        const formattedResponse = {
            data: items.reduce((acc, item, index) => {
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
    const { itemid, characterid } = req.body

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

            const itemData = item.items[0];
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
            
            console.log(wallet.amount, itemData.price)
            console.log(wallet.amount, itemData.currency)
            if (wallet.amount < itemData.price) {
                await session.abortTransaction();
                return res.status(400).json({ message: "failed", data: "Insufficient balance" });
            }

            // Update wallet
            await Characterwallet.findOneAndUpdate(
                { owner: characterid, type: itemData.currency },
                { $inc: { amount: -itemData.price } },
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
            }
            
            // Commit transaction
            await session.commitTransaction();
            return res.status(200).json({ 
                message: "success",
                data: {
                    item: itemData.name,
                    price: itemData.price,
                    type: itemData.type
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


    const { itemid, characterid } = req.body

    console.log(itemid)

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

        console.log("waaaat 1")

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

        console.log(items)
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