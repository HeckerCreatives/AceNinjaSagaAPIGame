const routers = app => {
    console.log("Routers are all available");

    app.use("/analytics", require("./analytics"))
    app.use("/announcement", require("./announcement"))
    app.use("/auth", require("./auth"))
    app.use("/badge", require("./badge"))
    app.use("/battlepass", require("./battlepass"))
    app.use("/character", require("./character"))
    app.use("/chest", require("./chest"))
    app.use("/companion", require("./companion"))
    app.use("/downloadlinks", require("./downloadlinks"))
    app.use("/friends", require("./friends"))
    app.use("/maintenance", require("./maintenance"))
    app.use("/marketplace", require("./marketplace"))
    app.use("/news", require("./news"))
    app.use("/pvp", require("./pvp"))
    app.use("/quest", require("./quest"))
    app.use("/ranking", require("./ranking"))
    app.use("/rankreward", require("./rankreward"))
    app.use("/redeemcode", require("./redeemcode"))
    app.use("/rewards", require("./rewards"))
    app.use("/skills", require("./skills"))
    app.use("/title", require("./title"))
    app.use("/transaction", require("./transaction"))
    app.use("/user", require("./user"))
    app.use("/uploads", require("./uploads"))
    app.use("/version", require("./version"))
    app.use("/raidboss", require("./raidboss"))
}

module.exports = routers