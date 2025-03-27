const { createRankTier, getAllRankTiers, deleteRankTier, updateRankTier} = require('../controllers/ranktier');
const { protectplayer, protectsuperadmin } = require('../middleware/middleware');

const upload = require("../middleware/uploadpics")
const uploadimg = upload.single("icon")


const router = require('express').Router();

router
 .get("/getallranktiers", protectsuperadmin, getAllRankTiers )
 .post("/deleteranktier", protectsuperadmin, deleteRankTier )
 .post("/createranktier", protectsuperadmin,function (req, res, next) {
    uploadimg(req, res, function(err){
        if(err) {
            return res.status(400).send({ message: "failed", data: err.message})
        }

        next()
    })
 }, createRankTier)
 .post("/updateranktier", protectsuperadmin,function (req, res, next) {
    uploadimg(req, res, function(err){
        if(err) {
            return res.status(400).send({ message: "failed", data: err.message})
        }

        next()
    })
 }, updateRankTier)

module.exports = router;