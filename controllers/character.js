const { default: mongoose, get } = require("mongoose")
const Characterdata = require("../models/Characterdata")
const CharacterStats = require("../models/Characterstats")
const Charactertitle = require("../models/Charactertitles")
const Characterwallet = require("../models/Characterwallet")
const Rankings = require("../models/Ranking")
const { CharacterInventory } = require("../models/Market")
const { CharacterSkillTree } = require("../models/Skills")
const Season = require("../models/Season")
const { Battlepass } = require("../models/Battlepass")
const { checkcharacter } = require("../utils/character")

const Companion = require("../models/Companion")
const RankTier = require("../models/RankTier")
const { MonthlyLogin, SpinnerRewards } = require("../models/Rewards")
const moment = require("moment")

exports.createcharacter = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const { id } = req.user;
        const { username, gender, outfit, hair, eyes, facedetails, color, itemindex } = req.body;

        // Validation checks...
        if(!id) {
            return res.status(401).json({ 
                message: "failed", 
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

            
        const usernameRegex = /^[a-zA-Z0-9]+$/;

        if(username.length < 5 || username.length > 20){
            return res.status(400).json({ message: "failed", data: "Username length should be greater than 5 and less than 20 characters."})
        }
        if(!usernameRegex.test(username)){
            return res.status(400).json({ message: "failed", data: "No special characters are allowed for username"})
        }

        if(!hair){
            return res.status(400).json({ message: "failed", data: "Character creation failed: Missing required attributes. Please select gender, outfit, hair, eyes, face details, and color."})
        }


        const characterCount = await Characterdata.countDocuments({ owner: id });
        if (characterCount >= 4) {
            return res.status(400).json({ message: "failed", data: "Character limit reached. You cannot create more than 4 characters." });
        }   

        const exists = await Characterdata.findOne({ username: { $regex: new RegExp('^' + username + '$', 'i')} })

        if(exists){
            return res.status(400).json({ message: "failed", data: "Username already used." });
        }
        // Create character data
        const data = await Characterdata.create([{ 
            owner: new mongoose.Types.ObjectId(id), 
            username,
            gender, 
            outfit,
            hair,
            eyes,
            facedetails,
            color,
            title: 0,
            experience: 0,
            level: 1,
            badge: 0,
            itemindex
        }], { session });

        const characterId = data[0]._id;

        // Create character stats
        await CharacterStats.create([{
            owner: characterId,
            health: 100,
            energy: 50,
            armor: 20,
            magicresist: 15,
            speed: 10,
            attackdamage: 9,
            armorpen: 0,
            magicpen: 0,
            critchance: 0,
            magicdamage: 15,
            lifesteal: 0,
            omnivamp: 0,
            healshieldpower: 0,
            critdamage: 0,
        }], { session });

        // Create character titles
        await Charactertitle.create([{ 
            owner: characterId, 
            items: [{ itemid: "" }]
        }], { session });

        const getranktier = await RankTier.findOne({ name: "Rookie" })
        const currentseason = await Season.findOne({ isActive: "active" })

        // Create rankings
        await Rankings.create([{ 
            owner: characterId, 
            mmr: 0,
            rank: getranktier._id, 
            season: currentseason._id
        }], { session });

        // Create skill tree
        await CharacterSkillTree.create([{ 
            owner: characterId, 
            skillPoints: 0, 
            skills: [], 
            unlockedSkills: [] 
        }], { session });

        // Create wallets
        const walletListData = ["coins", "crystal", "topupcredit"];
        const walletBulkwrite = walletListData.map(walletData => ({
            insertOne: {
                document: { owner: characterId, type: walletData, amount: "0" }
            }
        }));
        await Characterwallet.bulkWrite(walletBulkwrite, { session });

        // Create inventory
        const inventoryListData = ["weapon", "outfit", "hair", "face", "eyes", "skincolor", "skins", "goldpacks", "crystalpacks", "chests", "freebie"];
        const inventoryBulkWrite = inventoryListData.map(inventoryData => ({
            insertOne: {
                document: { owner: characterId, type: inventoryData }
            }
        }));
        await CharacterInventory.bulkWrite(inventoryBulkWrite, { session });

        await Battlepass.create([{
            owner: characterId,
            season: currentseason._id,
            level: 1,
            xp: 0,
            rewards: []
        }], { session })

        await MonthlyLogin.create([{
            owner: characterId,
            month: new Date().getMonth().toString(), 
            year: new Date().getFullYear().toString(), 
            login: 0,
            isClaimed: "0",
            lastClaimed: new Date()
        }], { session });

        await SpinnerRewards.create([{
            owner: characterId,
            daily: 0,
            isClaimed: "0",
            lastClaimed: new Date()
        }], { session });

        await session.commitTransaction();
        return res.status(200).json({ message: "success" });

    } catch (error) {
        await session.abortTransaction();
        console.log(`Error in character creation: ${error}`);
        return res.status(400).json({ 
            message: "bad-request", 
            data: error.message 
        });
    } finally {
        session.endSession();
    }
}
// exports.createcharacter = async (req, res) => {

//     const { id } = req.user
//     const { username, gender, outfit, hair, eyes, facedetails, color, itemindex } = req.body
   
//     if(!id){
//         return res.status(401).json({ message: "failed", data: "You are not authorized to view this page. Please login the right account to view the page."})
//     }

//     const usernameRegex = /^[a-zA-Z0-9]+$/;

//     if(username.length < 5 || username.length > 20){
//         return res.status(400).json({ message: "failed", data: "Username length should be greater than 5 and less than 20 characters."})
//     }
//     if(!usernameRegex.test(username)){
//         return res.status(400).json({ message: "failed", data: "No special characters are allowed for username"})
//     }

//     if(!hair){
//         return res.status(400).json({ message: "failed", data: "Character creation failed: Missing required attributes. Please select gender, outfit, hair, eyes, face details, and color."})
//     }


//     const characterCount = await Characterdata.countDocuments({ owner: id });
//     if (characterCount >= 4) {
//         return res.status(400).json({ message: "failed", data: "Character limit reached. You cannot create more than 4 characters." });
//     }   

//     await Characterdata.findOne({ username: { $regex: new RegExp('^' + username + '$', 'i')} })
//     .then(async character => {
//         if(character){
//             return res.json({ message: "failed", data: "Username already exist."})
//         } else {      
//             await Characterdata.create({ 
//                 owner: id, 
//                 username: username,
//                 gender: gender, 
//                 outfit: outfit,
//                 hair: hair,
//                 eyes: eyes,
//                 facedetails: facedetails,
//                 color: color,
//                 title: 0,
//                 experience: 0,
//                 level: 1,
//                 badge: "",
//                 itemindex: itemindex
//             })
//             .then(async data => {
//                 const stat = await CharacterStats.create({
//                     owner: data._id,
//                     health: 100,
//                     energy: 50,
//                     armor: 20,
//                     magicresist: 15,
//                     speed: 10,
//                     attackdamage: 9,
//                     armorpen: 0,
//                     magicpen: 0,
//                     critchance: 0,
//                     magicdamage: 15,
//                     lifesteal: 0,
//                     omnivamp: 0,
//                     healshieldpower: 0,
//                     critdamage: 0,
//                 })
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })

