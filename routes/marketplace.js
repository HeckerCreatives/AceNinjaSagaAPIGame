const { getMarketItems, buyitem, sellitem, equipitem, unequipitem, listequippeditems } = require('../controllers/marketplace');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();


router
 .get("/getmarketitems", protectplayer, getMarketItems)
 .post("/buyitem", protectplayer, buyitem)
 .post("/sellitem", protectplayer, sellitem)
 .post("/equipitem", protectplayer, equipitem)
 .post("/unequipitem", protectplayer, unequipitem)
 .get("/listequippeditems", protectplayer, listequippeditems)

module.exports = router;