const { getdownloadlinks, getdownloadlinkslandingpage, editdownloadlink } = require("../controllers/downloadlinks")
const { protectsuperadmin } = require("../middleware/middleware")

const router = require("express").Router()

router
.get("/getdownloadlinks", protectsuperadmin, getdownloadlinks)
.get("/getdownloadlinkslandingpage", getdownloadlinkslandingpage)
.post("/editdownloadlinks", protectsuperadmin, editdownloadlink)

module.exports = router