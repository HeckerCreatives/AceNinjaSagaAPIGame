const router = require("express").Router()
const { createannouncement, getannouncement, editannouncement, deleteannnouncement } = require("../controllers/announcement")


router
.post("/createannouncement", createannouncement)
.get("/getannouncement", getannouncement)
.post("/editannouncement", editannouncement)
.get("/deleteannouncement", deleteannnouncement)

module.exports = router