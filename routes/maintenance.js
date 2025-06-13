const { getmaintenance } = require("../controllers/maintenance")
const { protectplayer } = require("../middleware/middleware")

const router = require("express").Router()

router
 .get("/getmaintenance", protectplayer, getmaintenance)

module.exports = router