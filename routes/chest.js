const { openchest, getinventorychests, getchestsinmarket } = require('../controllers/chest');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .post("/openchest", protectplayer, openchest)
 .get("/getinventorychests", protectplayer, getinventorychests)
 .get("/getchestsinmarket", protectplayer, getchestsinmarket)

module.exports = router;