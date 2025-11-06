
const weaponstatsdata = [
    {
        name: "Katana",
        id: "6828695886cc0f20427495bf",
        stats: {
            health: 300
        },
        type: "add" //  add or percentage
    },
    {
        name: "Moonstone",
        id: "6828695886cc0f20427495c5",
        stats: {
            health: 500,
            energy: 500
        },
        type: "add" //  add or percentage
    },
    {
        name: "Dragonglass",
        id: "6828695886cc0f20427495c2",
        stats: {
            attackdamage: 40,
            magicdamage: 40
        },
        type: "add" //  add or percentage
    },
    {
        name: "Scar",
        id: "6828695886cc0f20427495c3",
        stats: {
            critchance: 10,
        },
        type: "add" //  add or percentage
    },
        {
        name: "Lightning Blade",
        id: "6828695886cc0f2042749601",
        stats: {
            speed: 5,
            magicdamage: 15
        },
        type: "add"
    },
    {
        name: "Ancient Spear",
        id: "6828695886cc0f2042749602",
        stats: {
            armor: 15,
            magicresist: 15,
            health: 300,
            speed: -5
        },
        type: "add"
    }
]

const skillsstats = [
    {
        name: "Ascension",
        id: "6828695886cc0f2042749654",
        stats: {
            health: 15,
            energy: 15
        },
        type: "percentage"
    },
    {
        name: "Shield Glory",
        id: "6828695886cc0f2042749653",
        stats: {
            armor: 15,
            magicresist: 15
        },
        type: "add"
    },
    {
        name: "Swiftness",
        id: "6828695886cc0f2042749651",
        stats: {
            speed: 5,
            armorpen: 10,
            magicpen: 10
        },
        type: "add"
    },
    {
        name: "Divine Energy",
        id: "6828695886cc0f2042749650",
        stats: {
            attackdamage: 15,
            magicdamage: 15
        },
        type: "add"
    },
    {
        name: "Resilience",
        id: "6828695886cc0f2042749652",
        stats: {
            healshieldpower: 15,
        },
        type: "add"
    }, 
    // added path passive skills

        {
        name: "Energy Reserves",
        id: "6828695886cc0f2042749681",
        stats: {
            energy: 35,
            // energycostreduce: 20,
            // magicdamage: 20,
            // energythreshold: 25
        },
        type: "percentage"
    },
    {
        name: "Essence of Fire",
        id: "6828695886cc0f2042749684",
        stats: {
            magicdamage: 25,
            // burnimmune: 100,
            // ignitechance: 15,
            // ignitedamage: 7,
            // igniteturns: 2
        },
        type: "add"
    },
    // {
    //     name: "Frozen Heart",
    //     id: "6828695886cc0f2042749689",
    //     stats: {
    //         energyrecover: 200,
    //         freezechance: 15,
    //         freezeturns: 1
    //     },
    //     type: "add"
    // },
    {
        name: "Sword Mastery",
        id: "6828695886cc0f2042749692",
        stats: {
            attackdamage: 20,
            armorpen: 20
        },
        type: "add"
    },
    {
        name: "Warrior's Honor",
        id: "6828695886cc0f2042749695",
        stats: {
            armor: 20,
            healshieldpower: 20,
        },
        type: "add"
    },
    // {
    //     name: "Unyielding Spirit",
    //     id: "6828695886cc0f2042749700",
    //     stats: {
    //         deathdefiance: 100,
    //         laststand: 100,
    //         healblock: 100
    //     },
    //     type: "add"
    // },
    {
        name: "Gene Therapy",
        id: "6828695886cc0f2042749703",
        stats: {
            // healthrecover: 150,
            // damagebonus: 15,
            // shield: 250,
            // shieldturns: 5
            attackdamage: 15,
            magicdamage: 15,
            critdamage: 15
        },
        type: "add"
    },
    // {
    //     name: "Mind's Eye",
    //     id: "6828695886cc0f2042749706",
    //     stats: {
    //         lockresist: 15,
    //         blockchance: 10
    //     },
    //     type: "add"
    // },
    // {
    //     name: "Rune Mastery",
    //     id: "6828695886cc0f20427496a1",
    //     stats: {
    //         resetcdchance: 15,
    //         energyregenbonus: 25
    //     },
    //     type: "add"
    // },
    {
        name: "Adrenaline Rush",
        id: "6828695886cc0f20427496a4",
        stats: {
            speed: 10,
            critchance: 15,
            critdamage: 30
        },
        type: "add"
    },
    // {
    //     name: "Assassin's Reflexes",
    //     id: "6828695886cc0f20427496a7",
    //     stats: {
    //         counterchance: 15,
    //         guaranteedcrit: 100
    //     },
    //     type: "add"
    // },
    {
        name: "Silent Killer",
        id: "6828695886cc0f20427496b2",
        stats: {
            // maxstacks: 10,
            // stackdamage: 3,
            // healthrecover: 20,
            // energyrecover: 20,
            // cooldownreduct: 3,
            critchance: 15,
            // dodgechance: 15
        },
        type: "add"
    },
    {
        name: "Dark Pact",
        id: "6828695886cc0f20427496b5",
        stats: {
            magicdamage: 30,
            magicpen: 30,
            // healthreduct: 5
        },
        type: "add"
    },
    // {
    //     name: "Void Walker",
    //     id: "6828695886cc0f20427496b8",
    //     stats: {
    //         buffduration: 1,
    //         burnimmune: 100,
    //         fearimmune: 100
    //     },
    //     type: "add"
    // },
    {
        name: "Soul Reaper",
        id: "6828695886cc0f20427496c3",
        stats: {
            omnivamp: 30,
            // fearturns: 5,
            // fear: 100,
            // fearduration: 1
        },
        type: "add"
    }
]



// Companion data — only unconditional passive effects (applied when companion is equipped)
const companiondata = [
    {
        name: "Viper",
        id: "682868aa3b00fa188878aa7e",
        stats: {},
        type: "add"
    },
    {
        name: "Terra",
        id: "682868aa3b00fa188878aa7f",
        stats: {
            armor: 20,
            magicresist: 20
        },
        type: "add"
    },
    {
        name: "Gale",
        id: "682868aa3b00fa188878aa80",
        stats: {
            critchance: 10,
            critdamage: 15
        },
        type: "add"
    },
    {
        name: "Shade",
        id: "682868aa3b00fa188878aa81",
        stats: {},
        type: "add"
    },
    {
        name: "Blaze",
        id: "682868aa3b00fa188878aa82",
        stats: {
            speed: 10,
        },
        type: "add"
    }
];

exports.findweaponandskillbyid = (id) => {
    const weapon = weaponstatsdata.find(item => item.id === id);
    const skill = skillsstats.find(item => item.id === id);
    const companion = companiondata.find(item => item.id === id);
    return weapon || skill || companion || null;
}

// Optionally export companiondata for other modules
exports.companiondata = companiondata;