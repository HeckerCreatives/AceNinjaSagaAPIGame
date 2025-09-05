const { default: mongoose } = require("mongoose")
const Pvp = require("../models/Pvp")
const Season = require("../models/Season")
const { Rankings, RankingHistory } = require("../models/Ranking")
const PvpStats = require("../models/PvpStats")
const Characterdata = require("../models/Characterdata")
const { RemainingTime, getSeasonRemainingTimeInMilliseconds } = require("../utils/datetimetools")
const RankTier = require("../models/RankTier")
const { Battlepass } = require("../models/Battlepass")
const { checkmaintenance } = require("../utils/maintenance")
const { progressutil, multipleprogressutil } = require("../utils/progress")

// Helper function to update player stats
async function updatePlayerStats(playerId, matchStatus, matchType, session) {
    let stats = await PvpStats.findOne({ owner: playerId }).session(session);
    
    if (!stats) {
        stats = await PvpStats.create([{
            owner: playerId,
            win: 0,
            lose: 0,
            rankedWin: 0,
            rankedLose: 0,
            normalWin: 0,
            normalLose: 0
        }], { session });
        stats = stats[0];
    }

    // Update overall stats
    if (matchStatus === 1) {
        stats.win += 1;
    } else {
        stats.lose += 1;
    }

    // Update type-specific stats
    if (matchType === "ranked") {
        if (matchStatus === 1) {
            stats.rankedWin += 1;
        } else {
            stats.rankedLose += 1;
        }
    } else {
        if (matchStatus === 1) {
            stats.normalWin += 1;
        } else {
            stats.normalLose += 1;
        }
    }

    await stats.save({ session });
    return stats;
}

// Helper function to update MMR and rankings
async function updateMMRAndRankings(playerId, opponentId, matchStatus, seasonId, session) {
    // Get or create rankings for both players
    let [playerRanking, opponentRanking] = await Promise.all([
        Rankings.findOne({ owner: playerId, season: seasonId }).session(session),
        Rankings.findOne({ owner: opponentId, season: seasonId }).session(session)
    ]);

    if (!playerRanking) {
        playerRanking = await Rankings.create([{
            owner: playerId,
            season: seasonId,
            mmr: 1000, // Starting MMR
            seasonBestMMR: 1000
        }], { session });
        playerRanking = playerRanking[0];
    }

    if (!opponentRanking) {
        opponentRanking = await Rankings.create([{
            owner: opponentId,
            season: seasonId,
            mmr: 1000, // Starting MMR
            seasonBestMMR: 1000
        }], { session });
        opponentRanking = opponentRanking[0];
    }

    // Get player stats for K-factor calculation
    const [playerStats, opponentStats] = await Promise.all([
        PvpStats.findOne({ owner: playerId }).session(session),
        PvpStats.findOne({ owner: opponentId }).session(session)
    ]);

    // Calculate MMR changes using ELO system
    const BASE_K_FACTOR = 32;
    const PLACEMENT_K_FACTOR = 64;
    const kFactor = (
        (playerStats?.rankedTotalMatches || 0) < 10 || 
        (opponentStats?.rankedTotalMatches || 0) < 10
    ) ? PLACEMENT_K_FACTOR : BASE_K_FACTOR;

    const mmrGap = playerRanking.mmr - opponentRanking.mmr;
    const expectedScore = 1 / (1 + Math.pow(10, mmrGap / 400));
    const actualScore = matchStatus; // 1 for win, 0 for loss
    const mmrChange = Math.round(kFactor * (actualScore - expectedScore));
    const minMMRChange = 1;

    // Apply MMR changes
    if (matchStatus === 1) {
        // Player won
        playerRanking.mmr = Math.max(0, playerRanking.mmr + Math.max(mmrChange, minMMRChange));
        opponentRanking.mmr = Math.max(0, opponentRanking.mmr - Math.max(mmrChange, minMMRChange));
    } else {
        // Player lost
        playerRanking.mmr = Math.max(0, playerRanking.mmr - Math.max(Math.abs(mmrChange), minMMRChange));
        opponentRanking.mmr = Math.max(0, opponentRanking.mmr + Math.max(Math.abs(mmrChange), minMMRChange));
    }

    // Update season best MMR
    if (playerRanking.mmr > playerRanking.seasonBestMMR) {
        playerRanking.seasonBestMMR = playerRanking.mmr;
    }
    if (opponentRanking.mmr > opponentRanking.seasonBestMMR) {
        opponentRanking.seasonBestMMR = opponentRanking.mmr;
    }

    // Get rank tiers and update current ranks
    const rankTiers = await RankTier.find({})
        .sort({ requiredmmr: -1 }) // Sort descending to find highest eligible rank
        .session(session);

    // Update current ranks based on MMR
    for (const tier of rankTiers) {
        if (playerRanking.mmr >= tier.requiredmmr && !playerRanking.rank) {
            playerRanking.rank = tier._id;
        }
        if (opponentRanking.mmr >= tier.requiredmmr && !opponentRanking.rank) {
            opponentRanking.rank = tier._id;
        }
    }

    // Update season best ranks
    for (const tier of rankTiers) {
        if (playerRanking.seasonBestMMR >= tier.requiredmmr && 
            (!playerRanking.seasonBestRank || playerRanking.seasonBestMMR > playerRanking.mmr)) {
            playerRanking.seasonBestRank = tier._id;
        }
    }

    // Save rankings
    await Promise.all([
        playerRanking.save({ session }),
        opponentRanking.save({ session })
    ]);

    return Math.abs(mmrChange);
}

