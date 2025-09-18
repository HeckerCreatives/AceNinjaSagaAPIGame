const { default: mongoose } = require("mongoose")
const Characterdata = require("../models/Characterdata")
const CharacterStats = require("../models/Characterstats")
const Charactertitle = require("../models/Charactertitles")
const Characterwallet = require("../models/Characterwallet")
const { Rankings, RankingHistory } = require("../models/Ranking")
const { CharacterInventory, Item } = require("../models/Market")
const { CharacterSkillTree } = require("../models/Skills")
const Season = require("../models/Season")
const { BattlepassProgress, BattlepassSeason, BattlepassMissionProgress } = require("../models/Battlepass")
const { checkcharacter, getCharacterGender, getdefaultstats, getLevelBasedStats } = require("../utils/character")
const RaidbossFight = require("../models/Raidbossfight")

const Analytics = require("../models/Analytics")

const RankTier = require("../models/RankTier")
const { MonthlyLogin, CharacterMonthlyLogin, CharacterDailySpin, CharacterWeeklyLogin } = require("../models/Rewards")
const moment = require("moment")
const { CharacterChapter, CharacterChapterHistory } = require("../models/Chapter")
const PvP = require("../models/Pvp")
const { Companion, CharacterCompanionUnlocked, CharacterCompanion } = require("../models/Companion")
const { QuestDetails, QuestProgress } = require("../models/Quest")
const { progressutil, multipleprogressutil } = require("../utils/progress")
const { News, NewsRead, ItemNews } = require("../models/News")
const Announcement = require("../models/Announcement")
const Friends = require("../models/Friends")
const { chapterlistdata } = require("../data/datainitialization")
const PvpStats = require("../models/PvpStats")
const { gethairname } = require("../utils/bundle")
const { challengeRewards } = require("../utils/gamerewards")
const { addreset, existsreset } = require("../utils/reset")
const { addXPAndLevel } = require("../utils/leveluptools")
const { addwallet } = require("../utils/wallettools")
const { findweaponandskillbyid } = require("../utils/stats")
const Users = require("../models/Users")

