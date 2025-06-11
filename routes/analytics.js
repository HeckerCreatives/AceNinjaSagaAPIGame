const { getanalyticshistory, getcharacteranalyticshistory } = require('../controllers/analytics');
const { protectsuperadmin } = require('../middleware/middleware');

const router = require('express').Router();

router
    .get("/getanalyticshistory", protectsuperadmin, getanalyticshistory)
    .get("/getcharacteranalyticshistory", protectsuperadmin, getcharacteranalyticshistory)

module.exports = router;