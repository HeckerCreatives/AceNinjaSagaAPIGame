const { getraidboss, awardRaidbossRewards } = require('../controllers/raidboss');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getraidboss", protectplayer, getraidboss)
 .post("/awardRaidbossRewards", protectplayer, awardRaidbossRewards);
module.exports = router;