exports.createcharacter = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const { id } = req.user;
        const { username, gender, outfit, hair, eyes, facedetails, color, itemindex, index } = req.body;

        if(!id) {
            return res.status(401).json({ 
                message: "failed", 
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        let searchgender = gender === 0 ? `Male Basic Attire ${Number(outfit) + 1}` : `Female Basic Attire ${Number(outfit) + 1}`;
        const hairname = await gethairname(hair, gender )
        const item = await Item.findOne({ name: searchgender })
        if(!item){
            return res.status(400).json({ message: "failed", data: "Item not found."})
        }


        const hairitem = await Item.findOne({ name: hairname })

        if(!hairitem){
            return res.status(400).json({ message: "failed", data: "Hair item not found."})
        }
            
        const usernameRegex = /^[a-zA-Z0-9]+$/;

        if(username.length < 5 || username.length > 20){
            return res.status(400).json({ message: "failed", data: "Username length should be greater than 5 and less than 20 characters."})
        }
        if(!usernameRegex.test(username)){
            return res.status(400).json({ message: "failed", data: "No special characters are allowed for username"})
        }

        if(!hair){
            return res.status(400).json({ message: "failed", data: "Character creation failed: Missing required attributes. Please select gender, outfit, hair, eyes, face details, and color."})
        }


        // Validate index parameter
        if (!index || index < 1 || index > 4) {
            return res.status(400).json({
                message: "failed",
                data: "Invalid slot index. Must be 1-4."
            });
        }

        // Check user's unlocked slots and validate the requested index
        const userDoc = await Users.findById(id).lean();
        
        // Initialize slotsunlocked array if it doesn't exist, ensuring slot 1 is always unlocked
        let userUnlockedSlots = [];
        if (Array.isArray(userDoc?.slotsunlocked) && userDoc.slotsunlocked.length > 0) {
            userUnlockedSlots = userDoc.slotsunlocked;
        } else {
            userUnlockedSlots = [1]; // Default: only slot 1 is unlocked
        }
        
        // Ensure slot 1 is always included (backward compatibility)
        if (!userUnlockedSlots.includes(1)) {
            userUnlockedSlots.push(1);
        }

        // Check if the requested slot index is unlocked
        if (!userUnlockedSlots.includes(Number(index))) {
            return res.status(400).json({
                message: "failed",
                data: `Slot ${index} is locked. Please unlock it first.`,
                slots: { unlocked: userUnlockedSlots.sort() }
            });
        }

        // Check if the requested slot is already occupied by checking slotIndex field
        const existingCharacterInSlot = await Characterdata.findOne({ 
            owner: id, 
            slotIndex: Number(index),
            status: { $ne: "deleted" } 
        }).lean();

        // Check if slot is already occupied
        if (existingCharacterInSlot) {
            return res.status(400).json({
                message: "failed",
                data: `Slot ${index} is already occupied by character '${existingCharacterInSlot.username}'.`
            });
        }

        const exists = await Characterdata.findOne({ username: { $regex: new RegExp('^' + username + '$', 'i')}, status: { $ne: "deleted" } }).session(session);

        if(exists){
            return res.status(400).json({ message: "failed", data: "Username already used." });
        }
        // Create character data with slot index
        const data = await Characterdata.create([{ 
            owner: new mongoose.Types.ObjectId(id), 
            username,
            gender, 
            outfit,
            hair,
            eyes,
            facedetails,
            color,
            title: 0,
            experience: 0,
            level: 1,
            badge: 0,
            itemindex,
            slotIndex: Number(index) // Store which slot this character occupies
        }], { session });

        const characterId = data[0]._id;

        // Create character stats
        await CharacterStats.create([{
            owner: characterId,
            ...getLevelBasedStats(1)
        }], { session });

        // Character titles will be added when earned through battlepass or other rewards
        // No default titles are created during character creation

        const getranktier = await RankTier.findOne({ name: "Rookie" })
        const currentseason = await Season.findOne({ isActive: "active" })

        // Create rankings
        await Rankings.create([{ 
            owner: characterId, 
            mmr: 0,
            rank: getranktier._id, 
            season: currentseason._id
        }], { session });

        // Create skill tree
        await CharacterSkillTree.create([{ 
            owner: characterId, 
            skillPoints: 0, 
            skills: [], 
            unlockedSkills: [] 
        }], { session });

        // Create wallets
        const walletListData = ["coins", "crystal", "topupcredit"];
        const walletBulkwrite = walletListData.map(walletData => ({
            insertOne: {
                document: { owner: characterId, type: walletData, amount: "0" }
            }
        }));
        await Characterwallet.bulkWrite(walletBulkwrite, { session });

        // Create inventory
        const inventoryListData = ["weapon", "outfit", "hair", "face", "eyes", "skincolor", "skins", "goldpacks", "crystalpacks", "chests", "freebie"];
        const inventoryBulkWrite = inventoryListData.map(inventoryData => ({
            insertOne: {
                document: { owner: characterId, type: inventoryData }
            }
        }));
        await CharacterInventory.bulkWrite(inventoryBulkWrite, { session });

        await CharacterInventory.findOneAndUpdate(
        { owner: characterId, type: "outfit" },
        {
            $push: {
                items: {
                    item: item._id,
                    quantity: 1,
                    isEquipped: true, // Optionally equip it by default
                    acquiredAt: new Date()
                }
            }
        },
        { session }
    );

    await CharacterInventory.findOneAndUpdate(
        { owner: characterId, type: "hair" },
        {
            $push: {
                items: {
                    item: hairitem._id,
                    quantity: 1,
                    isEquipped: true, // Optionally equip it by default
                    acquiredAt: new Date()
                }
            }
        },
        { session }
    );
        // FIND CURRENT BATTLEPASS
    const currentdate = new Date();
    const currentSeason = await BattlepassSeason.findOne({
        startDate: { $lte: currentdate },
        endDate: { $gte: currentdate }
    }, null, { session }).lean();

    if(!currentSeason) {
        await session.abortTransaction();
        return res.status(400).json({ 
            message: "failed", 
            data: "No active battlepass season found." 
        });
    }

        const chapterlist = chapterlistdata.map(chapter => ({
            owner: characterId,
            name: chapter.name, 
            completed: chapter.completed,
            chapter: chapter.chapter
        }));

        await CharacterChapter.insertMany(chapterlist, { session })
        
        
        await BattlepassProgress.create([{
            owner: characterId,
            season: currentSeason._id, 
            currentTier: 1,
            currentXP: 0,
            hasPremium: false,
            claimedRewards: []
        }], { session });
                
            // Initialize free missions
            for (const mission of currentSeason.freeMissions) {
                const requirementType = Object.keys(mission.requirements)[0];

                await BattlepassMissionProgress.create([{
                    owner: characterId,
                    season: currentSeason._id,
                    missionName: mission.missionName,
                    requirementtype: requirementType,
                    type: "free",
                    missionId: new mongoose.Types.ObjectId(mission._id), 
                    progress: 0,
                    isCompleted: false,
                    isLocked: false,
                    daily: mission.daily,
                    lastUpdated: new Date()
                }], { session });
            }

            // Initialize premium missions
            for (const mission of currentSeason.premiumMissions) {
                const requirementType = Object.keys(mission.requirements)[0];

                await BattlepassMissionProgress.create([{
                    owner: characterId,
                    season: currentSeason._id,
                    missionName: mission.missionName,
                    type: "premium",
                    missionId: new mongoose.Types.ObjectId(mission._id),
                    requirementtype: requirementType,
                    progress: 0, 
                    isCompleted: false,
                    isLocked: true, // Premium missions start locked
                    daily: mission.daily,
                    lastUpdated: new Date()
                }], { session });
            }

    const searchquest = await QuestDetails.find({},null, {session}).lean()
            for (const mission of searchquest) {
                const requirementType = Object.keys(mission.requirements)[0];

                await QuestProgress.create([{
                    owner: characterId,
                    quest: new mongoose.Types.ObjectId(mission._id),
                    requirementtype: requirementType,
                    progress: 0,
                    isCompleted: false,
                    daily: mission.daily,
                    lastUpdated: new Date()
                }], { session });
            }



        const daysArray = [];
                for (let i = 1; i <= 28; i++) {
                    daysArray.push({ day: i, loggedIn: false, missed: false, claimed: false });
                }

                await CharacterMonthlyLogin.create([{
                    owner: characterId,
                    days: daysArray,
                    totalLoggedIn: 0,
                    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    currentDay: new Date().getDate()
                }], { session });
        await CharacterWeeklyLogin.create([{
            owner: characterId,
            daily: {
            day1: false,
            day2: false, 
            day3: false,
            day4: false,
            day5: false,
            day6: false,
            day7: false,
            },
            currentDay: "day1",
            lastClaimed: new Date(Date.now() - 24*60*60*1000)
        }], { session })

        await CharacterDailySpin.create([{
            owner: characterId,
            spin: true,
            expspin: true,
        }], { session })

        const allCompanions = await Companion.find().lean()

        const companionBulkWrite = allCompanions.map(companion => ({
            insertOne: {
                document: {
                    owner: characterId,
                    companion: companion._id,
                    isLocked: companion.name === "Blaze" || companion.name === "Shade" ? true : false,
                }
            }
        }));

        await CharacterCompanionUnlocked.bulkWrite(companionBulkWrite, { session });

        await PvpStats.create([{
                owner: characterId,
                win: 0,
                lose: 0,
                totalMatches: 0,
                winRate: 0,
                rank: new mongoose.Types.ObjectId("684ce1f4c61e8f1dd3ba04fa") // Default rank ID, adjust as necessary
            }], { session });


        await RaidbossFight.create([{
            owner: new mongoose.Types.ObjectId(characterId),
            status: "notdone"
        }], {session})
        
        await session.commitTransaction();
        return res.status(200).json({ 
            message: "success", 
            data: {
                characterId: characterId,
                slotIndex: index,
                username: username
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.log(`Error in character creation: ${error}`);
        return res.status(400).json({ 
            message: "bad-request", 
            data: error.message 
        });
    } finally {
        session.endSession();
    }
}

// Delete a character and all associated data
exports.deletecharacter = async (req, res) => {
    const { id } = req.user;
    const { characterid } = req.body;

    if (!id) return res.status(401).json({ message: 'failed', data: 'Unauthorized' });
    if (!characterid) return res.status(400).json({ message: 'failed', data: 'Character ID is required' });

    const checker = await checkcharacter(id, characterid);
    if (checker === 'failed') return res.status(403).json({ message: 'failed', data: 'You are not authorized to delete this character' });

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const objectId = new mongoose.Types.ObjectId(characterid);

        // Delete main character document
        await Characterdata.findOneAndUpdate({ _id: objectId }, { status: "deleted" }).session(session);

        // delete friends where character is involved
        await Friends.deleteMany({ 
            $or: [
                { character: objectId },
                { friend: objectId }
            ]
        }).session(session);


        await session.commitTransaction();
        return res.status(200).json({ message: 'success' });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error deleting character:', error);
        return res.status(500).json({ message: 'failed', data: 'Failed to delete character' });
    } finally {
        session.endSession();
    }
}
// exports.createcharacter = async (req, res) => {

//     const { id } = req.user
//     const { username, gender, outfit, hair, eyes, facedetails, color, itemindex } = req.body
   
//     if(!id){
//         return res.status(401).json({ message: "failed", data: "You are not authorized to view this page. Please login the right account to view the page."})
//     }

//     const usernameRegex = /^[a-zA-Z0-9]+$/;

//     if(username.length < 5 || username.length > 20){
//         return res.status(400).json({ message: "failed", data: "Username length should be greater than 5 and less than 20 characters."})
//     }
//     if(!usernameRegex.test(username)){
//         return res.status(400).json({ message: "failed", data: "No special characters are allowed for username"})
//     }

//     if(!hair){
//         return res.status(400).json({ message: "failed", data: "Character creation failed: Missing required attributes. Please select gender, outfit, hair, eyes, face details, and color."})
//     }


//     const characterCount = await Characterdata.countDocuments({ owner: id });
//     if (characterCount >= 4) {
//         return res.status(400).json({ message: "failed", data: "Character limit reached. You cannot create more than 4 characters." });
//     }   

//     await Characterdata.findOne({ username: { $regex: new RegExp('^' + username + '$', 'i')} })
//     .then(async character => {
//         if(character){
//             return res.json({ message: "failed", data: "Username already exist."})
//         } else {      
//             await Characterdata.create({ 
//                 owner: id, 
//                 username: username,
//                 gender: gender, 
//                 outfit: outfit,
//                 hair: hair,
//                 eyes: eyes,
//                 facedetails: facedetails,
//                 color: color,
//                 title: 0,
//                 experience: 0,
//                 level: 1,
//                 badge: "",
//                 itemindex: itemindex
//             })
//             .then(async data => {
//                 const stat = await CharacterStats.create({
//                     owner: data._id,
//                     health: 100,
//                     energy: 50,
//                     armor: 20,
//                     magicresist: 15,
//                     speed: 10,
//                     attackdamage: 9,
//                     armorpen: 0,
//                     magicpen: 0,
//                     critchance: 0,
//                     magicdamage: 15,
//                     lifesteal: 0,
//                     omnivamp: 0,
//                     healshieldpower: 0,
//                     critdamage: 0,
//                 })
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })

//               const title =  await Charactertitle.create({ owner: data._id, items: [{ itemid: "" }]})
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ _id: stat._id, owner: data._id })
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })
                
