const router = require('express').Router();
const { getActiveVersion } = require('../controllers/version');
const { protectplayer } = require('../middleware/middleware');

router
    .get('/getactiveversion', getActiveVersion);

module.exports = router;