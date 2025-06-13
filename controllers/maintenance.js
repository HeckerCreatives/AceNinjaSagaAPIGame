
const Maintenance = require("../models/Maintenance")

exports.getmaintenance = async (req, res) => {

    const { type } = req.query
    if(!type) {
        return res.status(400).json({ message: "failed", data: "Please input the type of maintenance"})
    }
    const maintenanceList = await Maintenance.findOne({ type: type })
    .then( data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching maintenance list. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const finaldata = {
        type: maintenanceList.type,
        value: maintenanceList.value,
        description: maintenanceList.description
    }
    
    return res.status(200).json({ message: "success", data: finaldata})

}