//               const rank = await Rankings.create({ owner: data._id, mmr: 10 })
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ _id: stat._id, owner: data._id })
//                     await Charactertitle.findOneAndDelete({ _id: title._id, owner: data._id })
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })

//                const st = await CharacterSkillTree.create({ owner: data._id, skillPoints: 0, skills: [], unlockedSkills: [] })
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ _id: stat._id, owner: data._id })
//                     await Charactertitle.findOneAndDelete({ _id: title._id, owner: data._id })
//                     await Rankings.findOneAndDelete({ _id: st._id, owner: data._id })
//                 })

//                 const walletListData = ["coins", "crystal", "emerald"];
//                 const walletBulkwrite = walletListData.map(walletData => ({
//                     insertOne: {
//                         document: { owner: data._id, type: walletData, amount: "0" }
//                     }
//                 }));

//                 await Characterwallet.bulkWrite(walletBulkwrite)
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ owner: data._id })
//                     await Charactertitle.findOneAndDelete({ owner: data._id })
//                     await Rankings.findOneAndDelete({ owner: data._id })
//                     await CharacterSkillTree.findOneAndDelete({ owner: data._id })
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })

//                 const inventoryListData = ["weapon", "outfit", "hair", "face", "eyes", "skincolor", "skins"];
//                 const inventoryBulkWrite = inventoryListData.map(inventoryData => ({
//                     insertOne: {
//                         document: { owner: data._id, type: inventoryData }
//                     }
//                 }));

//                 await CharacterInventory.bulkWrite(inventoryBulkWrite)
//                 .catch(async error => {
//                     await Characterdata.findByIdAndDelete(data._id)
//                     await CharacterStats.findOneAndDelete({ owner: data._id })
//                     await Charactertitle.findOneAndDelete({ owner: data._id })
//                     await Characterwallet.deleteMany({ owner: data._id })
//                     await Rankings.findOneAndDelete({ owner: data._id })
//                     res.status(400).json({ message: "bad-request", data: error.message })
//                 })

//                 return res.status(200).json({ message: "success"})
//             })
//           .catch(error => res.status(400).json({ message: "bad-request", data: error.message }))
//         }
//     })
//     .catch(error => res.status(400).json({ message: "bad-request", data: error.message }))

// }