exports.getpvpleaderboard = async (req, res) => {
    try {
        const { page = 0, limit = 50, seasonid } = req.query;
        
        const pageOptions = {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100) // Max 100 results per page
        };

        // Get current or specified season
        let season;
        if (seasonid) {
            season = await Season.findById(seasonid).lean();
        } else {
            season = await Season.findOne({ isActive: "active" }).lean();
        }

        if (!season) {
            return res.status(400).json({
                message: "failed",
                data: "Season not found."
            });
        }

        // Get leaderboard data
        const leaderboard = await Rankings.find({ season: season._id })
            .populate("owner", "username")
            .populate("rank", "name icon")
            .sort({ mmr: -1, updatedAt: 1 }) // Higher MMR first, earlier update time as tiebreaker
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit)
            .lean();

        const totalPlayers = await Rankings.countDocuments({ season: season._id });

        const formattedLeaderboard = leaderboard.map((entry, index) => ({
            position: (pageOptions.page * pageOptions.limit) + index + 1,
            character: {
                id: entry.owner._id,
                username: entry.owner.username
            },
            mmr: entry.mmr,
            seasonBestMMR: entry.seasonBestMMR,
            rank: entry.rank,
            lastUpdated: entry.updatedAt
        }));

        return res.status(200).json({
            message: "success",
            data: {
                leaderboard: formattedLeaderboard,
                season: {
                    id: season._id,
                    name: season.name,
                    isActive: season.isActive === "active"
                },
                pagination: {
                    currentPage: pageOptions.page,
                    totalPages: Math.ceil(totalPlayers / pageOptions.limit),
                    totalPlayers
                }
            }
        });

    } catch (err) {
        console.error(`Error fetching PvP leaderboard: ${err}`);
        return res.status(500).json({
            message: "server-error",
            data: "There's a problem with the server. Please try again later."
        });
    }
};

