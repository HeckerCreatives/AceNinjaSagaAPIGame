const Characterdata = require("../models/Characterdata");
const Characterwallet = require("../models/Characterwallet");
const { Skill, CharacterSkillTree } = require("../models/Skills");

exports.getSkills = async (req, res) => {
    const { type, search, category, path, page, limit } = req.query;

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    try {
        // Build query
        const query = {};

        // Apply search filter
        if (search) {
            query.name = { $regex: new RegExp(search, "i") };
        }

        // Apply additional filters
        if (type) query.type = type;
        if (category) query.category = category;
        if (path) query.path = path;

        // Get skills with pagination
        const skills = await Skill.find(query)
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit);

        // Get total count for pagination
        const total = await Skill.countDocuments(query);

        // Format response
        const formattedResponse = {
            data: skills.reduce((acc, skill, index) => {
                acc[index + 1] = skill;
                return acc;
            }, {}),
            pagination: {
                total: total,
                page: pageOptions.page,
                limit: pageOptions.limit,
                pages: Math.ceil(total / pageOptions.limit)
            }
        };

        return res.status(200).json({
            message: "success",
            data: formattedResponse.data,
            pagination: formattedResponse.pagination
        });

    } catch (err) {
        console.log(`Error in skills retrieval: ${err}`);
        return res.status(400).json({
            message: "bad-request",
            data: "There's a problem with the server! Please try again later."
        });
    }
};


exports.getSkillsWithCharacter = async (req, res) => {
    const { type, search, category, path, page, limit, characterid } = req.query;

    const pageOptions = {
        page: parseInt(page) || 0,
        limit: parseInt(limit) || 10
    };

    try {
        // Build query for skills
        const query = {};

        // Apply search filter
        if (search) {
            query.name = { $regex: new RegExp(search, "i") };
        }

        // Apply additional filters
        if (type) query.type = type;
        if (category) query.category = category;
        if (path) query.path = path;

        // Get all available skills with pagination
        const skills = await Skill.find(query)
            .skip(pageOptions.page * pageOptions.limit)
            .limit(pageOptions.limit);

        // Get character's skill tree if characterid is provided
        let characterSkills = [];
        if (characterid) {
            const skillTree = await CharacterSkillTree.findOne({ owner: characterid })
                .populate('skills.skill');
            
            if (skillTree && skillTree.skills) {
                characterSkills = skillTree.skills;
            }
        }

        // Format response with character skill information
        const formattedSkills = skills.reduce((acc, skill, index) => {
            // Find if character has this skill
            const characterSkill = characterSkills.find(cs => 
                cs.skill._id.toString() === skill._id.toString()
            );

            acc[index + 1] = {
                ...skill.toObject(),
                acquired: !!characterSkill,
                currentLevel: characterSkill ? characterSkill.level : 0,
                maxLevel: skill.maxLevel
            };
            
            return acc;
        }, {});

        // Get total count for pagination
        const total = await Skill.countDocuments(query);

        // Format response
        const formattedResponse = {
            data: formattedSkills,
            pagination: {
                total: total,
                page: pageOptions.page,
                limit: pageOptions.limit,
                pages: Math.ceil(total / pageOptions.limit)
            }
        };

        return res.status(200).json({
            message: "success",
            data: formattedResponse.data,
            pagination: formattedResponse.pagination
        });

    } catch (err) {
        console.log(`Error in skills retrieval: ${err}`);
        return res.status(400).json({
            message: "bad-request",
            data: "There's a problem with the server! Please try again later."
        });
    }
};

