const Friends = require('../models/Friends');
const Characterdata = require('../models/Characterdata');
const { default: mongoose } = require('mongoose');
const { checkcharacter } = require('../utils/character');

// Add friend request
exports.addFriend = async (req, res) => {
    try {

        const { id } = req.user;
        const { characterId, friendId } = req.body;

        if(!characterId || !friendId || !mongoose.Types.ObjectId.isValid(characterId) || !mongoose.Types.ObjectId.isValid(friendId)){
            return res.status(400).json({
                message: "failed",
                data: "Invalid character ID"
            });
        }

        const checker = await checkcharacter(id, characterId);

        if (checker === "failed") {
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        if (characterId.toString() === friendId.toString()) {
            return res.status(400).json({
                message: "failed",
                data: "You cannot send a friend request to yourself."
            });
        }

        const hasrequest = await Friends.findOne({
            $or: [
                { character: characterId, friend: friendId },
                { character: friendId, friend: characterId }
            ],
            status: 'pending'
        });


        if (hasrequest) {
            return res.status(400).json({
                message: "failed",
                data: 'You already sent a friend request to this player'
            });
        }


        // Check if characters exist
        const [character, friend] = await Promise.all([
            Characterdata.findById(characterId),
            Characterdata.findById(friendId)
        ]);

        if (!character || !friend) {
            return res.status(400).json({
                message: "failed",
                data: 'Character or friend not found'
            });
        }

        // Check if friendship already exists
        const existingFriendship = await Friends.findOne({
            $or: [
                { character: characterId, friend: friendId },
                { character: friendId, friend: characterId }
            ]
        });

        if (existingFriendship) {
            return res.status(400).json({
                message: "failed",
                data: 'Friendship already exists'
            });
        }

        // Create new friendship
        const newFriendship = await Friends.create({
            character: characterId,
            friend: friendId
        });

        res.status(200).json({
            message: "success"
        });

    } catch (error) {
        res.status(400).json({
            message: "bad-request",
            data: "There's a problem with the server! Please contact support for more details."
        });
    }
};

// Get all friends for a character
exports.getFriends = async (req, res) => {
    try {
        const { id } = req.user;
        const { characterId } = req.query;
        const FRIEND_LIMIT = 200;

        if(!characterId || !mongoose.Types.ObjectId.isValid(characterId)){
            return res.status(400).json({
                message: "failed",
                data: "Invalid character ID"
            });
        }

        const checker = await checkcharacter(id, characterId);

        if (checker === "failed") {
            return res.status(400).json({
                message: "Unauthorized", 
                data: "You are not authorized to view this page. Please login the right account to view the page."
            });
        }

        const friendCount = await Friends.countDocuments({
            $or: [
                { character: characterId },
                { friend: characterId }
            ],
            status: 'accepted'
        });

        if (friendCount >= FRIEND_LIMIT) {
            return res.status(400).json({
                message: "failed",
                data: `You have reached the maximum friend limit of ${FRIEND_LIMIT}`
            });
        }



        const friends = await Friends.find({
            $and: [
                {
                    $or: [
                        { character: characterId },
                        { friend: characterId }
                    ]
                },
                { status: 'accepted' }
            ]
        }).populate('character friend', 'username level badge title');

        const formattedResponse = {
            data: friends.reduce((acc, friendship, index) => {
                const friendData = friendship.character._id.toString() === characterId 
                    ? friendship.friend 
                    : friendship.character;
                
                acc[index + 1] = {
                    friendId: friendData._id,
                    username: friendData.username,
                    level: friendData.level,
                    badge: friendData.badge,
                    title: friendData.title,
                    status: friendship.status,
                    friendSince: friendship.friendSince
                };
                
                return acc;
            }, {})
        };
        
        return res.status(200).json({
            message: "success",
            data: formattedResponse.data,
        });

    } catch (error) {
        console.log(`There's a problem encountered while getting friends. Error: ${error}`);
        res.status(400).json({
            message: "bad-request",
            data: "There's a problem with the server! Please contact support for more details."
        });
    }
};


// Get all friend requests for a character

exports.getFriendRequests = async (req, res) => {

    const { id } = req.user;
    const { characterId } = req.query;

    if(!characterId || !mongoose.Types.ObjectId.isValid(characterId)){
        return res.status(400).json({
            message: "failed",
            data: "Invalid character ID"
        });
    }

    const checker = await checkcharacter(id, characterId);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    try {
        const friendRequests = await Friends.find({
            friend: characterId,
            status: 'pending'
        }).populate('character', 'username level badge title');

        const formattedResponse = {
            data: friendRequests.reduce((acc, request, index) => {
                acc[index + 1] = {
                    characterId: request.character._id,
                    username: request.character.username,
                    level: request.character.level,
                    badge: request.character.badge,
                    title: request.character.title,
                };
                return acc;
            }, {})
        };

        res.status(200).json({
            message: "success",
            data: formattedResponse.data,
        });

    } catch (error) {

        console.log(`There's a problem encountered while getting friend requests. Error: ${error}`);
        res.status(400).json({
            message: "bad-request",
            data: "There's a problem with the server! Please contact support for more details."
        });
    }
}

// accept friend request

exports.acceptrejectFriendRequest = async (req, res) => {

    const { id } = req.user;
    const { characterId, friendId, status } = req.body;


    if(!characterId || !friendId || !status || !mongoose.Types.ObjectId.isValid(characterId) || !mongoose.Types.ObjectId.isValid(friendId)){
        return res.status(400).json({
            message: "failed",
            data: "Incomplete data"
        });
    }

    const checker = await checkcharacter(id, characterId);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    
    // Check if friendship exists
    const friendship = await Friends.findOne({
        $or: [
            { character: characterId, friend: friendId },
            { character: friendId, friend: characterId }
        ]
    });

    
    if(friendship.status !== 'pending'){
        return res.status(400).json({
            message: "failed",
            data: "Invalid status"
        });
    } 
    if (friendship.status === 'accepted'){ 
        return res.status(400).json({
            message: "failed",
            data: 'Player is already a friend'
        });
    }
    
    if(status === 'accepted'){
        await Friends.findOneAndUpdate(
            { character: friendId, friend: characterId },
            { status: 'accepted', friendSince: Date.now() }
        )
        .then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while accepting friend request. Error: ${err}`)
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
        })
    } else if (status === 'rejected'){
        await Friends.findOneAndDelete(
            { character: friendId, friend: characterId }
        ).then(data => data)
        .catch(err => {
            console.log(`There's a problem encountered while rejecting friend request. Error: ${err}`)
            return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
        })
    } else {
        console.log(`Invalid status: ${status}`)
        return res.status(400).json({
            message: "failed",
            data: "Invalid status"
        });
    }
    res.status(200).json({
        message: 'success'
    });

}

