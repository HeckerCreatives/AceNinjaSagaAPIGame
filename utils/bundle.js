

exports.gethairbundle = (itemid) => {
    if (!itemid) {
        return "failed";
    }

    const bundle = itembundledata.find(bundle => bundle.itemid === itemid);

    if (!bundle) {
        return "";
    }

    return bundle.hairid;
}


// both ids here are item
const itembundledata = [

    // male basic bundle 1-6
    {
        itemid: "6828695886cc0f20427495c6",
        hairid: "6828695886cc0f2042749516",
    },
    {
        itemid: "6828695886cc0f20427495c7",
        hairid: "6828695886cc0f2042749517",
    },
    {
        itemid: "6828695886cc0f20427495c8",
        hairid: "6828695886cc0f2042749518",
    },
    {
        itemid: "6828695886cc0f20427495c9",
        hairid: "6828695886cc0f2042749519",
    },
    {
        itemid: "6828695886cc0f20427495ca",
        hairid: "6828695886cc0f2042749520",
    },
    {
        itemid: "6828695886cc0f20427495cb",
        hairid: "6828695886cc0f2042749521",
    },
    // end male basic bundle 1-6
    // male fashion bundle 1-7
    {
        itemid: "6828695886cc0f20427495e0",
        hairid: "6828695886cc0f2042749522",
    },
    {
        itemid: "6828695886cc0f20427495e1",
        hairid: "6828695886cc0f2042749523",
    },
    {
        itemid: "6828695886cc0f20427495e2",
        hairid: "6828695886cc0f2042749524",
    },
    {
        itemid: "6828695886cc0f20427495e3",
        hairid: "6828695886cc0f2042749525",
    },
    {
        itemid: "6828695886cc0f20427495e4",
        hairid: "6828695886cc0f2042749526",
    },
    {
        itemid: "6828695886cc0f20427495e5",
        hairid: "6828695886cc0f2042749527",
    },
    {
        itemid: "6828695886cc0f20427495e6",
        hairid: "6828695886cc0f2042749528",
    },
    // end male fashion bundle 1-7
    // male drip bundle 1-6
    {
        itemid: "6828695886cc0f20427495e7",
        hairid: "6828695886cc0f2042749529",
    },
    {
        itemid: "6828695886cc0f20427495e8",
        hairid: "6828695886cc0f2042749530",
    },
    {
        itemid: "6828695886cc0f20427495e9",
        hairid: "6828695886cc0f2042749531",
    },
    {
        itemid: "6828695886cc0f20427495f0",
        hairid: "6828695886cc0f2042749532",
    },
    {
        itemid: "6828695886cc0f20427495f1",
        hairid: "6828695886cc0f2042749533",
    },
    {
        itemid: "6828695886cc0f20427495f",
        hairid: "6828695886cc0f2042749534",
    },
    // end male drip bundle 1-6
    // male epic bundle 1-6
    {
        itemid: "6828695886cc0f20427495f3",
        hairid: "6828695886cc0f2042749535",
    },
    {
        itemid: "6828695886cc0f20427495f4",
        hairid: "6828695886cc0f2042749536",
    },
    {
        itemid: "6828695886cc0f20427495f5",
        hairid: "6828695886cc0f2042749537",
    },
    {
        itemid: "6828695886cc0f20427495f6",
        hairid: "6828695886cc0f2042749538",
    },
    {
        itemid: "6828695886cc0f20427495f7",
        hairid: "6828695886cc0f2042749539",
    },
    {
        itemid: "6828695886cc0f20427495f8",
        hairid: "6828695886cc0f2042749540",
    },
    // female basic bundle 1-6
    {
        itemid: "6828695886cc0f20427495d1",
        hairid: "6828695886cc0f2042749541"
    },
    {
        itemid: "6828695886cc0f20427495d2",
        hairid: "6828695886cc0f2042749542"
    },
    {
        itemid: "6828695886cc0f20427495d3",
        hairid: "6828695886cc0f2042749543"
    },
    {
        itemid: "6828695886cc0f20427495d4",
        hairid: "6828695886cc0f2042749544"
    },
    {
        itemid: "6828695886cc0f20427495d5",
        hairid: "6828695886cc0f2042749545"
    },
    {
        itemid: "6828695886cc0f20427495d6",
        hairid: "6828695886cc0f2042749546"
    },
    // end female basic bundle 1-6
    // female fashion bundle 1-7
    {
        itemid: "6828695886cc0f20427495d7",
        hairid: "6828695886cc0f2042749547"
    },
    {
        itemid: "6828695886cc0f20427495d8",
        hairid: "6828695886cc0f2042749548"
    },
    {
        itemid: "6828695886cc0f20427495d9",
        hairid: "6828695886cc0f2042749549"
    },
    {
        itemid: "6828695886cc0f2042749500",
        hairid: "6828695886cc0f2042749550"
    },
    {
        itemid: "6828695886cc0f2042749501",
        hairid: "6828695886cc0f2042749551"
    },
    {
        itemid: "6828695886cc0f2042749502",
        hairid: "6828695886cc0f2042749552"
    },
    {
        itemid: "6828695886cc0f2042749503",
        hairid: "6828695886cc0f2042749553"
    },
    // end female fashion bundle 1-7
    // female drip bundle 1-6
    {
        itemid: "6828695886cc0f2042749504",
        hairid: "6828695886cc0f2042749553"
    },
    {
        itemid: "6828695886cc0f2042749505",
        hairid: "6828695886cc0f2042749554"
    },
    {
        itemid: "6828695886cc0f2042749506",
        hairid: "6828695886cc0f2042749555"
    },
    {
        itemid: "6828695886cc0f2042749507",
        hairid: "6828695886cc0f2042749556"
    },
    {
        itemid: "6828695886cc0f2042749508",
        hairid: "6828695886cc0f2042749557"
    },
    {
        itemid: "6828695886cc0f2042749509",
        hairid: "6828695886cc0f2042749558"
    },
    // end female drip bundle 1-6
    // female epic bundle 1-6
    {
        itemid: "6828695886cc0f2042749510",
        hairid: "6828695886cc0f2042749559"
    },
    {
        itemid: "6828695886cc0f2042749511",
        hairid: "6828695886cc0f2042749560"
    },
    {
        itemid: "6828695886cc0f2042749512",
        hairid: "6828695886cc0f2042749561"
    },
    {
        itemid: "6828695886cc0f2042749513",
        hairid: "6828695886cc0f2042749562"
    },
    {
        itemid: "6828695886cc0f2042749514",
        hairid: "6828695886cc0f2042749563"
    },
    {
        itemid: "6828695886cc0f2042749515",
        hairid: "6828695886cc0f2042749564"
    }
]