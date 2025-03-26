const { default: mongoose } = require("mongoose")
const Analytics = require("../models/Analytics")

exports.addanalytics = async(id, transactionid, type, description, amount) => {
    await Analytics.create({owner: new mongoose.Types.ObjectId(id), transactionid: transactionid, type: type, description: description, amount: amount})
    .catch(err => {

        console.log(`Failed to create analytics data for ${id} type: ${type} amount: ${amount}, error: ${err}`)

        return "failed"
    })

    return "success"
}

exports.deleteanalytics = async (transactionid) => {
    await Analytics.findOneAndDelete({transactionid: transactionid})
    .catch(err => {

        console.log(`Failed to delete analytics data for ${transactionid}, error: ${err}`)

        return "failed"
    })

    return "success"
}