//               const title =  await Charactertitle.create({ owner: data._id, items: [{ itemid: "" }]})
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ _id: stat._id, owner: data._id })
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })
                
//               const rank = await Rankings.create({ owner: data._id, mmr: 10 })
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ _id: stat._id, owner: data._id })
//                     await Charactertitle.findOneAndDelete({ _id: title._id, owner: data._id })
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })

//                const st = await CharacterSkillTree.create({ owner: data._id, skillPoints: 0, skills: [], unlockedSkills: [] })
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ _id: stat._id, owner: data._id })
//                     await Charactertitle.findOneAndDelete({ _id: title._id, owner: data._id })
//                     await Rankings.findOneAndDelete({ _id: st._id, owner: data._id })
//                 })

//                 const walletListData = ["coins", "crystal", "emerald"];
//                 const walletBulkwrite = walletListData.map(walletData => ({
//                     insertOne: {
//                         document: { owner: data._id, type: walletData, amount: "0" }
//                     }
//                 }));

//                 await Characterwallet.bulkWrite(walletBulkwrite)
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ owner: data._id })
//                     await Charactertitle.findOneAndDelete({ owner: data._id })
//                     await Rankings.findOneAndDelete({ owner: data._id })
//                     await CharacterSkillTree.findOneAndDelete({ owner: data._id })
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })

//                 const inventoryListData = ["weapon", "outfit", "hair", "face", "eyes", "skincolor", "skins"];
//                 const inventoryBulkWrite = inventoryListData.map(inventoryData => ({
//                     insertOne: {
//                         document: { owner: data._id, type: inventoryData }
//                     }
//                 }));

//                 await CharacterInventory.bulkWrite(inventoryBulkWrite)
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ owner: data._id })
//                     await Charactertitle.findOneAndDelete({ owner: data._id })
//                     await Characterwallet.deleteMany({ owner: data._id })
//                     await Rankings.findOneAndDelete({ owner: data._id })
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })

