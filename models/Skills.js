const { default: mongoose } = require("mongoose");


const SkillSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    category: { 
      type: String, 
      enum: ['Basic', 'Special', 'Secret', 'PvP', 'Clan', 'Deals', 'Raid', 'Path'], 
      required: true 
    },
    path: { 
      type: String, 
      enum: ['Attack', 'Defense', 'Utility', 'Mage', 'Samurai', 'Scholar', 'Rogue', 'Dark', null], 
      default: null 
    }, // Only for Basic skills
    type: {
        type: String,
        enum: ['Active', 'Passive', 'Stat'],
        required: true
    },
    description: {
        type: String,
    },
    levelRequirement: { 
        type: Number, default: 0 
    },
    price: {
        type: Number,
    },
    currency: {
        type: String,
        enum: ['coins', 'crystal', 'emerald', 'skillpoints']
    },
    spCost: { 
        type: Number, 
        required: true 
    }, // Skill points required
    maxLevel: { 
        type: Number, 
        default: 1 
    },
    effects: { 
        type: Map, 
        of: Number 
    }, // Example: { "attack": +5, "energy": +40 }
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }]
  });
  
  const CharacterSkillTreeSchema = new mongoose.Schema({
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Characterdata', 
        required: true 
    },
    skillPoints: { 
        type: Number, 
        default: 0 
    },
    skills: [
      {
        skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }, // Skill reference
        level: { type: Number, default: 0 }, // Skill level (default is locked)
        isEquipped: { type: Boolean, default: false } // Is skill equipped
      }
    ],
    unlockedSkills: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Skill' 
    }]
  });
    
  

  // Models
  const Skill = mongoose.model('Skill', SkillSchema);
  const CharacterSkillTree = mongoose.model('CharacterSkillTree', CharacterSkillTreeSchema);
  
  module.exports = { Skill, CharacterSkillTree };