exports.getcharacterSkills = async (req, res) => {
    const { characterid } = req.query;

    try {
        const characterSkills = await CharacterSkillTree.findOne({ owner: characterid })
            .populate("skills.skill");

        // If no skills found, return empty data
        if (!characterSkills || !characterSkills.skills) {
            return res.status(200).json({
                message: "success",
                data: {},
                pagination: {
                    total: 0,
                    pages: 0
                }
            });
        }

        // Filter out stat type skills and format response
        const nonStatSkills = characterSkills.skills.filter(skill => 
            skill.skill.type !== 'Stat'
        );

        const formattedResponse = {
            data: nonStatSkills.reduce((acc, skill, index) => {
                acc[index + 1] = {
                    ...skill.skill.toObject(),
                    level: skill.level,
                    isEquipped: skill.isEquipped
                };
                return acc;
            }, {}),
            pagination: {
                total: nonStatSkills.length,
                pages: 1
            }
        };

        return res.status(200).json({
            message: "success",
            data: formattedResponse.data,
            pagination: formattedResponse.pagination
        });

    } catch (err) {
        console.log(`Error in character skills retrieval: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "There's a problem with the server! Please try again later."
        });
    }
};

exports.acquirespbasedskills = async (req, res) => {
    const { characterid, skillid } = req.body;

    try {
        // Validate required parameters
        if (!characterid || !skillid) {
            return res.status(400).json({
                message: "failed",
                data: "Missing required parameters"
            });
        }

        // Get skill details
        const skill = await Skill.findById(skillid);
        if (!skill) {
            return res.status(404).json({
                message: "failed",
                data: "Skill not found"
            });
        }

        if(skill.currency !== "skillpoints") {
            return res.status(400).json({
                message: "failed",
                data: "Skill cannot be acquired with skill points"
            });
        }


        // Get character's skill tree
        let skillTree = await CharacterSkillTree.findOne({ owner: characterid })
            .populate('skills.skill');

        // If no skill tree exists, create one
        if (!skillTree) {
            skillTree = await CharacterSkillTree.create({
                characterid,
                skills: []
            });
        }

        // Check if character already has this skill
        const existingSkill = skillTree.skills.find(s => 
            s.skill._id.toString() === skillid
        );

        if (existingSkill) {
            // Check if skill can be upgraded
            if (existingSkill.level >= skill.maxLevel) {
                return res.status(400).json({
                    message: "failed",
                    data: "Skill already at maximum level"
                });
            }
        }

        // Check prerequisites
        if (skill.prerequisites && skill.prerequisites.length > 0) {
            const hasPrerequisites = skill.prerequisites.every(prereqId => {
                return skillTree.skills.some(s => 
                    s.skill._id.toString() === prereqId.toString() &&
                    s.level >= 1
                );
            });

            if (!hasPrerequisites) {
                return res.status(400).json({
                    message: "failed",
                    data: "Prerequisites not met"
                });
            }
        }

        // Get character data to check level and skill points
        const character = await Characterdata.findById(characterid);
        if (!character) {
            return res.status(404).json({
                message: "failed",
                data: "Character not found"
            });
        }

        // Check level requirement
        if (character.level < skill.levelRequirement) {
            return res.status(400).json({
                message: "failed",
                data: "Level requirement not met"
            });
        }

        // Check skill points
        if (skillTree.skillPoints < skill.spCost) {
            return res.status(400).json({
                message: "failed",
                data: "Not enough skill points"
            });
        }


        // Update or add skill
        if (existingSkill) {
            // Upgrade existing skill
            existingSkill.level += 1;
        } else {
            // Add new skill
            skillTree.skills.push({
                skill: skillid,
                level: 1
            });
        }

        // Deduct skill points
        skillTree.skillPoints -= skill.spCost;

        // Save changes
        await Promise.all([
            skillTree.save(),
        ]);

        return res.status(200).json({
            message: "success",
            data: {
                skillTree: skillTree,
                remainingPoints: character.skillpoints
            }
        });

    } catch (err) {
        console.log(`Error in skill acquisition: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "There's a problem with the server! Please try again later."
        });
    }
};

