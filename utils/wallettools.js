const Characterwallet = require("../models/Characterwallet")

exports.addwallet = async (characterid, type, amount, session = null) => {
    try {
        const updateOptions = {};
        if (session) {
            updateOptions.session = session;
        }

        console.log(`Adding ${amount} to wallet of character ${characterid} of type ${type}`);
        const result = await Characterwallet.updateOne(
            { owner: characterid, type: type },
            { $inc: { amount: amount } },
            updateOptions
        );
        if (result.modifiedCount === 0) {
            return "failed";
        }
        return "success";
    } catch (error) {
        return "failed";
    }
}

exports.reducewallet = async (characterid, amount, type, session = null) => {
    try {
        const updateOptions = {};
        if (session) {
            updateOptions.session = session;
        }
        const result = await Characterwallet.updateOne(
            { owner: characterid, type: type },
            { $inc: { amount: -amount } },
            updateOptions
        );
        if (result.modifiedCount === 0) {
            return "failed" ;
        }
        return "success" ;
    } catch (error) {
        return "failed";
    }
}

exports.checkwallet = async (characterid, type, session = null) => {
    try {
        const updateOptions = {};
        if (session) {
            updateOptions.session = session;
        }
        const wallet = await Characterwallet.findOne(
            { owner: characterid, type: type },
            null,
            updateOptions
        ).lean();

        return wallet ? wallet.amount : 0;
    } catch (error) {
        return "failed";
    }
}