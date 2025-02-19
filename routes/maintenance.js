const { getmaintenance, changemaintenance } = require("../controllers/maintenance")
const { protectsuperadmin } = require("../middleware/middleware")

const router = require("express").Router()

router
 .get("/getmaintenance", protectsuperadmin, getmaintenance)
 .post("/changemaintenance", protectsuperadmin, changemaintenance)

module.exports = router