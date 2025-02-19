const router = require("express").Router()
const { authlogin, register, registerstaffs, logout, adminchangepassword } = require("../controllers/auth");
const { protectsuperadmin } = require("../middleware/middleware");

router
.get("/login", authlogin)
.get("/logout", logout)
.post("/register", register)
.post("/adminchangepassword", protectsuperadmin, adminchangepassword)

module.exports = router;
