const router = require("express").Router();
const { getcharacterbadges } = require("../controllers/badge");
const { protectplayer } = require("../middleware/middleware");


router
 .get("/getcharacterbadges", protectplayer, getcharacterbadges);

module.exports = router;