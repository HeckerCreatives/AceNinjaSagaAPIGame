const { createTransaction, completeTransaction, monitorTransaction, getusertransactions } = require("../controllers/Transaction")
const { protectplayer } = require("../middleware/middleware")
const router = require("express").Router()

router
 .post("/createtransaction", protectplayer, createTransaction)
 .post("/completetransaction", protectplayer, completeTransaction)
 .get("/monitortransaction", protectplayer, monitorTransaction)
 .get("/getusertransaction", getusertransactions)

module.exports = router