exports.getplayerdata = async (req, res) => {
    const { characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input character ID."})
    }

    const matchCondition = [
        {
            $match: {
                _id: new mongoose.Types.ObjectId(characterid),
                status: { $ne: "deleted" }
            }
        },
        {
            $lookup: {
                from: "characterwallets",  
                localField: "_id",          
                foreignField: "owner",
                as: "wallet"      
            },
        },
        {
            $lookup: {
                from: "characterinventories",             
                localField: "_id",       
                foreignField: "owner",       
                as: "inventory"
            }
        },        
        {
            $lookup: {
                from: "rankings",             
                localField: "_id",       
                foreignField: "owner",       
                as: "ranking"
            }
        },
        {
            $lookup: {
                from: "characterstats",
                localField: "_id",
                foreignField: "owner",
                as: "stats"
            }
        },
        {
            $lookup: {
                from: "characterskilltrees",
                localField: "_id",
                foreignField: "owner",
                as: "skilltree"
            }
        },
        {
            $project: {
                id: 1,
                username: 1,
                title: 1,
                gender: 1,
                level: 1,
                experience: 1,
                badge: 1,
                itemindex: 1,
                createdAt: 1,
                customid: 1,
                stats: { $arrayElemAt: ["$stats", 0] },      // Flatten stats
                mmr: { $arrayElemAt: ["$ranking.mmr", 0] },      // Flatten ranking.mmr
                sp: { $arrayElemAt: ["$skilltree.skillPoints", 0]}
            }
        }
    ];
    // Parallelize independent DB calls and use lean/plain results where possible
    const objectId = new mongoose.Types.ObjectId(characterid);

    const totalWinsP = PvP.countDocuments({ status: 1, owner: objectId });
    const characterDataP = Characterdata.aggregate(matchCondition).allowDiskUse(true).exec();
    const highestmmrP = RankingHistory.findOne({ owner: objectId }).lean();

    const characterSkillsP = CharacterSkillTree.aggregate([
        { $match: { owner: objectId } },
        { $unwind: "$skills" },
        { $lookup: { from: "skills", localField: "skills.skill", foreignField: "_id", as: "skillDetails" } },
        { $unwind: "$skillDetails" },
        { $match: { "skillDetails.type": "Stat" } }
    ]).allowDiskUse(true).exec();

    const equippedPassiveSkillsP = CharacterSkillTree.aggregate([
        { $match: { owner: objectId } },
        { $unwind: "$skills" },
        { $match: { "skills.isEquipped": true } },
        { $lookup: { from: "skills", localField: "skills.skill", foreignField: "_id", as: "skillDetails" } },
        { $unwind: "$skillDetails" },
        { $match: { "skillDetails.type": "Passive" } }
    ]).allowDiskUse(true).exec();

    const equippedWeaponsP = CharacterInventory.aggregate([
        { $match: { owner: objectId, type: "weapon" } },
        { $unwind: "$items" },
        { $match: { "items.isEquipped": true } },
        // { $lookup: { from: "items", localField: "items.item", foreignField: "_id", as: "weaponDetails" } },
        // { $unwind: { path: "$weaponDetails", preserveNullAndEmptyArrays: true } }
    ]).allowDiskUse(true).exec();

    const equippedCompanionsP = CharacterCompanion.find({ owner: objectId, isEquipped: true }).lean();

    const [ totalWins, characterDataArr, highestmmrreached, characterSkills, equippedPassiveSkills, equippedWeapons, equippedCompanions ] = await Promise.all([
        totalWinsP,
        characterDataP,
        highestmmrP,
        characterSkillsP,
        equippedPassiveSkillsP,
        equippedWeaponsP,
        equippedCompanionsP
    ]);

    const characterData = characterDataArr;

    if (characterData[0]) {
        characterData[0].highestmmr = highestmmrreached ? highestmmrreached.mmr : 0;
        characterData[0].highestmmrrank = highestmmrreached ? highestmmrreached.rank : "684ce1f4c61e8f1dd3ba04fa";
    }


    // Base stats (ensure defaults to 0 to avoid NaN in calculations)
    const base = characterData[0]?.stats || {};
    const totalStats = {
        health: base.health || 0,
        energy: base.energy || 0,
        armor: base.armor || 0,
        magicresist: base.magicresist || 0,
        speed: base.speed || 0,
        attackdamage: base.attackdamage || 0,
        armorpen: base.armorpen || 0,
        magicpen: base.magicpen || 0,
        critchance: base.critchance || 0,
        magicdamage: base.magicdamage || 0,
        lifesteal: base.lifesteal || 0,
        omnivamp: base.omnivamp || 0,
        healshieldpower: base.healshieldpower || 0,
        critdamage: base.critdamage || 0 
    };
    // Batch fetch unique skill/weapon/companion details to avoid per-item DB calls
    const passiveIds = (equippedPassiveSkills || []).map(s => String(s.skills.skill));
    const weaponIds = (equippedWeapons || []).map(w => String(w.items.item));
    // equippedCompanions stores a `companion` ObjectId referencing Companion
    const companionIds = (equippedCompanions || []).map(c => String(c.companion));
    const uniqueIds = Array.from(new Set([...passiveIds, ...weaponIds, ...companionIds]));

    const detailsMap = {};
    if (uniqueIds.length > 0) {
        // Wrap calls in an async function so we safely handle both sync and async implementations
        const details = await Promise.all(uniqueIds.map(async id => {
            try {
                return await findweaponandskillbyid(id);
            } catch (err) {
                return null;
            }
        }));
        uniqueIds.forEach((id, idx) => { if (details[idx]) detailsMap[id] = details[idx]; });
    }

    // Apply passive skills
    for (const skill of (equippedPassiveSkills || [])) {
        const id = String(skill.skills.skill);
        const result = detailsMap[id];
        if (!result) continue;
            if (result.type === "add"){
            Object.entries(result.stats || {}).forEach(([stat, value]) => {
                if (totalStats.hasOwnProperty(stat)) totalStats[stat] += value;
            });
        }
    }

    // Apply equipped weapon stats
    for (const weapon of (equippedWeapons || [])) {
        const id = String(weapon.items.item);
        const result = detailsMap[id];
        if (!result) continue;
        if (result.type === "percentage"){
            Object.entries(result.stats || {}).forEach(([stat, value]) => {
                if (totalStats.hasOwnProperty(stat)) {
                    const multiplier = 1 + ((Number(value) || 0) / 100);
                    totalStats[stat] = Math.ceil(totalStats[stat] * multiplier);
                }
            });
        } else if (result.type === "add"){
            Object.entries(result.stats || {}).forEach(([stat, value]) => {
                if (totalStats.hasOwnProperty(stat)) totalStats[stat] += value;
            });
        }
    }

    // Apply equipped companion stats (unconditional passive effects)
    for (const comp of (equippedCompanions || [])) {
        const id = String(comp.companion);
        const result = detailsMap[id];
        if (!result) continue;
        if (result.type === "percentage"){
            Object.entries(result.stats || {}).forEach(([stat, value]) => {
                if (totalStats.hasOwnProperty(stat)) {
                    const multiplier = 1 + ((Number(value) || 0) / 100);
                    totalStats[stat] = Math.ceil(totalStats[stat] * multiplier);
                }
            });
        } else if (result.type === "add"){
            Object.entries(result.stats || {}).forEach(([stat, value]) => {
                if (totalStats.hasOwnProperty(stat)) totalStats[stat] += value;
            });
        }
    }
    for (const skill of (characterSkills || [])) {
        if (skill.skillDetails && skill.skillDetails.effects) {
            const effects = new Map(Object.entries(skill.skillDetails.effects));
            effects.forEach((value, stat) => {
                if (totalStats.hasOwnProperty(stat)) totalStats[stat] += value * (skill.skills.level || 0);
            });
        }
    }
    for (const skill of (equippedPassiveSkills || [])) {
        const id = String(skill.skills.skill);
        const result = detailsMap[id];
        if (!result) continue;
            if (result.type === "percentage"){
            Object.entries(result.stats || {}).forEach(([stat, value]) => {
                if (totalStats.hasOwnProperty(stat)) {
                    const multiplier = 1 + ((Number(value) || 0) / 100);
                    totalStats[stat] = Math.ceil(totalStats[stat] * multiplier);
                }
            });
        }
    }


    if (characterData.length > 0){
        const result = await getCharacterGender(characterid);
        characterData[0].pvpwins = totalWins || 0;
        characterData[0].clanwarwins = 0;
        characterData[0].stats = totalStats;
        characterData[0].gender = result.genderString;
    }

    return res.status(200).json({ message: "success", data: characterData[0]})
}

