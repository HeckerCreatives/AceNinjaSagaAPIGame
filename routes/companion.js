const { companionlist, getcharactercompanions, buycompanion, equipunequipcompanion, unlockcompanion } = require("../controllers/companion")
const { protectplayer } = require("../middleware/middleware")

const router = require("express").Router()

router
 .get("/getcompanionlist", protectplayer, companionlist)
 .get("/getcharactercompanions", protectplayer, getcharactercompanions)
 .post("/buycompanion", protectplayer, buycompanion)
 .post("/equipunequipcompanion", protectplayer, equipunequipcompanion)
 .post("/unlockcompanion", protectplayer, unlockcompanion)
module.exports = router