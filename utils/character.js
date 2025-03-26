const { default: mongoose } = require("mongoose")
const Characterdata = require("../models/Characterdata")


exports.checkcharacter = async (id, characterid) => {

    if (!characterid || !id) {
        return "failed"
    }

    const character = await Characterdata.findOne({
        owner: new mongoose.Types.ObjectId(id),
        _id: characterid
    })


    if (!character) {
        return "failed"
    }

    return "success"

}