exports.getpvphistory = async (req, res) => {
    try {
        const { id } = req.user;
        const { page, limit, characterid, datefilter, type } = req.query;

        const pageOptions = {
            page: parseInt(page) || 0,
            limit: parseInt(limit) || 10,
        };

        const maintenance = await checkmaintenance("pvp")

        if (maintenance === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                    message: "failed",
                    data: "The PvP is currently under maintenance. Please try again later."
                });
        }

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

        if (type) {
            query.type = type;
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
            type: data.type,
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

        const maintenance = await checkmaintenance("pvp")

        if (maintenance === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                    message: "failed",
                    data: "The PvP is currently under maintenance. Please try again later."
                });
        }

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
        const { characterid } = req.query;

        if (!characterid) {
            return res.status(400).json({
                message: "failed",
                data: "Character ID is required."
            });
        }

        // Get current season
        const activeSeason = await Season.findOne({ isActive: "active" }).lean();
        if (!activeSeason) {
            return res.status(400).json({
                message: "failed",
                data: "No active season found."
            });
        }

        // Get PvP stats
        const pvpStats = await PvpStats.findOne({ owner: characterid }).lean();
        if (!pvpStats) {
            return res.status(404).json({
                message: "failed",
                data: "No PvP stats found for this character."
            });
        }

        // Get current ranking and season best
        const currentRanking = await Rankings.findOne({ 
            owner: characterid, 
            season: activeSeason._id 
        })
        .populate("rank", "name icon")
        .populate("seasonBestRank", "name icon")
        .lean();

        // Get all-time best from current rankings and ranking history
        const [currentBest, historyBest] = await Promise.all([
            Rankings.aggregate([
                { $match: { owner: new mongoose.Types.ObjectId(characterid) } },
                { $group: { _id: null, maxMMR: { $max: "$mmr" }, maxSeasonBestMMR: { $max: "$seasonBestMMR" } } }
            ]),
            RankingHistory.aggregate([
                { $match: { owner: new mongoose.Types.ObjectId(characterid) } },
                { $group: { _id: null, maxMMR: { $max: "$mmr" } } }
            ])
        ]);

    // Get all rank tiers for MMR to rank conversion (include requiredmmr for matching)
    const rankTiersRaw = await RankTier.find({}).sort({ requiredmmr: -1 }).select("_id name icon requiredmmr").lean();
    // Add `id` field for convenience while keeping `_id` available
    const rankTiers = rankTiersRaw.map(t => ({ ...t, id: String(t._id) }));

        // Function to get rank tier for MMR
        const getRankForMMR = (mmr) => {
            return rankTiers.find(tier => mmr >= tier.requiredmmr) || null;
        };

        // Calculate true all-time best MMR from both current and history
        const currentBestMMR = currentBest.length > 0 ? Math.max(currentBest[0].maxMMR || 0, currentBest[0].maxSeasonBestMMR || 0) : 0;
        const historyBestMMR = historyBest.length > 0 ? historyBest[0].maxMMR || 0 : 0;
        const allTimeBestMMR = Math.max(currentBestMMR, historyBestMMR);
    let allTimeBestRank = getRankForMMR(allTimeBestMMR);

    // Map tier to minimal shape { id, name, icon }
    const mapTier = (t) => t ? { id: t.id || String(t._id), name: t.name, icon: t.icon } : null;
    allTimeBestRank = mapTier(allTimeBestRank);

        // Check if current season best is better than all previous season bests (including history)
        const [allSeasonBests, historySeasonBests] = await Promise.all([
            Rankings.find({ 
                owner: characterid,
                season: { $ne: activeSeason._id } 
            }, "seasonBestMMR").lean(),
            RankingHistory.find({ 
                owner: characterid 
            }, "mmr").lean()
        ]);
        
        const previousBestMMR = Math.max(
            ...allSeasonBests.map(r => r.seasonBestMMR || 0),
            ...historySeasonBests.map(r => r.mmr || 0),
            0
        );

        // Get current rank position
        const rankPosition = await Rankings.countDocuments({
            season: activeSeason._id,
            $or: [
                { mmr: { $gt: currentRanking?.mmr || 0 } },
                {
                    mmr: currentRanking?.mmr || 0,
                    updatedAt: { $lt: currentRanking?.updatedAt || new Date() }
                }
            ]
        });

        // Get character info
        const character = await Characterdata.findById(characterid, "username").lean();

        const finalData = {
            // Current season stats
            currentSeason: {
                mmr: currentRanking?.mmr || 0,
                rank: currentRanking?.rank ? { id: String(currentRanking.rank._id), name: currentRanking.rank.name, icon: currentRanking.rank.icon } : null,
                rankPosition: rankPosition + 1
            },
            // Season best
            seasonBest: {
                mmr: currentRanking?.seasonBestMMR || 0,
                rank: currentRanking?.seasonBestRank ? { id: String(currentRanking.seasonBestRank._id), name: currentRanking.seasonBestRank.name, icon: currentRanking.seasonBestRank.icon } : null,
            },
            // All-time best
            allTimeBest: {
                mmr: allTimeBestMMR,
                rank: allTimeBestRank
            },
            // Match statistics
            totalMatches: {
                wins: pvpStats.win || 0,
                losses: pvpStats.lose || 0,
                total: pvpStats.totalMatches || 0,
                winRate: Math.round((pvpStats.winRate || 0) * 100) / 100
            },
            rankedMatches: {
                wins: pvpStats.rankedWin || 0,
                losses: pvpStats.rankedLose || 0,
                total: pvpStats.rankedTotalMatches || 0,
                winRate: Math.round((pvpStats.rankedWinRate || 0) * 100) / 100
            },
            normalMatches: {
                wins: pvpStats.normalWin || 0,
                losses: pvpStats.normalLose || 0,
                total: pvpStats.normalTotalMatches || 0,
                winRate: Math.round((pvpStats.normalWinRate || 0) * 100) / 100
            },
            // Character info
            character: {
                username: character?.username || "Unknown"
            }
        };

        return res.status(200).json({
            message: "success",
            data: finalData
        });

    } catch (err) {
        console.error(`Error fetching PvP stats: ${err}`);
        return res.status(500).json({
            message: "server-error",
            data: "There's a problem with the server. Please try again later."
        });
    }
};

