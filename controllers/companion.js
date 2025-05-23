const Characterwallet = require("../models/Characterwallet");
const Characterdata = require("../models/Characterdata");
const {Companion, CharacterCompanion} = require("../models/Companion");
const { checkcharacter } = require("../utils/character");
const PvP = require("../models/Pvp");
const { default: mongoose } = require("mongoose");

exports.getcharactercompanions = async (req, res) => {

    const { id } = req.user
    const { characterid, page, limit } = req.query

    const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 10,
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized", 
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const query = { owner: characterid }

    const companions = await CharacterCompanion.find(query)
        .populate("companion")
        .limit(options.limit)
        .skip(options.limit * (options.page - 1))
        .sort({ createdAt: -1 })
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while getting companions. Error: ${err}.`)
            return res.status(400).json({
                message: "bad-request", 
                data: "There's a problem with the server. Please try again later."
            });
        })

    const totalData = await CharacterCompanion.countDocuments(query)
    const totalPages = Math.ceil(totalData / options.limit)

    const finalData = {
        companions: {},
        totalpages: totalPages
    }

    companions.forEach(data => {
        const { companion, isEquipped, _id } = data

        const { id, name, activedescription, passivedescription, passiveeffects, activeeffects, levelrequirement } = companion

        finalData.companions[name] = {
            id: _id,
            companionid: id,
            activedescription: activedescription,
            activeeffects: activeeffects,
            passivedescription: passivedescription,
            passiveeffects: passiveeffects,
            levelrequirement: levelrequirement,
            isEquipped: isEquipped
        }
    });

    return res.status(200).json({
        message: "success", 
        data: finalData, 
    });
    
}

exports.getcharactercompanionssa = async (req, res) => {

    const { id } = req.user
    const { characterid, page, limit } = req.query

    const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 10,
    }

    const query = { owner: characterid }

    const companions = await CharacterCompanion.find(query)
        .populate("companion")
        .limit(options.limit)
        .skip(options.limit * (options.page - 1))
        .sort({ createdAt: -1 })
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while getting companions. Error: ${err}.`)
            return res.status(400).json({
                message: "bad-request", 
                data: "There's a problem with the server. Please try again later."
            });
        })

    const totalData = await CharacterCompanion.countDocuments(query)
    const totalPages = Math.ceil(totalData / options.limit)

    const finalData = []

    companions.forEach(data => {
        const { companion, isEquipped, _id } = data

        const { id, name, activedescription, passivedescription, passiveeffects, activeeffects, levelrequirement } = companion

        finalData.push({
            id: _id,
            companionid: id,
            companionname: name,
            activedescription: activedescription,
            activeeffects: activeeffects,
            passivedescription: passivedescription,
            passiveeffects: passiveeffects,
            levelrequirement: levelrequirement,
            isEquipped: isEquipped
        })
    });

    return res.status(200).json({
        message: "success", 
        data: finalData, 
        totalpages: totalPages
    });
}


