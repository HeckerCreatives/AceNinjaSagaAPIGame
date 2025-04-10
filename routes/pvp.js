const { pvpmatchresult, getpvphistory, getcharacterpvpstats } = require('../controllers/pvp');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getpvphistory", protectplayer, getpvphistory )
 .post("/pvpmatchresult", protectplayer, pvpmatchresult )
 .get("/getcharacterpvpstats", protectplayer, getcharacterpvpstats )
 



module.exports = router;