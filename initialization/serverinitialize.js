const { hairData, weaponData, outfitData } = require("../data/datainitialization")
const Characterdata = require("../models/Characterdata")
const Characterwallet = require("../models/Characterwallet")
const Maintenance = require("../models/Maintenance")
const { Item, Market } = require("../models/Market")
const { Skill, CharacterSkillTree } = require("../models/Skills")
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
        } 


        // Basic Attack Path
        const attackskilltree = await Skill.find({ category: "Basic", path: "Attack" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding skill data: ${err}`)
        })


        if (attackskilltree.length <= 0) {
        
            // initialize attack path

            const energy = await Skill.create({
                name: "Energy +40",
                category: "Basic",
                path: "Attack",
                type: "Stat",
                levelRequirement: 0,
                currency: "skillpoints",                
                spCost: 1,
                maxLevel: 39,
                effects: { "energy": 40 },
                prerequisites: []
            })

            const attack1 = await Skill.create({
                name: "Attack Damage +5",
                category: "Basic",
                path: "Attack",
                type: "Stat",
                levelRequirement: 10,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "attackdamage": 5 },
                prerequisites: [energy._id]
            })
            const attack2 = await Skill.create({
                name: "Attack Damage +5",
                category: "Basic",
                path: "Attack",
                type: "Stat",
                levelRequirement: 20,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "attackdamage": 5 },
                prerequisites: [attack1._id, energy._id]
            })

            const attack3 = await Skill.create({
                name: "Attack Damage +5",
                category: "Basic",
                path: "Attack",
                type: "Stat",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "attackdamage": 5 },
                prerequisites: [attack1._id, energy._id, attack2._id]
            })
            const attack4 = await Skill.create({
                name: "Attack Damage +5",
                category: "Basic",
                path: "Attack",
                type: "Stat",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "attackdamage": 5 },
                prerequisites: [attack1._id, energy._id, attack2._id, attack3._id]
            })

            const magic1 = await Skill.create({
                name: "Magic Damage +5",
                category: "Basic",
                path: "Attack",
                type: "Stat",
                levelRequirement: 10,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "magicdamage": 5 },
                prerequisites: [energy._id]
            })

            const magic2 = await Skill.create({
                name: "Magic Damage +5",
                category: "Basic",
                path: "Attack",
                type: "Stat",
                levelRequirement: 20,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "magicdamage": 5 },
                prerequisites: [energy._id, magic1._id]
            })

            const magic3 = await Skill.create({
                name: "Magic Damage +5",
                category: "Basic",
                path: "Attack",
                type: "Stat",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "magicdamage": 5 },
                prerequisites: [energy._id, magic1._id, magic2._id]
            })

            const magic4 = await Skill.create({
                name: "Magic Damage +5",
                category: "Basic",
                path: "Attack",
                type: "Stat",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "magicdamage": 5 },
                prerequisites: [energy._id, magic1._id, magic2._id, magic3._id]
            })

            await Skill.create({
                name: "Power Up",
                category: "Basic",
                path: "Attack",
                type: "Active",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 7,
                maxLevel: 1,
                description: "Increase attack and magic damage by 70% for 3 turns. Gain 20% lifesteal and omnivamp while the skill is active, and damaging abilities gain 15% chance to stun the opponent for 1 turn",
                effects: { "attackdamage": 70, "magicdamage": 70, "stat_turn": 3, "lifesteal": 20, "omnivamp": 20, "stun": 15, "los_turn": 1, "damage": 0, "energy": 300, "cooldown": 14 },
                prerequisites: [energy._id, magic1._id, magic2._id, magic3._id, magic4._id, attack1._id, attack2._id, attack3._id, attack4._id]
            })

            console.log("Attack path initialized")

        }


        // Basic Defense Path
        const defskilltree = await Skill.find({ category: "Basic", path: "Defense" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding skill data: ${err}`)
        })


        if (defskilltree.length <= 0) {
        
            // initialize defense path

            const health = await Skill.create({
                name: "Health +40",
                category: "Basic",
                path: "Defense",
                type: "Stat",
                levelRequirement: 0,
                currency: "skillpoints",                
                spCost: 1,
                maxLevel: 39,
                effects: { "health": 40 },
                prerequisites: []
            })

            const armor1 = await Skill.create({
                name: "Armor +5",
                category: "Basic",
                path: "Defense",
                type: "Stat",
                levelRequirement: 10,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "armor": 5 },
                prerequisites: [health._id]
            })
            const armor2 = await Skill.create({
                name: "Armor +5",
                category: "Basic",
                path: "Defense",
                type: "Stat",
                levelRequirement: 20,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "armor": 5 },
                prerequisites: [health._id, armor1._id]
            })

            const armor3 = await Skill.create({
                name: "Armor +5",
                category: "Basic",
                path: "Defense",
                type: "Stat",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "armor": 5 },
                prerequisites: [health._id, armor1._id, armor2._id]
            })
            const armor4 = await Skill.create({
                name: "Armor +5",
                category: "Basic",
                path: "Defense",
                type: "Stat",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "armor": 5 },
                prerequisites: [health._id, armor1._id, armor2._id, armor3._id]
            })

            const magicresist1 = await Skill.create({
                name: "Magic Resist +5",
                category: "Basic",
                path: "Defense",
                type: "Stat",
                levelRequirement: 10,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "magicresist": 5 },
                prerequisites: [health._id]
            })

            const magicresist2 = await Skill.create({
                name: "Magic Resist +5",
                category: "Basic",
                path: "Defense",
                type: "Stat",
                levelRequirement: 20,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "magicresist": 5 },
                prerequisites: [health._id, magicresist1._id]
            })

            const magicresist3 = await Skill.create({
                name: "Magic Resist +5",
                category: "Basic",
                path: "Defense",
                type: "Stat",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "magicresist": 5 },
                prerequisites: [health._id, magicresist1._id, magicresist2._id]
            })

            const magicresist4 = await Skill.create({
                name: "Magic Resist +5",
                category: "Basic",
                path: "Defense",
                type: "Stat",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "magicresist": 5 },
                prerequisites: [health._id, magicresist1._id, magicresist2._id, magicresist3._id]
            })

            await Skill.create({
                name: "Blood Shield",
                category: "Basic",
                path: "Defense",
                type: "Active",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 7,
                maxLevel: 1,
                description: "Instantly recover 1500 health and gain 20 armor and magic resist for 3 turns.",
                effects: { "damage": 0, "energy": 300, "cooldown": 14, "health": 1500, "armor": 20, "magicresist": 20, "turns": 3 },
                prerequisites: [health._id , armor1._id, armor2._id, armor3._id, armor4._id, magicresist1._id, magicresist2._id, magicresist3._id, magicresist4._id]
            })

            console.log("Defense path initialized")

        }

        // Basic Utility Path
        const utilityskilltree = await Skill.find({ category: "Basic", path: "Utility" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding skill data: ${err}`)
        })


        if (utilityskilltree.length <= 0) {
           
            // initialize utility path

            const speed = await Skill.create({
                name: "speed +1",
                category: "Basic",
                path: "Utility",
                type: "Stat",
                levelRequirement: 0,
                currency: "skillpoints",                
                spCost: 1,
                maxLevel: 39,
                effects: { "speed": 1 },
                prerequisites: []
            })

            const crit1 = await Skill.create({
                name: "Crit. Chance +1",
                category: "Basic",
                path: "Utility",
                type: "Stat",
                levelRequirement: 10,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "critchance": 1 },
                prerequisites: [speed._id]
            })

            const armorpen = await Skill.create({
                name: "Armor Penetration +1",
                category: "Basic",
                path: "Utility",
                type: "Stat",
                levelRequirement: 20,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "armorpen": 1 },
                prerequisites: [speed._id, crit1._id]
            })
          
            const lifesteal = await Skill.create({
                name: "Lifesteal +1",
                category: "Basic",
                path: "Utility",
                type: "Stat",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "lifesteal": 1 },
                prerequisites: [speed._id, crit1._id, armorpen._id]
            })

            const crit2 = await Skill.create({
                name: "Crit. Chance +1",
                category: "Basic",
                path: "Utility",
                type: "Stat",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "critchance": 1 },
                prerequisites: [speed._id, crit1._id, armorpen._id, lifesteal._id]
            })

            const tbd = await Skill.create({
                name: "tbd",
                category: "Basic",
                path: "Utility",
                type: "Stat",
                levelRequirement: 10,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "tbd": 1 },
                prerequisites: [speed._id]
            })

            const magicpen1 = await Skill.create({
                name: "Magic Penetration +1",
                category: "Basic",
                path: "Utility",
                type: "Stat",
                levelRequirement: 20,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "magicpen": 1 },
                prerequisites: [speed._id, tbd._id]
            })

            const omnivamp = await Skill.create({
                name: "Omnivamp +1",
                category: "Basic",
                path: "Utility",
                type: "Stat",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "omnivamp": 1 },
                prerequisites: [speed._id, tbd._id, magicpen1._id]
            })

            const tbd2 = await Skill.create({
                name: "tbd",
                category: "Basic",
                path: "Utility",
                type: "Stat",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 5,
                effects: { "tbd": 1 },
                prerequisites: [speed._id, tbd._id, magicpen1._id, omnivamp._id]
            })

            await Skill.create({
                name: "Sensory Boost",
                category: "Basic",
                path: "Utility",
                type: "Active",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 7,
                maxLevel: 1,
                description: "Increase critical strike chance by 25% and critical damage by 40% for 3 turns. While this skill is active, critical strikes reduce all skill cooldown by 1.",
                effects: { "critchance": 25, "critdamage": 40, "cooldown": 14, "turns": 3, "damage": 0, "energy": 300 },
                prerequisites: [speed._id, crit1._id, crit2._id, armorpen._id, lifesteal._id, tbd._id, magicpen1._id, omnivamp._id, tbd2._id]
            })

            console.log("Utility path initialized")

        }

        // Special Skills
        const specialskills = await Skill.find({ category: "Special" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding skill data: ${err}`)
        })

        if(specialskills.length <= 0){
            // initialize special skills

            await Skill.create({
                name: "Arrow Strike",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 2,
                spCost: 0,
                maxLevel: 1,
                effects: { damage: 100, energy: 50, cooldown: 5 },
                prerequisites: []
            })

            await Skill.create({
                name: "Energy Blade",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 4,
                spCost: 0,
                maxLevel: 1,
                effects: { damage: 120, energy: 60, cooldown: 5 },
                prerequisites: []
            })

            await Skill.create({
                name: "Spirit Aura",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 6,
                spCost: 0,
                maxLevel: 1,
                description: "Coat the user with spirit aura. Recover 300 health and energy for 2 turns.",
                effects: { damage: 0, energy: 200, cooldown: 10, health: 150, energyrecovery: 150, turns: 2 },
                prerequisites: []
            })

            await Skill.create({
                name: "Silent Stab",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 8,
                spCost: 0,
                maxLevel: 1,
                description: "Stab the opponent from behind. Reduce their max. health by 5%.",
                effects: { damage: 200, energy: 100, cooldown: 8, enemyhealth: 5 },
                prerequisites: []
            })

            await Skill.create({
                name: "Blazing Fire",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 10,
                spCost: 0,
                maxLevel: 1,
                description: "Put opponent under the ring of fire. Reduce their max. health by 5% for 4 turns.",
                effects: { damage: 300, energy: 200, cooldown: 12, enemyhealth: 5, turns: 4 },
                prerequisites: []
            })

            await Skill.create({
                name: "Mystic Sound",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 12,
                spCost: 0,
                maxLevel: 1,
                description: "Send the waves of mysterious sound across the battlefield to disorient the enemies. All opponents’ will be stunned for 2 turns. (Stunned opponent can not do any actions)",
                effects: { damage: 300, energy: 300, cooldown: 14, stun: 100, turns: 2 },
                prerequisites: []
            })

            await Skill.create({
                name: "Quick Slash",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 14,
                spCost: 0,
                maxLevel: 1,
                description: "Slash the opponent with katana’s high speed and accuracy. Reduce their max. health by 10%.",
                effects: { damage: 500, energy: 300, cooldown: 12, enemyhealth: 10 },
                prerequisites: []
            })

            await Skill.create({
                name: "Rune Protection",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 16,
                spCost: 0,
                maxLevel: 1,
                description: "Gain the power from antient runes. Increase armor and magic resist by 30.",
                effects: { damage: 0, energy: 300, cooldown: 14, armor: 30, magicresist: 30 },
                prerequisites: []
            })

            await Skill.create({
                name: "Chain Attack",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 18,
                spCost: 0,
                maxLevel: 1,
                description: "Put chains around the opponent. Reduce their speed by 10 and reduce their attack and magic damage by 20.",
                effects: { damage: 500, energy: 300, cooldown: 14, speedreduct: 10, attackdamagereduct: 20, magicdamagereduct: 20 },
                prerequisites: []
            })

            await Skill.create({
                name: "Eagle Senses", 
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 20,
                spCost: 0,
                maxLevel: 1,
                description: "Gain eagle’s senses. Increase speed by 15 for 2 turns and reduce cooldown of all skills by 3 (excluding Path skills).",
                effects: { damage: 0, energy: 300, cooldown: 14, speed: 15, cooldownreduct: 3, turns: 2 },
                prerequisites: []
            })

            await Skill.create({
                name: "Rune Light",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 22,
                spCost: 0,
                maxLevel: 1,
                description: "Summon ancient light from runes. Remove all buffs from the opponent.",
                effects: { damage: 400, energy: 400, cooldown: 14, buffremove: 100 },
                prerequisites: []
            })

            await Skill.create({
                name: "Golem Attack",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 24,
                spCost: 0,
                maxLevel: 1,
                description: "Summon a golem to the battlefield to deal high damage to all opponents.",
                effects: { damage: 900, energy: 600, cooldown: 14 },
                prerequisites: []
            })

            await Skill.create({
                name: "Quick Shot",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 26,
                spCost: 0,
                maxLevel: 1,
                description: "Quickly attack with dagger from the shadows. Apply 30% bleeding and 7% max. health poison to the opponent for 3 turns. (Bleeding opponent takes % more damage)",
                effects: { damage: 500, energy: 300, cooldown: 14, bleed: 30, poison: 7, turns: 3 },
                prerequisites: []
            })

            await Skill.create({
                name: "Fear Aura",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 28,
                spCost: 0,
                maxLevel: 1,
                description: "Summon creature souls from the darkness. Fear the opponent for 2 turns. (Feared enemies randomly use any skill)",
                effects: { damage: 500, energy: 500, cooldown: 14, fear: 100, turns: 2 },
                prerequisites: []
            })

            await Skill.create({
                name: "Wind Strike",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 30,
                spCost: 0,
                maxLevel: 1,
                description: "Send a concentrated blow of wind to the opponent, overcoming all obstacles. Reduce opponent’s armor and magic resist by 30 for 3 turns.",
                effects: { damage: 700, energy: 600, cooldown: 14, armorreduct: 30, magicreduct: 30, turns: 3 },
                prerequisites: []
            })

            await Skill.create({
                name: "Stone Skin",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 32,
                spCost: 0,
                maxLevel: 1,
                description: "Coat the user’s skin with stone. Rebound all damage back to the opponent and user gains 800 health shield.",
                effects: { damage: 0, energy: 300, cooldown: 14, rebound: 100, shield: 800 },
                prerequisites: []
            })

            await Skill.create({
                name: "Heavy Fall",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 34,
                spCost: 0,
                maxLevel: 1,
                description: "Rain down the fire from the sky to entire battlefield. Deal massive damage to all opponents.",
                effects: { damage: 1100, energy: 700, cooldown: 14 },
                prerequisites: []
            })

            await Skill.create({
                name: "Light Attack",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 36,
                spCost: 0,
                maxLevel: 1,
                description: "Control light and shadows precisely. Remove all buffs from the opponent and reduce their attack damage by 50 for 2 turns.",
                effects: { damage: 400, energy: 400, cooldown: 14, buffremove: 100, attackdamagereduct: 50, turns: 2 },
                prerequisites: []
            })

            await Skill.create({
                name: "Stone Rain",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 38,
                spCost: 0,
                maxLevel: 1,
                description: "Roll down the massive stones from the mountain. Slow the opponent by 10 for 3 turns and instantly reduce their max. health by 15%.",
                effects: { damage: 700, energy: 400, cooldown: 14, speedreduct: 10, enemyhealth: 15, turns: 3 },
                prerequisites: []
            })

            await Skill.create({
                name: "Nature Energy",
                category: "Special",
                type: "Active",
                currency: "coins",
                price: 1000,
                levelRequirement: 40,
                spCost: 0,
                maxLevel: 1,
                description: "Absorb the energy from nature to greatly increase stats. Increase all damage by 30, critical chance by 15%, armor and magic resist by 15, and gain 20% lifesteal and omnivamp.",
                effects: { damage: 0, energy: 900, cooldown: 16, attackdamage: 30, magicdamage: 30, critchance: 15, armor: 15, magicresist: 15, lifesteal: 20, omnivamp: 20 },
                prerequisites: []
            })


            console.log("Special skills initialized")
        }

        // Secret Passive Skills
        const passivesecretskills = await Skill.find({ category: "Secret", type: "Passive" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding skill data: ${err}`)
        })

        if(passivesecretskills.length <= 0){
            // initialize secret passive skills
            await Skill.create({
                name: "Divine Energy",
                category: "Secret",
                type: "Passive",
                currency: "coins",
                price: 500,
                levelRequirement: 8,
                spCost: 0,
                maxLevel: 1,
                description: "Increase attack and magic damage by 15. Gain 15% chance to deal extra 150 damage that turn.",
                effects: { 
                    attackdamage: 15, 
                    magicdamage: 15,
                    extradamagechance: 15,
                    extradamage: 150
                },
                prerequisites: []
            });
        
            
            await Skill.create({
                name: "Swiftness",
                category: "Secret",
                type: "Passive",
                currency: "coins",
                price: 500,
                levelRequirement: 14,
                spCost: 0,
                maxLevel: 1,
                description: "Gain 5 speed and 10 armor and magic penetration.",
                effects: { 
                    speed: 5,
                    armorpen: 10,
                    magicpen: 10
                },
                prerequisites: []
            });
            await Skill.create({
                name: "Resilience",
                category: "Secret",
                type: "Passive",
                currency: "coins",
                price: 500,
                levelRequirement: 20,
                spCost: 0,
                maxLevel: 1,
                description: "Recover 100 health and energy every turn. Increase heal and shield power by 15%.",
                effects: { 
                    healthrecover: 100,
                    energyrecover: 100,
                    healpower: 15,
                    shieldpower: 15
                },
                prerequisites: []
            });
            await Skill.create({
                name: "Shield Glory",
                category: "Secret",
                type: "Passive",
                currency: "coins",
                price: 500,
                levelRequirement: 28,
                spCost: 0,
                maxLevel: 1,
                description: "Increase armor and magic resist by 15. Gain 10% chance to block all damage from the opponents that turn.",
                effects: { 
                    armor: 15, 
                    magicresist: 15,
                    blockchance: 10
                },
                prerequisites: []
            });
            
            await Skill.create({
                name: "Ascension",
                category: "Secret",
                type: "Passive",
                currency: "coins",
                price: 500,
                levelRequirement: 40,
                spCost: 0,
                maxLevel: 1,
                description: "Increase max. health and energy by 15%. Gain 10% critical chance and bonus 15% critical damage. First time in combat when health drops below 50%, player gains 600 shield.",
                effects: { 
                    maxhealth: 15,
                    maxenergy: 15,
                    critchance: 10,
                    critdamage: 15,
                    shield: 600,
                    shieldthreshold: 50
                },
                prerequisites: []
            });
            
        
            console.log("Secret passive skills initialized");
        }

        // Secret Damage and Buff Skills
        const damagesecretskills = await Skill.find({ category: "Secret", type: "Active" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding damage skill data: ${err}`)
        })

        if(damagesecretskills.length <= 0){
            // initialize secret damage skills
            await Skill.create({
                name: "Frozen Arrow",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 2,
                spCost: 0,
                maxLevel: 1,
                description: "Send the frozen arrow to target direction. Apply 30% bleeding to the opponent for 2 turns. (Bleeding opponent takes % more damage)",
                effects: { 
                    damage: 150,
                    energy: 100,
                    cooldown: 5,
                    bleed: 30,
                    turns: 2
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Fire Blast",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 4,
                spCost: 0,
                maxLevel: 1,
                description: "Concentrate fiery attack to one spot. Burn the opponent for 5% max. health and reduce their speed by 5 for 2 turns.",
                effects: { 
                    damage: 200,
                    energy: 150,
                    cooldown: 7,
                    enemyhealth: 5,
                    speedreduct: 5,
                    turns: 2
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Fear of Shadows",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 6,
                spCost: 0,
                maxLevel: 1,
                description: "Send shadow creatures around the opponent. Put them under fear for 1 turn and reduce their max. health by 10%. (Feared enemies randomly use any skill)",
                effects: { 
                    damage: 250,
                    energy: 150,
                    cooldown: 12,
                    fear: 100,
                    enemyhealth: 10,
                    turns: 1
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Icy Breath",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 12,
                spCost: 0,
                maxLevel: 1,
                description: "Send the huge blow of icy air towards the opponent. Freeze them and reduce their speed by 10 for 2 turns. (Frozen enemies can only recover energy)",
                effects: { 
                    damage: 350,
                    energy: 200,
                    cooldown: 12,
                    freeze: 100,
                    speedreduct: 10,
                    turns: 2
                },
                prerequisites: []
            });

            await Skill.create({
                name: "World Breaker",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 16,
                spCost: 0,
                maxLevel: 1,
                description: "Attack with the massive force that destroys everything in its path. Remove all positive status from the opponent and reduce 5% max. health and energy.",
                effects: { 
                    damage: 300,
                    energy: 250,
                    cooldown: 14,
                    buffremove: 100,
                    enemyhealth: 5,
                    energyreduct: 5
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Quicksand",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 22,
                spCost: 0,
                maxLevel: 1,
                description: "Drawn opponent in the quicksand. Slow their speed by 10 and reduce their armor and magic resist by 20 for 3 turns.",
                effects: { 
                    damage: 500,
                    energy: 250,
                    cooldown: 12,
                    speedreduct: 10,
                    armorreduct: 20,
                    magicreduct: 20,
                    turns: 3
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Parasite",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 24,
                spCost: 0,
                maxLevel: 1,
                description: "Attack opponent with parasites that grow inside their body. Use one skill from opponent's skill set and put it under cooldown (excluding Path skills.)",
                effects: { 
                    damage: 500,
                    energy: 250,
                    cooldown: 12,
                    skillsteal: 100
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Deadly Venom",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 30,
                spCost: 0,
                maxLevel: 1,
                description: "Summon swarm of spiders on the battlefield. Apply 7% poison to all enemies and reduce their attack and magic damage by 50 for 2 turns.",
                effects: { 
                    damage: 600,
                    energy: 300,
                    cooldown: 14,
                    poison: 7,
                    attackdamagereduct: 50,
                    magicdamagereduct: 50,
                    turns: 2
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Warriors Wrath",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 32,
                spCost: 0,
                maxLevel: 1,
                description: "Severe the blood flow of the opponent with a heavy attack. User removes all negative status and blocks opponent's healing for 3 turns.",
                effects: { 
                    damage: 600,
                    energy: 250,
                    cooldown: 14,
                    debuffremove: 100,
                    healblock: 100,
                    turns: 3
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Dark Binding",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 34,
                spCost: 0,
                maxLevel: 1,
                description: "Use dark energy to bind the soul of the opponent to the shadow realm. Remove one random buff from the opponent and stun them for 1 turns.",
                effects: { 
                    damage: 500,
                    energy: 500,
                    cooldown: 16,
                    buffremove: 1,
                    stun: 100,
                    turns: 1
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Lightning Strike",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 36,
                spCost: 0,
                maxLevel: 1,
                description: "Send the devastating lightning strike to the battlefield. Instantly reduce all enemies' max. health by 15% and reduce their move speed by 20 for 2 turns.",
                effects: { 
                    damage: 700,
                    energy: 500,
                    cooldown: 16,
                    enemyhealth: 15,
                    speedreduct: 20,
                    turns: 2
                },
                prerequisites: []
            });

            console.log("Secret damage skills initialized");


            // secret buff skills

            await Skill.create({
                name: "Time Dilation",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 10,
                spCost: 0,
                maxLevel: 1,
                description: "Gain the ability to briefly control time. Reduce all skill cooldowns by 4 (excluding Path skills).",
                effects: { 
                    damage: 0,
                    energy: 200,
                    cooldown: 14,
                    cooldownreduct: 4
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Spirit Power",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 18,
                spCost: 0,
                maxLevel: 1,
                description: "Gain power from the spirit world. Recover 300 health and energy and can not be affected by any negative status for 3 turns.",
                effects: { 
                    damage: 0,
                    energy: 300,
                    cooldown: 14,
                    health: 300,
                    energyrecover: 300,
                    immunestatus: 100,
                    turns: 3
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Fire Rune",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 26,
                spCost: 0,
                maxLevel: 1,
                description: "Gain the fire power from runes. Increase attack and magic damage by 55 for 3 turns.",
                effects: { 
                    damage: 0,
                    energy: 300,
                    cooldown: 14,
                    attackdamage: 55,
                    magicdamage: 55,
                    turns: 3
                },
                prerequisites: []
            });

            await Skill.create({
                name: "Berserk",
                category: "Secret",
                type: "Active",
                currency: "coins",
                price: 500,
                levelRequirement: 38,
                spCost: 0,
                maxLevel: 1,
                description: "Get enraged to gain massive power. Gain 10 move speed and 25 attack and magic damage for 3 turns. This buff can not be dispersed. After the buff duration, reduce user's attack and magic damage by 30 for 2 turns.",
                effects: { 
                    damage: 0,
                    energy: 500,
                    cooldown: 16,
                    speed: 10,
                    attackdamage: 25,
                    magicdamage: 25,
                    turns: 3,
                    undispellable: 100,
                    attackdamagereduct: 30,
                    magicdamagereduct: 30,
                    turns: 2
                },
                prerequisites: []
            });

            console.log("Secret buff skills initialized");
        }


        // PVP Skills
        const pvpskills = await Skill.find({ category: "PvP" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding PVP skill data: ${err}`)
        })

        if(pvpskills.length <= 0){
        await Skill.create({
            name: "Gale Force",
            category: "PvP",
            type: "Passive",
            currency: "coins", // New currency type
            price: 0,
            levelRequirement: 1,
            spCost: 0,
            maxLevel: 1,
            description: "Gain 15% chance to resist all lock effects (stun, freeze, fear) and recover 150 health each turn.",
            effects: { 
                lockresist: 15,
                healthrecover: 150
            },
            prerequisites: []
        });

        await Skill.create({
            name: "Soul Shackle",
            category: "PvP",
            type: "Active",
            currency: "coins",
            price: 0,
            levelRequirement: 1,
            spCost: 0,
            maxLevel: 1,
            description: "Reach into the opponent's soul and mind. Absorb 2 random buffs from the opponent and reduce all their skill cooldowns by 1 (excluding Path skills).",
            effects: { 
                damage: 450,
                energy: 400,
                cooldown: 12,
                buffsteal: 2,
                cooldownreduct: 1
            },
            prerequisites: []
        });

        await Skill.create({
            name: "Celestial Barrage",
            category: "PvP",
            type: "Active",
            currency: "coins",
            price: 0,
            levelRequirement: 1,
            spCost: 0,
            maxLevel: 1,
            description: "Call down the rain of Starfire from heavens. Reduce all opponents max. health by 20%.",
            effects: { 
                damage: 500,
                energy: 500,
                cooldown: 18,
                enemyhealth: 20
            },
            prerequisites: []
        });

        console.log("PVP skills initialized");
        }

        // Clan Skills
        const clanskills = await Skill.find({ category: "Clan" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding Clan skill data: ${err}`)
        })

        if(clanskills.length <= 0){
        await Skill.create({
            name: "Alchemist Soul",
            category: "Clan",
            type: "Passive",
            currency: "coins",
            price: 0,
            levelRequirement: 20,
            spCost: 0,
            maxLevel: 1,
            description: "Recover 100 energy each turn. Gain immunity to poison effects.",
            effects: { 
                energyrecover: 100,
                poisonimmune: 100
            },
            prerequisites: []
        });

        await Skill.create({
            name: "Gods Clash",
            category: "Clan",
            type: "Active",
            currency: "coins",
            price: 0,
            levelRequirement: 20,
            spCost: 0,
            maxLevel: 1,
            description: "Unleash the fury of the gods to devastate the battlefield. Recover 100% of the damage done by this skill as health. This skill always critically strikes.",
            effects: { 
                damage: 900,
                energy: 400,
                cooldown: 14,
                lifesteal: 100,
                guaranteedcrit: 100
            },
            prerequisites: []
        });

        await Skill.create({
            name: "Advanced Alchemist Soul",
            category: "Clan",
            type: "Passive",
            currency: "coins",
            price: 0,
            levelRequirement: 20,
            spCost: 0,
            maxLevel: 1,
            description: "Recover 100 health and energy each turn. Gain immunity to burn and poison effects.",
            effects: { 
                healthrecover: 100,
                energyrecover: 100,
                burnimmune: 100,
                poisonimmune: 100
            },
            prerequisites: []
        });

        console.log("Clan skills initialized");
        }

        // Raid Boss Skills
        const raidskills = await Skill.find({ category: "Raid" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding Raid skill data: ${err}`)
        })

        if(raidskills.length <= 0){
        await Skill.create([
            {
                name: "Lava Burst",
                category: "Raid",
                type: "Active",
                currency: "coins",
                price: 0,
                levelRequirement: 20,
                spCost: 0,
                maxLevel: 1,
                description: "Summon the giant volcanic eruption on the battlefield. Burn all targets to reduce their health by 10% for 2 turns.",
                effects: { 
                    damage: 900,
                    energy: 400,
                    cooldown: 14,
                    enemyhealth: 10,
                    turns: 2
                },
                prerequisites: []
            },
            {
                name: "High Tide",
                category: "Raid",
                type: "Active",
                currency: "coins",
                price: 0,
                spCost: 0,
                levelRequirement: 20,
                description: "Send huge waves towards the opponent to disorient them. Reduce their critical chance, all damage, armor, magic resist, and speed by 15 for 3 turns.",
                effects: { 
                    damage: 500,
                    energy: 400,
                    cooldown: 16,
                    critchancereduct: 15,
                    attackdamagereduct: 15,
                    magicdamagereduct: 15,
                    armorreduct: 15,
                    magicreduct: 15,
                    speedreduct: 15,
                    turns: 3
                },
                prerequisites: []
            },
            {
                name: "Frenzy",
                category: "Raid",
                type: "Active",
                currency: "coins",
                price: 0,
                levelRequirement: 20,
                spCost: 0,
                maxLevel: 1,
                description: "When your health drops below 40% activate the frenzy state to gain massively increased stats. Gain 50 attack and magic damage and increase critical chance by 20% for 3 turns. This skill can not be dispersed but can not be used if user above 40% max. health.",
                effects: { 
                    damage: 0,
                    energy: 0,
                    cooldown: 16,
                    attackdamage: 50,
                    magicdamage: 50,
                    critchance: 20,
                    turns: 3,
                    healththreshold: 40,
                    undispellable: 100
                },
                prerequisites: []
            },
            {
                name: "Leaf Dance",
                category: "Raid",
                type: "Active",
                currency: "coins",
                price: 0,
                levelRequirement: 20,
                spCost: 0,
                maxLevel: 1,
                description: "Emerge from stealth and attack the opponent without sound. Stun them for 2 turns and reduce their max. health by 10%.",
                effects: { 
                    damage: 600,
                    energy: 300,
                    cooldown: 14,
                    stun: 100,
                    enemyhealth: 10,
                    turns: 2
                },
                prerequisites: []
            },
            {
                name: "Soul's Eye",
                category: "Raid",
                type: "Active",
                currency: "coins",
                price: 0,
                levelRequirement: 20,
                spCost: 0,
                maxLevel: 1,
                description: "Ascend with the power of pure soul. Recover 400 health and energy and can not be affected by any negative status for 3 turns.",
                effects: { 
                    damage: 0,
                    energy: 400,
                    cooldown: 14,
                    health: 400,
                    energyrecover: 400,
                    immunestatus: 100,
                    turns: 3
                },
                prerequisites: []
            }
        ]);

        console.log("Raid skills initialized");
        }

        // Mage Path
        const mageskills = await Skill.find({ category: "Path", path: "Mage" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding Mage skill data: ${err}`)
        });

        if(mageskills.length <= 0) {
            // Initialize energy reserves (base passive)
            const energyReserves = await Skill.create({
                name: "Energy Reserves",
                category: "Path",
                path: "Mage",
                type: "Passive",
                levelRequirement: 20,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Increase max. energy by 35%. Energy cost of all magic damage abilities are reduced by 20%. When energy is below 25% gain bonus 20 magic damage.",
                effects: { 
                    maxenergy: 35,
                    energycostreduce: 20,
                    magicdamage: 20,
                    energythreshold: 25
                },
                prerequisites: []
            });
            
            // First branch - Arcane skills
            const mysticShield = await Skill.create({
                name: "Mystic Shield",
                category: "Path",
                path: "Mage",
                type: "Active",
                levelRequirement: 25,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Conjure a protective barrier that grants user Debuff Resist and Damage Rebound for 3 turns. (Debuff Resist = user can not be affected by any negative status. Damage Rebound = reflect all damage back to an opponent.",
                effects: {
                    damage: 0,
                    energy: 300,
                    cooldown: 16,
                    immunestatus: 100,
                    rebound: 100,
                    turns: 3
                },
                prerequisites: [energyReserves._id]
            });
            const arcaneBlast = await Skill.create({
                name: "Arcane Blast",
                category: "Path",
                path: "Mage",
                type: "Active",
                levelRequirement: 25,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Fire a concentrated blast of energy, dealing high damage and silence an opponent for 2 turns. (Silenced opponents can not use Path skills)",
                effects: {
                    damage: 900,
                    energy: 600,
                    cooldown: 14,
                    silence: 100,
                    turns: 2
                },
                prerequisites: [energyReserves._id]
            });
            // Second branch - Fire skills
            const essenceFire = await Skill.create({
                name: "Essence of Fire",
                category: "Path",
                path: "Mage",
                type: "Passive",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Increase magic damage by 25. Grant immunity to burn. All magic damage skills have 15% change to ignite an opponent. (Ignite = Burn opponent for 7% max. health for 2 turns. This effect can be stacked)",
                effects: {
                    magicdamage: 25,
                    burnimmune: 100,
                    ignitechance: 15,
                    ignitedamage: 7,
                    igniteturns: 2
                },
                prerequisites: [energyReserves._id, arcaneBlast._id, mysticShield._id]                       
            });
            
            const arcaneBarrage = await Skill.create({
                name: "Arcane Barrage",
                category: "Path",
                path: "Mage",
                type: "Active",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Unleash a rapid series of arcane missiles at all opponents. Deal high damage and reduce their max. health by 10%.",
                effects: {
                    damage: 900,
                    energy: 700,
                    cooldown: 16,
                    enemyhealth: 10
                },
                prerequisites: [energyReserves._id, arcaneBlast._id, mysticShield._id, essenceFire._id]                       
            });


            
            const crystalSpikes = await Skill.create({
                name: "Crystal Spikes",
                category: "Path",
                path: "Mage",
                type: "Active",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Summon sharp crystal spikes at the opponent's location. Freeze the opponent for 1 turn. This skill can be used frequently.",
                effects: {
                    damage: 500,
                    energy: 400,
                    cooldown: 6,
                    freeze: 100,
                    turns: 1
                },
                prerequisites: [energyReserves._id, arcaneBlast._id, mysticShield._id, essenceFire._id]                       
            });

            const inferno = await Skill.create({
                name: "Inferno",
                category: "Path",
                path: "Mage",
                type: "Active",
                levelRequirement: 35,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Summon a raging inferno at the targeted location. Burn opponent for 5% max. health for 2 turns and remove all buffs.",
                effects: {
                    damage: 400,
                    energy: 500,
                    cooldown: 14,
                    enemyhealth: 5,
                    buffremove: 100,
                    turns: 2
                },
                prerequisites: [energyReserves._id, arcaneBlast._id, mysticShield._id, essenceFire._id]                       
            });

            

            const iceFlow = await Skill.create({
                name: "Ice Flow",
                category: "Path",
                path: "Mage",
                type: "Active",
                levelRequirement: 35,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Conjure the power of ice. Increase magic damage by 70 and magic penetration by 35.",
                effects: {
                    damage: 0,
                    energy: 300,
                    cooldown: 14,
                    magicdamage: 70,
                    magicpen: 35
                },
                prerequisites: [energyReserves._id, arcaneBlast._id, mysticShield._id, essenceFire._id]                       
            });

            // Third branch - Ice skills
            const frozenHeart = await Skill.create({
                name: "Frozen Heart",
                category: "Path",
                path: "Mage",
                type: "Passive",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Regenerate 200 energy each turn. All magic damage skills have 15% chance to freeze enemy for 1 turn. (Frozen enemies can only recover energy)",
                effects: {
                    energyrecover: 200,
                    freezechance: 15,
                    freezeturns: 1
                },
                prerequisites: [energyReserves._id, arcaneBlast._id, mysticShield._id, essenceFire._id, inferno._id, iceFlow._id]                       
            });


           await Skill.create({
                name: "Frost Nova",
                category: "Path",
                path: "Mage",
                type: "Active",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Sacrifice 50% of your max. energy to release the burst of frozen energy. Deal massive damage to the opponent, reduce their speed by 20, and heal for 120% of damage done with this skill.",
                effects: {
                    damage: 1400,
                    energysacrifice: 50,
                    cooldown: 16,
                    speedreduct: 20,
                    lifesteal: 120
                },
                prerequisites: [energyReserves._id, arcaneBlast._id, mysticShield._id, essenceFire._id, inferno._id, iceFlow._id, frozenHeart._id]                       
            });

            await Skill.create({
                name: "Frost Siphon",
                category: "Path",
                path: "Mage",
                type: "Active",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Use the power of ice to drain 40% current energy from the opponent. If drained energy is more than 800, become awakened: increase magic damage by 25, speed by 10, armor and magic resist by 20 for 2 turns. (Can not be dispersed)",
                effects: {
                    damage: 600,
                    energy: 700,
                    cooldown: 14,
                    energydrain: 40,
                    awakenthreshold: 800,
                    magicdamage: 25,
                    speed: 10,
                    armor: 20,
                    magicresist: 20,
                    turns: 2,
                    undispellable: 100
                },
                prerequisites: [energyReserves._id, arcaneBlast._id, mysticShield._id, essenceFire._id, inferno._id, iceFlow._id, frozenHeart._id]                       
            });

            console.log("Mage path initialized");
        }

        // Samurai Path
        const samuraiskills = await Skill.find({ category: "Path", path: "Samurai" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding Samurai skill data: ${err}`)
        });

        if(samuraiskills.length <= 0) {
            // Initialize base passive
            const swordMastery = await Skill.create({
                name: "Sword Mastery",
                category: "Path",
                path: "Samurai",
                type: "Passive",
                levelRequirement: 20,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Increase attack damage and armor penetration by 20.",
                effects: { 
                    attackdamage: 20,
                    armorpen: 20
                },
                prerequisites: []
            });

            // Level 25 skills
            const samuraiFury = await Skill.create({
                name: "Samurai's Fury",
                category: "Path",
                path: "Samurai",
                type: "Active",
                levelRequirement: 25,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Attack with brute force to weaken the opponent. Reduce opponent's all damage by 50, and reduce their current energy by 20%",
                effects: {
                    damage: 500,
                    energy: 500,
                    cooldown: 14,
                    attackdamagereduct: 50,
                    magicdamagereduct: 50,
                    energyreduct: 20
                },
                prerequisites: [swordMastery._id]
            });

            const heavensEdge = await Skill.create({
                name: "Heaven's Edge",
                category: "Path",
                path: "Samurai",
                type: "Active",
                levelRequirement: 25,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Summon the power from heaven. Reduce opponent's max. health by 15% and apply 30% bleeding. (Bleeding opponent takes % more damage)",
                effects: {
                    damage: 600,
                    energy: 500,
                    cooldown: 14,
                    enemyhealth: 15,
                    bleed: 30
                },
                prerequisites: [swordMastery._id]
            });

            // Level 30 skills
            const warriorsHonor = await Skill.create({
                name: "Warrior's Honor",
                category: "Path",
                path: "Samurai",
                type: "Passive",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Increase armor and heal and shield power by 20.",
                effects: {
                    armor: 20,
                    healpower: 20,
                    shieldpower: 20
                },
                prerequisites: [swordMastery._id, samuraiFury._id, heavensEdge._id]
            });

            const guardianStance = await Skill.create({
                name: "Guardian Stance",
                category: "Path",
                path: "Samurai",
                type: "Active",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Field your sword with fine mastery. Block opponent's all attack damage skills for 3 turns and gain a shield that blocks 1000 damage.",
                effects: {
                    damage: 0,
                    energy: 300,
                    cooldown: 16,
                    attackblock: 100,
                    shield: 1000,
                    turns: 3
                },
                prerequisites: [swordMastery._id, samuraiFury._id, heavensEdge._id, warriorsHonor._id]
            });

            const windCutter = await Skill.create({
                name: "Wind Cutter",
                category: "Path",
                path: "Samurai",
                type: "Active",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Slash your opponent with ultra fast speed and leave them defenseless. Remove all positive buffs from the target and slow their movement speed by 20 for 2 turns.",
                effects: {
                    damage: 400,
                    energy: 400,
                    cooldown: 16,
                    buffremove: 100,
                    speedreduct: 20,
                    turns: 2
                },
                prerequisites: [swordMastery._id, samuraiFury._id, heavensEdge._id, warriorsHonor._id, guardianStance._id]
            });

            // Level 35 skills
            const tempestStrike = await Skill.create({
                name: "Tempest Strike",
                category: "Path",
                path: "Samurai",
                type: "Active",
                levelRequirement: 35,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Attack opponent continuously with your daggers to deal massive damage. Heal 50% of the damage done with this skill and put their one random skill in +5 cooldown.",
                effects: {
                    damage: 1000,
                    energy: 1000,
                    cooldown: 16,
                    lifesteal: 50,
                    cooldownincrease: 5
                },
                prerequisites: [swordMastery._id, samuraiFury._id, heavensEdge._id, warriorsHonor._id]
            });

            const stoneSkin = await Skill.create({
                name: "Stone Skin",
                category: "Path",
                path: "Samurai",
                type: "Active",
                levelRequirement: 35,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Coat skin with stone to greatly increase your defenses. Increase armor by 70 and regenerate 800 health for 3 turns.",
                effects: {
                    damage: 0,
                    energy: 300,
                    cooldown: 14,
                    armor: 70,
                    health: 800,
                    turns: 3
                },
                prerequisites: [swordMastery._id, samuraiFury._id, heavensEdge._id, warriorsHonor._id]
            });

            // Level 40 skills
            const unyieldingSpirit = await Skill.create({
                name: "Unyielding Spirit",
                category: "Path",
                path: "Samurai",
                type: "Passive",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "When you would reduce to 0 health for the first time you will not die and get a chance to attack your opponent for one last time. If the attack kills the opponent, you win. (When Unyielding Spirit is active, you can not heal or apply shields)",
                effects: {
                    deathdefiance: 100,
                    laststand: 100,
                    healblock: 100
                },
                prerequisites: [swordMastery._id, samuraiFury._id, heavensEdge._id, warriorsHonor._id, tempestStrike._id, stoneSkin._id]
            });
            const ironWill = await Skill.create({
                name: "Iron Will",
                category: "Path",
                path: "Samurai",
                type: "Active",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Pin down your opponent with your sword. Stun them for 2 turns. (Stunned opponent can not do any actions)",
                effects: {
                    damage: 400,
                    energy: 500,
                    cooldown: 16,
                    stun: 100,
                    turns: 2
                },
                prerequisites: [swordMastery._id, samuraiFury._id, heavensEdge._id, warriorsHonor._id, tempestStrike._id, stoneSkin._id, unyieldingSpirit._id]
            });


            await Skill.create({
                name: "Dragon Slash",
                category: "Path",
                path: "Samurai",
                type: "Active",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Channel the spirit of a dragon to deliver a powerful slash with the katana. Deal massive damage to all enemies and have 50% chance to apply 10% burn for 3 turns. (Burn = reduce % max. health from the target)",
                effects: {
                    damage: 1200,
                    energy: 1000,
                    cooldown: 16,
                    burnchance: 50,
                    burn: 10,
                    turns: 3
                },
                prerequisites: [swordMastery._id, samuraiFury._id, heavensEdge._id, warriorsHonor._id, tempestStrike._id, stoneSkin._id, unyieldingSpirit._id]
            });

            console.log("Samurai path initialized");
        }

        // Scholar Path
        const scholarskills = await Skill.find({ category: "Path", path: "Scholar" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding Scholar skill data: ${err}`)
        });

        if(scholarskills.length <= 0) {
        // Base passive
        const geneTherapy = await Skill.create({
            name: "Gene Therapy",
            category: "Path",
            path: "Scholar",
            type: "Passive",
            levelRequirement: 20,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Recover 150 health each turn. Increase all damage by 15%, and every 5 turns gain 250 health shield.",
            effects: { 
                healthrecover: 150,
                damagebonus: 15,
                shield: 250,
                shieldturns: 5
            },
            prerequisites: []
        });

        // Level 25 skills
        const scrollWisdom = await Skill.create({
            name: "Scroll of Wisdom",
            category: "Path",
            path: "Scholar",
            type: "Active",
            levelRequirement: 25,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Open a magic scroll that enhances user's knowledge of the battlefield. Reduce cooldown of all Path skills by 5.",
            effects: {
                damage: 0,
                energy: 300,
                cooldown: 14,
                cooldownreduct: 5
            },
            prerequisites: [geneTherapy._id]
        });

        const smartBinding = await Skill.create({
            name: "Smart Binding",
            category: "Path",
            path: "Scholar",
            type: "Active",
            levelRequirement: 25,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Summon spectral traps that bind opponent in place, slowing their speed by 15 and stunning for 2 turns. (Stunned opponent can not do any action)",
            effects: {
                damage: 400,
                energy: 800,
                cooldown: 16,
                speedreduct: 15,
                stun: 100,
                turns: 2
            },
            prerequisites: [geneTherapy._id]
        });

        // Level 30 skills
        const mindsEye = await Skill.create({
            name: "Mind's Eye",
            category: "Path",
            path: "Scholar",
            type: "Passive",
            levelRequirement: 30,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Gain 15% chance to resist any lock effects – stun, freeze, fear. Gain 10% chance to block all damage.",
            effects: {
                lockresist: 15,
                blockchance: 10
            },
            prerequisites: [geneTherapy._id, scrollWisdom._id, smartBinding._id]
        });

        const mindWrap = await Skill.create({
            name: "Mind Wrap",
            category: "Path",
            path: "Scholar",
            type: "Active",
            levelRequirement: 30,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Disrupts opponent's mind, causing them to flee the battlefield. The affected opponents takes 20% increased damage and skips 1 turn.",
            effects: {
                damage: 500,
                energy: 400,
                cooldown: 14,
                damagetaken: 20,
                skipturns: 1
            },
            prerequisites: [geneTherapy._id, scrollWisdom._id, smartBinding._id, mindsEye._id]
        });

        const healthPotion = await Skill.create({
            name: "Health Potion",
            category: "Path",
            path: "Scholar",
            type: "Active",
            levelRequirement: 30,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Drink the special potion. Remove all negative effects and recover 1000 health.",
            effects: {
                damage: 0,
                energy: 300,
                cooldown: 16,
                debuffremove: 100,
                health: 1000
            },
            prerequisites: [geneTherapy._id, scrollWisdom._id, smartBinding._id, mindsEye._id]
        });

        // Level 35 skills
        const poisonQuill = await Skill.create({
            name: "Poison Quill",
            category: "Path",
            path: "Scholar",
            type: "Active",
            levelRequirement: 35,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Summon a poisoned quill that writes ancient symbols on opponent's skin. Reduces opponent's armor and magic resist by 25 and applies 5% poison for 3 turns.",
            effects: {
                damage: 700,
                energy: 500,
                cooldown: 14,
                armorreduct: 25,
                magicreduct: 25,
                poison: 5,
                turns: 3
            },
            prerequisites: [geneTherapy._id, scrollWisdom._id, smartBinding._id, mindsEye._id]
        });

        const sagesResolve = await Skill.create({
            name: "Sage's Resolve",
            category: "Path",
            path: "Scholar",
            type: "Active",
            levelRequirement: 35,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Use ancient knowledge on battlefield. Recover 400 health and energy for 3 turns and increase speed by 15 for the duration.",
            effects: {
                damage: 0,
                energy: 300,
                cooldown: 16,
                healthrecover: 400,
                energyrecover: 400,
                speed: 15,
                turns: 3
            },
            prerequisites: [geneTherapy._id, scrollWisdom._id, smartBinding._id, mindsEye._id]
        });

        // Level 40 skills
        const runeMastery = await Skill.create({
            name: "Rune Mastery",
            category: "Path",
            path: "Scholar",
            type: "Passive",
            levelRequirement: 40,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Gain 15% chance to instantly reset the cooldown of any skill after casting it. Increase energy regeneration by 25%.",
            effects: {
                resetcdchance: 15,
                energyregenbonus: 25
            },
            prerequisites: [geneTherapy._id, scrollWisdom._id, smartBinding._id, mindsEye._id, poisonQuill._id, sagesResolve._id]
        });

        const scholarsTouch = await Skill.create({
            name: "Scholar's Touch",
            category: "Path",
            path: "Scholar",
            type: "Active",
            levelRequirement: 40,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Alter the flow of life in opponent's body. Remove all buffs and drain 20% of the current health from the opponent.",
            effects: {
                damage: 400,
                energy: 500,
                cooldown: 14,
                buffremove: 100,
                healthdrain: 20
            },
            prerequisites: [geneTherapy._id, scrollWisdom._id, smartBinding._id, mindsEye._id, poisonQuill._id, sagesResolve._id, runeMastery._id]
        });

        await Skill.create({
            name: "Cerebral Pulse",
            category: "Path",
            path: "Scholar",
            type: "Active",
            levelRequirement: 40,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Release the pulse of psychic energy all around the battlefield. Deal massive damage to all enemies, increase all skill cooldown by 1 (excluding Path skills) and instantly reduce 10% max. health.",
            effects: {
                damage: 1000,
                energy: 800,
                cooldown: 16,
                cooldownincrease: 1,
                enemyhealth: 10
            },
            prerequisites: [geneTherapy._id, scrollWisdom._id, smartBinding._id, mindsEye._id, poisonQuill._id, sagesResolve._id, runeMastery._id]
        });

        console.log("Scholar path initialized");
        }
        
        // Rogue Path
        const rogueskills = await Skill.find({ category: "Path", path: "Rogue" })
        .then(data => data)
        .catch(err => {
            console.log(`Error finding Rogue skill data: ${err}`)
        });

        if(rogueskills.length <= 0) {
        // Base passive
        const adrenalineRush = await Skill.create({
            name: "Adrenaline Rush",
            category: "Path",
            path: "Rogue",
            type: "Passive",
            levelRequirement: 20,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Increase speed by 10. Gain 15% critical chance and 30% bonus critical damage.",
            effects: { 
                speed: 10,
                critchance: 15,
                critdamage: 30
            },
            prerequisites: []
        });

        // Level 25 skills
        const tremorSense = await Skill.create({
            name: "Tremor Sense",
            category: "Path",
            path: "Rogue",
            type: "Active",
            levelRequirement: 25,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Gain an enhanced understanding of the battlefield through sound waves. Reduce all skill cooldown by 3 (excluding Path skills). Increase armor and magic resist by 15 for 3 turns.",
            effects: {
                damage: 0,
                energy: 300,
                cooldown: 14,
                cooldownreduct: 3,
                armor: 15,
                magicresist: 15,
                turns: 3
            },
            prerequisites: [adrenalineRush._id]
        });

        const arrowStrike = await Skill.create({
            name: "Arrow Strike",
            category: "Path",
            path: "Rogue",
            type: "Active",
            levelRequirement: 25,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Shoot a valley of arrows to all opponents. Reduce their max. health instantly by 10% and apply 30% bleeding for 3 turns.",
            effects: {
                damage: 600,
                energy: 400,
                cooldown: 14,
                enemyhealth: 10,
                bleed: 30,
                turns: 3
            },
            prerequisites: [adrenalineRush._id]
        });

        // Level 30 skills
        const assassinsReflexes = await Skill.create({
            name: "Assassin's Reflexes",
            category: "Path",
            path: "Rogue",
            type: "Passive",
            levelRequirement: 30,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Gain 15% chance to counterattack the same skill opponent used on that turn (Does not apply to Path skills). Always critically strike if opponent is stunned, frozen or feared.",
            effects: {
                counterchance: 15,
                guaranteedcrit: 100
            },
            prerequisites: [adrenalineRush._id, tremorSense._id, arrowStrike._id]
        });

        const deadlyPrecision = await Skill.create({
            name: "Deadly Precision",
            category: "Path",
            path: "Rogue",
            type: "Active",
            levelRequirement: 30,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Coat yourself in hard armor and light your weapon on fire. Gain 100% critical chance, increase attack damage by 30 and gain 1000 health shield for the next turn.",
            effects: {
                damage: 0,
                energy: 300,
                cooldown: 14,
                critchance: 100,
                attackdamage: 30,
                shield: 1000,
                turns: 1
            },
            prerequisites: [adrenalineRush._id, tremorSense._id, arrowStrike._id, assassinsReflexes._id]
        });

        const lethalStrike = await Skill.create({
            name: "Lethal Strike",
            category: "Path",
            path: "Rogue",
            type: "Active",
            levelRequirement: 30,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Attack an opponent from the behind with stealth blade. This attack always critically strikes, deals high damage and can be used frequently.",
            effects: {
                damage: 800,
                energy: 600,
                cooldown: 6,
                guaranteedcrit: 100
            },
            prerequisites: [adrenalineRush._id, tremorSense._id, arrowStrike._id, assassinsReflexes._id]
        });

        // Level 35 skills
        const bloodSacrifice = await Skill.create({
            name: "Blood Sacrifice",
            category: "Path",
            path: "Rogue",
            type: "Active",
            levelRequirement: 35,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Sacrifice 15% max. health to fear the opponent for 2 turns and reduce their armor and magic resist by 20.",
            effects: {
                damage: 500,
                energy: 500,
                cooldown: 16,
                healthsacrifice: 15,
                fear: 100,
                armorreduct: 20,
                magicreduct: 20,
                turns: 2
            },
            prerequisites: [adrenalineRush._id, tremorSense._id, arrowStrike._id, assassinsReflexes._id]
        });

        const shadowStrike = await Skill.create({
            name: "Shadow Strike",
            category: "Path",
            path: "Rogue",
            type: "Active",
            levelRequirement: 35,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Strike your opponent with poisoned arrow from the shadows. Remove all buffs and apply 7% poison for 2 turns.",
            effects: {
                damage: 400,
                energy: 600,
                cooldown: 14,
                buffremove: 100,
                poison: 7,
                turns: 2
            },
            prerequisites: [adrenalineRush._id, tremorSense._id, arrowStrike._id, assassinsReflexes._id]
        });

        // Level 40 skills
        const silentKiller = await Skill.create({
            name: "Silent Killer",
            category: "Path",
            path: "Rogue",
            type: "Passive",
            levelRequirement: 40,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Gain 1 stack for each damage skill used against an opponent (Max. 10 stacks). Each stack increases the attack damage by 3. At max. stacks recover 20% max. health and energy and reduce Path cooldowns by 3. Additionally, increase critical chance by 15% and gain 15% chance to dodge all attacks for the rest of the combat.",
            effects: {
                maxstacks: 10,
                stackdamage: 3,
                healthrecover: 20,
                energyrecover: 20,
                cooldownreduct: 3,
                critchance: 15,
                dodgechance: 15
            },
            prerequisites: [adrenalineRush._id, tremorSense._id, arrowStrike._id, assassinsReflexes._id, bloodSacrifice._id, shadowStrike._id]
        });

        const eyeOfRaven = await Skill.create({
            name: "Eye of Raven",
            category: "Path",
            path: "Rogue",
            type: "Active",
            levelRequirement: 40,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Gain the senses and agility of a raven. Dodge all opponent's skills and increase speed by 10 for 3 turns.",
            effects: {
                damage: 0,
                energy: 300,
                cooldown: 18,
                dodgechance: 100,
                speed: 10,
                turns: 3
            },
            prerequisites: [adrenalineRush._id, tremorSense._id, arrowStrike._id, assassinsReflexes._id, bloodSacrifice._id, shadowStrike._id, silentKiller._id]
        });

        await Skill.create({
            name: "Eviscerate",
            category: "Path",
            path: "Rogue",
            type: "Active",
            levelRequirement: 40,
            currency: "skillpoints",
            spCost: 4,
            maxLevel: 1,
            description: "Attack with such a brute force to dismember the opponent's organs. Deal massive damage and instantly reduce 15% of opponent's max. health. After using this skill, user's health will be reduced by 150 for 3 turns.",
            effects: {
                damage: 1100,
                energy: 1000,
                cooldown: 16,
                enemyhealth: 15,
                healthreduct: 150,
                turns: 3
            },
            prerequisites: [adrenalineRush._id, tremorSense._id, arrowStrike._id, assassinsReflexes._id, bloodSacrifice._id, shadowStrike._id, silentKiller._id]
        });

        console.log("Rogue path initialized");
        }

        // Dark Path
        const darkskills = await Skill.find({ category: "Path", path: "Dark" })
            .then(data => data)
            .catch(err => {
                console.log(`Error finding Dark skill data: ${err}`)
            });

        if(darkskills.length <= 0) {
            // Base passive
            const darkPact = await Skill.create({
                name: "Dark Pact",
                category: "Path",
                path: "Dark",
                type: "Passive",
                levelRequirement: 20,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Increase magic damage and magic penetration by 30. Using Path skills reduce user's max. health by 5%.",
                effects: { 
                    magicdamage: 30,
                    magicpen: 30,
                    healthreduct: 5
                },
                prerequisites: []
            });

            // Level 25 skills
            const darkSlash = await Skill.create({
                name: "Dark Slash",
                category: "Path",
                path: "Dark",
                type: "Active",
                levelRequirement: 25,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "A powerful attack infused with dark energy. Remove all buffs from target and reduce their max. energy by 25%.",
                effects: {
                    damage: 400,
                    energy: 400,
                    cooldown: 14,
                    buffremove: 100,
                    energyreduct: 25
                },
                prerequisites: [darkPact._id]
            });

            const necroticTouch = await Skill.create({
                name: "Necrotic Touch",
                category: "Path",
                path: "Dark",
                type: "Active",
                levelRequirement: 25,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Capture opponent inside a coffin for 3 turns. During this time opponent's healing is blocked and they can not use any skills (Path skills excluded).",
                effects: {
                    damage: 600,
                    energy: 500,
                    cooldown: 16,
                    healblock: 100,
                    silence: 100,
                    turns: 3
                },
                prerequisites: [darkPact._id]
            });

            // Level 30 skills
            const voidWalker = await Skill.create({
                name: "Void Walker",
                category: "Path",
                path: "Dark",
                type: "Passive",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Increase the duration of all buffs by 1 turn. Become immune to burn and fear effects.",
                effects: {
                    buffduration: 1,
                    burnimmune: 100,
                    fearimmune: 100
                },
                prerequisites: [darkPact._id, darkSlash._id, necroticTouch._id]
            });

            const blackout = await Skill.create({
                name: "Blackout",
                category: "Path",
                path: "Dark",
                type: "Active",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Envelop the battlefield in darkness. Reduce all opponents' attack damage by 100 and silence them for 3 turns. (Silenced opponents can not use Path skills)",
                effects: {
                    damage: 700,
                    energy: 500,
                    cooldown: 14,
                    attackdamagereduct: 100,
                    silence: 100,
                    turns: 3
                },
                prerequisites: [darkPact._id, darkSlash._id, necroticTouch._id, voidWalker._id]
            });

            const hauntingVeil = await Skill.create({
                name: "Haunting Veil",
                category: "Path",
                path: "Dark",
                type: "Active",
                levelRequirement: 30,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Haunt an opponent with their worst nightmares. Apply Fear to the opponent for 2 turns. (Feared enemies randomly use any skill).",
                effects: {
                    damage: 500,
                    energy: 600,
                    cooldown: 14,
                    fear: 100,
                    turns: 2
                },
                prerequisites: [darkPact._id, darkSlash._id, necroticTouch._id, voidWalker._id]
            });

            // Level 35 skills
            const shadowflame = await Skill.create({
                name: "Shadowflame",
                category: "Path",
                path: "Dark",
                type: "Active",
                levelRequirement: 35,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Unleash a fiery blast of dark energy. Gain Debuff Resist and recover 600 health for 3 turns.",
                effects: {
                    damage: 0,
                    energy: 300,
                    cooldown: 16,
                    immunestatus: 100,
                    health: 600,
                    turns: 3
                },
                prerequisites: [darkPact._id, darkSlash._id, necroticTouch._id, voidWalker._id]
            });

            const abyssalStrike = await Skill.create({
                name: "Abyssal Strike",
                category: "Path",
                path: "Dark",
                type: "Active",
                levelRequirement: 35,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Call upon the power of the abyss to strike the opponent. This skill deals high damage, always critically strikes and has 20% chance to stun the opponent for 2 turns. (Stunned opponent can not do any actions)",
                effects: {
                    damage: 1000,
                    energy: 700,
                    cooldown: 14,
                    guaranteedcrit: 100,
                    stunchance: 20,
                    stun: 100,
                    turns: 2
                },
                prerequisites: [darkPact._id, darkSlash._id, necroticTouch._id, voidWalker._id]
            });

            // Level 40 skills
            const soulReaper = await Skill.create({
                name: "Soul Reaper",
                category: "Path",
                path: "Dark",
                type: "Passive",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Gain 30% omnivamp. Every 5 turns, user's attack fear an opponent for 1 turn. (Feared enemies randomly use any skill)",
                effects: {
                    omnivamp: 30,
                    fearturns: 5,
                    fear: 100,
                    fearduration: 1
                },
                prerequisites: [darkPact._id, darkSlash._id, necroticTouch._id, voidWalker._id, shadowflame._id, abyssalStrike._id]
            });

            const soulDrain = await Skill.create({
                name: "Soul Drain",
                category: "Path",
                path: "Dark",
                type: "Active",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Absorb the soul of the opponent. Drain their 20% current health and energy, and 7 speed. This skill does high damage but can only be used once in battle.",
                effects: {
                    damage: 900,
                    energy: 1000,
                    cooldown: 999,
                    healthdrain: 20,
                    energydrain: 20,
                    speedreduct: 7
                },
                prerequisites: [darkPact._id, darkSlash._id, necroticTouch._id, voidWalker._id, shadowflame._id, abyssalStrike._id, soulReaper._id]
            });

            await Skill.create({
                name: "Death's Embrace",
                category: "Path",
                path: "Dark",
                type: "Active",
                levelRequirement: 40,
                currency: "skillpoints",
                spCost: 4,
                maxLevel: 1,
                description: "Sacrifice 20% max. health and energy to turn into a Frenzy state for 3 turns. During Frenzy user gains 700 health shield, 15 armor and magic resist, 15% critical chance, 15 magic damage and 15% omnivamp.",
                effects: {
                    damage: 0,
                    energy: 0,
                    cooldown: 16,
                    healthsacrifice: 20,
                    energysacrifice: 20,
                    shield: 700,
                    armor: 15,
                    magicresist: 15,
                    critchance: 15,
                    magicdamage: 15,
                    omnivamp: 15,
                    turns: 3
                },
                prerequisites: [darkPact._id, darkSlash._id, necroticTouch._id, voidWalker._id, shadowflame._id, abyssalStrike._id, soulReaper._id]
            });

            console.log("Dark path initialized");
        }


        const allcharacters = await Characterdata.find()


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

        // initialize skill tree for existing users

        for (let i = 0; i < allcharacters.length; i++) {
            
            const skilltree = await CharacterSkillTree.findOne({ owner: allcharacters[i]._id })

            if(!skilltree){
                await CharacterSkillTree.create({ owner: allcharacters[i]._id, skillPoints: 0, skills: [], unlockedSkills: []})
                .catch(err => {
                    console.log(`Error saving emerald wallet data: ${err}`)
                    return
                })

                console.log('Character Skill Tree created for', allcharacters[i].username)
            }
        }


    console.log("SERVER DATA INITIALIZED")
}