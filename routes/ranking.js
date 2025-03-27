const { getleaderboards, addmmr, getpvpleaderboards } = require('../controllers/ranking');
const { protectplayer, protectsuperadmin } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getrankings", protectplayer, getleaderboards)
 .post("/addmmr", protectplayer, addmmr)

module.exports = router;