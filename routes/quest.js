const { getdailyquest, claimdailyquest } = require('../controllers/quest');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getdailyquest", protectplayer, getdailyquest)
 .post("/claimdailyquest", protectplayer, claimdailyquest)

module.exports = router;