const { getSkills, getcharacterSkills, getSkillsWithCharacter, acquirebasicskills } = require('../controllers/skills');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();


router
.get("/getskills", protectplayer, getSkills)
.get("/getskillswithcharacter", protectplayer, getSkillsWithCharacter)
.get("/getcharacterskills", protectplayer, getcharacterSkills)
.post("/acquirebasicskills", protectplayer, acquirebasicskills)


module.exports = router;