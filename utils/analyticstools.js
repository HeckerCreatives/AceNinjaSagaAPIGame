const { default: mongoose } = require("mongoose")
const Analytics = require("../models/Analytics")

exports.addanalytics = async(id, transactionid, action, type, target, description, amount) => {
    await Analytics.create({owner: new mongoose.Types.ObjectId(id), transactionid: transactionid, action: action, target: target, type: type, description: description, amount: amount})
    .catch(err => {

        console.log(`Failed to create analytics data for ${id} type: ${type} amount: ${amount}, error: ${err}`)

        return "failed"
    })

    return "success"
}

/**
 * Add analytics with transaction support
 * @param {String} id - Character ID
 * @param {String} transactionid - Transaction ID
 * @param {String} action - Action type (buy, claim, grant, etc.)
 * @param {String} type - Type (market, pack, etc.)
 * @param {String} target - Target type (crystal, coins, weapon, etc.)
 * @param {String} description - Description of the transaction
 * @param {Number} amount - Amount involved
 * @param {Object} session - Mongoose session for transaction
 * @returns {String} - 'success' or 'failed'
 */
exports.addanalyticsTransactional = async(id, transactionid, action, type, target, description, amount, session = null) => {
    try {
        const analyticsData = {
            owner: new mongoose.Types.ObjectId(id),
            transactionid: transactionid,
            action: action,
            target: target,
            type: type,
            description: description,
            amount: amount
        };

        if (session) {
            await Analytics.create([analyticsData], { session });
        } else {
            await Analytics.create(analyticsData);
        }

        return "success";
    } catch (err) {
        console.log(`Failed to create analytics data for ${id} type: ${type} amount: ${amount}, error: ${err}`);
        return "failed";
    }
}

exports.deleteanalytics = async (transactionid) => {
    await Analytics.findOneAndDelete({transactionid: transactionid})
    .catch(err => {

        console.log(`Failed to delete analytics data for ${transactionid}, error: ${err}`)

        return "failed"
    })

    return "success"
}