exports.getplayercharacters = async (req, res) => {
    const {id} = req.user
    // load user's slot unlock status
    const userDoc = await Users.findById(id).lean();
    
    // Initialize slotsunlocked array if it doesn't exist, ensuring slot 1 is always unlocked
    let userUnlockedSlots = [];
    if (Array.isArray(userDoc?.slotsunlocked) && userDoc.slotsunlocked.length > 0) {
        userUnlockedSlots = userDoc.slotsunlocked;
    } else {
        userUnlockedSlots = [1]; // Default: only slot 1 is unlocked
    }
    
    // Ensure slot 1 is always included (backward compatibility)
    if (!userUnlockedSlots.includes(1)) {
        userUnlockedSlots.push(1);
    }

    const maxSlots = userUnlockedSlots.length;

    const tempdata = await Characterdata.find({ owner: new mongoose.Types.ObjectId(id), status: { $ne: "deleted" } })
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem while fetching character datas for user: ${id}. Error: ${err}`)
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later." })
        })

    // Create a map of characters by their slotIndex for easy lookup
    const charactersBySlot = {};
    tempdata.forEach(character => {
        if (character.slotIndex >= 1 && character.slotIndex <= 4) {
            charactersBySlot[character.slotIndex] = character;
        }
    });

    // Build slot list: filled slots show character info, empty slots show locked/unlocked status
    const data = {};
    const GLOBAL_MAX_SLOTS = 4;
    
    for (let slot = 1; slot <= GLOBAL_MAX_SLOTS; slot++) {
        const character = charactersBySlot[slot];
        const isSlotUnlocked = userUnlockedSlots.includes(slot);
        
        if (character) {
            const { _id, username, gender, outfit, hair, eyes, facedetails, level, color, title, experience, badge, itemindex, createdAt, slotIndex } = character;
            const createdAtDate = new moment(createdAt);
            const formattedDate = createdAtDate.format("YYYY-MM-DD");
            data[slot] = {
                locked: !isSlotUnlocked,
                used: true,
                UserID: _id,
                Username: username,
                CharacterCostume: {
                    Gender: gender,
                    OutfitId: outfit,
                    HairId: hair,
                    EyesId: eyes,
                    FaceDetailsId: facedetails,
                    ColorId: color,
                },
                Title: title,
                Level: level,
                CurrentXP: experience,
                badge: badge,
                creationdate: formattedDate,
                slotIndex: slotIndex || slot, // Include slotIndex for reference, fallback to slot number
            };
        } else {
            // empty slot
            data[slot] = {
                locked: !isSlotUnlocked, // true if this slot index is not in slotsunlocked array
                used: false,
            };
        }
    }

    return res.json({ 
        message: "success", 
        data: data, 
        slots: { 
            max: maxSlots,
            unlocked: userUnlockedSlots.sort() // Show which specific slots are unlocked
        } 
    })
}

// Unlock / increase character slot for authenticated user
exports.unlockcharacterslot = async (req, res) => {
    const { id } = req.user;
    const { index } = req.body; // slot index to unlock (1-4)
    if (!id) return res.status(401).json({ message: "failed", data: "Unauthorized" });
    if (!index || index < 1 || index > 4) return res.status(400).json({ message: "failed", data: "Invalid slot index. Must be 1-4." });

    try {
        const user = await Users.findById(id);
        if (!user) return res.status(404).json({ message: "failed", data: "User not found" });

        // Initialize slotsunlocked array if it doesn't exist and ensure slot 1 is always unlocked
        if (!Array.isArray(user.slotsunlocked)) {
            user.slotsunlocked = [1]; // Slot 1 is always unlocked by default
        } else if (!user.slotsunlocked.includes(1)) {
            user.slotsunlocked.push(1);
        }

        // Check if slot is already unlocked
        if (user.slotsunlocked.includes(index)) {
            return res.status(400).json({ message: "failed", data: "Slot is already unlocked" });
        }

        // Check if all slots are unlocked
        if (user.slotsunlocked.length >= 4) {
            return res.status(400).json({ message: "failed", data: "All character slots are already unlocked" });
        }

        // Optionally: validate payment here (deduct crystals etc.) before unlocking
        user.slotsunlocked.push(index);
        user.slotsunlocked.sort(); // Keep array sorted for consistency
        
        // Update characterSlots for backward compatibility
        user.characterSlots = user.slotsunlocked.length;
        
        await user.save();

        return res.status(200).json({ 
            message: "success", 
            data: { 
                characterSlots: user.characterSlots,
                slotsunlocked: user.slotsunlocked,
                unlockedSlot: index
            } 
        });
    } catch (err) {
        console.error("unlockcharacterslot error:", err);
        return res.status(500).json({ message: "failed", data: "Could not unlock character slot" });
    }
}

exports.getinventory = async (req, res) => {
    const { characterid } = req.query

    if(!characterid) {
        res.status(400).json({ message: "failed", data: "Please input characterId"})
    }

    const inventorydata = await CharacterInventory.find({ owner: new mongoose.Types.ObjectId(characterid)})
    .populate('items.item') // Changed from items.itemid to items.item
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching inventory data for user: ${characterid}. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })


    const data = []
    inventorydata.forEach(temp => {
        data.push({
            id: temp.id,
            type: temp.type,
            items: temp.items
        })
    })

    return res.status(200).json({ message: "success", data: data})
}

exports.getxplevel = async (req, res) => {
    const { characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input user ID"})
    }

    const xpleveldata = await Characterdata.findOne(
        { _id: new mongoose.Types.ObjectId(characterid)},
        { experience: 1, level: 1, username: 1}
    )
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem while fetching user exp level data. Error ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem in the server. Please try again later."})
    })

    return res.status(200).json({ message: "success", data: xpleveldata})
}

exports.getWallet = async (req, res) => {

    const { characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "There's no character ID."})
    }

    const walletData = await Characterwallet.find({ owner: new mongoose.Types.ObjectId(characterid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching wallet data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const data = {}

    walletData.forEach(temp => {
        data[temp.type] = temp.amount
    })

    return res.status(200).json({ message: "success", data: data})
}


exports.getcharactertitles = async (req, res) => {
    const { characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input character ID."})
    }

    const charactertitles = await Charactertitle.find({ owner: new mongoose.Types.ObjectId(characterid)})
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character titles. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })


    const formattedResponse = {
        data: charactertitles.reduce((acc, title, index) => {
            acc[index + 1] = {
                id: title._id,
                titleRef: title.title,
                name: title.name,
                index: title.index
            }
            return acc
        }, {})
    }

    return res.status(200).json({ 
        message: "success", 
        data: formattedResponse.data 
    })
}

exports.addxp = async (req, res) => {
    const { characterid, xp } = req.body;

    if(!characterid || !xp) {
        return res.status(400).json({ 
            message: "failed", 
            data: "Please input character ID and XP."
        });
    }

    try {
        const character = await Characterdata.findOne({ 
            _id: new mongoose.Types.ObjectId(characterid)
        });

        if(!character) {
            return res.status(400).json({ 
                message: "failed", 
                data: "Character not found."
            });
        }

        const result = await addXPAndLevel(character, xp);

        if (result === "failed"){
            return res.status(400).json({ 
                message: "failed", 
                data: "Failed to add XP. Please try again later."
            });
        }

        return res.status(200).json({ 
            message: "success",
            data: result
        });

    } catch (err) {
        console.log(`Error in XP addition: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "There's a problem with the server. Please contact support for more details."
        });
    }
};