exports.acquirebuybasedskills = async (req, res) => {
    const { characterid, skillid } = req.body;

    try {
        // Validate required parameters
        if (!characterid || !skillid) {
            return res.status(400).json({
                message: "failed",
                data: "Missing required parameters"
            });
        }

        // Get skill details with error handling
        const skill = await Skill.findById(skillid);
        if (!skill) {
            return res.status(404).json({
                message: "failed",
                data: "Skill not found"
            });
        }

        // Verify skill can be bought with currency
        if(skill.currency === "skillpoints") {
            return res.status(400).json({
                message: "failed",
                data: "This skill requires skill points to acquire"
            });
        }


        // Check if wallet exists
        let wallet = await Characterwallet.findOne({
            owner: characterid, 
            type: skill.currency
        });

        if (!wallet) {
            return res.status(404).json({
                message: "failed",
                data: "Wallet not found"
            });
        }

        // Get character's skill tree
        let skillTree = await CharacterSkillTree.findOne({ owner: characterid })
            .populate('skills.skill');

        if (!skillTree) {
            skillTree = await CharacterSkillTree.create({
                owner: characterid,  // Fixed: changed characterid to owner
                skills: []
            });
        }

        // Check prerequisites are maxed
        if (skill.prerequisites && skill.prerequisites.length > 0) {
            const hasMaxedPrerequisites = skill.prerequisites.every(prereqId => {
                const prereqSkill = skillTree.skills.find(s => 
                    s.skill._id.toString() === prereqId.toString()
                );
                return prereqSkill && prereqSkill.level >= prereqSkill.skill.maxLevel;
            });

            if (!hasMaxedPrerequisites) {
                return res.status(400).json({
                    message: "failed",
                    data: "Prerequisites must be at maximum level"
                });
            }
        }

        // Check if character already has this skill
        const existingSkill = skillTree.skills.find(s => 
            s.skill._id.toString() === skillid
        );

        if (existingSkill && existingSkill.level >= skill.maxLevel) {
            return res.status(400).json({
                message: "failed",
                data: "Skill already at maximum level"
            });
        }

        // Get character data
        const character = await Characterdata.findById(characterid);
        if (!character) {
            return res.status(404).json({
                message: "failed",
                data: "Character not found"
            });
        }

        // Check level requirement
        if (character.level < skill.levelRequirement) {
            return res.status(400).json({
                message: "failed", 
                data: "Level requirement not met"
            });
        }

        // Check currency
        if (parseInt(wallet.amount) < parseInt(skill.price)) {
            return res.status(400).json({
                message: "failed",
                data: `Not enough ${skill.currency}. Required: ${skill.price}, Available: ${wallet.amount}`
            });
        }

        // Update skill tree
        if (existingSkill) {
            existingSkill.level += 1;
        } else {
            skillTree.skills.push({
                skill: skillid,
                level: 1
            });
        }

        // Deduct currency
        wallet.amount = (parseInt(wallet.amount) - parseInt(skill.price)).toString();

        // Save all changes atomically
        await Promise.all([
            skillTree.save(),
            wallet.save()
        ]);

        return res.status(200).json({
            message: "success",
            data: {
                skillTree,
                wallet: {
                    type: wallet.type,
                    amount: wallet.amount
                }
            }
        });

    } catch (err) {
        console.log(`Error in skill acquisition: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "There's a problem with the server! Please try again later."
        });
    }
};

exports.equipskill = async (req, res) => {
    const { characterid, skillid } = req.body;

    try {
        // Get character's skill tree
        let skillTree = await CharacterSkillTree.findOne({ owner: characterid })
            .populate('skills.skill');

        if (!skillTree) {
            skillTree = await CharacterSkillTree.create({
                owner: characterid,
                skills: []
            });
        }

        // Check if skill exists
        const skill = skillTree.skills.find(s => 
            s.skill._id.toString() === skillid
        );

        if (!skill) {
            return res.status(404).json({
                message: "failed",
                data: "Skill not found"
            });
        }

        if (skill.skill.type === 'Stat') {
            return res.status(400).json({
                message: "failed",
                data: "Stat skills cannot be equipped"
            });
        }

        // Check if skill is already equipped
        if (skill.isEquipped) {
            return res.status(400).json({
                message: "failed",
                data: "Skill is already equipped"
            });
        }

        // Check if skill is passive
        const isPassive = skill.skill.type === 'Passive';
        const isPathSkill = skill.skill.category === 'Path';

        // Get currently equipped skills based on category
        const equippedPathSkills = skillTree.skills.filter(s => 
            s.isEquipped && s.skill.category === 'Path' && s.skill.type === (isPassive ? 'Passive' : 'Active')
        );

        const equippedNonPathSkills = skillTree.skills.filter(s => 
            s.isEquipped && s.skill.category !== 'Path' && s.skill.type === (isPassive ? 'Passive' : 'Active')
        );

        // Check limits based on skill category
        if (isPathSkill) {
            // Path skills (Mage, Samurai, etc.)
            if (isPassive && equippedPathSkills.length >= 3) {
                return res.status(400).json({
                    message: "failed",
                    data: "Maximum path passive skills (3) already equipped"
                });
            }
            if (!isPassive && equippedPathSkills.length >= 4) {
                return res.status(400).json({
                    message: "failed",
                    data: "Maximum path active skills (4) already equipped"
                });
            }
        } else {
            // Non-path skills (Attack, Defense, Utility, Guild, Raid, etc.)
            if (isPassive && equippedNonPathSkills.length >= 3) {
                return res.status(400).json({
                    message: "failed",
                    data: "Maximum non-path passive skills (3) already equipped"
                });
            }
            if (!isPassive && equippedNonPathSkills.length >= 4) {
                return res.status(400).json({
                    message: "failed",
                    data: "Maximum non-path active skills (4) already equipped"
                });
            }
        }

        // Equip skill
        skill.isEquipped = true;

        // Save changes
        await skillTree.save();

        return res.status(200).json({
            message: "success",
            data: {
                skillTree,
                equipped: {
                    pathSkills: {
                        active: equippedPathSkills.length + (!isPassive && isPathSkill ? 1 : 0),
                        passive: equippedPathSkills.length + (isPassive && isPathSkill ? 1 : 0)
                    },
                    nonPathSkills: {
                        active: equippedNonPathSkills.length + (!isPassive && !isPathSkill ? 1 : 0),
                        passive: equippedNonPathSkills.length + (isPassive && !isPathSkill ? 1 : 0)
                    }
                }
            }
        });
    } catch (err) {
        console.log(`Error in skill equip: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "There's a problem with the server! Please try again later."
        });
    }
};

