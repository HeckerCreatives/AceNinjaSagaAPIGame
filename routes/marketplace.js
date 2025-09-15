const { getMarketItems, buyitem, buychest, sellitem, equipitem, unequipitem, listequippeditems, claimfreebie } = require('../controllers/marketplace');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();


router
 .get("/getmarketitems", protectplayer, getMarketItems)
 .post("/buyitem", protectplayer, buyitem)
 .post("/buychest", protectplayer, buychest)
 .post("/sellitem", protectplayer, sellitem)
 .post("/equipitem", protectplayer, equipitem)
 .post("/unequipitem", protectplayer, unequipitem)
 .post("/claimfreebie", protectplayer, claimfreebie)
 .get("/listequippeditems", protectplayer, listequippeditems)

module.exports = router;