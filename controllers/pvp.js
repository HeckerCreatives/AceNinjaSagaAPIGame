const { default: mongoose } = require("mongoose")
const Pvp = require("../models/Pvp")
const Season = require("../models/Season")
const Rankings = require("../models/Ranking")
const PvpStats = require("../models/PvpStats")
const Characterdata = require("../models/Characterdata")
const { RemainingTime, getSeasonRemainingTimeInMilliseconds } = require("../utils/datetimetools")

exports.getpvphistory = async (req, res) => {
    try {
        const { id } = req.user;
        const { page, limit, characterid, datefilter } = req.query;

        const pageOptions = {
            page: parseInt(page) || 0,
            limit: parseInt(limit) || 10,
        };

        let query = { owner: characterid };

        if (datefilter) {
            const startOfDay = new Date(datefilter);
            startOfDay.setUTCHours(0, 0, 0, 0);

            const endOfDay = new Date(datefilter);
            endOfDay.setUTCHours(23, 59, 59, 999);

            query.createdAt = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        const pvpData = await Pvp.find(query)
            .populate({ 
                path: "opponent", 
                select: "username"
            })
            .sort({ createdAt: -1 })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit);

        const totalList = await Pvp.countDocuments(query);
        if(pvpData.length === 0){
            return res.status(200).json({
                message: "success",
                data: "No PvP history found.",
                totalPages: 0
            });
        }

        const finalData = pvpData.map(data => ({
            _id: data._id,
            opponent: data.opponent ? data.opponent.username : "Unknown",
            status: data.status,
            owner: data.owner,
            createdAt: data.createdAt,
        }));


        return res.status(200).json({
            message: "success",
            data: finalData,
            totalPages: Math.ceil(totalList / pageOptions.limit)
        });

    } catch (err) {
        console.error(`Error fetching PvP history: ${err}`);
        return res.status(500).json({
            message: "server-error",
            data: "There's a problem with the server. Please try again later."
        });
    }
};

// exports.getpvphistorybyseason = async (req, res) => {
//     try {
//         const { page, limit, datefilter, seasonid } = req.query;

//         const pageOptions = {
//             page: parseInt(page) || 0,
//             limit: parseInt(limit) || 10,
//         };

//         let query = {};

//         if (seasonid) {
//             query.season = seasonid;
//         }

//         if (datefilter) {
//             const startOfDay = new Date(datefilter);
//             startOfDay.setUTCHours(0, 0, 0, 0);

//             const endOfDay = new Date(datefilter);
//             endOfDay.setUTCHours(23, 59, 59, 999);

//             query.createdAt = {
//                 $gte: startOfDay,
//                 $lte: endOfDay
//             };
//         }

//         const pvpData = await Pvp.find(query)
//             .populate({ 
//                 path: "opponent", 
//                 select: "username" 
//             })
//             .populate({ 
//                 path: "season", 
//                 select: "name"
//             })
//             .sort({ createdAt: -1 })
//             .skip(pageOptions.page * pageOptions.limit)
//             .limit(pageOptions.limit);

//         const totalList = await Pvp.countDocuments(query);

//         const finalData = pvpData.map(data => ({
//             _id: data._id,
//             opponent: data.opponent ? data.opponent.username : "Unknown",
//             season: data.season ? data.season.name : "Unknown",
//             status: data.status,
//             owner: data.owner,
//             createdAt: data.createdAt,
//         }));

//         return res.status(200).json({
//             message: "success",
//             data: finalData,
//             totalPages: Math.ceil(totalList / pageOptions.limit)
//         });

//     } catch (err) {
//         console.error(`Error fetching PvP history by season: ${err}`);
//         return res.status(500).json({
//             message: "server-error",
//             data: "There's a problem with the server. Please try again later."
//         });
//     }
// };

exports.getpvphistorybyseason = async (req, res) => {
    try {
        const { page, limit, datefilter, seasonid } = req.query;

        const pageOptions = {
            page: parseInt(page) || 0,
            limit: parseInt(limit) || 10,
        };

        let query = {};

        if (seasonid) {
            query.season = seasonid;
        }

        if (datefilter) {
            const startOfDay = new Date(datefilter);
            startOfDay.setUTCHours(0, 0, 0, 0);

            const endOfDay = new Date(datefilter);
            endOfDay.setUTCHours(23, 59, 59, 999);

            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        const pvpData = await Pvp.find(query)
            .populate({ path: "opponent", model: "Characterdata", select: "username" })
            .populate({ path: "owner", model: "Characterdata", select: "username" })
            .populate({ path: "season", select: "name" })
            .sort({ createdAt: -1 })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit);

        const finalData = pvpData.map(data => {
            const ownerName = data.owner ? data.owner.username : "Unknown";
            const opponentName = data.opponent ? data.opponent.username : "Unknown";
            let player1, player2, winner;

            if (data.status === 1) {
                player1 = ownerName;
                player2 = opponentName;
                winner = `${ownerName} won the match`;
            } else {
                player1 = opponentName;
                player2 = ownerName;
                winner = `${opponentName} won the match`;
            }

            return {
                _id: data._id,
                player1,
                player2,
                status: data.status,
                createdAt: data.createdAt,
                winner
            };
        });

        return res.status(200).json({
            message: "success",
            data: finalData,
            totalPages: Math.ceil(await Pvp.countDocuments(query) / pageOptions.limit),
        });

    } catch (err) {
        console.error(`Error fetching PvP history by season: ${err}`);
        return res.status(500).json({
            message: "server-error",
            data: "There's a problem with the server. Please try again later.",
        });
    }
};

