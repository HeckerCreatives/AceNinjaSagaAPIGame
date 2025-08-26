
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
            health: 300,
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
    }
]

exports.findweaponandskillbyid = (id) => {
    const weapon = weaponstatsdata.find(item => item.id === id);
    const skill = skillsstats.find(item => item.id === id);
    return weapon || skill || null;
}