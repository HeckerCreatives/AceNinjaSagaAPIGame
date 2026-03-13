const TierAvailability = require("../models/TierAvailability");
const Characterdata = require("../models/Characterdata");
const Counter = require("../models/Counter");
const TIER_RANGES = {
    platinum: { min: 1, max: 9 },
    gold: { min: 10, max: 99 },
    silver: { min: 100, max: 899 }
};
/**
 * Initialize VIP tier availability documents in MongoDB.
 * Builds the `available` (sorted ascending) and `taken` arrays from live Characterdata.
 * Call once at server startup — no Redis needed.
 */
async function initializeVIPTiers() {
    try {
        for (const [tier, range] of Object.entries(TIER_RANGES)) {
            // Find all characters whose customid falls into this tier range
            const existingChars = await Characterdata.find({
                customid: { $gte: range.min, $lte: range.max },
                status: { $ne: "deleted" }
            }).select("customid").lean();

            const takenSet = new Set(existingChars.map(c => c.customid));
            const takenIds = [...takenSet].sort((a, b) => a - b);

            // Build available array: all IDs in range not taken, sorted ascending
            const availableIds = [];
            for (let id = range.min; id <= range.max; id++) {
                if (!takenSet.has(id)) availableIds.push(id);
            }

            await TierAvailability.findOneAndUpdate(
                { tier },
                { $set: { idRange: range, taken: takenIds, available: availableIds } },
                { upsert: true, new: true }
            );

            console.log(`[VIP Init] Tier ${tier} (${range.min}-${range.max}): ${takenIds.length} taken, ${availableIds.length} available`);
        }

        console.log("[VIP Init] All tiers initialized successfully (Mongo-only)");

        // Ensure the customid counter starts above the VIP-reserved range (1–899).
        // If the counter doesn't exist yet, upsert creates it at seq=999;
        // if it already exists but is below 999, bump it up.
        await Counter.findOneAndUpdate(
            { name: 'character_customid', seq: { $lt: 999 } },
            { $set: { seq: 999 } },
            { upsert: true }
        );
        console.log("[VIP Init] character_customid counter ensured >= 999 (next regular ID will be >= 1000)");
    } catch (err) {
        console.error("[VIP Init] Failed to initialize VIP tiers:", err);
    }
}

module.exports = { initializeVIPTiers };
