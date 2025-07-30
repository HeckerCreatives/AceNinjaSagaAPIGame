const Characterwallet = require("../models/Characterwallet");
const Characterdata = require("../models/Characterdata");
const {Companion, CharacterCompanion, CharacterCompanionUnlocked} = require("../models/Companion");
const { checkcharacter } = require("../utils/character");
const PvP = require("../models/Pvp");
const { default: mongoose } = require("mongoose");
const ClanwarsHistory = require("../models/Clanwarshistory");
const { addanalytics } = require("../utils/analyticstools");
const { checkwallet, reducewallet } = require("../utils/wallettools");

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
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while getting companions. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request",
            data: "There's a problem with the server. Please try again later."
        });
    })
    
    const isUnlocked = await CharacterCompanionUnlocked.find({ owner: characterid })


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
        isUnlocked.forEach(companion => {
            if(companion.companion.toString() === id.toString()){
                if(companion.isLocked){
                    islocked = true
                }
            }
        })

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

    const companion = await Companion.find({name: { $regex: new RegExp('^' + companionname + '$', 'i') }})
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

    const wallet = await checkwallet(characterid, currency)

    if(wallet === "failed"){
        return res.status(400).json({ message: "failed", data: "Character wallet not found."})
    }

    if(wallet < price){
        return res.status(400).json({ message: "failed", data: "Insufficient funds."})
    }

    // deduct wallet amount

    const walletReduce = await reducewallet(characterid, price, currency)

    if (walletReduce === "failed") {
        return res.status(400).json({
            message: "failed",
            data: "Failed to deduct wallet amount."
        });
    }

    // add companion to character

   const data = await CharacterCompanion.create({ owner: characterid, companion: companion[0]._id, isEquipped: false })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while buying companion. Error: ${err}.`)
        return res.status(400).json({
            message: "bad-request", 
            data: "There's a problem with the server. Please try again later."
        });
    })

    // create analytics for companion purchase

    const analyticresponse = await addanalytics(
        characterid.toString(),
        data._id.toString(),
        "buy", 
        "companion",
        companion[0].name,
        `Bought companion: ${companion[0].name} for ${price} ${currency}`,
        price
    );

    if (analyticresponse === "failed") {
        console.log("Failed to log analytics for companion purchase");
        return res.status(500).json({
            message: "failed",
            data: "Failed to log analytics for companion purchase"
        });
    }
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


    if(charactercompanion.isEquipped){
        charactercompanion.isEquipped = false;
        await charactercompanion.save();
        return res.status(200).json({ message: "success", data: "Companion unequipped successfully."});
    } else {
        await CharacterCompanion.updateMany(
            { owner: characterid },
            { $set: { isEquipped: false } }
        );

        charactercompanion.isEquipped = true;
        await charactercompanion.save();
    }

    return res.status(200).json({ message: "success"})
}

exports.unlockcompanion = async (req, res) => {
    const { id } = req.user
    const { characterid, companionid } = req.body

    if(!characterid || !companionid){
        return res.status(400).json({ message: "failed", data: "Please input character id and companion id."})
    }

    const checker = await checkcharacter(id, characterid);
    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized", 
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const charactercompanion = await CharacterCompanionUnlocked.findOne({ owner: characterid, companion: companionid })
            .populate("companion")
            .session(session);

        if(!charactercompanion){
            throw new Error("Companion not found.");
        }

        const character = await Characterdata.findById(characterid).session(session);
        if(!character){
            throw new Error("Character not found.");
        }

        const totalpvpwins = await PvP.countDocuments({ owner: characterid, status: 1 });
        const totalclanwarwins = await ClanwarsHistory.countDocuments({ owner: characterid, status: 1 });

        if(charactercompanion.isLocked){
            if(charactercompanion.companion.name === "Blaze" && (totalpvpwins < 30 || totalclanwarwins < 30 || character.level < 50)){
                throw new Error("You need to win 30 PvP matches and 30 Clan War matches to unlock Blaze.");
            } else if(charactercompanion.companion.name === "Shade" && (totalpvpwins < 20 || totalclanwarwins < 20 || character.level < 40)){
                throw new Error("You need to win 20 PvP matches and 20 Clan War matches to unlock Shade.");
            }

            const wallet = await Characterwallet.findOne({ owner: characterid, type: "crystal" }).session(session);
            if(!wallet){
                session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "failed", data: "Wallet not found."});
            }


            let price = charactercompanion.companion.name === "Blaze" ? 2000 : 
                       charactercompanion.companion.name === "Shade" ? 1000 : 0;

            if(wallet.amount < price){
                session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "failed", data: "Insufficient funds."});
            }

            wallet.amount -= price;
            charactercompanion.isLocked = false;

            await wallet.save();
            await charactercompanion.save();
        }

        await session.commitTransaction();
        return res.status(200).json({ message: "success"});

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error(`Transaction error: ${error}`);
        return res.status(400).json({ message: "bad-request", data: error.message || "There's a problem with the server. Please try again later."});
    } finally {
        session.endSession();
    }
}
