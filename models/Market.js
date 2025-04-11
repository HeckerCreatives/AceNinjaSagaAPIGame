const mongoose = require('mongoose');

// Item Schema
const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ["weapon", "skins", "skills", "goldpacks", "crystalpacks", "chests", "freebie"]
    },
    // if type is skills we have to reference the skills collection
    skill: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skills',
        required: function() {
            return this.type === 'skills';
        }
    },
    inventorytype: {
        type: String,
        required: true,
        enum: ["weapon", "outfit", "hair", "face", "eyes", "skincolor", "skins", "goldpacks", "crystalpacks", "chests", "freebie"]
    },
    gender: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    rarity: {
        type: String,
        required: true,
        enum: ['basic', 'common', 'rare', 'legendary']
    },
    imageUrl: {
        type: String,
    },
    isEquippable: {
        type: Boolean,
        default: true
    },
    isOpenable: {
        type: Boolean,
        default: false
    },
    crystals: {
        type: Number,
        default: 0,
        min: 0
    },
    coins: {
        type: Number,
        default: 0,
        min: 0
    },
    stats: {
        level: {
            type: Number,
            min: 1
        },
        damage: {
            type: Number,
            min: 0
        },
        defense: {
            type: Number,
            default: 0,
            min: 0
        },
        speed: {
            type: Number,
            default: 0,
            min: 0
        }
    }
});

// Market Schema
const MarketSchema = new mongoose.Schema({
    items: [itemSchema],
    marketType: {
        type: String,
        required: true,
        enum: ['market', 'shop']
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Character Inventory Schema
const CharacterInventorySchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Characterdata",
        required: true,
        index: true
    },
    type: {
        type: String,
        index: true
    },
    items: [{
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true,
            index: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        },
        isEquipped: {
            type: Boolean,
            default: false
        },
        acquiredAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes
itemSchema.index({ type: 1, rarity: 1 });
MarketSchema.index({ 'items.type': 1, 'items.rarity': 1 });
CharacterInventorySchema.index({ 'items.item': 1 });

// Models
const Item = mongoose.model('Item', itemSchema);
const Market = mongoose.model('Market', MarketSchema);
const CharacterInventory = mongoose.model('CharacterInventory', CharacterInventorySchema);

module.exports = {
    Item,
    Market,
    CharacterInventory
};