exports.updateplayerprofile = async (req, res) => {

    const { username, characterid } = req.body

    if(!username || !characterid){
        return res.status(400).json({ message: "failed", data: "Please input username and character ID."})
    }

    const existingcharacter = await Characterdata.findOne({ username: { $regex: new RegExp('^' + username + '$', 'i')}, status: { $ne: "deleted" } })

    if (existingcharacter){
        return res.status(400).json({ message: "failed", data: "There's an existing character name! Please enter a different username."})
    }

    const character = await Characterdata.findOne({ _id: new mongoose.Types.ObjectId(characterid)})

    if(!character){
        return res.status(400).json({ message: "failed", data: "Character not found."})
    }

    const wallet = await Characterwallet.findOne({owner: new mongoose.Types.ObjectId(characterid), type: "crystal"})

    if (wallet.amount < 500){
        return res.status(400).json({message: "faield", data: "Crystals not enough! Please buy more to change your name"})
    }

    const usernameRegex = /^[a-zA-Z0-9]+$/;

    if(username.length < 5 || username.length > 20){
        return res.status(400).json({ message: "failed", data: "Username length should be greater than 5 and less than 20 characters."})
    }
    if(!usernameRegex.test(username)){
        return res.status(400).json({ message: "failed", data: "No special characters are allowed for username"})
    }

    character.username = username

    await character.save()
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while saving character data. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    await Characterwallet.findOneAndUpdate({owner: new mongoose.Types.ObjectId(characterid), type: "crystal"}, {$inc: {amount: -500}})

    return res.status(200).json({ message: "success"})

}

exports.updateplayertitle = async (req, res) => {
    const { titleid, characterid } = req.body;

    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        // Find title in character's titles
        const character = await Charactertitle.findOne(
            { owner: new mongoose.Types.ObjectId(characterid) }
        ).session(session);

        if (!character) {
            await session.abortTransaction();
            return res.status(404).json({ 
                message: "failed", 
                data: "Character title not found" 
            });
        }

        // Check if title exists in character's titles
        const hasTitle = character.items.some(item => item.itemid === titleid);
        if (!hasTitle) {
            await session.abortTransaction();
            return res.status(404).json({ 
                message: "failed", 
                data: "Title not found in character's collection" 
            });
        }

        // check if there is a title equipped
        const equippedTitle = character.items.find(item => item.isEquipped === true);
        if (equippedTitle) {
            // Unequip the title
            equippedTitle.isEquipped = false;
        }

        // Equip the new title
        const titleIndex = character.items.findIndex(item => item.itemid === titleid);
        character.items[titleIndex].isEquipped = true;

        // Save the updated title

        await character.save({ session });

        await session.commitTransaction();
        return res.status(200).json({ 
            message: "success",
        });

    } catch (err) {
        await session.abortTransaction();
        console.log(`Error in update title transaction: ${err}`);
        return res.status(500).json({ 
            message: "failed", 
            data: "Failed to update title" 
        });
    } finally {
        session.endSession();
    }
}

// exports.getranking = async (req, res) => {
//     const { characterid } = req.query 

//     if(!characterid) {
//         res.status(400).json({ message: "failed", data: "Please input characterId"})
//     }

//     const rankingData = await Rankings.find({ owner: new mongoose.Types.ObjectId(characterid)})
//     .then(data => data)
//     .catch(err => {
//         console.log(`There's a problem encountered while fetching ranking. Error: ${err}`)

//         return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
//     })

//     return res.status(200).json({ message: "success", data: rankingData})

// }

// exports.getcharacterrank = async (req, res) => {
//     const { characterid } = req.query;

//     if (!characterid) {
//         return res.status(400).json({ message: "failed", data: "Please input characterId" });
//     }

//     try {
//         const rankingData = await Rankings.findOne(
//             { owner: new mongoose.Types.ObjectId(characterid) },
//             "mmr rank"
//         ).populate("rank", "name icon");

//         if (!rankingData) {
//             return res.status(404).json({ message: "not-found", data: "Character rank not found" });
//         }

//         return res.status(200).json({
//             message: "success",
//             data: {
//                 mmr: rankingData.mmr,
//                 rankTier: rankingData.rank?.name || "Unranked",
//                 icon: rankingData.rank?.icon || null
//             }
//         });
//     } catch (err) {
//         console.error(`Error fetching ranking: ${err}`);
//         return res.status(500).json({
//             message: "server-error",
//             data: "There's a problem with the server. Please try again later."
//         });
//     }
// };

exports.getcharacterstats = async (req, res) => {
    try {
        const { id } = req.user;
        const { characterid } = req.query;

        if(!characterid){
            return res.status(400).json({ 
                message: "failed", 
                data: "Please input character ID."
            });
        }

        const checker = await checkcharacter(id, characterid);

        if (checker === "failed") {
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        // Fetch base character stats
        const characterStats = await CharacterStats.findOne({ 
            owner: new mongoose.Types.ObjectId(characterid) 
        });

        if (!characterStats) {
            return res.status(404).json({
                message: "failed",
                data: "Character stats not found"
            });
        }

        // Fetch equipped skills and their effects
        const characterSkills = await CharacterSkillTree.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(characterid)
                }
            },
            {
                $unwind: "$skills"
            },
            {
                $lookup: {
                    from: "skills",
                    localField: "skills.skill",
                    foreignField: "_id",
                    as: "skillDetails"
                }
            },
            {
                $unwind: "$skillDetails"
            },
            {
                $match: {
                    "skillDetails.type": "Stat" // Only get stats-type skills
                }
            }
        ]);


        const totalStats = {
            health: characterStats.health,
            energy: characterStats.energy,
            armor: characterStats.armor,
            magicresist: characterStats.magicresist,
            speed: characterStats.speed,
            attackdamage: characterStats.attackdamage,
            armorpen: characterStats.armorpen,
            magicpen: characterStats.magicpen,
            critchance: characterStats.critchance,
            magicdamage: characterStats.magicdamage,
            lifesteal: characterStats.lifesteal,
            omnivamp: characterStats.omnivamp,
            healshieldpower: characterStats.healshieldpower,
            critdamage: characterStats.critdamage
        };

        characterSkills.forEach(skill => {
            if (skill.skillDetails.effects) {
                const effects = new Map(Object.entries(skill.skillDetails.effects));

                effects.forEach((value, stat) => {
                    if (totalStats.hasOwnProperty(stat)) {
                        totalStats[stat] += value * skill.skills.level;
                    }
                });
            }
        });

        return res.json({
            message: "success",
            data: totalStats
        });

    } catch (error) {
        console.error('Error in getcharacterstats:', error);
        return res.status(500).json({
            message: "failed",
            data: "An error occurred while fetching character stats"
        });
    }
};

