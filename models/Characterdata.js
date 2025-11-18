const mongoose = require("mongoose");
const Counter = require('./Counter');

const CharacterDataSchema = new mongoose.Schema(
    {
        customid: {
            type: Number,
            unique: true,
            index: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            index: true
        },
        username: {
            type: String,
            index: true,
        },
        gender: {
            type: Number,
            index: true
        },
        outfit: {
            type: Number,
            index: true
        },
        hair: {
            type: String,
            index: true
        },
        eyes: {
            type: Number,
            index: true
        },
        facedetails: {
            type: Number,
            index: true
        },
        weapon: {
            type: Number,
            index: true
        },
        color: {
            type: Number,
            index: true
        },
        title: {
            type: Number,
            index: true
        },
        experience: {
            type: Number
        },
        level: {
            type: Number
        },
        badge: {
            type: Number
        },
        itemindex: {
            type: Number
        },
        slotIndex: {
            type: Number,
            min: 1,
            max: 4,
            index: true
        },
        path: {
            type: String,
            index: true
        },
        status: {
            type: String,
            index: true,
            default: "active"
        }
    },
    {
        timestamps: true
    }
)

// Auto-increment customid with duplicate error handling and fallback mechanism
CharacterDataSchema.pre('save', async function(next) {
    try {
        // If customid is already set and this is not a new document, skip
        if (this.customid && this.customid > 0 && !this.isNew) {
            return next();
        }

        // If customid is already set for new document, validate it's unique
        if (this.customid && this.customid > 0 && this.isNew) {
            const existing = await this.constructor.findOne({ customid: this.customid });
            if (existing) {
                // If duplicate found, proceed with auto-increment
                this.customid = null;
            } else {
                return next(); // Use the provided customid
            }
        }

        // Auto-increment logic with fallback mechanism        
        
        const MAX_RETRIES = 3;
        
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                // Get next sequence number atomically
                const counterDoc = await Counter.findOneAndUpdate(
                    { name: 'character_customid' },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true, setDefaultsOnInsert: true }
                );

                if (!counterDoc || typeof counterDoc.seq !== 'number') {
                    throw new Error('Failed to get sequence number from counter');
                }

                this.customid = counterDoc.seq;

                // Test if this customid is truly unique by trying to save
                const testDoc = await this.constructor.findOne({ customid: this.customid });
                if (!testDoc) {
                    return next(); // Success - unique customid found
                }

                // If we reach here, there's a duplicate. Continue to next attempt.
                console.warn(`Duplicate customid ${this.customid} found on attempt ${attempt + 1}. Retrying...`);
                
            } catch (saveError) {
                // Check if it's a duplicate key error
                if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.customid) {
                    console.warn(`Duplicate key error for customid ${this.customid} on attempt ${attempt + 1}. Retrying...`);
                    continue; // Try again with next sequence number
                } else {
                    throw saveError; // Different error, propagate it
                }
            }
        }

        // If we've exhausted all retries, return an error
        return next(new Error(`Failed to generate unique customid after ${MAX_RETRIES} attempts`));

    } catch (err) {
        console.error('Error in customid pre-save hook:', err);
        return next(err);
    }
});

const Characterdata = mongoose.model("Characterdata", CharacterDataSchema)
module.exports = Characterdata