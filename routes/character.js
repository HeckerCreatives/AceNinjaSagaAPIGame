const { createcharacter, getplayerdata, userplayerdata, getinventory, getxplevel, getWallet, getplayercharacters, getcharactertitles, addxp, updateplayerprofile, updateplayertitle, getcharacterstats, equipunequiptitle, equipunequipbadge, getcharacterchapters, challengechapter, challengechapterhistory, getnotification, deletecharacter, unlockcharacterslot } = require("../controllers/character")
const { protectplayer } = require("../middleware/middleware")

const router = require("express").Router()

router
.post("/createcharacter", protectplayer, createcharacter)
.get("/getplayerdata", getplayerdata)
.get("/getplayercharacters", protectplayer, getplayercharacters)
.get("/getinventorydata", protectplayer, getinventory)
.get("/getxplevel", protectplayer, getxplevel)
.get("/getwallet", protectplayer, getWallet)
.get("/getcharactertitles", protectplayer, getcharactertitles)
.get("/getcharacterstats", protectplayer, getcharacterstats)
.get("/getcharacterchapters", protectplayer, getcharacterchapters)
.get("/challengechapterhistory", protectplayer, challengechapterhistory)
.get("/getnotification", protectplayer, getnotification)

.post("/addxp", protectplayer, addxp)
.post("/updateplayerprofile", protectplayer, updateplayerprofile)
.post("/updateplayertitle", protectplayer, updateplayertitle)

.post("/equipunequiptitle", protectplayer, equipunequiptitle)
.post("/equipunequipbadge", protectplayer, equipunequipbadge)
.post("/challengechapter", protectplayer, challengechapter)

.post("/deletecharacter", protectplayer, deletecharacter)
// Unlock additional character slot (increments by 1, up to max 4)
.post("/unlockcharacterslot", protectplayer, unlockcharacterslot)


module.exports = router