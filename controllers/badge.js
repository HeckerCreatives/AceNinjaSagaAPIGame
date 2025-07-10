const Characterbadge = require("../models/Characterbadges");
const { checkcharacter } = require("../utils/character");



exports.getcharacterbadges = async (req, res) => {

    const { id } = req.user
    const { characterid } = req.query

    if (!id || !characterid) {
        return res.status(400).json({
            message: "Bad Request", 
            data: "Missing user ID or character ID in the request."
        });
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(401).json({
            message: "Unauthorized", 
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const characterbadges = await Characterbadge.find({ owner: characterid })
        .populate("badge")
        .sort({ createdAt: -1 })
        .then(data =>  data)
        .catch(err => {
            console.error("Error fetching character badges:", err);
            return res.status(500).json({
                message: "Internal Server Error", 
                data: "An error occurred while fetching character badges."
            });
        })


    if (!characterbadges || characterbadges.length === 0) {
        return res.status(404).json({
            message: "Not Found", 
            data: "No badges found for this character."
        });
    }

    const formattedResponse = characterbadges.reduce((acc, badge) => {
        acc[badge._id] = {
            title: badge.name,
            index: badge.index,
            createdAt: badge.createdAt
        };
        return acc;
    }, {});

    return res.status(200).json({
        message: "Success", 
        data: formattedResponse
    });
    
}