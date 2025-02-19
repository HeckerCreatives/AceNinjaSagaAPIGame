const { creatnews, getnews, editnews, deletenews } = require("../controllers/news")

const router = require("express").Router()


router
.post("/createnews", creatnews)
.get("/getnews", getnews)
.post("/editnews", editnews)
.get("/deletenews", deletenews)

module.exports = router