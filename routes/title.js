const router = require("express").Router();
const { getcharactertitles } = require("../controllers/title");
const { protectplayer } = require("../middleware/middleware");


router
 .get("/getcharactertitles", protectplayer, getcharactertitles);

module.exports = router;