const Friends = require("../models/Friends");
const mongoose = require("mongoose");

exports.checkfriendlistcount = async (characterid) => {
    if (!characterid) return 0;

    // try to cast to ObjectId when valid
    let id = characterid;
    if (typeof characterid === "string" && mongoose.Types.ObjectId.isValid(characterid)) {
        id = mongoose.Types.ObjectId(characterid);
    }

    try {
        const totalFriends = await Friends.countDocuments({
            $and: [
                { status: "accepted" },
                { $or: [{ character: id }, { friend: id }] }
            ]
        });
        return totalFriends || 0;
    } catch (err) {
        console.error(`Error counting friend list for ${characterid}:`, err);
        return 0;
    }
}