const { getdailyspinsa, getdailyexpspinsa, getmonthlyloginsa, getweeklyloginsa, editdailyspin, editdailyexpspin, editmonthlylogin, editweeklylogin, getdailyspin, spindaily, getexpdailyspin, spinexpdaily, getweeklylogin, claimweeklylogin, getmonthlylogin, claimmonthlylogin } = require('../controllers/rewards');
const { protectplayer, protectsuperadmin } = require('../middleware/middleware');

const router = require('express').Router();

router
 .get("/getdailyspin", protectplayer, getdailyspin)
 .post("/spindaily", protectplayer, spindaily)
 .get("/getexpdailyspin", protectplayer, getexpdailyspin)
 .post("/spinexpdaily", protectplayer, spinexpdaily)
 .get("/getweeklylogin", protectplayer, getweeklylogin)
 .post("/claimweeklylogin", protectplayer, claimweeklylogin)
 .get("/getmonthlylogin", protectplayer, getmonthlylogin)
 .post("/claimmonthlylogin", protectplayer, claimmonthlylogin)

module.exports = router;