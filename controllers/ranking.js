const Characterdata = require("../models/Characterdata");
const Rankings = require("../models/Ranking");



exports.addmmr = async (req, res) => {
    const { mmr, characterid } = req.body;

    if (!mmr || !characterid) {
        return res.status(400).json({ message: "bad-request", data: "Please provide the necessary data!" })
    }

    // increment mmr
    await Rankings.findOneAndUpdate(
        { owner: characterid },
        { $inc: { mmr } },
        { new: true }
    )
    .then(data => {
        return res.json({ message: "success" })
    })
    .catch(err => {
        console.log(`Error adding mmr: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem adding mmr!" })
    })

}

exports.getleaderboards = async (req, res) => {

    const { characterid } = req.query;
    const limit = parseInt(req.query.limit) || 100;


    const lbvalue = await Rankings.findOne({ owner: characterid })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding lbvalue: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
    })

    const leaderboards = await Rankings.countDocuments({ mmr: { $gt: lbvalue.mmr } })
    .then(data => data)
    .catch(err => {
        console.log(`Error finding leaderboards: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
    })


    const topleaderboard = await Rankings.find()
    .populate("owner" , "username")
    .sort({ mmr: -1 })
    .limit(parseInt(limit))
    .then(data => data)
    .catch(err => {
        console.log(`Error finding topleaderboard: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
    })

    console.log(topleaderboard)

    const formattedResponse = {
        data: topleaderboard.reduce((acc, rank, index) => {
            acc[index + 1] = {
                rank: index + 1,
                username: rank?.owner?.username,
                mmr: rank.mmr,
                isCurrentPlayer: rank?.owner?._id.toString() === characterid
            };
            return acc;
        }, {}),
        playerRank: {
            rank: leaderboards + 1,
            username: lbvalue.owner.username,
            mmr: lbvalue.mmr
        }
    };

    return res.status(200).json({
        message: "success",
        data: formattedResponse.data,
        playerRank: formattedResponse.playerRank
    });


}

exports.getlevelleaderboards = async (req, res) => {

    const { characterid } = req.query;
    const limit = parseInt(req.query.limit) || 100;


    const lbvalue = await Characterdata.findOne({ owner: characterid })


    const leaderboards = await Characterdata.countDocuments({ level: { $gt: lbvalue.level } })

    const topleaderboard = await Characterdata.find()
    .populate("owner" , "username")
    .sort({ level: -1 })
    .limit(parseInt(limit))
    .then(data => data)
    .catch(err => {
        console.log(`Error finding top level leaderboard: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })

    })

    const formattedResponse = {

        data: topleaderboard.reduce((acc, rank, index) => {
            acc[index + 1] = {
                rank: index + 1,
                username: rank?.owner?.username,
                level: rank.level,
                isCurrentPlayer: rank?.owner?._id.toString() === characterid
            };
            return acc;
        }, {}),
        playerRank: {
            rank: leaderboards + 1,
            username: lbvalue.owner.username,
            level: lbvalue.level
        }
    };


    return res.status(200).json({ message: "success", data: formattedResponse.data, playerRank: formattedResponse.playerRank });

}

exports.resetleaderboards = async (req, res) => {
    await Rankings.updateMany({}, { mmr: 0 })
    .then(data => {
        return res.json({ message: "success" })
    })
    .catch(err => {
        console.log(`Error resetting leaderboards: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem resetting leaderboards!" })
    })
}