exports.equipunequiptitle = async (req, res) => {

    const { id } = req.user
    const { characterid, titleindex } = req.body

    if(!id){
        return res.status(401).json({ message: "failed", data: "You are not authorized to view this page. Please login the right account to view the page."})
    }
    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input character ID."})
    }

    if(isNaN(titleindex)){
        return res.status(400).json({ message: "failed", data: "Title index must be a number."})
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page."
        });
    }

    await Characterdata.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(characterid)}, { $set: { title: titleindex } })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character title. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success" })
}

exports.equipunequipbadge = async (req, res) => {

    const { id } = req.user
    const { characterid, badgeindex } = req.body

    if(!id){
        return res.status(401).json({ message: "failed", data: "You are not authorized to view this page. Please login the right account to view the page."})
    }
    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input character ID."})
    }
    if(isNaN(badgeindex)){
        return res.status(400).json({ message: "failed", data: "Badge index must be a number."})
    }
    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page."
        });
    }

    await Characterdata.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(characterid)}, { $set: { badge: badgeindex } })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character badge. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please try again later."})
    })

    return res.status(200).json({ message: "success" })
}

exports.getcharacterchapters = async (req, res) => {

    const { id } = req.user

    const { characterid } = req.query

    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input character ID."})
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }    

    const characterchapters = await CharacterChapter.find({ owner: new mongoose.Types.ObjectId(characterid)}).sort({ chapter: 1 })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character chapters. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const formattedResponse = {
        data: characterchapters.reduce((acc, chapter, index) => {
            acc[chapter.name] = {
                id: chapter._id,
                name: chapter.name,
                completed: chapter.completed,
                chapter: chapter.chapter
            }
            return acc
        }, {})
    }

    return res.status(200).json({ 
        message: "success", 
        data: formattedResponse.data 
    })
}

exports.challengechapter = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.startTransaction();

        const { id } = req.user;
        const { characterid, chapter, challenge, status, totaldamage, selfheal, skillsused, enemydefeated } = req.body;


        if (!characterid || !chapter || !challenge || !status || totaldamage === undefined || selfheal === undefined || skillsused === undefined || enemydefeated === undefined) {
           throw new Error("Missing required fields: characterid, chapter, challenge, status, totaldamage, selfheal, skillsused, enemydefeated");
        }

        const checker = await checkcharacter(id, characterid);

        if (checker === "failed") {
            throw new Error("Unauthorized: You are not authorized to view this page. Please login the right account to view the page.");
        }
        let name = `chapter${chapter}challenge${challenge}`;


        const charchapter = await CharacterChapter.findOne({ 
            owner: new mongoose.Types.ObjectId(characterid), 
            name: name 
        }).session(session);

        if (!charchapter) {
           throw new Error("Character chapter not found.");
        }

        charchapter.completed = true;
        await charchapter.save({ session });

        const character = await Characterdata.findOne({ 
            _id: new mongoose.Types.ObjectId(characterid) 
        }).session(session);

        if (!character) {
            throw new Error("Character not found.");
        }
        const characterchapterhistory = await CharacterChapterHistory.findOne({
            owner: new mongoose.Types.ObjectId(characterid),
            chapter: chapter,
            challenge: challenge,
            status: "win"
        }).session(session);

        const rewards = challengeRewards[`chapter${chapter}challenge${challenge}`];
        if (!characterchapterhistory && status === "win") {

            let currentLevel = character.level;
            let baseXP = 100;
            let growth = 1.35;

            let xpNeeded = Math.round(baseXP * Math.pow(currentLevel, growth));
            // let fiftyPercentXP = Math.ceil(xpNeeded * 0.5) // Calculate 50% of the XP needed for the current level
            rewards.exp = xpNeeded;

            const xpResult = await addXPAndLevel(character, xpNeeded, session);
            if (xpResult === "failed") {
                throw new Error("Failed to add XP. Please try again later.");
            }

            const coinsResult = await addwallet(characterid, "coins", rewards.gold, session);
            if (coinsResult === "failed") {
                throw new Error("Failed to add coins. Please try again later.");
            }
            const crystalResult = await addwallet(characterid, "crystal", rewards.crystals, session);
            if (crystalResult === "failed") {  
                throw new Error("Failed to add crystals. Please try again later.");
            }
        }
        await CharacterChapterHistory.create([{
            owner: new mongoose.Types.ObjectId(characterid),
            chapter: chapter,
            challenge: challenge,
            status: status
        }], { session });

        const multipleProgress = await multipleprogressutil(characterid, [
            { requirementtype: 'totaldamage', amount: totaldamage },
            { requirementtype: 'skillsused', amount: skillsused },
            { requirementtype: 'selfheal', amount: selfheal },
            { requirementtype: 'enemiesdefeated', amount: enemydefeated },
            { requirementtype: 'storychapters', amount: 1 }
        ]);

        if (multipleProgress.message !== "success") {
            throw new Error("Failed to update multiple progress: " + multipleProgress.data);
        }



        await session.commitTransaction();
        return res.status(200).json({
            message: "success",
            data: {
                rewards: rewards
            },
        });
    } catch (error) {
        await session.abortTransaction();
        console.error(`Error in challengechapter: ${error}`);
        return res.status(500).json({ 
            message: "failed", 
            data: "An error occurred while processing the challenge chapter: " + error.message
        });
    } finally {
        session.endSession();
    }
};


