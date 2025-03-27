const router = require("express").Router()
const { getnews } = require("../controllers/news")
const { protectplayer } = require("../middleware/middleware")


router

 .get("/getnews", protectplayer, getnews)

module.exports = router