exports.unequipskill = async (req, res) => {
    const { characterid, skillid } = req.body;

    try {
        // Get character's skill tree
        let skillTree = await CharacterSkillTree.findOne({ owner: characterid })
            .populate('skills.skill');

        if (!skillTree) {
            skillTree = await CharacterSkillTree.create({
                owner: characterid,
                skills: []
            });
        }

        // Check if skill exists
        const skill = skillTree.skills.find(s => 
            s.skill._id.toString() === skillid
        );

        if (!skill) {
            return res.status(404).json({
                message: "failed",
                data: "Skill not found"
            });
        }

        // Check if skill is already unequipped

        if (!skill.isEquipped) {
            return res.status(400).json({
                message: "failed",
                data: "Skill is already unequipped"
            });
        }

        // Unequip skill

        skill.isEquipped = false;

        // Save changes

        await skillTree.save();

        return res.status(200).json({
            message: "success",
            data: skillTree
        });

    } catch (err) {
        console.log(`Error in skill unequip: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "There's a problem with the server! Please try again later."
        });
    }

}


exports.getequippedskills = async (req, res) => {
    const { characterid } = req.query;

    try {
        // Get character's skill tree
        const skillTree = await CharacterSkillTree.findOne({ owner: characterid })
            .populate('skills.skill');

        if (!skillTree) {
            return res.status(404).json({
                message: "failed",
                data: "Skill tree not found"
            });
        }

        // Get equipped non-stat skills
        const equippedSkills = skillTree.skills?.filter(s => 
            s && s.isEquipped && s.skill.type !== 'Stat'
        ) || [];

        // Initialize empty structure if no equipped skills
        if (equippedSkills.length === 0) {
            return res.status(200).json({
                message: "success",
                data: {
                    path: { active: {}, passive: {} },
                    nonpath: { active: {}, passive: {} }
                },
                counts: {
                    path: {
                        active: 0,
                        passive: 0,
                        activeRemaining: 4,
                        passiveRemaining: 3
                    },
                    nonpath: {
                        active: 0,
                        passive: 0,
                        activeRemaining: 4,
                        passiveRemaining: 3
                    }
                }
            });
        }

        // Format skills by category and type
        const formattedSkills = equippedSkills.reduce((acc, skill) => {
            const isPathSkill = skill.skill.category === 'Path';
            const category = isPathSkill ? 'path' : 'nonpath';
            const type = skill.skill.type.toLowerCase();

            // Initialize category if needed
            if (!acc[category]) {
                acc[category] = { active: {}, passive: {} };
            }

            // Add skill to appropriate category
            const skillCount = Object.keys(acc[category][type]).length + 1;
            acc[category][type][skillCount] = {
                ...skill.skill.toObject(),
                level: skill.level,
                slot: skillCount
            };

            return acc;
        }, {
            path: { active: {}, passive: {} },
            nonpath: { active: {}, passive: {} }
        });

        // Calculate counts
        const counts = {
            path: {
                active: Object.keys(formattedSkills.path.active).length,
                passive: Object.keys(formattedSkills.path.passive).length,
                activeRemaining: 4 - Object.keys(formattedSkills.path.active).length,
                passiveRemaining: 3 - Object.keys(formattedSkills.path.passive).length
            },
            nonpath: {
                active: Object.keys(formattedSkills.nonpath.active).length,
                passive: Object.keys(formattedSkills.nonpath.passive).length,
                activeRemaining: 4 - Object.keys(formattedSkills.nonpath.active).length,
                passiveRemaining: 3 - Object.keys(formattedSkills.nonpath.passive).length
            }
        };

        return res.status(200).json({
            message: "success",
            data: formattedSkills,
            counts: counts
        });

    } catch (err) {
        console.log(`Error in equipped skills retrieval: ${err}`);
        return res.status(500).json({
            message: "failed",
            data: "There's a problem with the server! Please try again later."
        });
    }
};