const { getbattlepass, claimbattlepassreward, buypremiumbattlepass } = require('../controllers/battlepass');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getbattlepass", protectplayer, getbattlepass)
 .post("/claimbattlepassreward", protectplayer, claimbattlepassreward)
 .post("/buypremiumbattlepass", protectplayer, buypremiumbattlepass)
module.exports = router;