const { createcharacter, getplayerdata, userplayerdata, getinventory, getxplevel, getWallet, getplayercharacters, getcharactertitles, addxp, updateplayerprofile, updateplayertitle, getcharacterstats, equipunequiptitle, equipunequipbadge } = require("../controllers/character")
const { protectplayer } = require("../middleware/middleware")

const router = require("express").Router()

router
.post("/createcharacter", protectplayer, createcharacter)
.get("/getplayerdata", getplayerdata)
.get("/getplayercharacters", protectplayer, getplayercharacters)
.get("/getinventorydata", getinventory)
.get("/getxplevel", getxplevel)
.get("/getwallet", getWallet)
.get("/getcharactertitles", protectplayer, getcharactertitles)
.get("/getcharacterstats", protectplayer, getcharacterstats)

.post("/addxp", protectplayer, addxp)
.post("/updateplayerprofile", protectplayer, updateplayerprofile)
.post("/updateplayertitle", protectplayer, updateplayertitle)

.post("/equipunequiptitle", protectplayer, equipunequiptitle)
.post("/equipunequipbadge", protectplayer, equipunequipbadge)



module.exports = router