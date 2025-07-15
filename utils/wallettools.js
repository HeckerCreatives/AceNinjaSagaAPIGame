const Characterwallet = require("../models/Characterwallet")

exports.addwallet = async (characterid, amount, type, session = null) => {
    try {
        const updateOptions = {};
        if (session) {
            updateOptions.session = session;
        }
        await Characterwallet.updateOne(
            { character: characterid, type: type },
            { $inc: { amount: amount } },
            updateOptions
        );
        return { status: "success" };
    } catch (error) {
        return { status: "failed" };
    }
}

exports.reducewallet = async (characterid, amount, type, session = null) => {
    try {
        const updateOptions = {};
        if (session) {
            updateOptions.session = session;
        }
        await Characterwallet.updateOne(
            { character: characterid, type: type },
            { $inc: { amount: -amount } },
            updateOptions
        );
        return { status: "success" };
    } catch (error) {
        return { status: "failed" };
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
        return "failed"; // Return 0 if there's an error
    }
}
