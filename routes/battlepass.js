const { getbattlepass, claimbattlepassreward, buypremiumbattlepass, claimbattlepassquest } = require('../controllers/battlepass');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getbattlepass", protectplayer, getbattlepass)
 .post("/claimbattlepassreward", protectplayer, claimbattlepassreward)
 .post("/claimbattlepassquest", protectplayer, claimbattlepassquest)
 .post("/buypremiumbattlepass", protectplayer, buypremiumbattlepass)
module.exports = router;