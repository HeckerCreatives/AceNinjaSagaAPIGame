const { default: mongoose } = require("mongoose")
const Users = require("../models/Users")

exports.totalregistration = async (req, res) => {
        const totalUsers = await Users.countDocuments()
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while fetching totalUsers. Error: ${err}`)

            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
        })
        const totalActiveUsers = await Users.countDocuments({ status: "active" })
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while fetching totalActiveUsers. Error: ${err}`)

            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
        })
        const totalInactiveUsers = await Users.countDocuments({ status: { $ne: "active" } })
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while fetching totalInactiveUsers. Error: ${err}`)

            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
        })

        return res.status(200).json({
            message: "success",
            data: {
                totalUsers: totalUsers,
                totalActiveUsers: totalActiveUsers,
                totalInactiveUsers: totalInactiveUsers,
            }
        });

}

exports.banunbanuser = async (req, res) => {
    const { userid, status } = req.query

    if(!userid || !status){
        return res.status(400).json({ message: "failed", data: "Please input userid and status."})
    }
    await Users.findOneAndUpdate({ id: new mongoose.Types.ObjectId(userid)}, { $set: { status: status}})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encounter while banning/unbanning users. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    return res.status(200).json({ message: "success" })
}


exports.userlist = async (req, res) => {
    const { page, limit, filter, search} = req.query

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    }

    let searchMatchStage = {};
    let filterMatchStage = {};

    if(search){
        searchMatchStage = {
            username: { $regex: search, $options: 'i' },
        };

    }

    if(filter === 'active' || filter === 'inactive'){
        filterMatchStage = {
            status: filter,
        }
    }   

    const matchCondition = [
        {
            $match: {
                auth: "player"
            }
        },
        {
            $lookup: {
                from: "characterdatas",
                localField: "_id",
                foreignField: "owner",
                as: "character"
            }
        },
        {
            $unwind: {
                path: "$character",
                preserveNullAndEmptyArrays: true // Preserve users without character data
            }
        },
        {
            $lookup: {
                from: "characterwallets",
                localField: "character._id", // Use the `_id` of the character
                foreignField: "owner", // Match `owner` field in `characterwallets`
                as: "character.wallet"
            }
        },
        ...(search ? [ { $match: searchMatchStage }] : []),
        ...(filter ? [ { $match: filterMatchStage }]: []),
        {
            $group: {
                _id: "$_id", // Recombine documents by user
                username: { $first: "$username" },
                email: { $first: "$email" },
                status: { $first: "$status" },
                auth: { $first: "$auth" },
                character: { $push: "$character" } // Aggregate back the `character` array
            }
        },
        {
            $project: {
                id: 1,
                username: 1,
                email: 1,
                status: 1,
                auth: 1,
                character: 1
            }
        },
        {
            $skip: pageOptions.page * pageOptions.limit
        },
        {
            $limit: pageOptions.limit
        }
    ];
    

    const playerlistdata = await Users.aggregate(matchCondition)

    const totalPlayers = await Users.countDocuments(matchCondition)
    .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while fetching users. Error: ${err}`)

            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details"})
        });

    const finalpages = Math.ceil(totalPlayers / pageOptions.limit)

    const finaluserdata = []
    
    playerlistdata.forEach(temp => {
        const { _id, email, username, status, auth, character } = temp
        const characters = []

        character.forEach(temp1 => {
            const { _id, wallet, username, gender, outfit, hair, eyes, facedetails, color, title, level, badge } = temp1
           
            const wallet1 = []

            wallet.forEach(temp2 => {
                const { type, amount } = temp2

                wallet1.push({
                    type: type,
                    ammount: amount
                })
            })

            characters.push({
                id: _id,
                username: username,
                gender: gender,
                outfit: outfit,
                hair: hair,
                eyes: eyes,
                facedetails: facedetails,
                color: color,
                title: title,
                level: level,
                badge: badge,
                wallet: wallet1,
            })
        })
        finaluserdata.push({
            id: _id,
            username: username,
            email: email,
            status: status,
            auth: auth,
            character: characters,
        })
    })
    const data = {
        "playerListData": finaluserdata,
        "totalPages": finalpages
    }
    return res.json({ message: "success", data: data});

} 
