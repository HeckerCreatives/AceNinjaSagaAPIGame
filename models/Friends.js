const mongoose = require("mongoose");

const FriendsSchema = new mongoose.Schema(
    {
        character: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
            index: true
        },
        friend: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Characterdata",
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'blocked'],
            default: 'pending'
        },
        friendSince: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Helper methods to find friends in both directions
FriendsSchema.statics.findAllFriends = async function(characterId) {
    return this.find({
        $or: [
            { character: characterId, status: 'accepted' },
            { friend: characterId, status: 'accepted' }
        ]
    }).populate('character friend');
};

// Helper to check if two characters are friends
FriendsSchema.statics.areFriends = async function(character1Id, character2Id) {
    const friendship = await this.findOne({
        $or: [
            { character: character1Id, friend: character2Id },
            { character: character2Id, friend: character1Id }
        ],
        status: 'accepted'
    });
    return !!friendship;
};

const Friends = mongoose.model("Friends", FriendsSchema);
module.exports = Friends;