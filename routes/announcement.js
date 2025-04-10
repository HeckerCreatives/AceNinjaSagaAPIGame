const { createannouncement, getannouncement, deleteannouncement } = require("../controllers/announcement")

const router = require("express").Router()
router
.get("/getannouncement", getannouncement)

module.exports = router