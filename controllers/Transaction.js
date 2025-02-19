const Transaction = require("../models/Transaction")
const Characterwallet = require("../models/Characterwallet")
const { default: mongoose } = require("mongoose")

exports.createTransaction = async (req, res) => {

    const { id, username } = req.user

    const { transactionId, amount, method, currency, items } = req.body

    if(!id){
        return res.status(400).json({ message: "failed", data: "Unauthorized! Please login to the right account." })
    }

    if(!transactionId || !amount || !method || !currency ){
        return res.status(400).json({ message: "failed", data: "No transaction data." })
    }

    if(!items && items.length === 0){
        return res.status(400).json({ message: "failed", data: "No transaction data." })      
    }

    await Transaction.create({
        owner: id,
        transactionId: transactionId,
        amount: amount,
        method: method,
        currency: currency,
        items: items
    })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered when creating transaction for user: ${username}. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later"})
    })

    return res.status(200).json({ message: "success"})
}


exports.completeTransaction = async (req, res) => {
    const { id } = req.user

    const { status, transactionId, items, characterid } = req.body
    
    if(!transactionId){
        return res.status(400).json({ message: "failed", data: "There's no transaction details found."})
    }
    
    if(status === 'completed'){

        if(!transactionId || !items || !characterid){
            return res.status(400).json({ message: "failed", data: "There's no transaction/user details found."})
        }
        
        const findTransaction = await Transaction.findOne({ transactionId: transactionId})
        
        if(!findTransaction){
            return res.status(400).json({ message: "bad-request", data: "Transaction does not exists."})
        } else {
            await Transaction.findOneAndUpdate({ owner:  new mongoose.Types.ObjectId(id), transactionId: transactionId}, { $set: { status: "completed"}})
            .then(data => data)
            .catch(err => {
                console.log(`There's a problem encountered while updating transaction. Error: ${err}`)
                return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
            })

            for (const item of items) {
                const { type, quantity, price } = item;

                if (!type || !quantity || !price) {
                    return res.status(400).json({ message: "failed", data: "Invalid item data provided." });
                }
                const totalAmount = quantity * price;

                await Characterwallet.findOneAndUpdate(
                    { owner: characterid, type },
                    { $inc: { amount: totalAmount } }, 
                )
                .then(data => data)
                .catch(err => {
                    console.log(`There's a problem encountered while updating character wallet. Error: ${err}`)
                    
                    return res.status(400).json({
                        message: "bad-request",
                        data: `Character wallet not found for type: ${type}`,
                    });            
                })

            }
            
            return res.status(200).json({ message: "success"})
        }
    } else {
        await Transaction.findOneAndUpdate({ owner: new mongoose.Types.ObjectId(id), transactionId: transactionId}, { $set: { status: "failed"}})
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem while updating transaction status: failed. Error: ${err}`)
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
        })

        return res.status(200).json({ message: "success"})
    }
}


exports.monitorTransaction = async (req, res) => {
    
    const { id } = req.user

    const { transactionId } = req.query


    if(!id || !transactionId){
        return res.status(400).json({ message: "No user ID and transaction ID found."})
    }
    const transactionData = await Transaction.findOne({ transactionId: transactionId, owner: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching transaction data. Error ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })


    const data = {
        transactionId: transactionData.transactionId,
        amount: transactionData.amount,
        status: transactionData.status,
        items: transactionData.items,
        date: transactionData.createdAt
    }


    return res.status(200).json({ message: "success", data: data })
}

exports.getusertransactions = async (req, res) => {

    const { id } = req.query

    if(!id){
        return res.status(400).json({ message: "failed", data: "Please input user ID."})
    }
    const transactionData = await Transaction.find({ owner: new mongoose.Types.ObjectId(id)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching user transaction data. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const data = []

    transactionData.forEach(temp => {
        data.push({
            id: temp._id,
            transactionId: temp.transactionId,
            amount: temp.number,
            method: temp.method,
            currency: temp.currency,
            status: temp.status,
            items: temp.items,
            date: temp.createdAt
        })
    })

    return res.status(200).json({ message: "success", data: data})
}