const Characterdata = require("../models/Characterdata");
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

        // Format response only if skills exist
        const formattedResponse = {
            data: characterSkills.skills.reduce((acc, skill, index) => {
                acc[index + 1] = skill;
                return acc;
            }, {}),
            pagination: {
                total: characterSkills.skills.length,
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

exports.acquirebasicskills = async (req, res) => {
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

        console.log(skillTree.skillPoints, skill.spCost);

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