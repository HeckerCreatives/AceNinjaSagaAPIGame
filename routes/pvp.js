const { 
    pvpmatchresult, 
    getpvphistory, 
    getcharacterpvpstats, 
    getpvpleaderboard,
    getpvphistorybyseason 
} = require('../controllers/pvp');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getpvphistory", protectplayer, getpvphistory )
 .get("/getpvphistorybyseason", protectplayer, getpvphistorybyseason )
 .post("/pvpmatchresult", protectplayer, pvpmatchresult )
 .get("/getcharacterpvpstats", protectplayer, getcharacterpvpstats )
 .get("/getpvpleaderboard", protectplayer, getpvpleaderboard )
 



module.exports = router;