const Maintenance = require("../models/Maintenance")
const Users = require("../models/Users")
const { default: mongoose } = require("mongoose")


exports.initialize = async () => {

    const admin = await Users.find({ auth: "superadmin"})
    .then(data => data)
    .catch(err => {
        console.log(`Error finding the admin data: ${err}`)
        return
    })

    if(admin.length <= 0 ){
        await Users.create({ username: "aceninjasagaadmin", password: "KXiBP9gMaGoA", webtoken: "", status: "active", auth: "superadmin", email: "aceadmin@gmail.com"})
        .catch(err => {
            console.log(`Error saving admin data: ${err}`)
            return
        }) 
    }

    const maintenanceList = await Maintenance.find()
    .then(data => data)
    .catch(err => {
        console.log(`Error finding maintenance data: ${err}`)
    })

    if (maintenanceList.length <= 0) {
        const maintenanceListData = ["fullgame", "pvp", "raidboss", "store", "clanwar", "dailyquest", "rewards"];
        const maintenanceBulkWrite = maintenanceListData.map(maintenanceData => ({
            insertOne: {
                document: { type: maintenanceData, value: false }
            }
        }));


        await Maintenance.bulkWrite(maintenanceBulkWrite);
    }


    console.log("SERVER DATA INITIALIZED")
}