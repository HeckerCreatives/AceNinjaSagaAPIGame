const { default: mongoose } = require("mongoose");
const { CharacterInventory, Market } = require('../models/Market');
const { checkcharacter } = require('../utils/character');
const { checkmaintenance } = require('../utils/maintenance');
const { addanalytics } = require('../utils/analyticstools');
const { 
    selectRandomReward, 
    awardChestReward, 
    removeChestFromInventory, 
    getChestById,
    getEnhancedChestData 
} = require('../utils/chesttools');

exports.openchest = async (req, res) => {
    const { id } = req.user;
    const { itemid, characterid, quantity = 1 } = req.body;

    if (!itemid || !characterid) {
        return res.status(400).json({
            message: "failed",
            data: "Item ID and Character ID are required"
        });
    }

    const maintenance = await checkmaintenance("market");
    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The market is currently under maintenance. Please try again later."
        });
    }

    const checker = await checkcharacter(id, characterid);
    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to perform this action."
        });
    }

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        // Check if character has this chest in inventory
        const inventory = await CharacterInventory.findOne({
            owner: characterid,
            type: 'chests',
            'items.item': itemid
        }).session(session);

        if (!inventory) {
            await session.abortTransaction();
            return res.status(404).json({
                message: "failed",
                data: "Chest not found in inventory"
            });
        }

        const chestItem = inventory.items.find(item => item.item.toString() === itemid.toString());
        if (!chestItem || chestItem.quantity < 1) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "Insufficient chest quantity"
            });
        }
        // Determine how many chests to open (cap to available quantity)
        const qtyToOpen = Math.max(1, Math.floor(Number(quantity) || 1));
        if (qtyToOpen > chestItem.quantity) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'failed', data: 'Requested quantity exceeds available chest quantity' });
        }

        // Fetch chest data once
        const chest = await getChestById(itemid, session);

        const results = [];
        // Open chests in a loop; each iteration selects and awards one reward
        for (let i = 0; i < qtyToOpen; i++) {
            // Select random reward
            const selectedReward = selectRandomReward(chest.rewards);

            // Award the reward using existing rank reward system
            const rewardResults = await awardChestReward(characterid, selectedReward, session);
            // if (!rewardResults || rewardResults.length === 0 || !rewardResults[0].success) {
            //     await session.abortTransaction();
            //     return res.status(500).json({
            //         message: "failed",
            //         data: `Failed to award reward: ${rewardResults?.[0]?.message || rewardResults?.[0]?.error || 'Unknown error'}`
            //     });
            // }

            // Remove one chest per successful award (we'll remove after the loop in batch)
            results.push({
                chestName: chest.name,
                reward: rewardResults[0]
            });

            // Log analytics per chest opened
            const description = `Opened chest ${chest.name} and received ${selectedReward.rewardtype}`;
            await addanalytics(
                characterid.toString(),
                itemid.toString(),
                "open",
                "chest",
                selectedReward.rewardtype,
                description,
                selectedReward.amount || 1
            );
        }

        // Remove chests from inventory in a single operation
        await removeChestFromInventory(characterid, itemid, qtyToOpen, session);

        await session.commitTransaction();
        return res.status(200).json({
            message: "success",
            data: results
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error opening chest:', error);
        return res.status(500).json({
            message: "failed",
            data: "Failed to open chest"
        });
    } finally {
        session.endSession();
    }
};

