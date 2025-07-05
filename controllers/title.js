const Charactertitle = require("../models/Charactertitles");
const { checkcharacter } = require("../utils/character");



exports.getcharactertitles = async (req, res) => {

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

    const charactertitle = await Charactertitle.find({ owner: characterid })
        .populate("title")
        .sort({ createdAt: -1 })
        .then(data =>  data)
        .catch(err => {
            console.error("Error fetching character titles:", err);
            return res.status(500).json({
                message: "Internal Server Error", 
                data: "An error occurred while fetching character titles."
            });
        })

    if (!charactertitle || charactertitle.length === 0) {
        return res.status(404).json({
            message: "Not Found", 
            data: "No titles found for this character."
        });
    }

    const formattedResponse = charactertitle.reduce((acc, title) => {
        acc[title._id] = {
            title: title.name,
            index: title.index,
            createdAt: title.createdAt
        };
        return acc;
    }, {});

    return res.status(200).json({
        message: "Success", 
        data: formattedResponse
    });
    
}