const router = require("express").Router()


const { totalregistration, userlist, banunbanuser } = require("../controllers/user")


router
.get("/totalregistration", totalregistration)
.get("/userlist", userlist)
.get("/banunbanuser", banunbanuser)


module.exports = router