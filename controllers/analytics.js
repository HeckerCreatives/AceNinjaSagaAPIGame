const Analytics = require("../models/Analytics");



exports.getanalyticshistory = async (req, res) => {

    const { page, limit, type, action } = req.query;
    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    let matchCondition = {};
    if (type) {
        matchCondition.type = type;
    }
    if (action) {
        matchCondition.action = action;
    }

    const analytics = await Analytics.find(matchCondition)
        .populate("owner", "username")
        .sort({ createdAt: -1 })
        .skip(pageOptions.page * pageOptions.limit)
        .limit(pageOptions.limit)
        .then(data => data)
        .catch(err => {
            console.log(`Error fetching analytics history: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    const totalCount = await Analytics.countDocuments(matchCondition)
        .then(data => data)
        .catch(err => {
            console.log(`Error counting analytics documents: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    const totalPages = Math.ceil(totalCount / pageOptions.limit);
    const formattedData = analytics.map(item => ({
        id: item._id,
        action: item.action,
        type: item.type,
        description: item.description,
        amount: item.amount,
        owner: item.owner ? item.owner.username : "Unknown",
        createdAt: item.createdAt
    }));

    return res.status(200).json({
        message: "success",
        data: formattedData,
        pagination: {
            totalCount: totalCount,
            totalPages: totalPages,
            currentPage: pageOptions.page + 1,
            limit: pageOptions.limit
        }
    });
}

exports.getcharacteranalyticshistory = async (req, res) => {

    const { page, limit, type, action, characterid } = req.query;
    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    let matchCondition = {
        owner: characterid ? new mongoose.Types.ObjectId(characterid) : null
    };
    if (type) {
        matchCondition.type = type;
    }
    if (action) {
        matchCondition.action = action;
    }

    const analytics = await Analytics.find(matchCondition)
        .populate("owner", "username")
        .sort({ createdAt: -1 })
        .skip(pageOptions.page * pageOptions.limit)
        .limit(pageOptions.limit)
        .then(data => data)
        .catch(err => {
            console.log(`Error fetching analytics history: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    const totalCount = await Analytics.countDocuments(matchCondition)
        .then(data => data)
        .catch(err => {
            console.log(`Error counting analytics documents: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

    const totalPages = Math.ceil(totalCount / pageOptions.limit);
    const formattedData = analytics.map(item => ({
        id: item._id,
        action: item.action,
        type: item.type,
        description: item.description,
        amount: item.amount,
        owner: item.owner ? item.owner.username : "Unknown",
        createdAt: item.createdAt
    }));

    return res.status(200).json({
        message: "success",
        data: formattedData,
        pagination: {
            totalCount: totalCount,
            totalPages: totalPages,
            currentPage: pageOptions.page + 1,
            limit: pageOptions.limit
        }
    });
}