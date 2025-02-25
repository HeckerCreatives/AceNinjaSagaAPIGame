const { default: mongoose } = require("mongoose")
const Characterwallet = require("../models/Characterwallet")
const { Market, CharacterInventory } = require("../models/Market")


exports.getMarketItems = async (req, res) => {

    const { page, limit, type, rarity, search } = req.query

    const pageOptions = {
        page: parseInt(page, 10) || 0,
        limit: parseInt(limit, 10) || 10
    }

    const query = {
        $or: [
            { 'items.type': { $regex: new RegExp(search, "i") } },
            { 'items.rarity': { $regex: new RegExp(search, "i") } },
            { 'items.name': { $regex: new RegExp(search, "i") } }
        ]
    }

    if (type) query['items.type'] = type
    if (rarity) query['items.rarity'] = rarity

    const items = await Market.find(query, { items: { $slice: [pageOptions.page * pageOptions.limit, pageOptions.limit] } })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding item data: ${err}`)
        })

    const totalItems = await Market.find(query)
        .then(data => data)
        .catch(err => {
            console.log(`Error finding item data: ${err}`)
        })


        const formattedResponse = {
            data: items[0]?.items.reduce((acc, item, index) => {
                acc[index + 1] = {
                    itemId: item._id,
                    name: item.name,
                    type: item.type,
                    rarity: item.rarity,
                    price: item.price,
                    description: item.description,
                    stats: item.stats,
                    imageUrl: item.imageUrl
                }
                return acc
            }, {}),
            pagination: {
                total: totalItems[0]?.items.length || 0,
                page: pageOptions.page,
                limit: pageOptions.limit,
                pages: Math.ceil((totalItems[0]?.items.length || 0) / pageOptions.limit)
            }
        }

        return res.status(200).json({ message: "success", data: formattedResponse.data, pagination: formattedResponse.pagination })

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

            // Check wallet balance
            const wallet = await Characterwallet.findOne({ 
                owner: new mongoose.Types.ObjectId(characterid), 
                type: itemData.currency 
            }).session(session);

            if (!wallet) {
                await session.abortTransaction();
                return res.status(404).json({ message: "failed", data: "Wallet not found" });
            }

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

            // Update inventory
            await CharacterInventory.findOneAndUpdate(
                { owner: characterid, type: itemData.type },
                { $push: { items: { item: itemData._id } } },
                { upsert: true, new: true, session }
            );

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
