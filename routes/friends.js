const { removefriend } = require("../controllers/friends");
const {  addFriend, acceptrejectFriendRequest, getFriends, getFriendRequests, playerlist } = require("../controllers/friends")
const { protectplayer } = require("../middleware/middleware")

const router = require("express").Router()

router
// #region PLAYER
.get("/getfriends", protectplayer, getFriends)
.get("/getfriendrequests", protectplayer, getFriendRequests)
.post("/addfriend", protectplayer, addFriend)
.post("/acceptrejectfriendrequest", protectplayer, acceptrejectFriendRequest)
.get("/playerlist", protectplayer, playerlist)
.post("/removefriend", protectplayer, removefriend)
// #endregion



module.exports = router;