const { redeemcode, userredeemedcodeshistory } = require('../controllers/redeemcode');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .post("/redeemcode", protectplayer, redeemcode)
 .get("/userredeemedcodeshistory", protectplayer, userredeemedcodeshistory)

module.exports = router;