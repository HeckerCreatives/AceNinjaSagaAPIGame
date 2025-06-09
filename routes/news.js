const router = require("express").Router()
const { getnews, readnews } = require("../controllers/news")
const { protectplayer } = require("../middleware/middleware")


router

 .get("/getnews", protectplayer, getnews)
 .post("/readnews", protectplayer, readnews)

module.exports = router