exports.getinventorychests = async (req, res) => {
    const { characterid, page, limit } = req.query;

    if (!characterid) {
        return res.status(400).json({
            message: "failed",
            data: "Character ID is required"
        });
    }

    // Pagination defaults
    const pageOptions = {
        page: parseInt(page, 10) || 0,
        limit: parseInt(limit, 10) || 10
    };

    try {
        // Get character's chest inventory (single document)
        const inventory = await CharacterInventory.findOne({
            owner: characterid,
            type: 'chests'
        }).populate('items.item');

        // If no inventory or no items, return empty data with pagination
        const total = (inventory && Array.isArray(inventory.items)) ? inventory.items.length : 0;
        if (!inventory || total === 0) {
            return res.status(200).json({
                message: "success",
                data: {},
                pagination: {
                    total: 0,
                    page: pageOptions.page,
                    limit: pageOptions.limit,
                    pages: 0
                }
            });
        }

        // Compute slice for pagination to avoid enhancing all items
        const start = pageOptions.page * pageOptions.limit;
        const end = start + pageOptions.limit;
        const pageItems = inventory.items.slice(start, end);

        // Enhance only page items
        const chestDataPage = await Promise.all(
            pageItems.map(async (inventoryItem) => {
                return await getEnhancedChestData({
                    _id: inventoryItem.item._id,
                    name: inventoryItem.item.name,
                    rarity: inventoryItem.item.rarity,
                    quantity: inventoryItem.quantity,
                    imageUrl: inventoryItem.item.imageUrl,
                    description: inventoryItem.item.description,
                    acquiredAt: inventoryItem.acquiredAt
                });
            })
        );

        // Format response with 1-based numeric keys (like getMarketItems)
        const formattedData = chestDataPage.reduce((acc, item, idx) => {
            acc[idx + 1] = item;
            return acc;
        }, {});

        return res.status(200).json({
            message: "success",
            data: formattedData,
            pagination: {
                total,
                page: pageOptions.page,
                limit: pageOptions.limit,
                pages: Math.ceil(total / pageOptions.limit)
            }
        });

    } catch (error) {
        console.error('Error getting inventory chests:', error);
        return res.status(500).json({
            message: "failed",
            data: "Failed to get chest inventory"
        });
    }
};

exports.getchestsinmarket = async (req, res) => {
    const { page, limit, rarity, search } = req.query;

    const pageOptions = {
        page: parseInt(page, 10) || 0,
        limit: parseInt(limit, 10) || 10
    };

    const maintenance = await checkmaintenance("market");
    if (maintenance === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "The market is currently under maintenance. Please try again later."
        });
    }

    try {
        // Build aggregation pipeline for chests in market
        const pipeline = [
            {
                $match: {
                    marketType: { $in: ['market', 'store'] }
                }
            },
            { $unwind: '$items' },
            {
                $match: {
                    'items.type': 'chests'
                }
            }
        ];

        // Add filters
        const matchConditions = [];

        if (search) {
            matchConditions.push({
                $or: [
                    { 'items.name': { $regex: new RegExp(search, "i") } },
                    { 'items.rarity': { $regex: new RegExp(search, "i") } }
                ]
            });
        }

        if (rarity) {
            matchConditions.push({ 'items.rarity': rarity });
        }

        if (matchConditions.length > 0) {
            pipeline.push({
                $match: { $and: matchConditions }
            });
        }

        // Add pagination and projection
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
                    imageUrl: '$items.imageUrl',
                    isOpenable: '$items.isOpenable'
                }
            }
        );

        const marketChests = await Market.aggregate(pipeline);

        // Get enhanced chest data with rewards for each chest
        const chestsWithRewards = await Promise.all(
            marketChests.map(async (marketChest) => {
                return await getEnhancedChestData(marketChest);
            })
        );

        // Get total count for pagination
        const countPipeline = [...pipeline];
        countPipeline.splice(-3, 3); // Remove skip, limit, and project stages
        countPipeline.push({ $count: 'total' });
        const totalItems = await Market.aggregate(countPipeline);

        // Format response to match getMarketItems (1-based numeric keys)
        const formattedData = chestsWithRewards.reduce((acc, item, index) => {
            acc[index + 1] = item;
            return acc;
        }, {});

        return res.status(200).json({
            message: "success",
            data: formattedData,
            pagination: {
                total: totalItems[0]?.total || 0,
                page: pageOptions.page,
                limit: pageOptions.limit,
                pages: Math.ceil((totalItems[0]?.total || 0) / pageOptions.limit)
            }
        });

    } catch (error) {
        console.error('Error getting market chests:', error);
        return res.status(500).json({
            message: "failed",
            data: "Failed to get market chests"
        });
    }
};
