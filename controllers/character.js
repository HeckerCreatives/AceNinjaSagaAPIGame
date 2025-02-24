const { default: mongoose } = require("mongoose")
const Characterdata = require("../models/Characterdata")
const Characterinventory = require("../models/Characterinventory")
const CharacterStats = require("../models/Characterstats")
const Charactertitle = require("../models/Charactertitles")
const Characterwallet = require("../models/Characterwallet")
const Rankings = require("../models/Ranking")

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

    if(!outfit || !hair || !eyes || !facedetails){
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

                const walletListData = ["coins", "crystal"];
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

                await Characterinventory.bulkWrite(inventoryBulkWrite)
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
    const { userid } = req.query

    if(!userid){
        return res.status(400).json({ message: "failed", data: "Please input character ID."})
    }

    const matchCondition = [
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userid) 
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "user"
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
            $project: {
                id: 1,
                user: { $arrayElemAt: ["$user.username", 0] }, // Flatten user.username
                status: { $arrayElemAt: ["$user.status", 0] },    // Flatten user.status
                username: 1,
                title: 1,
                level: 1,
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

    const inventorydata = await Characterinventory.find({ owner: new mongoose.Types.ObjectId(characterid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching inventory data for user: ${characterid}. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

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

exports.getranking = async (req, res) => {
    const { characterid } = req.query 

    if(!characterid) {
        res.status(400).json({ message: "failed", data: "Please input characterId"})
    }

    const rankingData = await Rankings.find({ owner: new mongoose.Types.ObjectId(characterid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching ranking. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success", data: rankingData})

        // const { id, username } = req.user
        // const { limit } = req.query

        // const pageOptions = {
        //     limit: parseInt(limit) || 10,
        // }

        // const rankingData = await Rankings
        // .find({})
        // .sort({ amount: -1 })
        // .limit(pageOptions.limit)
        // .populate({ path: 'owner', select: 'username' }) 
        // .select('amount owner')
        // .then(data => data)
        // .catch(err => {
        //     console.log(`There's a problem while fetching leaderboard data for ${username}. Error: ${err}`)
        //     return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
        // })
        // const rank = leaderboardData.findIndex(item => item.owner.id.toString() === id.toString()) + 1

        // index = 0;
        // const data = {}
        // leaderboardData.map(item => {
        //     data[index] = {
        //         username: item.owner.username,
        //         amount: item.amount
        //     }
        //     index++
        // })

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