exports.pvpmatchresult = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const { id } = req.user;
        const { 
            opponent, 
            status, 
            characterid, 
            totaldamage, 
            selfheal, 
            skillsused, 
            type = "normal" // Default to normal match
        } = req.body;

        const maintenance = await checkmaintenance("pvp");

        if (maintenance === "failed") {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "The PvP is currently under maintenance. Please try again later."
            });
        }

        if (opponent === characterid) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "You cannot play against yourself."
            });
        }
                
        if (!opponent || status === undefined) {
            await session.abortTransaction();
            return res.status(400).json({ 
                message: "failed", 
                data: "Opponent character ID and match status are required." 
            });
        }

        if (!["ranked", "normal"].includes(type)) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "Match type must be either 'ranked' or 'normal'."
            });
        }

        const activeSeason = await Season.findOne({ isActive: "active" }).session(session);
        if (!activeSeason) {
            await session.abortTransaction();
            return res.status(400).json({ 
                message: "failed", 
                data: "No active season found." 
            });
        }

        // Verify both characters exist
        const [playerChar, opponentChar] = await Promise.all([
            Characterdata.findById(characterid).session(session),
            Characterdata.findById(opponent).session(session)
        ]);

        if (!playerChar || !opponentChar) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "One or both characters not found."
            });
        }

        // Create match records
        await Pvp.create([{
            owner: characterid,
            opponent,
            status,
            type,
            season: activeSeason._id
        }], { session });
        
        await Pvp.create([{
            owner: opponent,
            opponent: characterid,
            status: status === 1 ? 0 : 1,
            type,
            season: activeSeason._id
        }], { session });

        // Update PvP stats for both players
        await updatePlayerStats(characterid, status, type, session);
        await updatePlayerStats(opponent, status === 1 ? 0 : 1, type, session);

        // Update MMR and rankings only for ranked matches
        let mmrChange = 0;
        if (type === "ranked") {
            mmrChange = await updateMMRAndRankings(characterid, opponent, status, activeSeason._id, session);
        }

        // Update quest/battlepass progress
        const enemydefeated = status === 1 ? 1 : 0;
        const multipleProgress = await multipleprogressutil(characterid, [
            { requirementtype: 'totaldamage', amount: totaldamage },
            { requirementtype: 'skillsused', amount: skillsused },
            { requirementtype: 'selfheal', amount: selfheal },
            { requirementtype: 'enemiesdefeated', amount: enemydefeated },
            { requirementtype: 'pvpwins', amount: status === 1 ? 1 : 0 },
            { requirementtype: 'pvpparticipated', amount: 1 }
        ]);

        if (multipleProgress.message !== "success") {
            await session.abortTransaction();
            return res.status(400).json({ 
                message: "failed", 
                data: "Failed to update multiple progress."
            });
        }

        await session.commitTransaction();

        return res.status(200).json({
            message: "success",
            data: {
                winner: status === 1 ? characterid : opponent,
                mmrChange: type === "ranked" ? mmrChange : 0,
                matchType: type
            }
        });

    } catch (err) {
        await session.abortTransaction();
        console.error(`Error recording PvP match result: ${err}`);
        return res.status(500).json({
            message: "server-error",
            data: "There's a problem with the server. Please try again later."
        });
    } finally {
        session.endSession();
    }
};