exports.companionlist = async (req, res) => {

    const { page, limit, characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input character id."})
    }
    const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 10,
    }

    const companions = await Companion.find()
        .limit(options.limit)
        .skip(options.limit * (options.page - 1))
        .sort({ levelrequirement: 1 })
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while getting companions. Error: ${err}.`)
            return res.status(400).json({
                message: "bad-request", 
                data: "There's a problem with the server. Please try again later."
            });
        })

    // check if user has the companion

    const charactercompanion = await CharacterCompanion.find({ owner: characterid })
    const character = await Characterdata.findById(characterid)
    .lean()
    .then(data => data)
    const totalWins = await PvP.countDocuments({ status: 1, owner: new mongoose.Types.ObjectId(characterid) })
    


    const totalData = await Companion.countDocuments()
    const totalPages = Math.ceil(totalData / options.limit)

    const finalData = {
        companions: {}, 
        totalpages: totalPages
    }

    companions.forEach(data => {
        const { id, name, activedescription, passivedescription, passiveeffects, activeeffects, levelrequirement, price, currency } = data

        let isOwned = false
        let islocked = false
        charactercompanion.forEach(companion => {
            if(companion.companion.toString() === id.toString()){
                isOwned = true
            }
        })

        if (name === "Blaze" &&(totalWins < 40 || character.level < 50)){
            islocked = true
        }
        if (name === "Shade" && (totalWins < 20 || character.level < 40)) {
            islocked = true
        }

        

        finalData.companions[name] = {
            id: id,
            activedescription: activedescription,
            passivedescription: passivedescription,
            passiveeffects: passiveeffects,
            activeeffects: activeeffects,
            levelrequirement: levelrequirement,
            price: price,
            currency: currency,
            isOwned: isOwned,
            islocked: islocked
        }
    });

    return res.status(200).json({
        message: "success", 
        data: finalData
    });
}


exports.buycompanion = async (req, res) => {

    const { id } = req.user
    const { characterid, companionname } = req.body

    if(!companionname){
        return res.status(400).json({ message: "failed", data: "Please select a valid companion."})
    }

    if (!characterid){
        return res.status(401).json({ message: "failed", data: "Please select a valid character."})
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(401).json({
            message: "Unauthorized", 
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const companion = await Companion.find({name: companionname})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while buying companion. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request", 
            data: "There's a problem with the server. Please try again later."
        });
    })
    if(!companion){
        return res.status(400).json({ message: "failed", data: "Companion not found."})
    }

    const character = await Characterdata.findById(characterid)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while buying companion. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request", 
            data: "There's a problem with the server. Please try again later."
        });
    })

    if(!character){
        return res.status(400).json({ message: "failed", data: "Character not found."})
    }
    // check level
    if(character.level < companion.levelrequirement){
        return res.status(400).json({ message: "failed", data: "Character level not enough."})
    }

    const charactercompanion = await CharacterCompanion.find({ owner: characterid, companion: companion[0]._id })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while buying companion. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request", 
            data: "There's a problem with the server. Please try again later."
        });
    })

    if(charactercompanion.length > 0){
        return res.status(400).json({ message: "failed", data: "Companion already owned."})
    }

    // check price and currency and wallet balance

    const { price, currency } = companion[0]

    // check if character has enough currency

    const wallet = await Characterwallet.findOne({ owner: characterid, type: currency })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while buying companion. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request", 
            data: "There's a problem with the server. Please try again later."
        });
    })

    if(!wallet){
        return res.status(400).json({ message: "failed", data: "Character wallet not found."})
    }

    if(wallet.amount < price){
        return res.status(400).json({ message: "failed", data: "Insufficient funds."})
    }

    // deduct wallet amount

    wallet.amount -= price

    await wallet.save()

    // add companion to character

    await CharacterCompanion.create({ owner: characterid, companion: companion[0]._id, isEquipped: false })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while buying companion. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request", 
            data: "There's a problem with the server. Please try again later."
        });
    })

    return res.status(200).json({ message: "success"})

}

exports.equipunequipcompanion = async (req, res) => {
    const { id } = req.user

    const { characterid, companionid } = req.body

    const checker = await checkcharacter(id, characterid);
    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized", 
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    if(!characterid || !companionid){
        return res.status(400).json({ message: "failed", data: "Please input character id and companion id."})
    }

    const charactercompanion = await CharacterCompanion.findOne({ owner: characterid, companion: companionid })
    .populate("companion")
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while equipping companion. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request", 
            data: "There's a problem with the server. Please try again later."
        });
    })

    if(!charactercompanion){
        return res.status(400).json({ message: "failed", data: "Companion not found."})
    }

    // get character data and check companion level requirement

    const character = await Characterdata.findById(characterid)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while equipping companion. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request", 
            data: "There's a problem with the server. Please try again later."
        });
    })

    if(!character){
        return res.status(400).json({ message: "failed", data: "Character not found."})
    }

    if(character.level < charactercompanion.companion.levelrequirement){
        return res.status(400).json({ message: "failed", data: "Character level not enough."})
    }


    // check if companion is already equipped

    const equipped = await CharacterCompanion.findOne({ owner: characterid, companion: companionid, isEquipped: true })
    if(equipped){
        equipped.isEquipped = false
        await equipped.save()
    } 
    
    // check if there are other equipped companions

    const otherEquipped = await CharacterCompanion.findOne({ owner: characterid, isEquipped: true })
    if(otherEquipped){
        otherEquipped.isEquipped = false
        await otherEquipped.save()
    }

    // equip companion

    charactercompanion.isEquipped = true

    await charactercompanion.save()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while equipping companion. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request", 
            data: "There's a problem with the server. Please try again later."
        });
    })

    return res.status(200).json({ message: "success"})
}