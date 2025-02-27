const { getleaderboards, addmmr } = require('../controllers/ranking');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getrankings", protectplayer, getleaderboards)
 .post("/addmmr", protectplayer, addmmr)

module.exports = router;