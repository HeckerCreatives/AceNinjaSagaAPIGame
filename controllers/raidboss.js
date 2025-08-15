const { default: mongoose } = require("mongoose");
const Raidboss = require("../models/Raidboss")
const RaidbossFight = require("../models/Raidbossfight")

exports.getraidboss = async (req, res) => {
    const { id } = req.user;

    const {characterid} = req.query

    try {
        const bossdatas = await Raidboss.find({})
            .populate('itemrewards') // Fetch full item docs
            .populate('skillrewards') // Fetch full skill docs
            .lean(); // Return plain objects instead of Mongoose docs for performance

        const bossfightdatas = await RaidbossFight.findOne({owner: new mongoose.Types.ObjectId(characterid)})
        .then(data => data)
        .catch(err => {
            console.error(`Error fetching boss fight data: ${err}`);
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." });
        });

        const data = {
            boss: {},
            timeremaining: 0,
            status: bossfightdatas.status
        };

        bossdatas.forEach(tempdata => {
            const { bossname, rewards, itemrewards, skillrewards, status } = tempdata;

            data.boss[bossname] = {
                rewards,        // already stored as Map<key, number>
                itemrewards,    // now full item objects
                skillrewards,   // now full skill objects
                status
            };
        });
        
        const now = new Date();
        const phTime = new Date(now.getTime());
        
        // Calculate time until next midnight (00:00) in UTC+8
        const midnight = new Date(phTime);
        midnight.setDate(midnight.getDate() + 1);
        midnight.setHours(0, 0, 0, 0);
        
        const timeUntilMidnight = midnight - phTime;
        const minutesRemaining = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));

        data.timeremaining = minutesRemaining

        return res.json({ message: "success", data });
    } catch (err) {
        console.error(`Error fetching boss datas: ${err}`);
        return res.status(400).json({
            message: "bad-request",
            data: "There's a problem with the server. Please try again later."
        });
    }
};
