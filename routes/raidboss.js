const { getraidboss } = require('../controllers/raidboss');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getraidboss", protectplayer, getraidboss)

module.exports = router;