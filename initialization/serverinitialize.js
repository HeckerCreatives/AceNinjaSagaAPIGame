const { hairData, weaponData, outfitData } = require("../data/datainitialization")
const Characterdata = require("../models/Characterdata")
const Characterwallet = require("../models/Characterwallet")
const Maintenance = require("../models/Maintenance")
const { Item, Market } = require("../models/Market")
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


    const items = await Item.find()
    .then(data => data)
    .catch(err => {
        console.log(`Error finding item data: ${err}`)
    })

    if (items.length <= 0) {

        const itemData = [
            ...hairData,
            ...weaponData,
            ...outfitData
        ]

        const itemBulkWrite = itemData.map(item => ({
            insertOne: {
                document: item
            }
        }));

        await Item.bulkWrite(itemBulkWrite)
        .catch(err => {
            console.log(`Error saving item data: ${err}`)
            return
        })

    }

        const market = await Market.find()
        .then(data => data)
        .catch(err => {
            console.log(`Error finding market data: ${err}`)
        })


        if (market.length <= 0) {
            try {
                // Fetch all items again to ensure we have the latest data
                const availableItems = await Item.find();
                
                if (!availableItems || availableItems.length === 0) {
                    console.log("No items available to create market");
                    return;
                }
    
                // Create initial market with all available items
                const newMarket = await Market.create({
                    items: availableItems,
                    lastUpdated: new Date()
                });
    
                if (newMarket) {
                    console.log("Market initialized successfully with", availableItems.length, "items");
                }
            } catch (err) {
                console.log(`Error creating market: ${err}`);
                return;
            }
        } else {
            console.log("Market already exists with", market.length, "entries");
        }


        // const allcharacters = await Characterdata.find()

        // for (let i = 0; i < allcharacters.length; i++) {
            
        //     const emeraldwallet = await Characterwallet.findOne({ owner: allcharacters[i]._id, type: "emerald" })

        //     if(!emeraldwallet){
        //         await Characterwallet.create({ owner: allcharacters[i]._id, type: "emerald", amount: 0 })
        //         .catch(err => {
        //             console.log(`Error saving emerald wallet data: ${err}`)
        //             return
        //         })

        //         console.log('Emerald wallet created for', allcharacters[i].username)
        //     }
        // }


    console.log("SERVER DATA INITIALIZED")
}