exports.getcharacterpvpstats = async (req, res) => {
    try {
        const { id } = req.user; 
        const {characterid} = req.query

        const pvpstats = await PvpStats.find({ owner: characterid })
            .populate("owner")
            .sort({ mmr: -1 })
            .lean();

        const user = await Rankings.findOne({ owner: characterid }).lean();

        const userrank = await Rankings.countDocuments({
            $or: [
                { mmr: { $gt: user.mmr } },
                {
                    mmr: user.mmr,
                    updatedAt: { $lt: user.updatedAt }
                }
            ]
        });

        const finaldata = {
            mmr: user.mmr,
            win: pvpstats[0].win,
            lost: pvpstats[0].lose,
            totalMatches: pvpstats[0].totalMatches,
            winRate: pvpstats[0].winRate,
            rank: userrank + 1,
            username: pvpstats[0].owner.username
        }
        return res.status(200).json({
            message: "success",
            data: finaldata
        });

    } catch (err) {
        console.error(`Error fetching ranking stats: ${err}`);
        return res.status(500).json({
            message: "server-error",
            data: "There's a problem with the server. Please try again later."
        });
    }
};

exports.pvpmatchresult = async (req, res) => {
    try {
        const { id } = req.user;
        const { opponent, status, characterid } = req.body;

        if (!opponent || status === undefined) {
            return res.status(400).json({ message: "failed", data: "Opponent character ID and match status are required." });
        }

        const activeSeason = await Season.findOne({ isActive: "active" });

        if (!activeSeason) {
            return res.status(400).json({ message: "failed", data: "No active season found." });
        }


        const newMatch = await Pvp.create({
            owner: characterid,
            opponent,
            status,
            season: activeSeason._id
        });

        const newMatch1 = await Pvp.create({
            owner: opponent,
            opponent: characterid,
            status,
            season: activeSeason._id
        });

        let ranking = await PvpStats.findOne({ owner: characterid });
        let enemy = await PvpStats.findOne({ owner: opponent });

        let rankingmmr = await Rankings.findOne({ owner: characterid });
        let enemymmr = await Rankings.findOne({ owner: opponent });

        if (!enemy) {
            enemy = await PvpStats.create({
                owner: opponent,
                mmr: 0,
                win: 0,
                lose: 0,
                totalMatches: 0,
                winRate: 0
            });
        }

        if (!ranking) {
            ranking = await PvpStats.create({
                owner: characterid,
                mmr: 0,
                win: 0,
                lose: 0,
                totalMatches: 0,
                winRate: 0
            });
        }

        if (rankingmmr.mmr < 10) rankingmmr.mmr = 10; // Ensure baseline MMR is at least 10
        if (enemymmr.mmr < 10) enemymmr.mmr = 10; // Ensure baseline MMR is at least 10
        
        const BASE_K_FACTOR = 32;
        const PLACEMENT_K_FACTOR = 64;
        
        // Use higher K-factor for first 10 matches (placement matches)
        const kFactor = (ranking.totalMatches < 10 || enemy.totalMatches < 10) 
            ? PLACEMENT_K_FACTOR 
            : BASE_K_FACTOR;
        
        const mmrGap = rankingmmr.mmr - enemymmr.mmr;
        const expectedScore = 1 / (1 + Math.pow(10, mmrGap / 400));
        const mmrChange = Math.round(kFactor * (1 - expectedScore));
        
        // Ensure minimum MMR change to avoid stagnation
        const minMMRGain = 1; // Ensures at least 1 MMR gain/loss per match
        
        if (status === 1) {
            ranking.win += 1;
            enemy.lose += 1;
        
            rankingmmr.mmr = Math.max(10, rankingmmr.mmr + Math.max(mmrChange, minMMRGain));
            enemymmr.mmr = Math.max(10, enemymmr.mmr - Math.max(mmrChange, minMMRGain));
        
        } else {
            enemy.win += 1;
            ranking.lose += 1;
            console.log("before",enemymmr.mmr)
            console.log("before",rankingmmr.mmr)
        
            enemymmr.mmr = Math.max(10, enemymmr.mmr + Math.max(mmrChange, minMMRGain));
            rankingmmr.mmr = Math.max(10, rankingmmr.mmr - Math.max(mmrChange, minMMRGain));

            console.log("after",enemymmr.mmr)
            console.log("after",rankingmmr.mmr)
        }
        
        enemy.totalMatches = enemy.win + enemy.lose;
        enemy.winRate = enemy.totalMatches > 0 ? (enemy.win / enemy.totalMatches) * 100 : 0;

    

        ranking.totalMatches = ranking.win + ranking.lose;
        ranking.winRate = ranking.totalMatches > 0 ? (ranking.win / ranking.totalMatches) * 100 : 0;

        await rankingmmr.save();
        await enemymmr.save();
        await enemy.save();
        await ranking.save();

        return res.status(200).json({ message: "success" });

    } catch (err) {
        console.error(`Error creating PvP match: ${err}`);
        return res.status(500).json({ message: "server-error", data: "There's a problem with the server. Please try again later." });
    }
};