//                 return res.status(200).json({ message: "success"})
//             })
//           .catch(error => res.status(400).json({ message: "bad-request", data: error.message }))
//         }
//     })
//     .catch(error => res.status(400).json({ message: "bad-request", data: error.message }))

// }

exports.getplayerdata = async (req, res) => {
    const { characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input character ID."})
    }

    const matchCondition = [
        {
            $match: {
                _id: new mongoose.Types.ObjectId(characterid) 
            }
        },
        {
            $lookup: {
                from: "characterwallets",  
                localField: "_id",          
                foreignField: "owner",
                as: "wallet"      
            },
        },
        {
            $lookup: {
                from: "characterinventories",             
                localField: "_id",       
                foreignField: "owner",       
                as: "inventory"
            }
        },        
        {
            $lookup: {
                from: "rankings",             
                localField: "_id",       
                foreignField: "owner",       
                as: "ranking"
            }
        },
        {
            $lookup: {
                from: "characterstats",
                localField: "_id",
                foreignField: "owner",
                as: "stats"
            }
        },
        {
            $project: {
                id: 1,
                username: 1,
                title: 1,
                level: 1,
                experience: 1,
                badge: 1,
                itemindex: 1,
                createdAt: 1,
                stats: { $arrayElemAt: ["$stats", 0] },      // Flatten stats
                mmr: { $arrayElemAt: ["$ranking.mmr", 0] },      // Flatten ranking.mmr
            }
        }
    ];

    const characterData = await Characterdata.aggregate(matchCondition)

    return res.status(200).json({ message: "success", data: characterData[0]})
}

exports.getplayercharacters = async (req, res) => {
    const {id} = req.user

    const tempdata = await Characterdata.find({owner: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching character datas for user: ${id}. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    const data = {}

    tempdata.forEach(temp => {
        const {_id, username, gender, outfit, hair, eyes, facedetails, level, color, title, experience, badge, itemindex, createdAt} = temp;

        const createdAtDate = new moment(createdAt);

        const formattedDate = createdAtDate.format("YYYY-MM-DD");
        data[itemindex] = {
            UserID: _id,
            Username: username,
            CharacterCostume: {
                Gender: gender,
                OutfitId: outfit,
                HairId: hair,
                EyesId: eyes,
                FaceDetailsId: facedetails,
                ColorId: color,
            },
            Title: title,
            Level: level,
            CurrentXP: experience,
            badge: badge,
            creationdate: formattedDate,
        }
    })

    return res.json({message: "success", data: data})
}

exports.getinventory = async (req, res) => {
    const { characterid } = req.query

    if(!characterid) {
        res.status(400).json({ message: "failed", data: "Please input characterId"})
    }

    const inventorydata = await CharacterInventory.find({ owner: new mongoose.Types.ObjectId(characterid)})
    .populate('items.item') // Changed from items.itemid to items.item
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching inventory data for user: ${characterid}. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    console.log(inventorydata)

    const data = []
    inventorydata.forEach(temp => {
        data.push({
            id: temp.id,
            type: temp.type,
            items: temp.items
        })
    })

    return res.status(200).json({ message: "success", data: data})
}

exports.getxplevel = async (req, res) => {
    const { characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input user ID"})
    }

    const xpleveldata = await Characterdata.findOne(
        { _id: new mongoose.Types.ObjectId(characterid)},
        { experience: 1, level: 1, username: 1}
    )
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching user exp level data. Error ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem in the server. Please try again later."})
    })

    return res.status(200).json({ message: "success", data: xpleveldata})
}

