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
            mmr: 0, // Starting MMR
            seasonBestMMR: 0
        }], { session });
        playerRanking = playerRanking[0];
    }

    if (!opponentRanking) {
        opponentRanking = await Rankings.create([{
            owner: opponentId,
            season: seasonId,
            mmr: 0, // Starting MMR
            seasonBestMMR: 0
        }], { session });
        opponentRanking = opponentRanking[0];
    }

    // Get player stats for K-factor calculation
    const [playerStats, opponentStats] = await Promise.all([
        PvpStats.findOne({ owner: playerId }).session(session),
        PvpStats.findOne({ owner: opponentId }).session(session)
    ]);

    // Get rank tiers for MMR scaling calculation
    const rankTiersForScaling = await RankTier.find({})
        .sort({ requiredmmr: -1 }) // Sort descending 
        .session(session);

    // Function to get rank-based MMR scaling
    const getRankScaling = (mmr) => {
        // Find the current rank tier
        const currentRank = rankTiersForScaling.find(tier => mmr >= tier.requiredmmr);
        
        if (!currentRank) return { gainMultiplier: 1.0, lossMultiplier: 1.0, minLoss: 1 };
        
        const rankName = currentRank.name.toLowerCase();
        
        switch (rankName) {
            case 'ace':
                return { gainMultiplier: 0.3, lossMultiplier: 2.0, minLoss: 5 }; // Hardest rank
            case 'shogun':
                return { gainMultiplier: 0.4, lossMultiplier: 1.8, minLoss: 4 }; 
            case 'ronin':
                return { gainMultiplier: 0.5, lossMultiplier: 1.6, minLoss: 3 };
            case 'elder':
                return { gainMultiplier: 0.7, lossMultiplier: 1.4, minLoss: 2 };
            case 'veteran':
                return { gainMultiplier: 0.8, lossMultiplier: 1.2, minLoss: 2 };
            case 'rookie':
            default:
                return { gainMultiplier: 1.0, lossMultiplier: 1.0, minLoss: 1 }; // Normal gains/losses
        }
    };

    const kFactor = 32

    // Calculate expected scores for both players
    const mmrGap = playerRanking.mmr - opponentRanking.mmr;
    const playerExpectedScore = 1 / (1 + Math.pow(10, -mmrGap / 400)); // Player's expected win probability
    const opponentExpectedScore = 1 / (1 + Math.pow(10, mmrGap / 400)); // Opponent's expected win probability
    
    const playerActualScore = matchStatus; // 1 for win, 0 for loss
    const opponentActualScore = 1 - matchStatus; // Opposite of player's result
    
    // Calculate base MMR changes for both players
    const basePlayerMMRChange = Math.round(kFactor * (playerActualScore - playerExpectedScore));
    const baseOpponentMMRChange = Math.round(kFactor * (opponentActualScore - opponentExpectedScore));
    
    // Get rank-based scaling for both players
    const playerScaling = getRankScaling(playerRanking.mmr);
    const opponentScaling = getRankScaling(opponentRanking.mmr);

    // Apply MMR changes with rank-based scaling and upset bonuses
    if (matchStatus === 1) {
        // Player won
        let playerGain = Math.round(Math.max(basePlayerMMRChange, 1) * playerScaling.gainMultiplier);
        let opponentLoss = Math.round(Math.max(Math.abs(baseOpponentMMRChange), opponentScaling.minLoss) * opponentScaling.lossMultiplier);
        
        // Apply upset bonus if lower MMR player wins
        if (playerRanking.mmr < opponentRanking.mmr) {
            const mmrGapBonus = Math.min((opponentRanking.mmr - playerRanking.mmr) / 400, 1.5); // Max 1.5x bonus
            playerGain = Math.round(playerGain * (1 + mmrGapBonus * 0.5)); // Up to 75% bonus for huge upsets
        }
        
        // Ensure minimum values
        playerGain = Math.max(playerGain, 1);
        opponentLoss = Math.max(opponentLoss, opponentScaling.minLoss);
        opponentLoss = Math.min(opponentLoss, 100); // Cap maximum loss at 100
        
        playerRanking.mmr = Math.max(0, playerRanking.mmr + playerGain);
        opponentRanking.mmr = Math.max(0, opponentRanking.mmr - opponentLoss);
    } else {
        // Player lost
        let playerLoss = Math.round(Math.max(Math.abs(basePlayerMMRChange), playerScaling.minLoss) * playerScaling.lossMultiplier);
        let opponentGain = Math.round(Math.max(baseOpponentMMRChange, 1) * opponentScaling.gainMultiplier);
        
        // Apply upset bonus if lower MMR player (opponent) wins
        if (opponentRanking.mmr < playerRanking.mmr) {
            const mmrGapBonus = Math.min((playerRanking.mmr - opponentRanking.mmr) / 400, 1.5); // Max 1.5x bonus
            opponentGain = Math.round(opponentGain * (1 + mmrGapBonus * 0.5)); // Up to 75% bonus for huge upsets
        }
        
        // Ensure minimum values and caps
        playerLoss = Math.max(playerLoss, playerScaling.minLoss);
        playerLoss = Math.min(playerLoss, 100); // Cap maximum loss at 100
        opponentGain = Math.max(opponentGain, 1);
        
        playerRanking.mmr = Math.max(0, playerRanking.mmr - playerLoss);
        opponentRanking.mmr = Math.max(0, opponentRanking.mmr + opponentGain);
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

    // Update current ranks based on MMR (always find the highest eligible rank)
    playerRanking.rank = null;
    opponentRanking.rank = null;
    for (const tier of rankTiers) {
        if (playerRanking.mmr >= tier.requiredmmr && !playerRanking.rank) {
            playerRanking.rank = tier._id;
        }
        if (opponentRanking.mmr >= tier.requiredmmr && !opponentRanking.rank) {
            opponentRanking.rank = tier._id;
        }
    }

    // Update season best ranks for both players
    for (const tier of rankTiers) {
        if (playerRanking.seasonBestMMR >= tier.requiredmmr && !playerRanking.seasonBestRank) {
            playerRanking.seasonBestRank = tier._id;
        }
        if (opponentRanking.seasonBestMMR >= tier.requiredmmr && !opponentRanking.seasonBestRank) {
            opponentRanking.seasonBestRank = tier._id;
        }
    }

    // Save rankings
    await Promise.all([
        playerRanking.save({ session }),
        opponentRanking.save({ session })
    ]);

    // Return the actual MMR change applied to the player
    return Math.abs(basePlayerMMRChange);
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

        const { 
            pvpstats,
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

        // Validate pvpstats array
        if (!pvpstats || !Array.isArray(pvpstats) || pvpstats.length !== 2) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "pvpstats must be an array with exactly 2 players."
            });
        }

        // Extract player data
        const [player1, player2] = pvpstats;
        
        // Validate player data
        for (const player of pvpstats) {
            if (!player.characterid || player.status === undefined || 
                player.totaldamage === undefined || player.selfheal === undefined || 
                player.skillsused === undefined) {
                await session.abortTransaction();
                return res.status(400).json({
                    message: "failed",
                    data: "Each player must have characterid, status, totaldamage, selfheal, and skillsused."
                });
            }
        }

        // Validate that players are different
        if (player1.characterid === player2.characterid) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "Players cannot have the same character ID."
            });
        }

        // Validate that one player won and one lost
        if (player1.status === player2.status) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "One player must win (status: 1) and one must lose (status: 0)."
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
        const [playerChar1, playerChar2] = await Promise.all([
            Characterdata.findById(player1.characterid).session(session),
            Characterdata.findById(player2.characterid).session(session)
        ]);

        if (!playerChar1 || !playerChar2) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "failed",
                data: "One or both characters not found."
            });
        }

        // Create match records for both players
        await Pvp.create([{
            owner: player1.characterid,
            opponent: player2.characterid,
            status: player1.status,
            type,
            season: activeSeason._id
        }], { session });
        
        await Pvp.create([{
            owner: player2.characterid,
            opponent: player1.characterid,
            status: player2.status,
            type,
            season: activeSeason._id
        }], { session });

        // Update PvP stats for both players
        await updatePlayerStats(player1.characterid, player1.status, type, session);
        await updatePlayerStats(player2.characterid, player2.status, type, session);

        // Get current MMR before updates for both players
        let player1MMRData = { previousMMR: 0, newMMR: 0, mmrChange: 0 };
        let player2MMRData = { previousMMR: 0, newMMR: 0, mmrChange: 0 };

        if (type === "ranked") {
            // Get current rankings to capture previous MMR
            const [player1Ranking, player2Ranking] = await Promise.all([
                Rankings.findOne({ owner: player1.characterid, season: activeSeason._id }).session(session),
                Rankings.findOne({ owner: player2.characterid, season: activeSeason._id }).session(session)
            ]);

            player1MMRData.previousMMR = player1Ranking?.mmr || 0;
            player2MMRData.previousMMR = player2Ranking?.mmr || 0;

            // Update MMR and rankings for ranked matches
            const mmrChangeAmount = await updateMMRAndRankings(player1.characterid, player2.characterid, player1.status, activeSeason._id, session);

            // Get updated rankings to capture new MMR
            const [updatedPlayer1Ranking, updatedPlayer2Ranking] = await Promise.all([
                Rankings.findOne({ owner: player1.characterid, season: activeSeason._id }).session(session),
                Rankings.findOne({ owner: player2.characterid, season: activeSeason._id }).session(session)
            ]);

            player1MMRData.newMMR = updatedPlayer1Ranking?.mmr || player1MMRData.previousMMR;
            player2MMRData.newMMR = updatedPlayer2Ranking?.mmr || player2MMRData.previousMMR;

            // Calculate actual MMR changes
            player1MMRData.mmrChange = player1MMRData.newMMR - player1MMRData.previousMMR;
            player2MMRData.mmrChange = player2MMRData.newMMR - player2MMRData.previousMMR;
        }

        // Update quest/battlepass progress for both players
        for (const player of pvpstats) {
            const enemydefeated = player.status === 1 ? 1 : 0;
            const multipleProgress = await multipleprogressutil(player.characterid, [
                { requirementtype: 'totaldamage', amount: player.totaldamage },
                { requirementtype: 'skillsused', amount: player.skillsused },
                { requirementtype: 'selfheal', amount: player.selfheal },
                { requirementtype: 'enemiesdefeated', amount: enemydefeated },
                { requirementtype: 'pvpwins', amount: player.status === 1 ? 1 : 0 },
                { requirementtype: 'pvpparticipated', amount: 1 }
            ]);

            if (multipleProgress.message !== "success") {
                await session.abortTransaction();
                return res.status(400).json({ 
                    message: "failed", 
                    data: `Failed to update multiple progress for character ${player.characterid}.`
                });
            }
        }

        await session.commitTransaction();

        // Determine winner
        const winner = player1.status === 1 ? player1.characterid : player2.characterid;

        return res.status(200).json({
            message: "success",
            data: {
                winner: winner,
                matchType: type,
                players: {
                    [player1.characterid]: {
                        result: player1.status === 1 ? "win" : "loss",
                        // previousMMR: player1MMRData.previousMMR,
                        // newMMR: player1MMRData.newMMR,
                        mmrChange: player1MMRData.mmrChange,
                        stats: {
                            totaldamage: player1.totaldamage,
                            selfheal: player1.selfheal,
                            skillsused: player1.skillsused
                        }
                    },
                    [player2.characterid]: {
                        result: player2.status === 1 ? "win" : "loss",
                        // previousMMR: player2MMRData.previousMMR,
                        // newMMR: player2MMRData.newMMR,
                        mmrChange: player2MMRData.mmrChange,
                        stats: {
                            totaldamage: player2.totaldamage,
                            selfheal: player2.selfheal,
                            skillsused: player2.skillsused
                        }
                    }
                }
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