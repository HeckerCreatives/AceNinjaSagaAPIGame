const { getMarketItems, buyitem } = require('../controllers/marketplace');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();


router
 .get("/getmarketitems", protectplayer, getMarketItems)
 .post("/buyitem", protectplayer, buyitem)
module.exports = router;