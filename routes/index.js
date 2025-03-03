const routers = app => {
    console.log("Routers are all available");

    app.use("/auth", require("./auth"))
    app.use("/announcement", require("./announcement"))
    app.use("/character", require("./character"))
    app.use("/maintenance", require("./maintenance"))
    app.use("/marketplace", require("./marketplace"))
    app.use("/news", require("./news"))
    app.use("/ranking", require("./ranking"))
    app.use("/skills", require("./skills"))
    app.use("/transaction", require("./transaction"))
    app.use("/user", require("./user"))
}

module.exports = routers