exports.playerlist = async (req, res) => {
    try {
        const { id } = req.user;
        const { characterId, search, page, limit } = req.query;

        const pageOptions = {
            page: parseInt(page) || 0,
            limit: parseInt(limit) || 10
        };

        let query = {
            _id: { $ne: characterId } // Exclude current character
        };

        if(search){
            query.username = { $regex: new RegExp(search, 'i') };
        }

        if(!characterId || !mongoose.Types.ObjectId.isValid(characterId)){
            return res.status(400).json({
                message: "failed",
                data: "Invalid character ID"
            });
        }

        const checker = await checkcharacter(id, characterId);
        if (checker === "failed") {
            return res.status(400).json({
                message: "Unauthorized",
                data: "You are not authorized to view this page."
            });
        }

        const friends = await Friends.find({
            $or: [
                { character: characterId },
                { friend: characterId }
            ]
        });

        const friendIds = friends.map(friendship => 
            friendship.character.toString() === characterId
                ? friendship.friend
                : friendship.character
        );

        // Add friendIds to exclusion query
        query._id.$nin = [...(query._id.$nin || []), ...friendIds];

        const [players, totalData] = await Promise.all([
            Characterdata.find(query)
                .limit(pageOptions.limit)
                .skip(pageOptions.limit * pageOptions.page)
                .select('_id username level badge title'),
            Characterdata.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalData / pageOptions.limit);


        const formattedResponse = {
            data: players.reduce((acc, player, index) => {
                acc[index + 1] = {
                    id: player._id,
                    username: player.username,
                    level: player.level,
                    badge: player.badge,
                    title: player.title,
                };
                return acc;
            }, {}),
            pagination: {
                total: totalData,
                page: pageOptions.page,
                limit: pageOptions.limit,
                pages: totalPages
            }
        };

        return res.status(200).json({
            message: "success",
            data: formattedResponse.data,
            pagination: formattedResponse.pagination
        });

    } catch (error) {
        console.error(`Error in playerlist: ${error}`);
        return res.status(400).json({
            message: "bad-request",
            data: "There's a problem with the server! Please contact support."
        });
    }
};

exports.removefriend = async (req, res) => {

    const { id } = req.user;
    const { characterId, friendId } = req.body;

    if(!characterId || !friendId || !mongoose.Types.ObjectId.isValid(characterId) || !mongoose.Types.ObjectId.isValid(friendId)){
        return res.status(400).json({
            message: "failed",
            data: "Invalid character ID"
        });
    }

    const checker = await checkcharacter(id, characterId);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const friendship = await Friends.findOne({
        $or: [
            { character: characterId, friend: friendId },
            { character: friendId, friend: characterId }
        ]
    });

    if(!friendship){
        return res.status(400).json({
            message: "failed",
            data: "Friendship not found"
        });
    }

    await Friends.findOneAndDelete({
        $or: [
            { character: characterId, friend: friendId },
            { character: friendId, friend: characterId }
        ]
    })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while removing friend. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    });

    res.status(200).json({
        message: "success"
    });
}

exports.blockunblock = async (req, res) => {
    const { id } = req.user;
    const { characterId, friendId, status } = req.body;

    if(!characterId || !friendId || !status || !mongoose.Types.ObjectId.isValid(characterId) || !mongoose.Types.ObjectId.isValid(friendId)){
        return res.status(400).json({
            message: "failed",
            data: "Invalid character ID"
        });
    }

    const checker = await checkcharacter(id, characterId);

    if (checker === "failed") {
        return res.status(400).json({
            message: "Unauthorized",
            data: "You are not authorized to view this page. Please login the right account to view the page."
        });
    }

    const friendship = await Friends.findOne({
        $or: [
            { character: characterId, friend: friendId },
            { character: friendId, friend: characterId }
        ]
    });

    if(!friendship){
        return res.status(400).json({
            message: "failed",
            data: "Friendship not found"
        });
    }

    await Friends.findOneAndUpdate({
        $or: [
            { character: characterId, friend: friendId },
            { character: friendId, friend: characterId }
        ]
    }, { status })
    .then(data => data)
    .catch(err => {
        console.log(`There's a problem encountered while blocking/unblocking friend. Error: ${err}`)
        return res.status(400).json({ message: "bad-request", data: "There's a problem with the server. Please contact support for more details."})
    });

    res.status(200).json({
        message: "success"
    });

}