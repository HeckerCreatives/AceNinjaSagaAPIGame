const { createcharacter, getplayerdata, userplayerdata, getinventory, getranking, getxplevel, getWallet, getplayercharacters } = require("../controllers/character")
const { protectplayer } = require("../middleware/middleware")

const router = require("express").Router()

router
.post("/createcharacter", protectplayer, createcharacter)
.get("/getplayerdata", getplayerdata)
.get("/getplayercharacters", protectplayer, getplayercharacters)
.get("/getinventorydata", getinventory)
.get("/getranking", getranking)
.get("/getxplevel", getxplevel)
.get("/getwallet", getWallet)

module.exports = router