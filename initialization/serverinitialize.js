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
            {
                name: "Basic Sword",
                type: "weapon",
                rarity: "basic",
                gender: "unisex",
                price: 500,
                currency: "coins",
                description: "Recover 20 health and energy every turn.",
                stats: {
                    level: 2,
                    damage: 50,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            },
            {
                name: "Lizard",
                type: "weapon",
                rarity: "basic",
                gender: "unisex",
                price: 2000,
                currency: "coins",
                description: "Each weapon attack poisons enemy for 3% max. health for 2 turns.",
                stats: {
                    level: 5,
                    damage: 70,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            },
            {
                name: "War Hammer",
                type: "weapon",
                rarity: "common",
                gender: "unisex",
                price: 5000,
                currency: "coins",
                description: "Reduce all damage taken by 150 points.",
                stats: {
                    level: 8,
                    damage: 100,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            },
            {
                name: "Katana",
                type: "weapon",
                rarity: "legendary",
                gender: "unisex",
                price: 100,
                currency: "emerald",
                description: "Increase Max health by 300 and all damage by 150 points.",
                stats: {
                    level: 14,
                    damage: 120,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            },
            {
                name: "Water Sword",
                type: "weapon",
                rarity: "common",
                gender: "unisex",
                currency: "coins",
                price: 10000,
                description: "Reduce skill energy consumption by 25%. Recover 100 energy each turn and reduce all damage taken by 100 points.",
                stats: {
                    level: 19,
                    damage: 150,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            },
            {
                name: "Ice Shuriken",
                type: "weapon",
                rarity: "legendary",
                gender: "unisex",
                price: 100,
                currency: "emerald",
                description: "Recover 150 health and energy each turn. Reduce skill cooldown by 1 after each weapon attack.",
                stats: {
                    level: 24,
                    damage: 200,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            },
            {
                name: "Dragonglass",
                type: "weapon",
                rarity: "common",
                gender: "unisex",
                price: 20000,
                currency: "coins",
                description: "Increase attack and magic damage by 40. Every time opponent attacks, their max. health will be reduced by 3%.",
                stats: {
                    level: 28,
                    damage: 200,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            },
            {
                name: "Scar",
                type: "weapon",
                rarity: "rare",
                gender: "unisex",
                price: 50000,
                currency: "coins",
                description: "Increase critical chance by 10%. Recover 10% of max. health on every critical strike. Critical strikes have 10% chance to stun the opponent.",
                stats: {
                    level: 33,
                    damage: 200,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            },
            {
                name: "Torch",
                type: "weapon",
                rarity: "rare",
                gender: "unisex",
                price: 100000,
                currency: "coins",
                description: "Increase all damage by 500 every 3 turns. Every weapon attack reduces target’s 5% max. health and has 35% chance to remove all buffs from the target.",
                stats: {
                    level: 36,
                    damage: 200,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            },
            {
                name: "Moonstone",
                type: "weapon",
                rarity: "rare",
                gender: "unisex",
                price: 200,
                currency: "emerald",
                description: "Increase all damage by 500 every 3 turns. Every weapon attack reduces target’s 5% max. health and has 35% chance to remove all buffs from the target.",
                stats: {
                    level: 40,
                    damage: 250,
                    defense: 0,
                    speed: 0
                },
                imageUrl: ""
            }
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