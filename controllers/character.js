const { default: mongoose } = require("mongoose")
const Characterdata = require("../models/Characterdata")
const CharacterStats = require("../models/Characterstats")
const Charactertitle = require("../models/Charactertitles")
const Characterwallet = require("../models/Characterwallet")
const Rankings = require("../models/Ranking")
const { CharacterInventory } = require("../models/Market")

exports.createcharacter = async (req, res) => {

    const { id } = req.user
    const { username, gender, outfit, hair, eyes, facedetails, color, itemindex } = req.body
   
    if(!id){
        return res.status(401).json({ message: "failed", data: "You are not authorized to view this page. Please login the right account to view the page."})
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

    await Characterdata.findOne({ username: { $regex: new RegExp('^' + username + '$', 'i')} })
    .then(async character => {
        if(character){
            return res.json({ message: "failed", data: "Username already exist."})
        } else {      
            await Characterdata.create({ 
                owner: id, 
                username: username,
                gender: gender, 
                outfit: outfit,
                hair: hair,
                eyes: eyes,
                facedetails: facedetails,
                color: color,
                title: 0,
                experience: 0,
                level: 1,
                badge: "",
                itemindex: itemindex
            })
            .then(async data => {
                await CharacterStats.create({
                    owner: data._id,
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
                })
                .catch(async error => {
                    await Characterdata.findByIdAndDelete(data._id)
                    res.status(400).json({ message: "bad-request", data: error.message })
                })

                await Charactertitle.create({ owner: data._id, items: [{ itemid: "" }]})
                .catch(async error => {
                    await Characterdata.findByIdAndDelete(data._id)
                    await CharacterStats.findOneAndDelete({ owner: data._id })
                    res.status(400).json({ message: "bad-request", data: error.message })
                })
                
                await Rankings.create({ owner: data._id, mmr: 10 })
                .catch(async error => {
                    await Characterdata.findByIdAndDelete(data._id)
                    await CharacterStats.findOneAndDelete({ owner: data._id })
                    await Charactertitle.findOneAndDelete({ owner: data._id })
                    res.status(400).json({ message: "bad-request", data: error.message })
                })

                const walletListData = ["coins", "crystal", "emerald"];
                const walletBulkwrite = walletListData.map(walletData => ({
                    insertOne: {
                        document: { owner: data._id, type: walletData, amount: "0" }
                    }
                }));

                await Characterwallet.bulkWrite(walletBulkwrite)
                .catch(async error => {
                    await Characterdata.findByIdAndDelete(data._id)
                    await CharacterStats.findOneAndDelete({ owner: data._id })
                    await Charactertitle.findOneAndDelete({ owner: data._id })
                    await Rankings.findOneAndDelete({ owner: data._id })
                    res.status(400).json({ message: "bad-request", data: error.message })
                })

                const inventoryListData = ["weapon", "outfit", "hair", "face", "eyes", "skincolor", "skins"];
                const inventoryBulkWrite = inventoryListData.map(inventoryData => ({
                    insertOne: {
                        document: { owner: data._id, type: inventoryData }
                    }
                }));

                await CharacterInventory.bulkWrite(inventoryBulkWrite)
                .catch(async error => {
                    await Characterdata.findByIdAndDelete(data._id)
                    await CharacterStats.findOneAndDelete({ owner: data._id })
                    await Charactertitle.findOneAndDelete({ owner: data._id })
                    await Characterwallet.deleteMany({ owner: data._id })
                    await Rankings.findOneAndDelete({ owner: data._id })
                    res.status(400).json({ message: "bad-request", data: error.message })
                })

                return res.status(200).json({ message: "success"})
            })
          .catch(error => res.status(400).json({ message: "bad-request", data: error.message }))
        }
    })
    .catch(error => res.status(400).json({ message: "bad-request", data: error.message }))

}


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
                stats: { $arrayElemAt: ["$stats", 0] },      // Flatten stats
                mmr: { $arrayElemAt: ["$ranking.mmr", 0] },      // Flatten ranking.mmr
                wallet: {                 
                    $map: {               
                        input: "$wallet", 
                        as: "w",          
                        in: {             
                            type: "$$w.type",      
                            amount: "$$w.amount"  
                        }
                    }
                },
                inventory: {                 
                    $map: {               
                        input: "$inventory", 
                        as: "w",          
                        in: {             
                            type: "$$w.type",      
                            items: "$$w.items"  
                        }
                    }
                },
            }
        }
    ];

    const characterData = await Characterdata.aggregate(matchCondition)

    return res.status(200).json({ message: "success", data: characterData})
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
        const {_id, username, gender, outfit, hair, eyes, facedetails, color, title, experience, badge, itemindex} = temp;

        data[itemindex] = {
            id: _id,
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
            CurrentXP: experience,
            badge: badge,
            Level: 1,
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

    const data = []

    walletData.forEach(temp => {
        data.push({
            type: temp.type,
            amount: temp.amount
        })
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
    const { characterid, xp } = req.body

    if(!characterid || !xp){
        return res.status(400).json({ message: "failed", data: "Please input character ID and XP."})
    }


    const character = await Characterdata.findOne({ _id: new mongoose.Types.ObjectId(characterid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    if(!character){
        return res.status(400).json({ message: "failed", data: "Character not found."})
    }

    let level = character.level
    let expneeded = 80 * level

    let newxp = xp

    if(character.experience + xp >= expneeded){
        level += 1
        newxp = (character.experience + xp) - expneeded
        
        await CharacterStats.findOneAndUpdate({ owner: characterid }, {
            $inc: {
                health: 10,
                energy: 5,
                armor: 2,
                magicresist: 1,
                speed: 1,
                attackdamage: 1,
                armorpen: 1,
                magicpen: 1,
                critchance: 0,
                magicdamage: 1,
                lifesteal: 0,
                omnivamp: 0,
                healshieldpower: 0,
                critdamage: 1,
            }
         })
    
    }



    character.experience += newxp
    character.level = level

    await character.save()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while saving character data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })


    return res.status(200).json({ message: "success"})
}


exports.updateplayerprofile = async (req, res) => {

    const { username, characterid } = req.body

    if(!username || !characterid){
        return res.status(400).json({ message: "failed", data: "Please input username and character ID."})
    }

    const character = await Characterdata.findOne({ _id: new mongoose.Types.ObjectId(characterid)})

    if(!character){
        return res.status(400).json({ message: "failed", data: "Character not found."})
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