exports.challengechapterhistory = async (req, res) => {

    const { id } = req.user
    const { characterid, page, limit, filter } = req.query
    
    if(!characterid){
        return res.status(400).json({ message: "failed", data: "Please input character ID."})
    }

    const checker = await checkcharacter(id, characterid);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    if (filter) {
        let query = { owner: new mongoose.Types.ObjectId(characterid) };
        
        if (filter === 'win') {
            query.status = true;
        } else if (filter === 'lose') {
            query.status = false;
        }

        const ctchallenge = await CharacterChapterHistory.find(query)
            .sort({ createdAt: -1 })
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit);
            
        const totalCount = await CharacterChapterHistory.countDocuments(query);

        const totalpages = Math.ceil(totalCount / pageOptions.limit);

        const formattedResponse = {
            data: ctchallenge.reduce((acc, chapter, index) => {
                acc[index + 1] = {
                    id: chapter._id,
                    chapter: chapter.chapter, 
                    challenge: chapter.challenge,
                    status: chapter.status,
                    createdAt: moment(chapter.createdAt).format("YYYY-MM-DD HH:mm:ss")
                }
                return acc;
            }, {}),
            totalCount: totalCount,
            totalPages: totalpages, 
            currentPage: pageOptions.page + 1
        };

        return res.status(200).json({
            message: "success",
            data: formattedResponse.data,
            tSotalCount: totalCount,
            totalPages: totalpages,
            currentPage: pageOptions.page + 1
        });
    }

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10,
    }

    const ctchallenge = await CharacterChapterHistory.find({ owner: new mongoose.Types.ObjectId(characterid) })
    .sort({ createdAt: -1 })
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character chapter history. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const totalCount = await CharacterChapterHistory.countDocuments({ owner: new mongoose.Types.ObjectId(characterid) })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while fetching character chapter history. Error: ${err}`)

        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    })

    const totalpages = Math.ceil(totalCount / pageOptions.limit)

    const formattedResponse = {
        data: ctchallenge.reduce((acc, chapter, index) => {
            acc[index + 1] = {
                id: chapter._id,
                chapter: chapter.chapter,
                challenge: chapter.challenge,
                status: chapter.status,
                createdAt: moment(chapter.createdAt).format("YYYY-MM-DD HH:mm:ss")
            }
            return acc
        }, {}),
        totalCount: totalCount,
        totalPages: totalpages,
        currentPage: pageOptions.page + 1,
    }


    return res.status(200).json({ 
        message: "success", 
        data: formattedResponse.data,
        totalCount: totalCount,
        totalPages: totalpages,
        currentPage: pageOptions.page + 1,
    })
}

exports.getnotification = async (req, res) => {
    const { id } = req.user;
    const { characterid } = req.query;

    if (!characterid) {
        return res.status(400).json({ message: "failed", data: "Please input character ID." });
    }

    const checker = await checkcharacter(id, characterid);
    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page."
        });
    }

    try {
        // Get character gender for item news filtering
        const character = await Characterdata.findById(characterid).select('gender').lean();
        if (!character) {
            return res.status(404).json({ message: "failed", data: "Character not found" });
        }

        // Count read news for the character
        const [readNewsCount, readNewsVideoCount, readAnnouncementCount, friendRequestCount] = await Promise.all([
            News.aggregate([
                {
                    $match: {
                        type: "image"
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $limit: 5
                },
                {
                    $lookup: {
                    from: "newsreads",
                    let: { newsId: "$_id" },
                    pipeline: [
                        {
                        $match: {
                            $expr: {
                            $and: [
                                { $eq: ["$news", "$$newsId"] },
                                { $eq: ["$owner", new mongoose.Types.ObjectId(characterid)] }
                            ]
                            }
                        }
                        }
                    ],
                        as: "readByUser"
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $limit: 5
                },
                {
                    $match: {
                        readByUser: { $eq: [] }
                    }
                },
                {
                    $count: "unread"
                }
            ]),
            News.aggregate([
                 {
                    $match: {
                        type: "video"
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $limit: 5
                },
                {
                    $lookup: {
                    from: "newsreads",
                    let: { newsId: "$_id" },
                    pipeline: [
                        {
                        $match: {
                            $expr: {
                            $and: [
                                { $eq: ["$news", "$$newsId"] },
                                { $eq: ["$owner", new mongoose.Types.ObjectId(characterid)] }
                            ]
                            }
                        }
                        }
                    ],
                        as: "readByUser"
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $limit: 5
                },
                {
                    $match: {
                        readByUser: { $eq: [] }
                    }
                },
                {
                    $count: "unread"
                }
            ]),
            Announcement.aggregate([
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $limit: 10
                },
                {
                    $lookup: {
                    from: "newsreads",
                    let: { announcementId: "$_id" },
                    pipeline: [
                        {
                        $match: {
                            $expr: {
                            $and: [
                                    { $eq: ["$announcement", "$$announcementId"] },
                                    { $eq: ["$owner", new mongoose.Types.ObjectId(characterid)] }
                                ]
                            }
                        }
                        }
                    ],
                        as: "readByUser"
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $limit: 10
                },
                {
                    $match: {
                        readByUser: { $eq: [] }
                    }
                },
                {
                    $count: "unread"
                }
            ]),
            Friends.countDocuments({ friend: characterid, status: 'pending' })
        ]);

        // Get daily/weekly/monthly login status
        const [dailySpin, weeklyLogin, monthlyLogin] = await Promise.all([
            CharacterDailySpin.findOne({ owner: characterid }).select('spin expspin').lean(),
            CharacterWeeklyLogin.findOne({ owner: characterid }).select('daily currentDay').lean(),
            CharacterMonthlyLogin.findOne({ owner: characterid }).select('days').lean()
        ]);

        if (!dailySpin || !weeklyLogin || !monthlyLogin) {
            return res.status(404).json({ message: "failed", data: "Login rewards data not found." });
        }

        const dayOfMonth = new Date().getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [expexist, coinsexist, crystalexists, weeklyHasLoggedToday, monthlyHasLoggedToday] = await Promise.all([
            existsreset(characterid, "freebieexp", "claim").then(reset => !reset),
            existsreset(characterid, "freebiecoins", "claim").then(reset => !reset),
            existsreset(characterid, "freebiecrystal", "claim").then(reset => !reset),
            existsreset(characterid, "weeklylogin", "claim").then(reset => !reset),
            existsreset(characterid, "monthlylogin", "checkin").then(reset => !reset)
        ]);

        let isMonthlyTrue = false;
        if (monthlyLogin.currentDay < 28  && dayOfMonth < 28) {
            isMonthlyTrue = true;
        }

        const response = {
            data: {
                news: {
                    images: readNewsCount.length <= 0 ? 0 : readNewsCount[0].unread,
                    video: readNewsVideoCount.length <= 0 ? 0 : readNewsVideoCount[0].unread
                },
                announcement: {
                    unreadcount: readAnnouncementCount.length <= 0 ? 0 : readAnnouncementCount[0].unread
                },
                friendrequests: {
                    count: friendRequestCount
                },
                rewards: {
                    dailyspin: dailySpin.spin,
                    dailyexpspin: dailySpin.expspin,
                    weeklylogin: weeklyHasLoggedToday,
                    monthlylogin: isMonthlyTrue ? false : monthlyHasLoggedToday,
                    freebieexp: expexist,
                    freebiecoins: coinsexist,
                    freebiecrystal: crystalexists
                }
            }
        };

        return res.status(200).json({
            message: "success",
            data: response.data
        });

    } catch (error) {
        console.error('Error in getnotification:', error);
        return res.status(500).json({
            message: "failed",
            data: "Server error while fetching notifications"
        });
    }
};
