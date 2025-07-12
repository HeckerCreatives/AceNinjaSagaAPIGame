const router = require("express").Router();

const { getRankRewards, editrankrewards } = require("../controllers/rankreward");
const { protectplayer, protectsuperadmin } = require("../middleware/middleware");


router
 .get("/getrankrewards", protectplayer, getRankRewards)

module.exports = router;