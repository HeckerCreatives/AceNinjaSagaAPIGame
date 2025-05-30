const routers = app => {
    console.log("Routers are all available");

    app.use("/auth", require("./auth"))
    app.use("/announcement", require("./announcement"))
    app.use("/battlepass", require("./battlepass"))
    app.use("/character", require("./character"))
    app.use("/companion", require("./companion"))
    app.use("/downloadlinks", require("./downloadlinks"))
    app.use("/friends", require("./friends"))
    app.use("/maintenance", require("./maintenance"))
    app.use("/marketplace", require("./marketplace"))
    app.use("/news", require("./news"))
    app.use("/pvp", require("./pvp"))
    app.use("/ranking", require("./ranking"))
    app.use("/redeemcode", require("./redeemcode"))
    app.use("/rewards", require("./rewards"))
    app.use("/skills", require("./skills"))
    app.use("/transaction", require("./transaction"))
    app.use("/user", require("./user"))
    app.use("/uploads", require("./uploads"))
}

module.exports = routers