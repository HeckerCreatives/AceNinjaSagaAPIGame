const { getSkills, getcharacterSkills, getSkillsWithCharacter, acquirespbasedskills, acquirebuybasedskills, equipskill, unequipskill, getequippedskills, resetbasicskills } = require('../controllers/skills');
const { protectplayer } = require('../middleware/middleware');

const router = require('express').Router();


router
.get("/getskills", protectplayer, getSkills)
.get("/getskillswithcharacter", protectplayer, getSkillsWithCharacter)
.get("/getcharacterskills", protectplayer, getcharacterSkills)
.post("/acquirespbasedskills", protectplayer, acquirespbasedskills)
.post("/acquirebuybasedskills", protectplayer, acquirebuybasedskills)
.post("/equipskill", protectplayer, equipskill)
.post("/unequipskill", protectplayer, unequipskill)
.post("/resetbasicskills", protectplayer, resetbasicskills)
.get("/getequippedskills", protectplayer, getequippedskills)

module.exports = router;