exports.getWallet = async (req, res) => {

    const { characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "There's no character ID."})
    }

    const walletData = await Characterwallet.find({ owner: new mongoose.Types.ObjectId(characterid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching wallet data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const data = {}

    walletData.forEach(temp => {
        data[temp.type] = temp.amount
    })

    return res.status(200).json({ message: "success", data: data})
}


exports.getcharactertitles = async (req, res) => {
    const { characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input character ID."})
    }

    const charactertitles = await Charactertitle.find({ owner: new mongoose.Types.ObjectId(characterid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character titles. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })


    const formattedResponse = {
        data: charactertitles.reduce((acc, title, index) => {
            acc[index + 1] = {
                id: title._id,
                type: title.type,
                items: title.items
            }
            return acc
        }, {})
    }

    return res.status(200).json({ 
        message: "success", 
        data: formattedResponse.data 
    })
}

exports.addxp = async (req, res) => {
    const { characterid, xp } = req.body;

    if(!characterid || !xp) {
        return res.status(400).json({ 
            message: "failed", 
            data: "Please input character ID and XP."
        });
    }

    try {
        const character = await Characterdata.findOne({ 
            _id: new mongoose.Types.ObjectId(characterid)
        });

        if(!character) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Character not found."
            });
        }

        let currentLevel = character.level;
        let currentXP = character.experience + xp;
        let levelsGained = 0;
        let xpNeeded = 80 * currentLevel;

        // Calculate multiple level ups
        while (currentXP >= xpNeeded && xpNeeded > 0){
            const overflowXP = currentXP - xpNeeded;

            currentLevel++
            levelsGained++;
            currentXP = overflowXP
            xpNeeded = 80 * currentLevel
        }


        // while (true) {
            
        //     if (currentXP >= xpNeeded) {
        //         currentLevel++;
        //         currentXP -= xpNeeded;
        //         levelsGained++;
        //     } else {
        //         break;
        //     }
        // }

        // If levels were gained, update stats and skill points
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
                }
            );

            await CharacterSkillTree.findOneAndUpdate(
                { owner: characterid }, 
                {
                    $inc: {
                        skillPoints: 4 * levelsGained
                    }
                }
            );
        }

        // Update character level and experience
        character.level = currentLevel;
        character.experience = currentXP;
        await character.save();

        return res.status(200).json({ 
            message: "success",
            data: {
                newLevel: currentLevel,
                levelsGained,
                currentXP,
                nextLevelXP: 80 * currentLevel
            }
        });

    } catch (err) {
        console.log(`Error in XP addition: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "There's a problem with the server. Please contact support for more details."
        });
    }
};

exports.updateplayerprofile = async (req, res) => {

    const { username, characterid } = req.body

    if(!username || !characterid){
        return res.status(400).json({ message: "failed", data: "Please input username and character ID."})
    }

    const character = await Characterdata.findOne({ _id: new mongoose.Types.ObjectId(characterid)})

    if(!character){
        return res.status(400).json({ message: "failed", data: "Character not found."})
    }

    const wallet = await Characterwallet.findOne({owner: new mongoose.Types.ObjectId(characterid), type: "crystal"})

    if (wallet.amount <= 500){
        return res.status(400).json({message: "faield", data: "Crystals not enough! Please buy more to change your name"})
    }

    const usernameRegex = /^[a-zA-Z0-9]+$/;

    if(username.length < 5 || username.length > 20){
        return res.status(400).json({ message: "failed", data: "Username length should be greater than 5 and less than 20 characters."})
    }
    if(!usernameRegex.test(username)){
        return res.status(400).json({ message: "failed", data: "No special characters are allowed for username"})
    }

    character.username = username

    await character.save()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while saving character data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    await Characterwallet.findOneAndUpdate({owner: new mongoose.Types.ObjectId(characterid), type: "crystal"}, {$inc: {amount: -500}})

    return res.status(200).json({ message: "success"})

}

exports.updateplayertitle = async (req, res) => {
    const { titleid, characterid } = req.body;

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        // Find title in character's titles
        const character = await Charactertitle.findOne(
            { owner: new mongoose.Types.ObjectId(characterid) }
        ).session(session);

        if (!character) {
            await session.abortTransaction();
            return res.status(404).json({ 
                message: "failed", 
                data: "Character title not found" 
            });
        }

        // Check if title exists in character's titles
        const hasTitle = character.items.some(item => item.itemid === titleid);
        if (!hasTitle) {
            await session.abortTransaction();
            return res.status(404).json({ 
                message: "failed", 
                data: "Title not found in character's collection" 
            });
        }

        // check if there is a title equipped
        const equippedTitle = character.items.find(item => item.isEquipped === true);
        if (equippedTitle) {
            // Unequip the title
            equippedTitle.isEquipped = false;
        }

        // Equip the new title
        const titleIndex = character.items.findIndex(item => item.itemid === titleid);
        character.items[titleIndex].isEquipped = true;

        // Save the updated title

        await character.save({ session });

        await session.commitTransaction();
        return res.status(200).json({ 
            message: "success",
        });

    } catch (err) {
        await session.abortTransaction();
        console.log(`Error in update title transaction: ${err}`);
        return res.status(500).json({ 
            message: "failed", 
            data: "Failed to update title" 
        });
    } finally {
        session.endSession();
    }
}

// exports.getranking = async (req, res) => {
//     const { characterid } = req.query 

//     if(!characterid) {
//         res.status(400).json({ message: "failed", data: "Please input characterId"})
//     }

//     const rankingData = await Rankings.find({ owner: new mongoose.Types.ObjectId(characterid)})
//     .then(data => data)
//     .catch(err => {
//         console.log(`There's a problem encountered while fetching ranking. Error: ${err}`)

//         return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
//     })

//     return res.status(200).json({ message: "success", data: rankingData})

// }

// exports.getcharacterrank = async (req, res) => {
//     const { characterid } = req.query;

//     if (!characterid) {
//         return res.status(400).json({ message: "failed", data: "Please input characterId" });
//     }

//     try {
//         const rankingData = await Rankings.findOne(
//             { owner: new mongoose.Types.ObjectId(characterid) },
//             "mmr rank"
//         ).populate("rank", "name icon");

//         if (!rankingData) {
//             return res.status(404).json({ message: "not-found", data: "Character rank not found" });
//         }

//         return res.status(200).json({
//             message: "success",
//             data: {
//                 mmr: rankingData.mmr,
//                 rankTier: rankingData.rank?.name || "Unranked",
//                 icon: rankingData.rank?.icon || null
//             }
//         });
//     } catch (err) {
//         console.error(`Error fetching ranking: ${err}`);
//         return res.status(500).json({
//             message: "server-error",
//             data: "There's a problem with the server. Please try again later."
//         });
//     }
// };

exports.getcharacterstats = async (req, res) => {
    try {
        const { id } = req.user;
        const { characterid } = req.query;

        if(!characterid){
            return res.status(400).json({ 
                message: "failed", 
                data: "Please input character ID."
            });
        }

        const checker = await checkcharacter(id, characterid);

        if (checker === "failed") {
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        // Fetch base character stats
        const characterStats = await CharacterStats.findOne({ 
            owner: new mongoose.Types.ObjectId(characterid) 
        });

        if (!characterStats) {
            return res.status(404).json({
                message: "failed",
                data: "Character stats not found"
            });
        }

        // Fetch equipped skills and their effects
        const characterSkills = await CharacterSkillTree.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(characterid)
                }
            },
            {
                $unwind: "$skills"
            },
            {
                $lookup: {
                    from: "skills",
                    localField: "skills.skill",
                    foreignField: "_id",
                    as: "skillDetails"
                }
            },
            {
                $unwind: "$skillDetails"
            },
            {
                $match: {
                    "skillDetails.type": "Stat" // Only get stats-type skills
                }
            }
        ]);


        const totalStats = {
            health: characterStats.health,
            energy: characterStats.energy,
            armor: characterStats.armor,
            magicresist: characterStats.magicresist,
            speed: characterStats.speed,
            attackdamage: characterStats.attackdamage,
            armorpen: characterStats.armorpen,
            magicpen: characterStats.magicpen,
            critchance: characterStats.critchance,
            magicdamage: characterStats.magicdamage,
            lifesteal: characterStats.lifesteal,
            omnivamp: characterStats.omnivamp,
            healshieldpower: characterStats.healshieldpower,
            critdamage: characterStats.critdamage
        };

        characterSkills.forEach(skill => {
            if (skill.skillDetails.effects) {
                const effects = new Map(Object.entries(skill.skillDetails.effects));

                effects.forEach((value, stat) => {
                    if (totalStats.hasOwnProperty(stat)) {
                        totalStats[stat] += value * skill.skills.level;
                    }
                });
            }
        });

        return res.json({
            message: "success",
            data: totalStats
        });

    } catch (error) {
        console.error('Error in getcharacterstats:', error);
        return res.status(500).json({
            message: "failed",
            data: "An error occurred while fetching character stats"
        });
    }
};

exports.equipunequiptitle = async (req, res) => {

    const { id } = req.user
    const { characterid, titleindex } = req.body

    if(!id){
        return res.status(401).json({ message: "failed", data: "You are not authorized to view this page. Please login the right account to view the page."})
    }
    if(!characterid || !titleindex){
        return res.status(400).json({ message: "failed", data: "Please input character ID and title index."})
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page."
        });
    }

    await Characterdata.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(characterid)}, { $set: { title: titleindex } })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character title. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success" })
}


exports.equipunequipbadge = async (req, res) => {

    const { id } = req.user
    const { characterid, badgeindex } = req.body

    if(!id){
        return res.status(401).json({ message: "failed", data: "You are not authorized to view this page. Please login the right account to view the page."})
    }
    if(!characterid || !badgeindex){
        return res.status(400).json({ message: "failed", data: "Please input character ID and badge index."})
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page."
        });
    }

    await Characterdata.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(characterid)}, { $set: { badge: badgeindex } })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character badge. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success" })
}